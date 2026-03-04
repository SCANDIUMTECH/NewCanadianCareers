import logging
import re
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import ConsentHistory, ConsentLog, GDPRSettings, Service, UserConsent

logger = logging.getLogger("gdpr.consent")


def mask_ip(ip: str) -> str:
    """Mask IP address for privacy - last octet for IPv4, last two groups for IPv6."""
    if ":" in ip:
        return re.sub(r"[\da-f]*:[\da-f]*$", "XXXX:XXXX", ip, flags=re.IGNORECASE)
    return re.sub(r"\.\d+$", ".XXX", ip)


def get_client_ip(request) -> str:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


class ConsentService:
    """Core consent management with immutable audit trail (Art. 7(1)),
    consent versioning (EDPB), and consent expiry (CNIL 13-month rule)."""

    def check_service_consent(self, request, service: Service, gdpr_settings: GDPRSettings) -> bool:
        """Check if a specific service is consented to by the current visitor."""
        if not service.is_deactivatable:
            return True

        if gdpr_settings.first_visit_allow_all or gdpr_settings.returning_visitor_allow_all:
            if service.default_enabled:
                return True

        if request.user.is_authenticated:
            try:
                user_consent = UserConsent.objects.get(user=request.user)
                if self._is_consent_expired(user_consent, gdpr_settings):
                    return service.default_enabled
                service_key = str(service.id)
                if service_key in user_consent.consents:
                    return user_consent.consents[service_key]
            except UserConsent.DoesNotExist:
                pass
        else:
            ip = mask_ip(get_client_ip(request))
            try:
                consent_log = ConsentLog.objects.get(ip_address=ip)
                if self._is_consent_expired(consent_log, gdpr_settings):
                    return service.default_enabled
                service_key = str(service.id)
                if service_key in consent_log.consents:
                    return consent_log.consents[service_key]
            except ConsentLog.DoesNotExist:
                pass

        return service.default_enabled

    def _is_consent_expired(self, consent_record, gdpr_settings: GDPRSettings) -> bool:
        """Check if consent has expired (CNIL: max 13 months / 395 days)."""
        if not consent_record.consent_given_at:
            return False
        expiry_days = gdpr_settings.consent_expiry_days
        if expiry_days <= 0:
            return False
        cutoff = timezone.now() - timedelta(days=expiry_days)
        return consent_record.consent_given_at < cutoff

    def is_consent_version_current(self, consent_record, gdpr_settings: GDPRSettings) -> bool:
        """Check if consent was given for the current banner/service version."""
        if not consent_record.consent_version:
            return False
        return consent_record.consent_version == gdpr_settings.consent_version

    def update_service_consent(self, request, service_id: int, allowed: bool):
        """Update consent for a single service with audit trail.

        Uses select_for_update to prevent race conditions when multiple
        consent toggles are fired concurrently (e.g. category-level toggles).
        """
        service_key = str(service_id)
        gdpr_settings = GDPRSettings.load()
        service_name = ""
        try:
            service_name = Service.objects.get(id=service_id).name
        except Service.DoesNotExist:
            pass

        now = timezone.now()
        with transaction.atomic():
            if request.user.is_authenticated:
                user_consent, _ = UserConsent.objects.get_or_create(user=request.user)
                # Re-fetch with row lock to prevent concurrent read-modify-write
                user_consent = UserConsent.objects.select_for_update().get(pk=user_consent.pk)
                user_consent.consents[service_key] = allowed
                user_consent.consent_version = gdpr_settings.consent_version
                user_consent.consent_given_at = now
                user_consent.save()
                consents_snapshot = user_consent.consents
            else:
                ip = mask_ip(get_client_ip(request))
                consent_log = self._get_or_create_consent_log(ip)
                # Re-fetch with row lock
                consent_log = ConsentLog.objects.select_for_update().get(pk=consent_log.pk)
                consent_log.consents[service_key] = allowed
                consent_log.consent_version = gdpr_settings.consent_version
                consent_log.consent_given_at = now
                consent_log.save()
                consents_snapshot = consent_log.consents

        self._record_consent_history(
            request=request,
            action=ConsentHistory.Action.GRANT if allowed else ConsentHistory.Action.REVOKE,
            service_id=service_id,
            service_name=service_name,
            consent_version=gdpr_settings.consent_version,
            consents_snapshot=consents_snapshot,
        )

    @staticmethod
    def _get_or_create_consent_log(ip: str) -> ConsentLog:
        try:
            consent_log, _ = ConsentLog.objects.get_or_create(ip_address=ip)
        except IntegrityError:
            consent_log = ConsentLog.objects.get(ip_address=ip)
        return consent_log

    def allow_all(self, request) -> dict:
        """Allow all cookie services with audit trail."""
        services = Service.objects.filter(is_active=True).select_related("category")
        consents = {str(s.id): True for s in services}
        gdpr_settings = GDPRSettings.load()
        now = timezone.now()

        if request.user.is_authenticated:
            user_consent, _ = UserConsent.objects.get_or_create(user=request.user)
            user_consent.consents = consents
            user_consent.consent_version = gdpr_settings.consent_version
            user_consent.consent_given_at = now
            user_consent.save()
        else:
            ip = mask_ip(get_client_ip(request))
            ConsentLog.objects.update_or_create(
                ip_address=ip,
                defaults={
                    "consents": consents,
                    "consent_version": gdpr_settings.consent_version,
                    "consent_given_at": now,
                },
            )

        self._record_consent_history(
            request=request,
            action=ConsentHistory.Action.ALLOW_ALL,
            consent_version=gdpr_settings.consent_version,
            consents_snapshot=consents,
        )

        scripts = {}
        for s in services:
            scripts[str(s.id)] = {
                "allowed": True,
                "name": s.name,
                "category": s.category.slug if s.category else "unclassified",
                "head_script": s.head_script,
                "body_script": s.body_script,
                "cookies": s.get_cookie_list(),
            }

        return {
            "status": "all_allowed",
            "allowed_services": [s.id for s in services],
            "services": scripts,
        }

    def decline_all(self, request) -> dict:
        """Decline all deactivatable cookie services with audit trail."""
        services = Service.objects.filter(is_active=True)
        consents = {str(s.id): not s.is_deactivatable for s in services}
        gdpr_settings = GDPRSettings.load()
        now = timezone.now()

        if request.user.is_authenticated:
            user_consent, _ = UserConsent.objects.get_or_create(user=request.user)
            user_consent.consents = consents
            user_consent.consent_version = gdpr_settings.consent_version
            user_consent.consent_given_at = now
            user_consent.save()
        else:
            ip = mask_ip(get_client_ip(request))
            ConsentLog.objects.update_or_create(
                ip_address=ip,
                defaults={
                    "consents": consents,
                    "consent_version": gdpr_settings.consent_version,
                    "consent_given_at": now,
                },
            )

        self._record_consent_history(
            request=request,
            action=ConsentHistory.Action.DECLINE_ALL,
            consent_version=gdpr_settings.consent_version,
            consents_snapshot=consents,
        )

        return {"status": "all_declined"}

    def accept_policy(self, request, policy_type: str):
        if not request.user.is_authenticated:
            return
        user_consent, _ = UserConsent.objects.get_or_create(user=request.user)
        now = timezone.now()
        if policy_type == "privacy_policy":
            user_consent.privacy_policy_accepted = True
            user_consent.privacy_policy_accepted_at = now
        elif policy_type == "terms_conditions":
            user_consent.terms_accepted = True
            user_consent.terms_accepted_at = now
        user_consent.save()

    def _record_consent_history(
        self,
        request,
        action: str,
        service_id: int = None,
        service_name: str = "",
        consent_version: str = "",
        consents_snapshot: dict = None,
    ):
        """Record an immutable consent history entry (Art. 7(1) proof)."""
        try:
            ip = mask_ip(get_client_ip(request))
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            ConsentHistory.objects.create(
                user=request.user if request.user.is_authenticated else None,
                ip_address=ip,
                service_id=service_id,
                service_name=service_name,
                action=action,
                consent_version=consent_version,
                user_agent=user_agent[:2000],
                consents_snapshot=consents_snapshot or {},
            )
        except Exception as e:
            logger.error("Failed to record consent history: %s", e)

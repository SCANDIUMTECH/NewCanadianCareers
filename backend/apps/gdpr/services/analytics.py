from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from ..models import (
    ConsentHistory,
    ConsentLog,
    DataBreach,
    DataRequest,
    Service,
    UserConsent,
)


class ConsentAnalyticsService:
    """Aggregated consent analytics for enterprise compliance dashboards."""

    def get_stats(self) -> dict:
        """Return comprehensive GDPR compliance statistics."""
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # ── Consent adoption ──────────────────────────────────
        total_authenticated = UserConsent.objects.count()
        authenticated_with_consent = UserConsent.objects.filter(
            consent_given_at__isnull=False
        ).count()
        total_anonymous = ConsentLog.objects.count()
        anonymous_with_consent = ConsentLog.objects.filter(
            consent_given_at__isnull=False
        ).count()

        total_records = total_authenticated + total_anonymous
        total_with_consent = authenticated_with_consent + anonymous_with_consent
        consent_rate = (
            round((total_with_consent / total_records) * 100, 1)
            if total_records > 0
            else 0
        )

        # ── Consent actions last 30 days ──────────────────────
        recent_history = ConsentHistory.objects.filter(timestamp__gte=thirty_days_ago)
        action_counts = recent_history.values("action").annotate(
            count=Count("id")
        )
        actions_30d = {item["action"]: item["count"] for item in action_counts}

        total_actions_30d = sum(actions_30d.values())
        accept_count = actions_30d.get("allow_all", 0) + actions_30d.get("grant", 0)
        decline_count = actions_30d.get("decline_all", 0) + actions_30d.get("revoke", 0)
        accept_rate_30d = (
            round((accept_count / total_actions_30d) * 100, 1)
            if total_actions_30d > 0
            else 0
        )

        # ── Per-service opt-in rates ──────────────────────────
        services = Service.objects.filter(is_active=True, is_deactivatable=True)
        service_stats = []
        for service in services:
            service_key = str(service.id)
            # Count how many users have this service enabled
            opted_in = 0
            opted_out = 0

            for uc in UserConsent.objects.filter(consent_given_at__isnull=False):
                if uc.consents.get(service_key) is True:
                    opted_in += 1
                elif uc.consents.get(service_key) is False:
                    opted_out += 1

            total_for_service = opted_in + opted_out
            service_stats.append({
                "id": service.id,
                "name": service.name,
                "category": service.category.name if service.category else "Uncategorized",
                "opted_in": opted_in,
                "opted_out": opted_out,
                "opt_in_rate": (
                    round((opted_in / total_for_service) * 100, 1)
                    if total_for_service > 0
                    else 0
                ),
            })

        # ── DSAR stats ────────────────────────────────────────
        pending_statuses = [
            DataRequest.Status.PENDING,
            DataRequest.Status.CONFIRMED,
            DataRequest.Status.PROCESSING,
        ]
        open_dsars = DataRequest.objects.filter(status__in=pending_statuses)
        overdue_dsars = sum(1 for r in open_dsars if r.is_overdue)
        dsars_30d = DataRequest.objects.filter(created_at__gte=thirty_days_ago).count()

        # ── Data breach stats ─────────────────────────────────
        active_breaches = DataBreach.objects.filter(is_resolved=False).count()
        overdue_dpa = DataBreach.objects.filter(
            is_resolved=False,
            dpa_notified_at__isnull=True,
            dpa_notification_deadline__lt=now,
        ).count()

        # ── History volume ────────────────────────────────────
        total_history = ConsentHistory.objects.count()
        history_30d = recent_history.count()

        return {
            "consent_rate": consent_rate,
            "total_consent_records": total_records,
            "total_with_consent": total_with_consent,
            "authenticated_users": total_authenticated,
            "anonymous_visitors": total_anonymous,
            "accept_rate_30d": accept_rate_30d,
            "actions_30d": {
                "allow_all": actions_30d.get("allow_all", 0),
                "decline_all": actions_30d.get("decline_all", 0),
                "grant": actions_30d.get("grant", 0),
                "revoke": actions_30d.get("revoke", 0),
                "total": total_actions_30d,
            },
            "service_opt_in_rates": service_stats,
            "dsars": {
                "open": open_dsars.count(),
                "overdue": overdue_dsars,
                "last_30d": dsars_30d,
            },
            "breaches": {
                "active": active_breaches,
                "overdue_dpa": overdue_dpa,
            },
            "history": {
                "total": total_history,
                "last_30d": history_30d,
            },
        }

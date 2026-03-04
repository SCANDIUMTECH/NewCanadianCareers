import logging

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mass_mail
from django.utils import timezone

from ..models import DataBreach, GDPRSettings

User = get_user_model()
logger = logging.getLogger("gdpr.breach")


class DataBreachService:
    """Handles data breach lifecycle with 72-hour DPA notification tracking (Art. 33/34)."""

    def create_breach(
        self,
        title: str,
        nature_of_breach: str,
        discovered_at=None,
        reported_by=None,
        **kwargs,
    ) -> DataBreach:
        """Create a new data breach record with automatic 72h deadline."""
        if discovered_at is None:
            discovered_at = timezone.now()

        breach = DataBreach.objects.create(
            title=title,
            nature_of_breach=nature_of_breach,
            discovered_at=discovered_at,
            reported_by=reported_by,
            **kwargs,
        )
        logger.warning(
            "Data breach created: %s (severity=%s, deadline=%s)",
            breach.title,
            breach.severity,
            breach.dpa_notification_deadline,
        )
        return breach

    def notify_all_users(self, breach_id=None) -> int:
        """Send data breach notification email to all active users.

        If breach_id is provided, updates the breach record with notification timestamp.
        """
        gdpr_settings = GDPRSettings.load()
        users = User.objects.filter(is_active=True).exclude(email="")

        messages = []
        for user in users:
            body = gdpr_settings.data_breach_body.replace(
                "%s", user.get_full_name() or user.email
            )
            messages.append((
                gdpr_settings.data_breach_subject,
                body,
                django_settings.DEFAULT_FROM_EMAIL,
                [user.email],
            ))

        if messages:
            try:
                send_mass_mail(messages, fail_silently=False)
            except Exception as e:
                logger.error("Failed to send breach notifications: %s", e)
                raise

        # Update breach record if provided
        if breach_id:
            try:
                breach = DataBreach.objects.get(id=breach_id)
                breach.users_notified_at = timezone.now()
                breach.users_notified_count = len(messages)
                breach.save()
            except DataBreach.DoesNotExist:
                logger.warning("Breach %s not found for notification update", breach_id)

        return len(messages)

    def send_policy_update(self) -> int:
        """Send privacy policy update notification to all active users."""
        gdpr_settings = GDPRSettings.load()
        users = User.objects.filter(is_active=True).exclude(email="")

        messages = []
        for user in users:
            body = gdpr_settings.policy_update_body.replace(
                "%s", user.get_full_name() or user.email
            )
            messages.append((
                gdpr_settings.policy_update_subject,
                body,
                django_settings.DEFAULT_FROM_EMAIL,
                [user.email],
            ))

        if messages:
            try:
                send_mass_mail(messages, fail_silently=False)
            except Exception as e:
                logger.error("Failed to send policy update notifications: %s", e)
                raise

        return len(messages)

    def mark_dpa_notified(self, breach_id) -> DataBreach:
        """Mark a breach as having been reported to the DPA."""
        breach = DataBreach.objects.get(id=breach_id)
        breach.dpa_notified_at = timezone.now()
        breach.save()
        return breach

    def resolve_breach(self, breach_id) -> DataBreach:
        """Mark a breach as resolved."""
        breach = DataBreach.objects.get(id=breach_id)
        breach.is_resolved = True
        breach.resolved_at = timezone.now()
        breach.save()
        return breach

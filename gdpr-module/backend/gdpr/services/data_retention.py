from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import GDPRSettings, UserConsent

User = get_user_model()


class DataRetentionService:
    """Automated data retention enforcement.

    Checks user last login against configured retention period
    and deactivates/deletes users who exceed it.
    """

    def enforce_retention(self) -> list[str]:
        """Check all users against retention policy. Returns list of affected emails."""
        gdpr_settings = GDPRSettings.load()
        if not gdpr_settings.data_retention_enabled:
            return []

        retention_days = gdpr_settings.data_retention_days
        cutoff = timezone.now() - timedelta(days=retention_days)
        affected = []

        # Find users whose last login is older than the retention period
        consents = UserConsent.objects.filter(
            last_login_recorded__lt=cutoff
        ).select_related("user")

        for consent in consents:
            user = consent.user
            if not user.is_active:
                continue

            affected.append(user.email)

            # Soft delete: deactivate account and anonymize
            user.is_active = False
            user.email = f"retained-{user.id}@deleted.local"
            user.first_name = ""
            user.last_name = ""
            user.save()

            # Delete consent records
            consent.delete()

        return affected

    def record_login(self, user):
        """Update last login timestamp for retention tracking."""
        consent, _ = UserConsent.objects.get_or_create(user=user)
        consent.last_login_recorded = timezone.now()
        consent.save(update_fields=["last_login_recorded"])

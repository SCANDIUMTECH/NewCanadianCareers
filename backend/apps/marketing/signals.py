"""
Marketing signals for Orion.
Syncs NotificationPreference.email_marketing with MarketingConsent.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender='notifications.NotificationPreference')
def sync_marketing_consent(sender, instance, created, **kwargs):
    """
    When a user toggles email_marketing in NotificationPreference,
    sync the change to their MarketingConsent record.
    """
    from apps.marketing.models import MarketingConsent

    consent, was_created = MarketingConsent.objects.get_or_create(
        user=instance.user,
        defaults={
            'status': 'opted_in' if instance.email_marketing else 'opted_out',
            'source': 'preference_center',
        }
    )

    if not was_created:
        if instance.email_marketing and consent.status in ('opted_out',):
            consent.status = 'opted_in'
            consent.source = 'preference_center'
            consent.consented_at = timezone.now()
            consent.save(update_fields=['status', 'source', 'consented_at', 'updated_at'])
        elif not instance.email_marketing and consent.status == 'opted_in':
            consent.status = 'opted_out'
            consent.withdrawn_at = timezone.now()
            consent.save(update_fields=['status', 'withdrawn_at', 'updated_at'])

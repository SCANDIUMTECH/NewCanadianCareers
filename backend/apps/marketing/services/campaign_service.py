"""
Campaign business logic for the marketing module.
"""
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.audit.models import create_audit_log
from ..models import Campaign, CampaignRecipient, CampaignVariant
from .audience_service import AudienceService


class CampaignService:
    """Handles campaign lifecycle operations."""

    @staticmethod
    def generate_unique_slug(name):
        """Generate a unique slug for a campaign."""
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while Campaign.all_objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
        return slug

    @staticmethod
    @transaction.atomic
    def create_campaign(data, created_by):
        """Create a new campaign."""
        campaign = Campaign.objects.create(
            name=data['name'],
            slug=CampaignService.generate_unique_slug(data['name']),
            segment_id=data.get('segment'),
            template_id=data.get('template'),
            subject_line=data.get('subject_line', ''),
            preheader=data.get('preheader', ''),
            from_name=data.get('from_name', ''),
            from_email=data.get('from_email', ''),
            reply_to=data.get('reply_to', ''),
            personalization_schema=data.get('personalization_schema', {}),
            scheduled_at=data.get('scheduled_at'),
            is_ab_test=data.get('is_ab_test', False),
            requires_approval=data.get('requires_approval', False),
            created_by=created_by,
            status='draft',
        )
        return campaign

    @staticmethod
    @transaction.atomic
    def schedule_campaign(campaign, scheduled_at, actor=None, request=None):
        """Schedule a campaign for future sending."""
        if campaign.status not in ('draft', 'approved'):
            raise ValueError(f'Cannot schedule campaign in status: {campaign.status}')

        campaign.scheduled_at = scheduled_at
        campaign.status = 'scheduled'
        campaign.save(update_fields=['scheduled_at', 'status', 'updated_at'])

        if actor:
            create_audit_log(
                actor=actor,
                action='campaign_schedule',
                target=campaign,
                changes={'scheduled_at': str(scheduled_at)},
                request=request,
            )
        return campaign

    @staticmethod
    @transaction.atomic
    def approve_campaign(campaign, actor, request=None):
        """Approve a campaign that requires approval."""
        if campaign.status != 'pending_approval':
            raise ValueError(f'Cannot approve campaign in status: {campaign.status}')

        campaign.status = 'approved'
        campaign.approved_by = actor
        campaign.approved_at = timezone.now()
        campaign.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])

        create_audit_log(
            actor=actor,
            action='campaign_approve',
            target=campaign,
            request=request,
        )
        return campaign

    @staticmethod
    @transaction.atomic
    def start_send(campaign, actor=None, request=None):
        """Resolve recipients and begin the campaign send."""
        if campaign.status not in ('draft', 'approved', 'scheduled'):
            raise ValueError(f'Cannot send campaign in status: {campaign.status}')

        if not campaign.segment:
            raise ValueError('Campaign has no segment assigned.')
        if not campaign.template and not campaign.subject_line:
            raise ValueError('Campaign has no template or subject line.')

        # Resolve eligible recipients
        eligible = AudienceService.get_eligible_recipients(campaign.segment)
        if eligible.count() == 0:
            raise ValueError('No eligible recipients in the selected segment.')

        campaign.status = 'sending'
        campaign.started_at = timezone.now()
        campaign.total_recipients = eligible.count()
        campaign.save(update_fields=['status', 'started_at', 'total_recipients', 'updated_at'])

        # Create recipient records
        recipients = []
        for user in eligible.iterator():
            recipients.append(
                CampaignRecipient(
                    campaign=campaign,
                    user=user,
                    status='pending',
                )
            )
        CampaignRecipient.objects.bulk_create(recipients, ignore_conflicts=True)

        if actor:
            create_audit_log(
                actor=actor,
                action='campaign_send',
                target=campaign,
                changes={'total_recipients': campaign.total_recipients},
                request=request,
            )
        return campaign

    @staticmethod
    @transaction.atomic
    def pause_campaign(campaign, actor=None, request=None):
        """Pause an in-progress campaign."""
        if campaign.status != 'sending':
            raise ValueError(f'Cannot pause campaign in status: {campaign.status}')

        campaign.status = 'paused'
        campaign.save(update_fields=['status', 'updated_at'])

        if actor:
            create_audit_log(
                actor=actor,
                action='campaign_pause',
                target=campaign,
                request=request,
            )
        return campaign

    @staticmethod
    @transaction.atomic
    def cancel_campaign(campaign, actor=None, request=None):
        """Cancel a campaign."""
        if campaign.status in ('sent', 'canceled'):
            raise ValueError(f'Cannot cancel campaign in status: {campaign.status}')

        campaign.status = 'canceled'
        campaign.save(update_fields=['status', 'updated_at'])

        # Skip pending recipients
        CampaignRecipient.objects.filter(
            campaign=campaign, status='pending'
        ).update(status='skipped')

        if actor:
            create_audit_log(
                actor=actor,
                action='campaign_cancel',
                target=campaign,
                request=request,
            )
        return campaign

    @staticmethod
    @transaction.atomic
    def duplicate_campaign(campaign, actor=None):
        """Create a copy of a campaign in draft status."""
        new_campaign = Campaign.objects.create(
            name=f'{campaign.name} (Copy)',
            slug=CampaignService.generate_unique_slug(f'{campaign.name} copy'),
            segment=campaign.segment,
            template=campaign.template,
            subject_line=campaign.subject_line,
            preheader=campaign.preheader,
            from_name=campaign.from_name,
            from_email=campaign.from_email,
            reply_to=campaign.reply_to,
            personalization_schema=campaign.personalization_schema,
            is_ab_test=campaign.is_ab_test,
            requires_approval=campaign.requires_approval,
            created_by=actor,
            status='draft',
        )

        # Duplicate variants if A/B test
        for variant in campaign.variants.all():
            CampaignVariant.objects.create(
                campaign=new_campaign,
                name=variant.name,
                subject_line=variant.subject_line,
                preheader=variant.preheader,
                template=variant.template,
                weight=variant.weight,
            )

        return new_campaign

    @staticmethod
    @transaction.atomic
    def select_ab_winner(campaign, variant_id, actor=None, request=None):
        """Select a winning A/B variant."""
        if not campaign.is_ab_test:
            raise ValueError('Campaign is not an A/B test.')

        variant = campaign.variants.get(id=variant_id)
        campaign.variants.update(is_winner=False)
        variant.is_winner = True
        variant.save(update_fields=['is_winner'])

        if actor:
            create_audit_log(
                actor=actor,
                action='campaign_ab_winner',
                target=campaign,
                changes={'winner_variant': variant.name},
                request=request,
            )
        return variant

    @staticmethod
    def update_campaign_metrics(campaign):
        """Aggregate recipient statuses into denormalized campaign fields."""
        from django.db.models import Count, Q

        stats = CampaignRecipient.objects.filter(campaign=campaign).aggregate(
            sent=Count('id', filter=Q(status__in=['sent', 'delivered', 'opened', 'clicked'])),
            delivered=Count('id', filter=Q(status__in=['delivered', 'opened', 'clicked'])),
            opened=Count('id', filter=Q(status__in=['opened', 'clicked'])),
            clicked=Count('id', filter=Q(status='clicked')),
            bounced=Count('id', filter=Q(status='bounced')),
            complained=Count('id', filter=Q(status='complained')),
            unsubscribed=Count('id', filter=Q(status='unsubscribed')),
            failed=Count('id', filter=Q(status='failed')),
        )

        campaign.sent_count = stats['sent']
        campaign.delivered_count = stats['delivered']
        campaign.opened_count = stats['opened']
        campaign.clicked_count = stats['clicked']
        campaign.bounced_count = stats['bounced']
        campaign.complained_count = stats['complained']
        campaign.unsubscribed_count = stats['unsubscribed']
        campaign.failed_count = stats['failed']
        campaign.save(update_fields=[
            'sent_count', 'delivered_count', 'opened_count', 'clicked_count',
            'bounced_count', 'complained_count', 'unsubscribed_count', 'failed_count',
            'updated_at',
        ])

        # Check if all recipients are processed
        pending = CampaignRecipient.objects.filter(
            campaign=campaign, status='pending'
        ).count()
        if pending == 0 and campaign.status == 'sending':
            campaign.status = 'sent'
            campaign.completed_at = timezone.now()
            campaign.save(update_fields=['status', 'completed_at', 'updated_at'])

        return campaign

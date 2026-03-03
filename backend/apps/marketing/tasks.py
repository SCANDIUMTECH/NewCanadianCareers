"""
Celery tasks for the marketing module.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def refresh_segment_counts():
    """
    Periodic task: recomputes estimated_size for all dynamic segments.
    Runs every 30 minutes via Celery Beat.
    """
    from .models import Segment
    from .services.audience_service import AudienceService

    segments = Segment.objects.filter(segment_type='dynamic')
    updated = 0

    for segment in segments:
        try:
            AudienceService.compute_segment_size(segment)
            updated += 1
        except Exception:
            continue

    return f'Refreshed {updated} segment counts'


# ─── Campaign Tasks ───────────────────────────────────────────────────


@shared_task
def process_campaign_send(campaign_id):
    """
    Process sending for a campaign.
    Iterates pending recipients and dispatches individual send tasks.
    """
    from .models import Campaign, CampaignRecipient

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.error(f'Campaign {campaign_id} not found')
        return

    if campaign.status not in ('sending',):
        logger.info(f'Campaign {campaign_id} is {campaign.status}, skipping send')
        return

    pending = CampaignRecipient.objects.filter(
        campaign=campaign, status='pending'
    ).select_related('user').values_list('id', flat=True)

    batched = 0
    for recipient_id in pending.iterator():
        send_campaign_email.delay(recipient_id)
        batched += 1

    logger.info(f'Campaign {campaign_id}: dispatched {batched} email tasks')
    return f'Dispatched {batched} emails for campaign {campaign_id}'


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_campaign_email(self, recipient_id):
    """Send a single campaign email to a recipient."""
    from django.conf import settings
    from .models import CampaignRecipient
    from apps.notifications.tasks import send_email
    from apps.notifications.models import EmailSettings

    try:
        recipient = CampaignRecipient.objects.select_related(
            'campaign', 'campaign__template', 'user'
        ).get(id=recipient_id)
    except CampaignRecipient.DoesNotExist:
        logger.error(f'CampaignRecipient {recipient_id} not found')
        return

    campaign = recipient.campaign
    user = recipient.user

    # Check kill switch
    try:
        email_settings = EmailSettings.get_settings()
        if email_settings.kill_switch_enabled:
            recipient.status = 'skipped'
            recipient.save(update_fields=['status', 'updated_at'])
            return
    except Exception:
        pass  # Continue if settings unavailable

    # Check campaign is still sending
    if campaign.status not in ('sending',):
        recipient.status = 'skipped'
        recipient.save(update_fields=['status', 'updated_at'])
        return

    # Build email content
    subject = campaign.subject_line
    if campaign.template:
        subject = subject or campaign.template.subject
        template_name = campaign.template.slug
    else:
        template_name = 'default'

    from_name = campaign.from_name or 'Orion'
    from_email = campaign.from_email or settings.DEFAULT_FROM_EMAIL

    context = {
        'name': user.first_name or user.email,
        'email': user.email,
        'content': f'Campaign: {campaign.name}',
        **(campaign.personalization_schema or {}),
    }

    try:
        # Queue the send via Celery (send_email handles its own retries).
        send_email.delay(
            to_email=user.email,
            subject=subject,
            template=template_name,
            context=context,
            user_id=user.id,
            campaign_id=campaign.id,
        )

        recipient.status = 'sent'
        recipient.sent_at = timezone.now()

    except Exception as exc:
        logger.error(f'Campaign email error for recipient {recipient_id}: {exc}')
        recipient.status = 'failed'
        # Retry on transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)

    recipient.save(update_fields=['status', 'sent_at', 'updated_at'])


@shared_task
def check_scheduled_campaigns():
    """
    Periodic task (every 1 minute): trigger campaigns whose scheduled_at has passed.
    """
    from django.utils import timezone
    from .models import Campaign

    now = timezone.now()
    due = Campaign.objects.filter(
        status='scheduled',
        scheduled_at__lte=now,
    )

    triggered = 0
    for campaign in due:
        try:
            from .services.campaign_service import CampaignService
            CampaignService.start_send(campaign)
            process_campaign_send.delay(campaign.id)
            triggered += 1
        except Exception as exc:
            logger.error(f'Failed to trigger campaign {campaign.id}: {exc}')
            campaign.status = 'failed'
            campaign.save(update_fields=['status', 'updated_at'])

    return f'Triggered {triggered} scheduled campaigns'


@shared_task
def update_campaign_metrics_task(campaign_id):
    """Update denormalized metrics for a campaign."""
    from .models import Campaign
    from .services.campaign_service import CampaignService

    try:
        campaign = Campaign.objects.get(id=campaign_id)
        CampaignService.update_campaign_metrics(campaign)
    except Campaign.DoesNotExist:
        logger.error(f'Campaign {campaign_id} not found for metrics update')


# ─── Journey Tasks ────────────────────────────────────────────────


@shared_task
def process_journey_triggers():
    """
    Periodic task (every 1 minute): check for trigger events and enroll eligible users.
    Handles segment_entry triggers (other triggers are event-driven via signals).
    """
    from .models import Journey, Segment
    from .services.journey_service import JourneyService
    from .services.audience_service import AudienceService

    active_journeys = Journey.objects.filter(
        status='active',
        trigger_type='segment_entry',
    )

    enrolled = 0
    for journey in active_journeys:
        segment_id = (journey.trigger_config or {}).get('segment_id')
        if not segment_id:
            continue

        try:
            segment = Segment.objects.get(id=segment_id)
        except Segment.DoesNotExist:
            continue

        # Get eligible users from segment
        eligible_users = AudienceService.get_eligible_recipients(segment)

        for user in eligible_users[:100]:  # Cap per run to avoid overload
            enrollment = JourneyService.enroll_user(journey, user)
            if enrollment:
                enrolled += 1

    return f'Enrolled {enrolled} users from segment triggers'


@shared_task
def advance_journey_enrollments():
    """
    Periodic task (every 1 minute): find enrollments whose next_action_at has passed
    and execute their current step.
    """
    from django.utils import timezone
    from .models import JourneyEnrollment

    now = timezone.now()
    due_enrollments = JourneyEnrollment.objects.filter(
        status='active',
        next_action_at__lte=now,
        current_step__isnull=False,
    ).select_related('journey', 'current_step', 'user')[:200]  # Cap per run

    processed = 0
    for enrollment in due_enrollments:
        if enrollment.journey.status != 'active':
            continue
        execute_journey_step.delay(enrollment.id)
        processed += 1

    return f'Dispatched {processed} journey step executions'


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def execute_journey_step(self, enrollment_id):
    """Execute the current step for a specific enrollment."""
    from .models import JourneyEnrollment
    from .services.journey_service import JourneyService

    try:
        enrollment = JourneyEnrollment.objects.select_related(
            'journey', 'current_step', 'user'
        ).get(id=enrollment_id)
    except JourneyEnrollment.DoesNotExist:
        logger.error(f'JourneyEnrollment {enrollment_id} not found')
        return

    if enrollment.status != 'active':
        return

    try:
        JourneyService.execute_step(enrollment)
    except Exception as exc:
        logger.error(f'Journey step execution error for enrollment {enrollment_id}: {exc}')
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)


@shared_task
def check_journey_goals():
    """
    Periodic task (every 5 minutes): check active enrollments for goal completion.
    """
    from .models import JourneyEnrollment
    from .services.journey_service import JourneyService

    enrollments = JourneyEnrollment.objects.filter(
        status='active',
        journey__goal_type__gt='',  # Only journeys with a goal
        journey__status='active',
    ).select_related('journey', 'user')[:200]

    exited = 0
    for enrollment in enrollments:
        try:
            if JourneyService.check_goal(enrollment):
                JourneyService.exit_enrollment(enrollment, status='exited_goal')
                exited += 1
        except Exception as exc:
            logger.error(f'Goal check error for enrollment {enrollment.id}: {exc}')

    return f'Exited {exited} enrollments via goal completion'


@shared_task
def update_journey_stats(journey_id):
    """Update denormalized enrollment counts for a journey."""
    from .models import Journey, JourneyEnrollment

    try:
        journey = Journey.objects.get(id=journey_id)
    except Journey.DoesNotExist:
        return

    journey.active_enrollments_count = JourneyEnrollment.objects.filter(
        journey=journey, status='active'
    ).count()
    journey.completed_enrollments_count = JourneyEnrollment.objects.filter(
        journey=journey, status__in=['completed', 'exited_goal']
    ).count()
    journey.total_enrollments_count = JourneyEnrollment.objects.filter(
        journey=journey
    ).count()
    journey.save(update_fields=[
        'active_enrollments_count', 'completed_enrollments_count',
        'total_enrollments_count', 'updated_at',
    ])


# ─── Reporting Tasks ──────────────────────────────────────────────


@shared_task
def generate_report_export(report_type, filters=None, admin_user_id=None):
    """
    Generate a CSV export of a marketing report and store it.
    Currently logs the export — MinIO upload to be wired later.
    """
    import csv
    import io
    from .services.reporting_service import ReportingService

    filters = filters or {}

    generators = {
        'campaigns': lambda: ReportingService.campaign_kpis(days=filters.get('days', 30)),
        'coupons': lambda: ReportingService.coupon_kpis(),
        'journeys': lambda: ReportingService.journey_kpis(),
        'audience-health': lambda: [ReportingService.audience_health(days=filters.get('days', 30))],
        'revenue-attribution': lambda: ReportingService.revenue_attribution().get('by_coupon', []),
    }

    generator = generators.get(report_type)
    if not generator:
        logger.error(f'Unknown report type: {report_type}')
        return f'Unknown report type: {report_type}'

    try:
        data = generator()
        if not data:
            return f'No data for report type: {report_type}'

        # Build CSV
        output = io.StringIO()
        if isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            if isinstance(first_item, dict):
                writer = csv.DictWriter(output, fieldnames=first_item.keys())
                writer.writeheader()
                writer.writerows(data)

        csv_content = output.getvalue()
        logger.info(f'Generated {report_type} export: {len(csv_content)} chars for admin {admin_user_id}')

        # TODO: Upload to MinIO and notify admin
        return f'Export generated for {report_type}: {len(data)} rows'

    except Exception as exc:
        logger.error(f'Report export failed for {report_type}: {exc}')
        return f'Export failed: {exc}'


@shared_task
def calculate_daily_marketing_metrics():
    """
    Periodic daily task: pre-compute and cache marketing metrics.
    Updates campaign denormalized fields and journey enrollment counts.
    """
    from .models import Campaign, Journey, JourneyEnrollment

    # Refresh all sent campaign metrics
    sent_campaigns = Campaign.objects.filter(status='sent')
    campaign_count = 0
    for campaign in sent_campaigns:
        try:
            from .services.campaign_service import CampaignService
            CampaignService.update_campaign_metrics(campaign)
            campaign_count += 1
        except Exception:
            continue

    # Refresh all journey enrollment counts
    active_journeys = Journey.objects.filter(status__in=['active', 'paused'])
    journey_count = 0
    for journey in active_journeys:
        try:
            journey.active_enrollments_count = JourneyEnrollment.objects.filter(
                journey=journey, status='active'
            ).count()
            journey.completed_enrollments_count = JourneyEnrollment.objects.filter(
                journey=journey, status__in=['completed', 'exited_goal']
            ).count()
            journey.total_enrollments_count = JourneyEnrollment.objects.filter(
                journey=journey
            ).count()
            journey.save(update_fields=[
                'active_enrollments_count', 'completed_enrollments_count',
                'total_enrollments_count', 'updated_at',
            ])
            journey_count += 1
        except Exception:
            continue

    return f'Daily metrics: {campaign_count} campaigns, {journey_count} journeys refreshed'

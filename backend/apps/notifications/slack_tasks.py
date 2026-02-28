"""
Periodic Celery tasks for proactive Slack notifications.

These tasks run on schedules via Celery Beat and alert admins about
conditions that require attention — before they become problems.

Tasks:
  - check_low_credits         : Entitlements running low (≤2 credits)
  - check_expiring_jobs       : Jobs expiring in the next 48 hours
  - check_expiring_entitlements: Entitlements expiring in the next 7 days
  - daily_platform_digest     : Daily summary of platform activity
  - check_stale_pending_jobs  : Jobs stuck in pending review for >24 hours
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('apps.notifications.slack')


@shared_task
def check_low_credits():
    """
    Alert companies whose posting credits are running low (≤2 remaining).
    Also sends a Slack notification so admins can reach out proactively.

    Run: Every 6 hours via Celery Beat.
    """
    from apps.billing.models import Entitlement
    from .slack import slack_notify, SlackChannel
    from django.conf import settings

    if not getattr(settings, 'SLACK_ENABLED', False):
        return 'Slack disabled'

    now = timezone.now()
    low_threshold = 2

    # Find active entitlements with low remaining credits
    from django.db.models import F
    entitlements = Entitlement.objects.annotate(
        remaining=F('credits_total') - F('credits_used'),
    ).filter(
        remaining__lte=low_threshold,
        remaining__gt=0,
    ).select_related('company', 'agency')

    # Exclude already-expired
    entitlements = entitlements.exclude(expires_at__lt=now)

    if not entitlements.exists():
        return 'No low-credit entitlements'

    entries = []
    for ent in entitlements[:20]:
        owner = ent.company.name if ent.company else (ent.agency.name if ent.agency else 'Unknown')
        remaining = ent.credits_total - ent.credits_used
        entries.append(f'• *{owner}*: {remaining} credit(s) remaining')

    count = entitlements.count()
    message = '\n'.join(entries)
    if count > 20:
        message += f'\n_...and {count - 20} more_'

    slack_notify(
        channel=SlackChannel.BILLING,
        title=f'Low Credits Alert — {count} Account(s)',
        message=message,
        severity='medium',
        fields={'Total Accounts': str(count)},
    )

    return f'Alerted on {count} low-credit entitlements'


@shared_task
def check_expiring_jobs():
    """
    Alert about jobs expiring in the next 48 hours.
    Useful for admins to prompt renewals and for marketing outreach.

    Run: Daily at 8 AM via Celery Beat.
    """
    from apps.jobs.models import Job
    from .slack import slack_notify, SlackChannel
    from django.conf import settings

    if not getattr(settings, 'SLACK_ENABLED', False):
        return 'Slack disabled'

    now = timezone.now()
    window_end = now + timedelta(hours=48)

    expiring = Job.objects.filter(
        status='published',
        expires_at__gt=now,
        expires_at__lte=window_end,
    ).select_related('company').order_by('expires_at')

    count = expiring.count()
    if count == 0:
        return 'No expiring jobs'

    entries = []
    for job in expiring[:15]:
        company_name = job.company.name if job.company else 'Unknown'
        hours_left = int((job.expires_at - now).total_seconds() / 3600)
        entries.append(f'• *{job.title}* ({company_name}) — {hours_left}h left')

    message = '\n'.join(entries)
    if count > 15:
        message += f'\n_...and {count - 15} more_'

    slack_notify(
        channel=SlackChannel.JOBS,
        title=f'Jobs Expiring Soon — {count} Job(s)',
        message=message,
        severity='medium' if count >= 10 else 'low',
        fields={'Expiring in 48h': str(count)},
    )

    return f'Alerted on {count} expiring jobs'


@shared_task
def check_expiring_entitlements():
    """
    Alert about entitlements (credit packages) expiring in the next 7 days.
    Great for sales/marketing to prompt renewals.

    Run: Daily at 9 AM via Celery Beat.
    """
    from apps.billing.models import Entitlement
    from django.db.models import F
    from .slack import slack_notify, SlackChannel
    from django.conf import settings

    if not getattr(settings, 'SLACK_ENABLED', False):
        return 'Slack disabled'

    now = timezone.now()
    window_end = now + timedelta(days=7)

    expiring = Entitlement.objects.filter(
        expires_at__gt=now,
        expires_at__lte=window_end,
    ).annotate(
        remaining=F('credits_total') - F('credits_used'),
    ).filter(
        remaining__gt=0,  # Only those with unused credits
    ).select_related('company', 'agency', 'package')

    count = expiring.count()
    if count == 0:
        return 'No expiring entitlements'

    entries = []
    for ent in expiring[:15]:
        owner = ent.company.name if ent.company else (ent.agency.name if ent.agency else 'Unknown')
        remaining = ent.credits_total - ent.credits_used
        days_left = max(0, (ent.expires_at - now).days)
        entries.append(f'• *{owner}*: {remaining} credit(s), expires in {days_left} day(s)')

    message = '\n'.join(entries)
    if count > 15:
        message += f'\n_...and {count - 15} more_'

    slack_notify(
        channel=SlackChannel.BILLING,
        title=f'Expiring Credits — {count} Account(s)',
        message=f'{count} account(s) have credits expiring within 7 days. Reach out for renewal.',
        severity='medium',
        fields={
            'Expiring Accounts': str(count),
        },
    )

    return f'Alerted on {count} expiring entitlements'


@shared_task
def check_stale_pending_jobs():
    """
    Alert about jobs stuck in 'pending' review for >24 hours.
    Ensures admin moderation queue doesn't get neglected.

    Run: Every 4 hours via Celery Beat.
    """
    from apps.jobs.models import Job
    from .slack import slack_notify, SlackChannel
    from django.conf import settings

    if not getattr(settings, 'SLACK_ENABLED', False):
        return 'Slack disabled'

    stale_cutoff = timezone.now() - timedelta(hours=24)

    stale_jobs = Job.objects.filter(
        status='pending',
        created_at__lt=stale_cutoff,
    ).select_related('company').order_by('created_at')

    count = stale_jobs.count()
    if count == 0:
        return 'No stale pending jobs'

    entries = []
    for job in stale_jobs[:10]:
        company_name = job.company.name if job.company else 'Unknown'
        hours_waiting = int((timezone.now() - job.created_at).total_seconds() / 3600)
        entries.append(f'• *{job.title}* ({company_name}) — waiting {hours_waiting}h')

    message = '\n'.join(entries)
    if count > 10:
        message += f'\n_...and {count - 10} more_'

    try:
        frontend_url = __import__('django').conf.settings.FRONTEND_URL
        action_url = f'{frontend_url}/admin/jobs?status=pending'
    except Exception:
        action_url = None

    slack_notify(
        channel=SlackChannel.MODERATION,
        title=f'Stale Review Queue — {count} Job(s) Waiting',
        message=message,
        severity='high' if count >= 5 else 'medium',
        fields={'Pending >24h': str(count)},
        action_url=action_url,
        mention='@here' if count >= 10 else None,
    )

    return f'Alerted on {count} stale pending jobs'


@shared_task
def daily_platform_digest():
    """
    Daily summary of platform activity sent to #system.
    Gives admins a pulse check without needing to log into the dashboard.

    Run: Daily at 9 AM via Celery Beat.
    """
    from apps.users.models import User
    from apps.jobs.models import Job
    from apps.applications.models import Application
    from apps.billing.models import Invoice
    from apps.moderation.models import FraudAlert
    from apps.audit.models import LoginAttempt
    from .slack import slack_notify, SlackChannel
    from django.conf import settings
    from django.db.models import Sum

    if not getattr(settings, 'SLACK_ENABLED', False):
        return 'Slack disabled'

    yesterday = timezone.now() - timedelta(days=1)

    # Gather metrics
    new_users = User.objects.filter(date_joined__gte=yesterday).count()
    new_employers = User.objects.filter(date_joined__gte=yesterday, role='employer').count()
    new_candidates = User.objects.filter(date_joined__gte=yesterday, role='candidate').count()

    new_jobs = Job.objects.filter(created_at__gte=yesterday).count()
    published_jobs = Job.objects.filter(posted_at__gte=yesterday, status='published').count()
    expired_jobs = Job.objects.filter(closed_at__gte=yesterday, status='expired').count()

    new_applications = Application.objects.filter(created_at__gte=yesterday).count()
    hires = Application.objects.filter(
        status='hired',
        status_changed_at__gte=yesterday,
    ).count()

    revenue_result = Invoice.objects.filter(
        status='paid',
        paid_at__gte=yesterday,
    ).aggregate(total=Sum('amount'))
    revenue = revenue_result['total'] or 0

    failed_payments = Invoice.objects.filter(
        status='failed',
        updated_at__gte=yesterday,
    ).count()

    fraud_alerts = FraudAlert.objects.filter(created_at__gte=yesterday).count()
    critical_fraud = FraudAlert.objects.filter(
        created_at__gte=yesterday,
        severity='critical',
    ).count()

    lockouts = LoginAttempt.objects.filter(
        created_at__gte=yesterday,
        status='locked',
    ).count()

    active_jobs = Job.objects.filter(status='published').count()

    # Build message
    lines = [
        f'*Users:* {new_users} signups ({new_employers} employers, {new_candidates} candidates)',
        f'*Jobs:* {new_jobs} created, {published_jobs} published, {expired_jobs} expired ({active_jobs} active total)',
        f'*Applications:* {new_applications} submitted, {hires} hired',
        f'*Revenue:* ${revenue:,.2f} collected' + (f', {failed_payments} failed' if failed_payments else ''),
    ]

    if fraud_alerts:
        lines.append(f'*Security:* {fraud_alerts} fraud alert(s)' + (f' ({critical_fraud} critical!)' if critical_fraud else '') + f', {lockouts} lockout(s)')
    elif lockouts:
        lines.append(f'*Security:* {lockouts} account lockout(s)')

    message = '\n'.join(lines)

    severity = 'info'
    if critical_fraud > 0:
        severity = 'high'
    elif failed_payments >= 3:
        severity = 'medium'

    slack_notify(
        channel=SlackChannel.SYSTEM,
        title='Daily Platform Digest',
        message=message,
        severity=severity,
        fields={
            'Period': 'Last 24 hours',
            'Active Jobs': str(active_jobs),
        },
    )

    return f'Digest sent: {new_users} users, {new_jobs} jobs, ${revenue:,.2f} revenue'

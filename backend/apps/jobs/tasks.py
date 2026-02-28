"""
Celery tasks for jobs.
"""
from celery import shared_task
from django.utils import timezone


@shared_task
def expire_jobs():
    """Mark expired jobs as expired.

    Respects the auto_expire_enabled policy setting — if disabled, no jobs
    are transitioned and the task returns early.
    """
    from .models import Job
    from .services import get_job_policy

    policy = get_job_policy()
    if not policy.get('auto_expire_enabled', True):
        return 'Auto-expire disabled by policy'

    expired_count = Job.objects.filter(
        status='published',
        expires_at__lt=timezone.now()
    ).update(
        status='expired',
        closed_at=timezone.now()
    )

    return f'Expired {expired_count} jobs'


@shared_task
def publish_scheduled_job(job_id):
    """Auto-publish a scheduled job when its time arrives."""
    from django.db import transaction
    from .models import Job

    with transaction.atomic():
        try:
            job = Job.objects.select_for_update().get(id=job_id, status='scheduled')
        except Job.DoesNotExist:
            return f'Job {job_id} not found or no longer scheduled'

        job.status = 'published'
        job.posted_at = job.scheduled_publish_at or timezone.now()
        job.scheduled_publish_at = None
        # expires_at was already set during schedule()
        job.save(update_fields=['status', 'posted_at', 'scheduled_publish_at'])

    return f'Published scheduled job {job_id}'


@shared_task
def publish_due_scheduled_jobs():
    """Safety net: publish any scheduled jobs that are past due.

    Catches jobs whose Celery eta task may have been missed
    (e.g., worker restart, Redis flush).
    """
    from django.db import transaction
    from .models import Job

    count = 0
    due_ids = list(
        Job.objects.filter(
            status='scheduled',
            scheduled_publish_at__lte=timezone.now()
        ).values_list('id', flat=True)
    )

    for job_id in due_ids:
        with transaction.atomic():
            try:
                job = Job.objects.select_for_update(skip_locked=True).get(
                    id=job_id, status='scheduled'
                )
            except Job.DoesNotExist:
                continue
            job.status = 'published'
            job.posted_at = job.scheduled_publish_at or timezone.now()
            job.scheduled_publish_at = None
            job.save(update_fields=['status', 'posted_at', 'scheduled_publish_at'])
            count += 1

    return f'Published {count} overdue scheduled jobs'


@shared_task
def purge_trashed_jobs():
    """Permanently delete jobs that have been in trash beyond the retention period.

    Reads trash_retention_days from job policy (default: 30 days).
    Run daily.
    """
    from .models import Job
    from .services import get_job_policy

    policy = get_job_policy()
    retention_days = policy.get('trash_retention_days', 30)
    if retention_days <= 0:
        return 'Trash purge disabled (retention_days <= 0)'

    cutoff = timezone.now() - timezone.timedelta(days=retention_days)
    trashed = Job.all_objects.filter(
        deleted_at__isnull=False,
        deleted_at__lt=cutoff,
    )
    count = trashed.count()
    # Hard delete (bypass SoftDeleteMixin)
    trashed.delete()

    return f'Purged {count} trashed jobs older than {retention_days} days'


@shared_task
def archive_expired_jobs():
    """Permanently delete expired jobs beyond the retention period.

    Reads expired_retention_days from job policy (default: 0 = keep forever).
    When set, expired jobs older than N days are permanently deleted.
    Run daily.
    """
    from .models import Job
    from .services import get_job_policy

    policy = get_job_policy()
    retention_days = policy.get('expired_retention_days', 0)
    if retention_days <= 0:
        return 'Expired retention disabled (retention_days <= 0)'

    cutoff = timezone.now() - timezone.timedelta(days=retention_days)
    expired_qs = Job.objects.filter(
        status='expired',
        closed_at__lt=cutoff,
    )
    count = expired_qs.count()
    # Permanently delete — expired jobs are not recoverable after retention
    for job in expired_qs:
        job.hard_delete()

    return f'Permanently deleted {count} expired jobs older than {retention_days} days'


@shared_task
def send_job_alerts(frequency='daily'):
    """Send job alerts to candidates with saved searches."""
    from apps.applications.models import SavedSearch
    from apps.notifications.tasks import send_job_alert_email

    searches = SavedSearch.objects.filter(
        enabled=True,
        frequency=frequency
    ).select_related('candidate')

    for search in searches:
        # Find matching jobs since last alert
        matching_jobs = find_matching_jobs(search)

        if matching_jobs:
            send_job_alert_email.delay(
                candidate_id=search.candidate_id,
                search_id=search.id,
                job_ids=list(matching_jobs.values_list('id', flat=True))
            )

            # Update last sent timestamp
            search.last_sent_at = timezone.now()
            search.save(update_fields=['last_sent_at'])

    return f'Processed {searches.count()} saved searches'


def find_matching_jobs(search):
    """Find jobs matching a saved search."""
    from .models import Job

    query = search.query or {}
    queryset = Job.objects.filter(
        status='published',
        expires_at__gt=timezone.now()
    )

    # Apply filters from saved search
    if 'keywords' in query:
        queryset = queryset.filter(
            title__icontains=query['keywords']
        ) | queryset.filter(
            description__icontains=query['keywords']
        )

    if 'location' in query:
        queryset = queryset.filter(city__icontains=query['location'])

    if 'location_type' in query:
        queryset = queryset.filter(location_type=query['location_type'])

    if 'employment_type' in query:
        queryset = queryset.filter(employment_type__in=query['employment_type'])

    if 'experience_level' in query:
        queryset = queryset.filter(experience_level__in=query['experience_level'])

    if 'category' in query:
        queryset = queryset.filter(category__in=query['category'])

    if 'salary_min' in query:
        queryset = queryset.filter(salary_max__gte=query['salary_min'])

    # Only jobs posted since last alert
    if search.last_sent_at:
        queryset = queryset.filter(posted_at__gt=search.last_sent_at)
    else:
        # First alert - limit to jobs from last 7 days
        queryset = queryset.filter(
            posted_at__gt=timezone.now() - timezone.timedelta(days=7)
        )

    return queryset[:50]  # Limit to 50 jobs per alert


@shared_task
def update_job_metrics():
    """Recalculate denormalised metrics for all published jobs (run hourly).

    Recomputes:
    - views          — total JobView count
    - unique_views   — distinct visitor_id count
    - applications_count — Application count
    - report_count   — pending JobReport count

    Uses a single annotated queryset per source table to avoid N+1 queries.
    """
    from .models import Job, JobView, JobReport
    from apps.applications.models import Application
    from django.db.models import Count, Q

    updated = 0

    # --- Views & unique views -----------------------------------------------
    view_stats = (
        JobView.objects
        .values('job_id')
        .annotate(
            total_views=Count('id'),
            total_unique=Count('visitor_id', distinct=True),
        )
    )
    view_map = {row['job_id']: row for row in view_stats}

    # --- Applications -------------------------------------------------------
    app_stats = (
        Application.objects
        .values('job_id')
        .annotate(total_apps=Count('id'))
    )
    app_map = {row['job_id']: row['total_apps'] for row in app_stats}

    # --- Reports (only pending) ---------------------------------------------
    report_stats = (
        JobReport.objects
        .filter(status='pending')
        .values('job_id')
        .annotate(total_reports=Count('id'))
    )
    report_map = {row['job_id']: row['total_reports'] for row in report_stats}

    # --- Update published / paused / pending jobs ---------------------------
    active_jobs = Job.objects.filter(
        status__in=['published', 'paused', 'pending', 'scheduled'],
    ).only('id', 'views', 'unique_views', 'applications_count', 'report_count')

    for job in active_jobs.iterator(chunk_size=500):
        vs = view_map.get(job.id, {})
        new_views = vs.get('total_views', 0)
        new_unique = vs.get('total_unique', 0)
        new_apps = app_map.get(job.id, 0)
        new_reports = report_map.get(job.id, 0)

        # Only write if something actually changed
        if (
            job.views != new_views
            or job.unique_views != new_unique
            or job.applications_count != new_apps
            or job.report_count != new_reports
        ):
            job.views = new_views
            job.unique_views = new_unique
            job.applications_count = new_apps
            job.report_count = new_reports
            job.save(update_fields=[
                'views', 'unique_views', 'applications_count', 'report_count'
            ])
            updated += 1

    return f'Updated metrics for {updated} jobs'


@shared_task
def cleanup_old_job_views():
    """Clean up old job view records (run weekly)."""
    from .models import JobView

    cutoff = timezone.now() - timezone.timedelta(days=90)
    deleted_count = JobView.objects.filter(created_at__lt=cutoff).delete()[0]

    return f'Deleted {deleted_count} old job view records'

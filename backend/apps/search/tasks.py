"""
Celery tasks for SEO automation.

- Nightly SEO audit: backfill missing meta fields using templates (zero AI cost)
- Content freshness check: flag stale listings
- Ping search engines: notify Google/Bing of sitemap updates
"""
import logging
import requests

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def nightly_seo_audit():
    """
    Run nightly SEO audit and backfill missing meta fields.

    Uses template-based generation (zero AI cost, no API calls).
    Only fills empty meta_title and meta_description on published jobs.
    """
    from apps.jobs.models import Job
    from apps.search.seo_utils import generate_meta_title, generate_meta_description

    published_jobs = Job.objects.filter(
        status='published',
    ).select_related('company')

    # Jobs missing meta_title
    missing_title = published_jobs.filter(meta_title='')
    title_count = 0
    for job in missing_title.iterator(chunk_size=200):
        try:
            job.meta_title = generate_meta_title(job)
            job.save(update_fields=['meta_title', 'updated_at'])
            title_count += 1
        except Exception as e:
            logger.error(f'Failed to generate meta_title for job {job.id}: {e}')

    # Jobs missing meta_description
    missing_desc = published_jobs.filter(meta_description='')
    desc_count = 0
    for job in missing_desc.iterator(chunk_size=200):
        try:
            job.meta_description = generate_meta_description(job)
            job.save(update_fields=['meta_description', 'updated_at'])
            desc_count += 1
        except Exception as e:
            logger.error(f'Failed to generate meta_description for job {job.id}: {e}')

    result = f'SEO audit complete: filled {title_count} meta titles, {desc_count} meta descriptions'
    logger.info(result)
    return result


@shared_task
def content_freshness_check():
    """
    Flag stale listings that haven't been refreshed in 60+ days.

    Stale jobs rank lower in Google for Jobs. This task identifies them
    so admins can notify employers to refresh their listings.
    """
    from apps.jobs.models import Job

    cutoff = timezone.now() - timezone.timedelta(days=60)

    stale_jobs = Job.objects.filter(
        status='published',
        posted_at__lt=cutoff,
    ).exclude(
        last_refreshed_at__gt=cutoff,
    )

    count = stale_jobs.count()
    if count > 0:
        logger.warning(f'Content freshness: {count} published jobs are stale (>60 days without refresh)')
    else:
        logger.info('Content freshness: all published jobs are fresh')

    return f'{count} stale jobs detected'


@shared_task
def ping_search_engines():
    """
    Notify Google and Bing that the sitemap has been updated.

    Uses the standard sitemap ping protocol:
    - Google: https://www.google.com/ping?sitemap={url}
    - Bing: https://www.bing.com/ping?sitemap={url}
    """
    base_url = getattr(settings, 'FRONTEND_URL', 'https://orion.jobs')
    sitemap_url = f'{base_url}/sitemap.xml'

    results = {}

    # Google ping
    try:
        resp = requests.get(
            f'https://www.google.com/ping?sitemap={sitemap_url}',
            timeout=10,
        )
        results['google'] = f'status {resp.status_code}'
        logger.info(f'Pinged Google sitemap: status {resp.status_code}')
    except requests.RequestException as e:
        results['google'] = f'error: {e}'
        logger.error(f'Failed to ping Google: {e}')

    # Bing ping
    try:
        resp = requests.get(
            f'https://www.bing.com/ping?sitemap={sitemap_url}',
            timeout=10,
        )
        results['bing'] = f'status {resp.status_code}'
        logger.info(f'Pinged Bing sitemap: status {resp.status_code}')
    except requests.RequestException as e:
        results['bing'] = f'error: {e}'
        logger.error(f'Failed to ping Bing: {e}')

    return results

"""
Celery configuration for Orion backend.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

app = Celery('orion')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
app.autodiscover_tasks(related_name='slack_tasks')

# Celery Beat schedule
app.conf.beat_schedule = {
    # Process scheduled social posts every minute
    'process-scheduled-social-posts': {
        'task': 'apps.social.tasks.process_scheduled_posts',
        'schedule': crontab(minute='*'),
    },
    # Cleanup old pending posts daily at 3am
    'cleanup-old-pending-posts': {
        'task': 'apps.social.tasks.cleanup_old_pending_posts',
        'schedule': crontab(hour=3, minute=0),
    },

    # SEO: Nightly audit — backfill missing meta fields (template-based, zero AI cost)
    'nightly-seo-audit': {
        'task': 'apps.search.tasks.nightly_seo_audit',
        'schedule': crontab(hour=2, minute=0),
    },
    # SEO: Content freshness check — flag stale listings (>60 days)
    'content-freshness-check': {
        'task': 'apps.search.tasks.content_freshness_check',
        'schedule': crontab(hour=3, minute=30),
    },
    # SEO: Ping search engines — notify Google/Bing of sitemap updates
    'ping-search-engines': {
        'task': 'apps.search.tasks.ping_search_engines',
        'schedule': crontab(hour=4, minute=0),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

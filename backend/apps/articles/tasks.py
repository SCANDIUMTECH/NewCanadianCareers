"""
Celery tasks for the articles app.
"""
from celery import shared_task


@shared_task
def publish_due_scheduled_articles():
    """Publish articles that have passed their scheduled publish time."""
    from django.utils import timezone
    from django.db import transaction
    from .models import Article

    now = timezone.now()
    due_ids = list(
        Article.objects.filter(
            status='scheduled',
            scheduled_publish_at__lte=now,
        ).values_list('id', flat=True)
    )

    published_count = 0
    for article_id in due_ids:
        try:
            with transaction.atomic():
                article = Article.objects.select_for_update(
                    skip_locked=True
                ).get(id=article_id, status='scheduled')
                article.status = 'published'
                article.published_at = article.scheduled_publish_at or now
                article.scheduled_publish_at = None
                article.save(update_fields=['status', 'published_at', 'scheduled_publish_at'])
                published_count += 1
        except Article.DoesNotExist:
            continue

    return f'Published {published_count} scheduled articles'

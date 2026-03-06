"""
Celery tasks for user management housekeeping.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(soft_time_limit=120, time_limit=150)
def flush_expired_jwt_tokens():
    """Prune expired rows from the JWT blacklist tables.

    Equivalent to: manage.py flushexpiredtokens
    Prevents the OutstandingToken + BlacklistedToken tables from growing unbounded.
    Schedule via celery-beat (daily).
    """
    from django.utils import timezone

    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

        deleted, _ = OutstandingToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        if deleted:
            logger.info("Flushed %d expired JWT tokens", deleted)
        return {"deleted": deleted}
    except ImportError:
        return {"deleted": 0}

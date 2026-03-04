import logging

from celery import shared_task

logger = logging.getLogger("gdpr.tasks")


@shared_task
def enforce_data_retention():
    """Periodic task to enforce data retention policy (schedule via celery-beat, e.g. daily)."""
    from .services.data_retention import DataRetentionService

    service = DataRetentionService()
    affected = service.enforce_retention()
    return {"affected_users": len(affected), "emails": affected}


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_data_breach_notification(self, breach_id=None):
    """Task to send data breach notifications with retry on email failure."""
    from .services.data_breach import DataBreachService

    try:
        service = DataBreachService()
        count = service.notify_all_users(breach_id=breach_id)
        return {"users_notified": count}
    except Exception as exc:
        logger.error("Breach notification failed (attempt %d): %s", self.request.retries, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_policy_update_notification(self):
    """Task to send policy update notifications with retry on email failure."""
    from .services.data_breach import DataBreachService

    try:
        service = DataBreachService()
        count = service.send_policy_update()
        return {"users_notified": count}
    except Exception as exc:
        logger.error("Policy update notification failed (attempt %d): %s", self.request.retries, exc)
        raise self.retry(exc=exc)


@shared_task
def check_dsar_deadlines():
    """Periodic task to check for approaching DSAR deadlines and send warnings.

    Schedule via celery-beat (e.g., daily). Logs warnings for requests
    approaching their deadline (within 7 days) or overdue.
    """
    from django.utils import timezone

    from .models import DataRequest

    pending_statuses = [
        DataRequest.Status.PENDING,
        DataRequest.Status.CONFIRMED,
        DataRequest.Status.PROCESSING,
    ]
    open_requests = DataRequest.objects.filter(
        status__in=pending_statuses,
        deadline__isnull=False,
    )

    overdue = []
    approaching = []

    for req in open_requests:
        days_left = req.days_until_deadline
        if days_left is not None:
            if days_left < 0:
                overdue.append(str(req.id))
                logger.warning(
                    "DSAR OVERDUE: %s (%s) - %d days past deadline",
                    req.email, req.request_type, abs(days_left),
                )
            elif days_left <= 7:
                approaching.append(str(req.id))
                logger.warning(
                    "DSAR approaching deadline: %s (%s) - %d days remaining",
                    req.email, req.request_type, days_left,
                )

    return {
        "overdue_count": len(overdue),
        "approaching_count": len(approaching),
        "overdue_ids": overdue,
        "approaching_ids": approaching,
    }

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
    """Periodic task to check for approaching DSAR deadlines and email DPO.

    Schedule via celery-beat (e.g., daily). Sends email alerts to DPO for
    requests approaching their deadline (within 7 days) or overdue.
    """
    from django.conf import settings as django_settings
    from django.core.mail import send_mail
    from django.utils import timezone

    from .models import DataRequest, GDPRSettings

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
                overdue.append({"id": str(req.id), "email": req.email, "type": req.request_type, "days": abs(days_left)})
                logger.warning(
                    "DSAR OVERDUE: %s (%s) - %d days past deadline",
                    req.email, req.request_type, abs(days_left),
                )
            elif days_left <= 7:
                approaching.append({"id": str(req.id), "email": req.email, "type": req.request_type, "days": days_left})
                logger.warning(
                    "DSAR approaching deadline: %s (%s) - %d days remaining",
                    req.email, req.request_type, days_left,
                )

    # Email DPO if there are any overdue or approaching deadlines
    if overdue or approaching:
        try:
            gdpr_settings = GDPRSettings.load()
            dpo_email = gdpr_settings.dpo_email

            lines = ["GDPR DSAR Deadline Alert\n"]
            if overdue:
                lines.append(f"⚠ OVERDUE ({len(overdue)}):")
                for r in overdue:
                    lines.append(f"  • {r['email']} ({r['type']}) — {r['days']} days past deadline [ID: {r['id']}]")
                lines.append("")
            if approaching:
                lines.append(f"⏰ Approaching deadline ({len(approaching)}):")
                for r in approaching:
                    lines.append(f"  • {r['email']} ({r['type']}) — {r['days']} days remaining [ID: {r['id']}]")
                lines.append("")
            lines.append("Please log in to the admin panel to process these requests.")

            send_mail(
                subject=f"[GDPR] {len(overdue)} overdue, {len(approaching)} approaching DSAR deadlines",
                message="\n".join(lines),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[dpo_email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error("Failed to send DSAR deadline alert email: %s", e)

    return {
        "overdue_count": len(overdue),
        "approaching_count": len(approaching),
        "overdue_ids": [r["id"] for r in overdue],
        "approaching_ids": [r["id"] for r in approaching],
    }


@shared_task
def purge_old_consent_logs():
    """Periodic task to purge anonymous consent logs older than retention period.

    CNIL guidance: consent records should be retained only as long as necessary
    to demonstrate compliance. Default: 5 years (1825 days).
    """
    from datetime import timedelta

    from django.utils import timezone

    from .models import ConsentLog

    # Anonymous consent logs older than 5 years
    CONSENT_LOG_RETENTION_DAYS = 1825
    cutoff = timezone.now() - timedelta(days=CONSENT_LOG_RETENTION_DAYS)

    deleted_count, _ = ConsentLog.objects.filter(updated_at__lt=cutoff).delete()
    if deleted_count:
        logger.info("Purged %d anonymous consent logs older than %d days", deleted_count, CONSENT_LOG_RETENTION_DAYS)

    return {"deleted_count": deleted_count}

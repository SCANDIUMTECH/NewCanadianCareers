"""
Celery tasks for fraud detection and monitoring.
"""
import logging

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(soft_time_limit=250, time_limit=300)
def run_fraud_scan():
    """
    Periodic fraud scan task. Evaluates all enabled fraud rules.
    Scheduled via Celery Beat (every 15 minutes).
    """
    from .services import FraudDetectionService

    logger.info("Starting periodic fraud scan...")
    try:
        total_alerts = FraudDetectionService.evaluate_all_rules()
        logger.info(f"Fraud scan completed: {total_alerts} new alerts created")
        return {'alerts_created': total_alerts}
    except Exception as e:
        logger.error(f"Fraud scan failed: {e}")
        return {'error': str(e)}


@shared_task
def notify_fraud_alert(alert_id, rule_id=None):
    """
    Send notifications to all admin users when a fraud alert is triggered.
    Creates in-app notifications and sends email for high/critical severity.
    rule_id may be None for realtime alerts not triggered by a scheduled rule.
    """
    from .models import FraudAlert, FraudRule
    from apps.users.models import User
    from apps.notifications.models import Notification
    from apps.notifications.tasks import send_email

    try:
        alert = FraudAlert.objects.get(id=alert_id)
    except FraudAlert.DoesNotExist:
        logger.error(f"Fraud alert {alert_id} not found")
        return

    rule = None
    if rule_id:
        try:
            rule = FraudRule.objects.get(id=rule_id)
        except FraudRule.DoesNotExist:
            logger.warning(f"Fraud rule {rule_id} not found for alert {alert_id}")

    rule_name = rule.name if rule else 'Realtime Detection'

    # Get all admin users
    admin_users = User.objects.filter(role='admin', status='active')

    severity_label = alert.get_severity_display()
    type_label = alert.get_type_display()

    for admin_user in admin_users:
        # Create in-app notification
        Notification.objects.create(
            user=admin_user,
            notification_type='system',
            title=f'Fraud Alert: {type_label}',
            message=f'[{severity_label}] {alert.description}',
            link='/admin/fraud',
            data={
                'alert_id': alert.id,
                'severity': alert.severity,
                'type': alert.type,
                'rule_name': rule_name,
            },
        )

        # Send email for high and critical severity
        if alert.severity in ('high', 'critical'):
            try:
                send_email.delay(
                    to_email=admin_user.email,
                    subject=f'[{severity_label.upper()}] Fraud Alert: {type_label}',
                    template='fraud_alert',
                    context={
                        'name': admin_user.first_name or 'Admin',
                        'severity': severity_label,
                        'alert_type': type_label,
                        'description': alert.description,
                        'subject_name': alert.subject_name,
                        'ip_address': alert.ip_address or 'N/A',
                        'indicators': ', '.join(alert.indicators) if alert.indicators else 'None',
                        'rule_name': rule_name,
                        'alert_url': f'/admin/fraud',
                        'time': timezone.now().strftime('%Y-%m-%d %H:%M UTC'),
                    },
                    user_id=admin_user.id,
                )
            except Exception as e:
                logger.error(f"Failed to send fraud alert email to {admin_user.email}: {e}")

    logger.info(f"Fraud alert notifications sent to {admin_users.count()} admins for alert {alert_id}")


@shared_task
def auto_mitigate_fraud(alert_id):
    """
    Automatic mitigation for critical fraud alerts.
    - Suspends user accounts involved in critical alerts
    - Hides flagged jobs
    """
    from .models import FraudAlert

    try:
        alert = FraudAlert.objects.get(id=alert_id)
    except FraudAlert.DoesNotExist:
        logger.error(f"Fraud alert {alert_id} not found for auto-mitigation")
        return

    if alert.severity != 'critical':
        return

    logger.info(f"Auto-mitigating critical fraud alert {alert_id}: {alert.type}")

    if alert.type in ('credential_stuffing', 'suspicious_activity', 'multiple_accounts'):
        # Block the IP by suspending associated user accounts
        if alert.affected_accounts:
            from apps.users.models import User
            suspended_count = 0
            for email in alert.affected_accounts[:10]:
                try:
                    user = User.objects.get(email=email)
                    if user.status != 'suspended' and user.role != 'admin':
                        user.status = 'suspended'
                        user.save(update_fields=['status'])
                        suspended_count += 1
                except User.DoesNotExist:
                    continue

            if suspended_count > 0:
                alert.status = 'blocked'
                alert.resolution_notes = f'Auto-mitigated: {suspended_count} account(s) suspended.'
                alert.resolved_at = timezone.now()
                alert.save(update_fields=['status', 'resolution_notes', 'resolved_at'])
                logger.info(f"Auto-mitigation: suspended {suspended_count} accounts for alert {alert_id}")

    elif alert.type in ('fake_listings', 'fake_job', 'spam'):
        # Hide the flagged job
        if alert.subject_type == 'job' and alert.subject_id:
            from apps.jobs.models import Job
            try:
                job = Job.objects.get(id=alert.subject_id)
                if job.status not in ('hidden', 'expired'):
                    job.status = 'hidden'
                    job.save(update_fields=['status'])
                    alert.status = 'blocked'
                    alert.resolution_notes = f'Auto-mitigated: Job hidden.'
                    alert.resolved_at = timezone.now()
                    alert.save(update_fields=['status', 'resolution_notes', 'resolved_at'])
                    logger.info(f"Auto-mitigation: hid job {alert.subject_id} for alert {alert_id}")
            except Job.DoesNotExist:
                pass

    elif alert.type == 'disposable_email':
        # Suspend user accounts using disposable email providers
        if alert.affected_accounts:
            from apps.users.models import User
            suspended_count = 0
            for email in alert.affected_accounts[:10]:
                try:
                    user = User.objects.get(email=email)
                    if user.status != 'suspended' and user.role != 'admin':
                        user.status = 'suspended'
                        user.save(update_fields=['status'])
                        suspended_count += 1
                except User.DoesNotExist:
                    continue

            if suspended_count > 0:
                alert.status = 'blocked'
                alert.resolution_notes = f'Auto-mitigated: {suspended_count} account(s) with disposable email suspended.'
                alert.resolved_at = timezone.now()
                alert.save(update_fields=['status', 'resolution_notes', 'resolved_at'])
                logger.info(f"Auto-mitigation: suspended {suspended_count} disposable email accounts for alert {alert_id}")

    elif alert.type == 'payment_fraud':
        # Flag the company as high risk
        if alert.subject_type == 'company' and alert.subject_id:
            from apps.companies.models import Company
            try:
                company = Company.objects.get(id=alert.subject_id)
                if company.risk_level != 'high':
                    company.risk_level = 'high'
                    company.save(update_fields=['risk_level'])
                    alert.resolution_notes = f'Auto-mitigated: Company flagged as high risk.'
                    alert.save(update_fields=['resolution_notes'])
                    logger.info(f"Auto-mitigation: flagged company {alert.subject_id} as high risk for alert {alert_id}")
            except Company.DoesNotExist:
                pass


@shared_task
def run_fraud_check_for_event(event_type, event_data):
    """
    Run targeted fraud checks triggered by real-time events (signals).
    Only evaluates rules relevant to the event type.
    """
    from .models import FraudRule
    from .services import FraudDetectionService

    logger.info(f"Running event-triggered fraud check: {event_type}")

    # Map events to relevant check types
    event_check_map = {
        'user_created': ['multiple_accounts', 'identity_fraud', 'disposable_email'],
        'job_published': ['fake_listings', 'fake_job', 'spam'],
    }

    check_types = event_check_map.get(event_type, [])
    if not check_types:
        return

    rules = FraudRule.objects.filter(
        enabled=True,
        conditions__check_type__in=check_types,
    )

    total_alerts = 0
    for rule in rules:
        try:
            alerts_created = FraudDetectionService.evaluate_rule(rule)
            total_alerts += alerts_created
        except Exception as e:
            logger.error(f"Event-triggered fraud check error for rule '{rule.name}': {e}")

    logger.info(f"Event-triggered fraud check complete: {total_alerts} alerts from {event_type}")
    return {'event': event_type, 'alerts_created': total_alerts}


@shared_task
def purge_old_tracking_records():
    """Purge banner/affiliate tracking records older than 90 days.

    GDPR compliance: IP addresses are PII and must not be retained
    indefinitely. Matches the existing 90-day login attempt retention
    policy. Aggregate counters on parent models are preserved.
    """
    from .models import BannerImpression, BannerClick, AffiliateLinkClick

    cutoff = timezone.now() - timedelta(days=90)

    counts = {}
    for model in (BannerImpression, BannerClick, AffiliateLinkClick):
        deleted, _ = model.objects.filter(created_at__lt=cutoff).delete()
        counts[model.__name__] = deleted

    total = sum(counts.values())
    if total > 0:
        logger.info("Purged %d old tracking records: %s", total, counts)
    return counts

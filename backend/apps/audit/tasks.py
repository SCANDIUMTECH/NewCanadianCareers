"""
Celery tasks for audit and security operations.
"""
from celery import shared_task
from django.conf import settings
from django.utils import timezone


@shared_task
def send_security_alert_email(user_id, attempt_id):
    """Send security alert email after failed login attempts threshold."""
    from apps.users.models import User
    from apps.notifications.tasks import send_email
    from .models import LoginAttempt

    try:
        user = User.objects.get(id=user_id)
        attempt = LoginAttempt.objects.get(id=attempt_id)

        send_email.delay(
            to_email=user.email,
            subject='Security Alert: Failed Login Attempts',
            template='security_alert',
            context={
                'name': user.first_name or 'there',
                'ip_address': attempt.ip_address,
                'location': attempt.location_display,
                'time': attempt.created_at.strftime('%B %d, %Y at %I:%M %p UTC'),
                'reset_url': f'{settings.FRONTEND_URL}/forgot-password',
            },
            user_id=user_id
        )
    except (User.DoesNotExist, LoginAttempt.DoesNotExist):
        pass


@shared_task
def cleanup_old_login_attempts():
    """Daily cleanup of old login attempt records (GDPR compliance)."""
    from datetime import timedelta
    from .models import LoginAttempt

    days = settings.LOGIN_SECURITY.get('RETENTION_DAYS', 90)
    cutoff = timezone.now() - timedelta(days=days)
    deleted_count, _ = LoginAttempt.objects.filter(created_at__lt=cutoff).delete()

    return {'deleted': deleted_count}

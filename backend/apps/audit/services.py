"""
Security services for login attempt tracking and account lockout.
"""
from datetime import timedelta

from django.utils import timezone
from django.conf import settings


class LoginSecurityService:
    """Service for login security operations."""

    @classmethod
    def record_attempt(cls, request, email, user=None, success=True, failure_reason=''):
        """Record a login attempt and handle security actions."""
        from .models import LoginAttempt
        from .tasks import send_security_alert_email

        attempt = LoginAttempt.objects.create(
            user=user,
            email=email,
            status='success' if success else 'failed',
            failure_reason=failure_reason,
            ip_address=cls.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            location_city=request.META.get('HTTP_CF_IPCITY', ''),
            location_country=request.META.get('HTTP_CF_IPCOUNTRY', ''),
            location_latitude=cls._parse_float(request.META.get('HTTP_CF_IPLATITUDE')),
            location_longitude=cls._parse_float(request.META.get('HTTP_CF_IPLONGITUDE')),
        )

        if not success and user:
            cls._handle_failed_attempt(user, attempt)
        elif success and user:
            cls._reset_failed_attempts(user)

        return attempt

    @classmethod
    def _handle_failed_attempt(cls, user, attempt):
        """Handle a failed login attempt - update counters and send alerts."""
        from .tasks import send_security_alert_email

        config = settings.LOGIN_SECURITY
        window = timedelta(minutes=config['TRACKING_WINDOW'])

        from .models import LoginAttempt
        recent_failures = LoginAttempt.objects.filter(
            user=user,
            status='failed',
            created_at__gte=timezone.now() - window
        ).count()

        user.failed_login_attempts = recent_failures
        user.last_failed_login = timezone.now()

        # Send alert at threshold
        if recent_failures == config['ALERT_THRESHOLD'] and user.security_email_enabled:
            send_security_alert_email.delay(user.id, attempt.id)

        # Lock account at lockout threshold
        if recent_failures >= config['LOCKOUT_THRESHOLD']:
            user.locked_until = timezone.now() + timedelta(minutes=config['LOCKOUT_DURATION'])

        user.save(update_fields=['failed_login_attempts', 'last_failed_login', 'locked_until'])

    @classmethod
    def _reset_failed_attempts(cls, user):
        """Reset failed attempt counter on successful login."""
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])

    @classmethod
    def is_locked(cls, user):
        """
        Check if account is locked.
        Returns (is_locked: bool, remaining_seconds: int)
        """
        if not user.locked_until:
            return False, 0

        if timezone.now() >= user.locked_until:
            # Lock has expired, clear it
            user.locked_until = None
            user.failed_login_attempts = 0
            user.save(update_fields=['locked_until', 'failed_login_attempts'])
            return False, 0

        remaining = int((user.locked_until - timezone.now()).total_seconds())
        return True, remaining

    @staticmethod
    def get_client_ip(request):
        """Extract client IP from request, preferring Cloudflare headers."""
        # Prefer Cloudflare's connecting IP header
        cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            return cf_ip

        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()

        return request.META.get('REMOTE_ADDR', '')

    @staticmethod
    def _parse_float(value):
        """Safely parse a float value, returning None on failure."""
        try:
            return float(value) if value else None
        except (ValueError, TypeError):
            return None

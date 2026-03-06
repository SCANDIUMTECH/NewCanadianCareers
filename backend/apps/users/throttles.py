"""
Custom throttle classes for user-related endpoints.
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class ResendVerificationThrottle(UserRateThrottle):
    """Limits email verification resend requests to 3 per hour per user."""
    scope = 'resend_verification'


class EmailCheckThrottle(AnonRateThrottle):
    """Strict per-IP throttle for the email check endpoint.

    Mitigates email enumeration by limiting probing rate.
    """
    scope = 'email_check'


class AuthRateThrottle(AnonRateThrottle):
    """Stricter per-IP throttle for all auth endpoints (login, register, reset, etc.).

    Turnstile is a bot-check, not a rate limit — this enforces framework-level
    rate limiting on unauthenticated auth flows.
    """
    scope = 'auth'

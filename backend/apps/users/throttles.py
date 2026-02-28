"""
Custom throttle classes for user-related endpoints.
"""
from rest_framework.throttling import UserRateThrottle


class ResendVerificationThrottle(UserRateThrottle):
    """Limits email verification resend requests to 3 per hour per user."""
    scope = 'resend_verification'

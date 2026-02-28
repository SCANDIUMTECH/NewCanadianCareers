"""
Cloudflare Turnstile verification utility.

Provides a reusable function for verifying Turnstile tokens on protected endpoints.
Reads configuration from PlatformSettings singleton.
Fails open on network errors for production resilience.
"""
import logging

import requests

logger = logging.getLogger(__name__)

CLOUDFLARE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'


def _get_turnstile_settings():
    """Return the PlatformSettings singleton (lazy import to avoid circular deps)."""
    from .models import PlatformSettings
    return PlatformSettings.get_settings()


def verify_turnstile_token(token, ip_address=None, feature='auth'):
    """
    Verify a Cloudflare Turnstile token.

    Args:
        token: The cf-turnstile-response token from the frontend.
        ip_address: Optional client IP for enhanced validation.
        feature: Which feature group to check — 'auth', 'jobs', or 'applications'.

    Returns:
        (is_valid, error_message):
        - (True, None)  if valid, disabled, or Cloudflare unreachable (fail-open).
        - (False, str)  if invalid or missing when required.
    """
    settings = _get_turnstile_settings()

    # Master toggle: if Turnstile is disabled globally, pass silently
    if not settings.turnstile_enabled:
        return (True, None)

    # Feature-level toggle
    feature_toggles = {
        'auth': settings.turnstile_protect_auth,
        'jobs': settings.turnstile_protect_jobs,
        'applications': settings.turnstile_protect_applications,
    }
    if not feature_toggles.get(feature, True):
        return (True, None)

    # Secret key must be configured
    if not settings.turnstile_secret_key:
        logger.warning('Turnstile enabled but secret key not configured — passing through')
        return (True, None)

    # Token must be present
    if not token:
        return (False, 'Human verification is required. Please complete the challenge.')

    # Call Cloudflare siteverify API
    try:
        payload = {
            'secret': settings.turnstile_secret_key,
            'response': token,
        }
        if ip_address:
            payload['remoteip'] = ip_address

        resp = requests.post(CLOUDFLARE_VERIFY_URL, json=payload, timeout=5)
        result = resp.json()

        if result.get('success'):
            return (True, None)

        error_codes = result.get('error-codes', [])
        logger.info('Turnstile verification failed: %s', error_codes)
        return (False, 'Human verification failed. Please try again.')

    except requests.exceptions.RequestException as exc:
        # Fail open on network errors — don't block legitimate users
        logger.error('Turnstile API request failed: %s', exc)
        return (True, None)


def get_client_ip(request):
    """
    Extract client IP from the request.
    Prefers Cloudflare's CF-Connecting-IP header (set by Cloudflare Tunnel).
    """
    return (
        request.META.get('HTTP_CF_CONNECTING_IP')
        or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        or request.META.get('REMOTE_ADDR')
    )

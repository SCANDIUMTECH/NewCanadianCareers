"""
RUM Pipeline Security — HMAC verification, origin allowlist, deterministic sampling, PII stripping.
"""
import hashlib
import hmac
import re
from urllib.parse import urlparse, urlunparse

from django.conf import settings


def verify_hmac(body: bytes, signature: str) -> bool:
    """
    Verify HMAC-SHA256 signature of the request body.
    Expects signature in format: sha256=<hex_digest>
    Uses constant-time comparison to prevent timing attacks.
    """
    if not signature or not signature.startswith('sha256='):
        return False

    expected_sig = signature[7:]  # strip 'sha256=' prefix
    secret = settings.RUM_HMAC_SECRET.encode('utf-8')
    computed = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, expected_sig)


def check_origin(origin: str) -> bool:
    """
    Check if the request Origin header is in the allowlist.
    """
    if not origin:
        return False
    allowed = getattr(settings, 'RUM_ALLOWED_ORIGINS', ['http://localhost:3000'])
    return origin in allowed


def should_sample(session_id: str) -> bool:
    """
    Deterministic sampling based on session_id hash.
    Same session always gets the same decision.
    Returns True if the session should be kept (sampled in).
    """
    if not session_id:
        return False
    sample_rate = getattr(settings, 'RUM_SAMPLE_RATE', 10)
    if sample_rate >= 100:
        return True
    if sample_rate <= 0:
        return False
    hash_val = int(hashlib.sha256(session_id.encode('utf-8')).hexdigest()[:8], 16)
    return (hash_val % 100) < sample_rate


# Regex to detect email-like patterns in URLs
_EMAIL_RE = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')


def strip_pii(url: str) -> str:
    """
    Remove PII from URLs:
    - Strip query parameters
    - Strip fragments
    - Hash any email addresses found in the path
    """
    if not url:
        return ''
    try:
        parsed = urlparse(url)
        # Strip query and fragment
        clean_path = parsed.path
        # Hash any email-like patterns in path
        clean_path = _EMAIL_RE.sub('[REDACTED]', clean_path)
        return urlunparse((parsed.scheme, parsed.netloc, clean_path, '', '', ''))
    except Exception:
        return ''


def extract_page_path(url: str) -> str:
    """
    Extract just the path portion from a URL.
    """
    if not url:
        return '/'
    try:
        return urlparse(url).path or '/'
    except Exception:
        return '/'

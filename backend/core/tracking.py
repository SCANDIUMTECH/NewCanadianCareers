"""
Shared tracking utilities for banner impressions, clicks,
affiliate link clicks, article views, and job views.

Provides visitor identification, deduplication, and atomic counter updates.
"""
import re
import uuid

from django.conf import settings
from django.db.models import F
from django.utils import timezone
from rest_framework.throttling import AnonRateThrottle

# UUID v4 format validator — rejects oversized or malformed visitor_id cookies
_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


class BannerTrackingThrottle(AnonRateThrottle):
    """Per-IP rate limit for banner impression/click tracking (500/hour)."""
    scope = 'banner_tracking'


class AffiliateTrackingThrottle(AnonRateThrottle):
    """Per-IP rate limit for affiliate link click tracking (500/hour)."""
    scope = 'affiliate_tracking'


def get_visitor_id(request):
    """Get or create visitor ID for anonymous tracking.

    Validates cookie value as UUID v4 to prevent cache-key bloat
    and dedup bypass from crafted cookie values.
    """
    raw = request.COOKIES.get('visitor_id', '')
    if raw and _UUID_RE.match(raw):
        return raw
    return str(uuid.uuid4())


def get_request_context(request):
    """Extract tracking context from an HTTP request."""
    return {
        'visitor_id': get_visitor_id(request),
        'user': request.user if request.user.is_authenticated else None,
        'ip_address': request.META.get('REMOTE_ADDR', '0.0.0.0'),
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        'referrer': request.META.get('HTTP_REFERER', ''),
    }


def record_impression(parent_instance, detail_model_class, fk_field_name,
                       request, dedup_hours=24):
    """
    Record an impression with 24h dedup per visitor.

    Args:
        parent_instance: The parent model instance (e.g., SponsoredBanner)
        detail_model_class: The detail tracking model (e.g., BannerImpression)
        fk_field_name: Name of the FK field on the detail model (e.g., 'banner')
        request: The HTTP request
        dedup_hours: Hours for dedup window (default 24)

    Returns:
        (is_new, visitor_id) tuple
    """
    ctx = get_request_context(request)

    # Check for recent impression from this visitor
    recent = detail_model_class.objects.filter(
        **{fk_field_name: parent_instance},
        visitor_id=ctx['visitor_id'],
        created_at__gte=timezone.now() - timezone.timedelta(hours=dedup_hours),
    ).exists()

    if not recent:
        detail_model_class.objects.create(
            **{fk_field_name: parent_instance},
            visitor_id=ctx['visitor_id'],
            user=ctx['user'],
            ip_address=ctx['ip_address'],
            user_agent=ctx['user_agent'],
            referrer=ctx['referrer'],
        )
        # Atomic increment on parent
        parent_instance.__class__.objects.filter(pk=parent_instance.pk).update(
            impressions=F('impressions') + 1,
        )
        return True, ctx['visitor_id']

    return False, ctx['visitor_id']


def record_click(parent_instance, detail_model_class, fk_field_name, request):
    """
    Record a click (no dedup — every click counts).

    Args:
        parent_instance: The parent model instance (e.g., SponsoredBanner, AffiliateLink)
        detail_model_class: The detail tracking model (e.g., BannerClick, AffiliateLinkClick)
        fk_field_name: Name of the FK field on the detail model (e.g., 'banner', 'link')
        request: The HTTP request

    Returns:
        visitor_id string
    """
    ctx = get_request_context(request)

    detail_model_class.objects.create(
        **{fk_field_name: parent_instance},
        visitor_id=ctx['visitor_id'],
        user=ctx['user'],
        ip_address=ctx['ip_address'],
        user_agent=ctx['user_agent'],
        referrer=ctx['referrer'],
    )
    # Atomic increment on parent
    parent_instance.__class__.objects.filter(pk=parent_instance.pk).update(
        clicks=F('clicks') + 1,
    )

    return ctx['visitor_id']


def set_visitor_cookie(response, visitor_id):
    """Set the visitor_id cookie on a response."""
    response.set_cookie(
        'visitor_id', visitor_id,
        max_age=365 * 24 * 60 * 60,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
    )
    return response

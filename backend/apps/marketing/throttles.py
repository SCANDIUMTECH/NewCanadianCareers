"""
Custom throttle classes for the marketing module.
"""
from rest_framework.throttling import UserRateThrottle


class MarketingBulkThrottle(UserRateThrottle):
    """Throttle for bulk marketing operations (campaign sends, bulk imports).

    Limits to 10 requests per hour to prevent accidental mass operations.
    """
    scope = 'marketing_bulk'
    rate = '10/hour'


class CouponRedemptionThrottle(UserRateThrottle):
    """Throttle for coupon redemption attempts.

    Limits to 20 per hour per user to prevent abuse.
    """
    scope = 'coupon_redemption'
    rate = '20/hour'

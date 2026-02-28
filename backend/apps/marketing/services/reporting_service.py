"""
Marketing reporting and analytics service.
Provides aggregated KPIs and metrics across campaigns, coupons, journeys, and audiences.
"""
import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, Q, F, Value, CharField
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone

logger = logging.getLogger(__name__)


class ReportingService:
    """Service for marketing analytics and reporting."""

    # ─── Overview KPIs ─────────────────────────────────────────────

    @staticmethod
    def get_overview():
        """Aggregate overview KPIs across all marketing channels."""
        from ..models import (
            Campaign, Coupon, CouponRedemption, Journey, JourneyEnrollment,
            MarketingConsent, SuppressionEntry, Segment,
        )

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Campaign metrics
        campaigns_total = Campaign.objects.count()
        campaigns_sent = Campaign.objects.filter(status='sent').count()
        campaigns_active = Campaign.objects.filter(status__in=['sending', 'scheduled']).count()

        campaign_agg = Campaign.objects.filter(
            status='sent',
        ).aggregate(
            total_sent=Coalesce(Sum('sent_count'), 0),
            total_delivered=Coalesce(Sum('delivered_count'), 0),
            total_opened=Coalesce(Sum('opened_count'), 0),
            total_clicked=Coalesce(Sum('clicked_count'), 0),
        )

        # Coupon metrics
        coupons_active = Coupon.objects.filter(status='active').count()
        total_redemptions = CouponRedemption.objects.count()
        redemptions_30d = CouponRedemption.objects.filter(created_at__gte=thirty_days_ago).count()
        total_discount = CouponRedemption.objects.aggregate(
            total=Coalesce(Sum('discount_amount'), Decimal('0'))
        )['total']

        # Journey metrics
        journeys_active = Journey.objects.filter(status='active').count()
        active_enrollments = JourneyEnrollment.objects.filter(status='active').count()
        completed_enrollments = JourneyEnrollment.objects.filter(
            status__in=['completed', 'exited_goal']
        ).count()

        # Audience metrics
        total_contacts = MarketingConsent.objects.count()
        opted_in = MarketingConsent.objects.filter(status='opted_in').count()
        suppressed = SuppressionEntry.objects.count()
        segments_count = Segment.objects.count()

        return {
            # Campaign
            'campaigns_total': campaigns_total,
            'campaigns_sent': campaigns_sent,
            'campaigns_active': campaigns_active,
            'total_emails_sent': campaign_agg['total_sent'],
            'total_emails_delivered': campaign_agg['total_delivered'],
            'total_emails_opened': campaign_agg['total_opened'],
            'total_emails_clicked': campaign_agg['total_clicked'],
            'avg_open_rate': round(
                (campaign_agg['total_opened'] / campaign_agg['total_delivered'] * 100)
                if campaign_agg['total_delivered'] > 0 else 0, 2
            ),
            'avg_click_rate': round(
                (campaign_agg['total_clicked'] / campaign_agg['total_delivered'] * 100)
                if campaign_agg['total_delivered'] > 0 else 0, 2
            ),

            # Coupon
            'coupons_active': coupons_active,
            'total_redemptions': total_redemptions,
            'redemptions_30d': redemptions_30d,
            'total_discount_given': float(total_discount),

            # Journey
            'journeys_active': journeys_active,
            'active_enrollments': active_enrollments,
            'completed_enrollments': completed_enrollments,

            # Audience
            'total_contacts': total_contacts,
            'opted_in': opted_in,
            'suppressed': suppressed,
            'segments_count': segments_count,
            'consent_rate': round(
                (opted_in / total_contacts * 100) if total_contacts > 0 else 0, 2
            ),
        }

    # ─── Campaign Reports ──────────────────────────────────────────

    @staticmethod
    def campaign_kpis(days=30):
        """Campaign performance table for reporting."""
        from ..models import Campaign

        cutoff = timezone.now() - timedelta(days=days)

        campaigns = Campaign.objects.filter(
            status='sent',
            completed_at__gte=cutoff,
        ).order_by('-completed_at').values(
            'id', 'name', 'slug', 'status',
            'total_recipients', 'sent_count', 'delivered_count',
            'opened_count', 'clicked_count', 'bounced_count',
            'complained_count', 'unsubscribed_count', 'failed_count',
            'completed_at',
        )

        results = []
        for c in campaigns:
            delivered = c['delivered_count'] or 0
            results.append({
                **c,
                'open_rate': round((c['opened_count'] / delivered * 100) if delivered > 0 else 0, 2),
                'click_rate': round((c['clicked_count'] / delivered * 100) if delivered > 0 else 0, 2),
                'bounce_rate': round(
                    (c['bounced_count'] / c['sent_count'] * 100) if c['sent_count'] > 0 else 0, 2
                ),
            })

        return results

    # ─── Coupon Reports ────────────────────────────────────────────

    @staticmethod
    def coupon_kpis():
        """Coupon performance summary."""
        from ..models import Coupon, CouponRedemption

        coupons = Coupon.objects.annotate(
            redemption_count=Count('redemptions'),
            unique_users=Count('redemptions__user', distinct=True),
            total_discount=Coalesce(Sum('redemptions__discount_amount'), Decimal('0')),
            total_credits=Coalesce(Sum('redemptions__credits_granted'), 0),
        ).values(
            'id', 'name', 'code', 'status',
            'discount_type', 'discount_value',
            'uses_count', 'max_uses_total',
            'redemption_count', 'unique_users', 'total_discount', 'total_credits',
            'created_at', 'expires_at',
        ).order_by('-created_at')

        return list(coupons)

    # ─── Journey Reports ───────────────────────────────────────────

    @staticmethod
    def journey_kpis():
        """Journey performance summary."""
        from ..models import Journey, JourneyEnrollment, JourneyStepLog

        journeys = Journey.objects.annotate(
            enrollment_count=Count('enrollments'),
            active_count=Count('enrollments', filter=Q(enrollments__status='active')),
            completed_count=Count('enrollments', filter=Q(
                enrollments__status__in=['completed', 'exited_goal']
            )),
            failed_count=Count('enrollments', filter=Q(enrollments__status='failed')),
        ).values(
            'id', 'name', 'slug', 'status', 'trigger_type',
            'enrollment_count', 'active_count', 'completed_count', 'failed_count',
            'created_at',
        ).order_by('-created_at')

        results = []
        for j in journeys:
            total = j['enrollment_count'] or 0
            completion_rate = round(
                (j['completed_count'] / total * 100) if total > 0 else 0, 2
            )

            # Get step execution counts
            emails_sent = JourneyStepLog.objects.filter(
                enrollment__journey_id=j['id'],
                step__step_type='send_email',
                status='success',
            ).count()

            results.append({
                **j,
                'completion_rate': completion_rate,
                'emails_sent': emails_sent,
            })

        return results

    # ─── Audience Health ───────────────────────────────────────────

    @staticmethod
    def audience_health(days=30):
        """Audience health metrics: consent trends, suppression breakdown."""
        from ..models import MarketingConsent, SuppressionEntry

        now = timezone.now()
        cutoff = now - timedelta(days=days)

        # Consent status breakdown
        consent_breakdown = dict(
            MarketingConsent.objects.values_list('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')
        )

        # Suppression reason breakdown
        suppression_breakdown = dict(
            SuppressionEntry.objects.values_list('reason').annotate(
                count=Count('id')
            ).values_list('reason', 'count')
        )

        # Daily consent trends (last N days)
        consent_daily = list(
            MarketingConsent.objects.filter(
                created_at__gte=cutoff,
            ).annotate(
                date=TruncDate('created_at'),
            ).values('date').annotate(
                count=Count('id'),
            ).order_by('date')
        )

        # Daily suppression trends (last N days)
        suppression_daily = list(
            SuppressionEntry.objects.filter(
                created_at__gte=cutoff,
            ).annotate(
                date=TruncDate('created_at'),
            ).values('date').annotate(
                count=Count('id'),
            ).order_by('date')
        )

        return {
            'consent_breakdown': consent_breakdown,
            'suppression_breakdown': suppression_breakdown,
            'consent_daily': [
                {'date': str(d['date']), 'count': d['count']}
                for d in consent_daily
            ],
            'suppression_daily': [
                {'date': str(d['date']), 'count': d['count']}
                for d in suppression_daily
            ],
            'total_consents': MarketingConsent.objects.count(),
            'total_opted_in': MarketingConsent.objects.filter(status='opted_in').count(),
            'total_suppressed': SuppressionEntry.objects.count(),
        }

    # ─── Revenue Attribution ───────────────────────────────────────

    @staticmethod
    def revenue_attribution():
        """Coupon-to-purchase attribution metrics."""
        from ..models import CouponRedemption

        # Group by coupon
        attribution = list(
            CouponRedemption.objects.values(
                'coupon__id', 'coupon__code', 'coupon__name',
                'coupon__discount_type',
            ).annotate(
                redemption_count=Count('id'),
                unique_users=Count('user', distinct=True),
                total_discount=Coalesce(Sum('discount_amount'), Decimal('0')),
                total_credits=Coalesce(Sum('credits_granted'), 0),
            ).order_by('-total_discount')
        )

        total_discount = sum(float(a['total_discount']) for a in attribution)
        total_redemptions = sum(a['redemption_count'] for a in attribution)

        return {
            'by_coupon': [
                {
                    'coupon_id': a['coupon__id'],
                    'coupon_code': a['coupon__code'],
                    'coupon_name': a['coupon__name'],
                    'discount_type': a['coupon__discount_type'],
                    'redemption_count': a['redemption_count'],
                    'unique_users': a['unique_users'],
                    'total_discount': float(a['total_discount']),
                    'total_credits': a['total_credits'],
                }
                for a in attribution
            ],
            'total_discount': total_discount,
            'total_redemptions': total_redemptions,
        }

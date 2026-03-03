"""
Marketing URL patterns.
All endpoints are under /api/admin/marketing/ (registered via moderation urls).
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import audience_views
from . import campaign_views
from . import coupon_views
from . import journey_views
from . import report_views
from . import compliance_views

router = DefaultRouter()
router.register(
    r'audiences/suppression',
    audience_views.SuppressionEntryViewSet,
    basename='marketing-suppression'
)
router.register(
    r'audiences/segments',
    audience_views.SegmentViewSet,
    basename='marketing-segments'
)
router.register(
    r'campaigns',
    campaign_views.CampaignViewSet,
    basename='marketing-campaigns'
)
router.register(
    r'coupons',
    coupon_views.CouponViewSet,
    basename='marketing-coupons'
)
router.register(
    r'credits/wallets',
    coupon_views.StoreCreditWalletViewSet,
    basename='marketing-credit-wallets'
)
router.register(
    r'journeys',
    journey_views.JourneyViewSet,
    basename='marketing-journeys'
)

urlpatterns = [
    # Overview
    path('audiences/overview/', audience_views.AudienceOverviewView.as_view(), name='marketing-audience-overview'),

    # Consents
    path('audiences/consents/', audience_views.MarketingConsentListCreateView.as_view(), name='marketing-consents-list'),
    path('audiences/consents/<int:pk>/', audience_views.MarketingConsentUpdateView.as_view(), name='marketing-consent-update'),

    # Suppression import
    path('audiences/suppression/import/', audience_views.SuppressionImportView.as_view(), name='marketing-suppression-import'),

    # Segment actions
    path('audiences/segments/<int:pk>/preview/', audience_views.SegmentPreviewView.as_view(), name='marketing-segment-preview'),
    path('audiences/segments/<int:pk>/refresh/', audience_views.SegmentRefreshView.as_view(), name='marketing-segment-refresh'),

    # Compliance
    path('compliance/overview/', compliance_views.ComplianceOverviewView.as_view(), name='marketing-compliance-overview'),
    path('compliance/consent-log/', compliance_views.ConsentAuditLogView.as_view(), name='marketing-compliance-consent-log'),
    path('deliverability/', compliance_views.DeliverabilityDashboardView.as_view(), name='marketing-deliverability'),

    # Reports
    path('reports/overview/', report_views.MarketingOverviewView.as_view(), name='marketing-reports-overview'),
    path('reports/campaigns/', report_views.CampaignReportView.as_view(), name='marketing-reports-campaigns'),
    path('reports/coupons/', report_views.CouponReportView.as_view(), name='marketing-reports-coupons'),
    path('reports/journeys/', report_views.JourneyReportView.as_view(), name='marketing-reports-journeys'),
    path('reports/audience-health/', report_views.AudienceHealthView.as_view(), name='marketing-reports-audience-health'),
    path('reports/revenue-attribution/', report_views.RevenueAttributionView.as_view(), name='marketing-reports-revenue'),
    path('reports/export/', report_views.ReportExportView.as_view(), name='marketing-reports-export'),

    # Router-generated CRUD (campaigns, suppression, segments, journeys)
    path('', include(router.urls)),
]

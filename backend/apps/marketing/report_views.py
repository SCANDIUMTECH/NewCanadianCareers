"""
Marketing reporting views.
All endpoints are read-only admin views.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from .serializers import (
    MarketingOverviewSerializer,
    CampaignReportSerializer,
    CouponReportSerializer,
    JourneyReportSerializer,
    AudienceHealthSerializer,
    RevenueAttributionSerializer,
)
from .services.reporting_service import ReportingService


class MarketingOverviewView(APIView):
    """GET /api/admin/marketing/reports/overview/ — aggregate KPIs."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ReportingService.get_overview()
        serializer = MarketingOverviewSerializer(data)
        return Response(serializer.data)


class CampaignReportView(APIView):
    """GET /api/admin/marketing/reports/campaigns/ — campaign performance."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        data = ReportingService.campaign_kpis(days=days)
        serializer = CampaignReportSerializer(data, many=True)
        return Response(serializer.data)


class CouponReportView(APIView):
    """GET /api/admin/marketing/reports/coupons/ — coupon performance."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ReportingService.coupon_kpis()
        serializer = CouponReportSerializer(data, many=True)
        return Response(serializer.data)


class JourneyReportView(APIView):
    """GET /api/admin/marketing/reports/journeys/ — journey performance."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ReportingService.journey_kpis()
        serializer = JourneyReportSerializer(data, many=True)
        return Response(serializer.data)


class AudienceHealthView(APIView):
    """GET /api/admin/marketing/reports/audience-health/ — audience metrics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        data = ReportingService.audience_health(days=days)
        serializer = AudienceHealthSerializer(data)
        return Response(serializer.data)


class RevenueAttributionView(APIView):
    """GET /api/admin/marketing/reports/revenue-attribution/ — coupon attribution."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ReportingService.revenue_attribution()
        serializer = RevenueAttributionSerializer(data)
        return Response(serializer.data)


class ReportExportView(APIView):
    """POST /api/admin/marketing/reports/export/ — trigger async CSV export."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        report_type = request.data.get('report_type', 'overview')
        filters = request.data.get('filters', {})

        from .tasks import generate_report_export
        generate_report_export.delay(
            report_type=report_type,
            filters=filters,
            admin_user_id=request.user.id,
        )

        return Response({'detail': f'Export for "{report_type}" queued. You will be notified when ready.'})

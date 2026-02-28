"""
Admin compliance views for the marketing module.
Provides compliance overview, consent audit log, and deliverability dashboard.
"""
import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from .serializers import (
    ComplianceOverviewSerializer,
    ConsentAuditSerializer,
    DeliverabilitySerializer,
)
from .services.compliance_service import ComplianceService

logger = logging.getLogger(__name__)


class ComplianceOverviewView(APIView):
    """GET /api/admin/marketing/compliance/overview/

    Returns compliance stats: consent rates, suppression breakdown,
    unsubscribe/bounce/complaint counts (30d), daily trends.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ComplianceService.get_compliance_overview()
        serializer = ComplianceOverviewSerializer(data)
        return Response(serializer.data)


class ConsentAuditLogView(APIView):
    """GET /api/admin/marketing/compliance/consent-log/

    Paginated consent change log for compliance auditing.
    Query params: page (default 1), page_size (default 50, max 100).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 100)

        data = ComplianceService.get_consent_audit_log(page=page, page_size=page_size)

        return Response({
            'count': data['count'],
            'page': page,
            'page_size': page_size,
            'results': ConsentAuditSerializer(data['results'], many=True).data,
        })


class DeliverabilityDashboardView(APIView):
    """GET /api/admin/marketing/deliverability/

    Returns deliverability metrics for the last 30 days:
    delivery rate, bounce rate, complaint rate, open/click rates,
    and suppression list growth.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = ComplianceService.get_deliverability_stats()
        serializer = DeliverabilitySerializer(data)
        return Response(serializer.data)

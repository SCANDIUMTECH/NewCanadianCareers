"""
Campaign management views for marketing module.
"""
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from .throttles import MarketingBulkThrottle
from apps.audit.models import create_audit_log
from .models import Campaign, CampaignRecipient, CampaignVariant
from .serializers import (
    CampaignSerializer,
    CampaignCreateSerializer,
    CampaignUpdateSerializer,
    CampaignRecipientSerializer,
    CampaignStatsSerializer,
    CampaignVariantSerializer,
)
from .services.campaign_service import CampaignService


class CampaignViewSet(viewsets.ModelViewSet):
    """
    CRUD for campaigns.
    GET    /api/admin/marketing/campaigns/
    POST   /api/admin/marketing/campaigns/
    GET    /api/admin/marketing/campaigns/{id}/
    PATCH  /api/admin/marketing/campaigns/{id}/
    DELETE /api/admin/marketing/campaigns/{id}/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Campaign.objects.select_related(
        'segment', 'template', 'created_by', 'approved_by'
    ).prefetch_related('variants')
    filterset_fields = ['status', 'is_ab_test']
    search_fields = ['name']
    ordering_fields = ['created_at', 'scheduled_at', 'name']

    def get_serializer_class(self):
        if self.action == 'create':
            return CampaignCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CampaignUpdateSerializer
        return CampaignSerializer

    def perform_create(self, serializer):
        campaign = CampaignService.create_campaign(
            data=serializer.validated_data,
            created_by=self.request.user,
        )
        # Re-assign instance for response serialization
        serializer.instance = campaign
        create_audit_log(
            actor=self.request.user,
            action='campaign_create',
            target=campaign,
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            actor=self.request.user,
            action='campaign_delete',
            target=instance,
            request=self.request,
        )
        instance.delete()  # Soft delete via SoftDeleteMixin

    # ─── Custom Actions ───────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/schedule/"""
        campaign = self.get_object()
        scheduled_at = request.data.get('scheduled_at')
        if not scheduled_at:
            return Response(
                {'error': 'scheduled_at is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            campaign = CampaignService.schedule_campaign(
                campaign, scheduled_at, actor=request.user, request=request,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['post'], throttle_classes=[MarketingBulkThrottle])
    def send(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/send/"""
        campaign = self.get_object()
        try:
            campaign = CampaignService.start_send(
                campaign, actor=request.user, request=request,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger async send task
        from .tasks import process_campaign_send
        process_campaign_send.delay(campaign.id)

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/pause/"""
        campaign = self.get_object()
        try:
            campaign = CampaignService.pause_campaign(
                campaign, actor=request.user, request=request,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/cancel/"""
        campaign = self.get_object()
        try:
            campaign = CampaignService.cancel_campaign(
                campaign, actor=request.user, request=request,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/duplicate/"""
        campaign = self.get_object()
        new_campaign = CampaignService.duplicate_campaign(campaign, actor=request.user)
        return Response(
            CampaignSerializer(new_campaign).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/approve/"""
        campaign = self.get_object()
        try:
            campaign = CampaignService.approve_campaign(
                campaign, actor=request.user, request=request,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['get'])
    def recipients(self, request, pk=None):
        """GET /api/admin/marketing/campaigns/{id}/recipients/"""
        campaign = self.get_object()
        recipients = CampaignRecipient.objects.filter(
            campaign=campaign
        ).select_related('user', 'variant')

        # Optional status filter
        recipient_status = request.query_params.get('status')
        if recipient_status:
            recipients = recipients.filter(status=recipient_status)

        page = self.paginate_queryset(recipients)
        if page is not None:
            serializer = CampaignRecipientSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CampaignRecipientSerializer(recipients, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """GET /api/admin/marketing/campaigns/{id}/stats/"""
        campaign = self.get_object()
        data = {
            'total_recipients': campaign.total_recipients,
            'sent_count': campaign.sent_count,
            'delivered_count': campaign.delivered_count,
            'opened_count': campaign.opened_count,
            'clicked_count': campaign.clicked_count,
            'bounced_count': campaign.bounced_count,
            'complained_count': campaign.complained_count,
            'unsubscribed_count': campaign.unsubscribed_count,
            'failed_count': campaign.failed_count,
            'open_rate': campaign.open_rate,
            'click_rate': campaign.click_rate,
            'bounce_rate': campaign.bounce_rate,
        }
        return Response(CampaignStatsSerializer(data).data)

    @action(detail=True, methods=['post'], url_path='test-send')
    def test_send(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/test-send/"""
        campaign = self.get_object()
        test_email = request.data.get('email')
        if not test_email:
            return Response(
                {'error': 'email is required for test send.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.notifications.tasks import send_email
        subject = campaign.subject_line or (campaign.template.subject if campaign.template else 'Test')
        template_name = campaign.template.slug if campaign.template else 'default'
        context = {
            'name': 'Test User',
            'content': f'Test email for campaign: {campaign.name}',
            **(campaign.personalization_schema or {}),
        }

        send_email.delay(
            to_email=test_email,
            subject=f'[TEST] {subject}',
            template=template_name,
            context=context,
            user_id=request.user.id,
            campaign_id=campaign.id,
        )

        return Response({'message': f'Test email sent to {test_email}'})

    @action(detail=True, methods=['post'], url_path='ab-winner')
    def ab_winner(self, request, pk=None):
        """POST /api/admin/marketing/campaigns/{id}/ab-winner/"""
        campaign = self.get_object()
        variant_id = request.data.get('variant_id')
        if not variant_id:
            return Response(
                {'error': 'variant_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            variant = CampaignService.select_ab_winner(
                campaign, variant_id, actor=request.user, request=request,
            )
        except (ValueError, CampaignVariant.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CampaignVariantSerializer(variant).data)

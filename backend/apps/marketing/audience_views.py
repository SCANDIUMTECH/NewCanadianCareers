"""
Audience management views for marketing module.
"""
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import generics, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from apps.audit.models import create_audit_log
from .throttles import MarketingBulkThrottle
from .models import MarketingConsent, SuppressionEntry, ContactAttribute, Segment
from .serializers import (
    MarketingConsentSerializer,
    MarketingConsentUpdateSerializer,
    SuppressionEntrySerializer,
    SuppressionEntryCreateSerializer,
    SuppressionImportSerializer,
    SegmentSerializer,
    SegmentCreateUpdateSerializer,
    SegmentPreviewSerializer,
    AudienceOverviewSerializer,
)
from .services.audience_service import AudienceService


class AudienceOverviewView(APIView):
    """GET /api/admin/marketing/audiences/overview/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.users.models import User

        total_contacts = User.objects.filter(status='active').count()
        opted_in = MarketingConsent.objects.filter(status='opted_in').count()
        opted_out = MarketingConsent.objects.filter(status='opted_out').count()
        suppressed_count = SuppressionEntry.objects.count()
        segment_count = Segment.objects.count()
        consent_rate = (opted_in / total_contacts * 100) if total_contacts > 0 else 0

        data = {
            'total_contacts': total_contacts,
            'opted_in': opted_in,
            'opted_out': opted_out,
            'suppressed_count': suppressed_count,
            'segment_count': segment_count,
            'consent_rate': round(consent_rate, 1),
        }
        serializer = AudienceOverviewSerializer(data)
        return Response(serializer.data)


class MarketingConsentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/marketing/audiences/consents/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = MarketingConsentSerializer
    filterset_fields = ['status', 'source', 'express_consent']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'consented_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return MarketingConsent.objects.select_related('user').all()

    def perform_create(self, serializer):
        instance = serializer.save()
        create_audit_log(
            actor=self.request.user,
            action='create',
            target=instance,
            changes={'status': instance.status, 'source': instance.source},
            request=self.request,
        )


class MarketingConsentUpdateView(generics.UpdateAPIView):
    """PATCH /api/admin/marketing/audiences/consents/{id}/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = MarketingConsentUpdateSerializer
    queryset = MarketingConsent.objects.all()

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        if instance.status != old_status:
            if instance.status == 'opted_in':
                instance.consented_at = timezone.now()
                instance.save(update_fields=['consented_at'])
            elif instance.status in ('opted_out', 'unsubscribed'):
                instance.withdrawn_at = timezone.now()
                instance.save(update_fields=['withdrawn_at'])

        create_audit_log(
            actor=self.request.user,
            action='update',
            target=instance,
            changes={'old_status': old_status, 'new_status': instance.status},
            request=self.request,
        )


class SuppressionEntryViewSet(viewsets.ModelViewSet):
    """GET/POST/DELETE /api/admin/marketing/audiences/suppression/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['reason']
    search_fields = ['email', 'notes']
    ordering_fields = ['created_at', 'email']
    ordering = ['-created_at']

    def get_queryset(self):
        return SuppressionEntry.objects.select_related('user').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return SuppressionEntryCreateSerializer
        return SuppressionEntrySerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        create_audit_log(
            actor=self.request.user,
            action='create',
            target=instance,
            changes={'email': instance.email, 'reason': instance.reason},
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            actor=self.request.user,
            action='delete',
            target=instance,
            changes={'email': instance.email, 'reason': instance.reason},
            request=self.request,
        )
        instance.delete()


class SuppressionImportView(APIView):
    """POST /api/admin/marketing/audiences/suppression/import/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [MarketingBulkThrottle]

    def post(self, request):
        serializer = SuppressionImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        emails = serializer.validated_data['emails']
        reason = serializer.validated_data['reason']
        source = serializer.validated_data.get('source', 'import')

        created_count = 0
        skipped_count = 0

        for email in emails:
            _, created = SuppressionEntry.objects.get_or_create(
                email=email.lower(),
                defaults={'reason': reason, 'source': source},
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        create_audit_log(
            actor=request.user,
            action='create',
            target=SuppressionEntry(),
            changes={
                'action': 'bulk_import',
                'total': len(emails),
                'created': created_count,
                'skipped': skipped_count,
            },
            request=request,
        )

        return Response({
            'created': created_count,
            'skipped': skipped_count,
            'total': len(emails),
        }, status=status.HTTP_201_CREATED)


class SegmentViewSet(viewsets.ModelViewSet):
    """GET/POST/PATCH/DELETE /api/admin/marketing/audiences/segments/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['segment_type']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name', 'estimated_size']
    ordering = ['-created_at']
    lookup_field = 'pk'

    def get_queryset(self):
        return Segment.objects.select_related('created_by').all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SegmentCreateUpdateSerializer
        return SegmentSerializer

    def perform_create(self, serializer):
        name = serializer.validated_data['name']
        slug = slugify(name)
        # Handle slug conflicts
        base_slug = slug
        counter = 1
        while Segment.all_objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        instance = serializer.save(
            slug=slug,
            created_by=self.request.user,
        )

        # Compute initial size for dynamic segments
        if instance.segment_type == 'dynamic' and instance.filter_rules.get('rules'):
            AudienceService.compute_segment_size(instance)

        create_audit_log(
            actor=self.request.user,
            action='create',
            target=instance,
            changes={'name': instance.name, 'type': instance.segment_type},
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save()

        # Recompute size for dynamic segments on rule change
        if instance.segment_type == 'dynamic' and instance.filter_rules.get('rules'):
            AudienceService.compute_segment_size(instance)

        create_audit_log(
            actor=self.request.user,
            action='update',
            target=instance,
            changes={'name': instance.name},
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            actor=self.request.user,
            action='delete',
            target=instance,
            changes={'name': instance.name},
            request=self.request,
        )
        instance.delete()  # Soft delete via SoftDeleteMixin


class SegmentPreviewView(APIView):
    """POST /api/admin/marketing/audiences/segments/{id}/preview/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            segment = Segment.objects.get(pk=pk)
        except Segment.DoesNotExist:
            return Response(
                {'error': 'Segment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        result = AudienceService.preview_segment(segment)
        serializer = SegmentPreviewSerializer(result)
        return Response(serializer.data)


class SegmentRefreshView(APIView):
    """POST /api/admin/marketing/audiences/segments/{id}/refresh/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            segment = Segment.objects.get(pk=pk)
        except Segment.DoesNotExist:
            return Response(
                {'error': 'Segment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        count = AudienceService.compute_segment_size(segment)
        return Response({
            'estimated_size': count,
            'last_computed_at': segment.last_computed_at,
        })

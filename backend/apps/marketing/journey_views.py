"""
Journey automation views for marketing module.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from apps.audit.models import create_audit_log
from .models import Journey, JourneyStep, JourneyEnrollment, JourneyStepLog
from .serializers import (
    JourneySerializer,
    JourneyListSerializer,
    JourneyCreateSerializer,
    JourneyUpdateSerializer,
    JourneyStepSerializer,
    JourneyStepCreateUpdateSerializer,
    JourneyEnrollmentSerializer,
    JourneyStepLogSerializer,
    JourneyStatsSerializer,
)
from .services.journey_service import JourneyService


class JourneyViewSet(viewsets.ModelViewSet):
    """
    CRUD for journeys.
    GET    /api/admin/marketing/journeys/
    POST   /api/admin/marketing/journeys/
    GET    /api/admin/marketing/journeys/{id}/
    PATCH  /api/admin/marketing/journeys/{id}/
    DELETE /api/admin/marketing/journeys/{id}/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'pk'

    def get_queryset(self):
        qs = Journey.objects.select_related('created_by').prefetch_related('steps')

        # Filters
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)

        trigger = self.request.query_params.get('trigger_type')
        if trigger:
            qs = qs.filter(trigger_type=trigger)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return JourneyListSerializer
        if self.action == 'create':
            return JourneyCreateSerializer
        if self.action in ('update', 'partial_update'):
            return JourneyUpdateSerializer
        return JourneySerializer

    def perform_create(self, serializer):
        # Use service for slug generation
        journey = JourneyService.create_journey(
            data=serializer.validated_data,
            created_by=self.request.user,
        )
        serializer.instance = journey
        create_audit_log(
            actor=self.request.user,
            action='journey_create',
            target=journey,
            changes={'name': journey.name, 'trigger_type': journey.trigger_type},
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
        instance.soft_delete()

    # ─── Lifecycle Actions ─────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        journey = self.get_object()
        try:
            JourneyService.activate_journey(journey)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            actor=request.user, action='journey_activate',
            target=journey, request=request,
        )
        return Response(JourneySerializer(journey).data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        journey = self.get_object()
        try:
            JourneyService.pause_journey(journey)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            actor=request.user, action='journey_pause',
            target=journey, request=request,
        )
        return Response(JourneySerializer(journey).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        journey = self.get_object()
        try:
            JourneyService.archive_journey(journey)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            actor=request.user, action='journey_archive',
            target=journey, request=request,
        )
        return Response(JourneySerializer(journey).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        journey = self.get_object()
        new_journey = JourneyService.duplicate_journey(journey, created_by=request.user)
        create_audit_log(
            actor=request.user, action='journey_duplicate',
            target=new_journey, request=request,
        )
        return Response(JourneySerializer(new_journey).data, status=status.HTTP_201_CREATED)

    # ─── Enrollments & Stats ───────────────────────────────────────

    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        journey = self.get_object()
        qs = JourneyEnrollment.objects.filter(
            journey=journey
        ).select_related('user', 'current_step')

        s = request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = JourneyEnrollmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = JourneyEnrollmentSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        journey = self.get_object()
        stats = JourneyService.get_journey_stats(journey)
        serializer = JourneyStatsSerializer(stats)
        return Response(serializer.data)

    # ─── Steps (nested) ────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='steps')
    def steps(self, request, pk=None):
        journey = self.get_object()

        if request.method == 'GET':
            steps = journey.steps.all()
            serializer = JourneyStepSerializer(steps, many=True)
            return Response(serializer.data)

        # POST — create a step
        serializer = JourneyStepCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = JourneyStep.objects.create(
            journey=journey,
            **serializer.validated_data,
        )
        return Response(JourneyStepSerializer(step).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path='steps/(?P<step_id>[^/.]+)')
    def step_detail(self, request, pk=None, step_id=None):
        journey = self.get_object()

        try:
            step = JourneyStep.objects.get(id=step_id, journey=journey)
        except JourneyStep.DoesNotExist:
            return Response({'detail': 'Step not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            step.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH
        serializer = JourneyStepCreateUpdateSerializer(step, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(JourneyStepSerializer(step).data)

    @action(detail=True, methods=['post'], url_path='steps/bulk')
    def steps_bulk(self, request, pk=None):
        """Bulk replace all steps for a journey (used by the visual editor)."""
        journey = self.get_object()

        if journey.status not in ('draft', 'paused'):
            return Response(
                {'detail': 'Can only edit steps on draft or paused journeys.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        steps_data = request.data.get('steps', [])
        if not isinstance(steps_data, list):
            return Response(
                {'detail': 'steps must be a list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Delete existing steps and recreate
        journey.steps.all().delete()

        # First pass: create steps without branch FKs
        temp_id_map = {}  # Maps frontend temp IDs to real IDs
        created_steps = []

        for step_data in steps_data:
            temp_id = step_data.pop('temp_id', None)
            # Remove branch refs for second pass
            next_ref = step_data.pop('next_step_ref', None)
            true_ref = step_data.pop('true_branch_ref', None)
            false_ref = step_data.pop('false_branch_ref', None)

            serializer = JourneyStepCreateUpdateSerializer(data=step_data)
            serializer.is_valid(raise_exception=True)
            step = JourneyStep.objects.create(
                journey=journey,
                **serializer.validated_data,
            )
            if temp_id is not None:
                temp_id_map[temp_id] = step
            created_steps.append((step, next_ref, true_ref, false_ref))

        # Second pass: wire branch FKs using temp_id references
        for step, next_ref, true_ref, false_ref in created_steps:
            changed = False
            if next_ref is not None and next_ref in temp_id_map:
                step.next_step = temp_id_map[next_ref]
                changed = True
            if true_ref is not None and true_ref in temp_id_map:
                step.true_branch = temp_id_map[true_ref]
                changed = True
            if false_ref is not None and false_ref in temp_id_map:
                step.false_branch = temp_id_map[false_ref]
                changed = True
            if changed:
                step.save(update_fields=['next_step', 'true_branch', 'false_branch'])

        steps = journey.steps.all()
        return Response(JourneyStepSerializer(steps, many=True).data)

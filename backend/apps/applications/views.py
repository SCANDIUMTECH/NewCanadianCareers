"""
Application views for Orion API.
"""
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.renderers import BaseRenderer

from apps.moderation.turnstile import verify_turnstile_token, get_client_ip
from core.permissions import IsAdmin, IsEmployer, IsCandidate, IsCompanyMember, IsAgency
from .models import Application, ApplicationTimeline, SavedJob, SavedSearch, ApplicationMessage
from .serializers import (
    ApplicationListSerializer, ApplicationDetailSerializer,
    ApplicationCreateSerializer, ApplicationStatusUpdateSerializer,
    ApplicationNoteSerializer, ApplicationTimelineSerializer,
    SavedJobSerializer, SavedJobCreateSerializer,
    SavedSearchSerializer, ApplicationMessageSerializer,
    CandidateApplicationSerializer, AgencyApplicantSerializer
)


# Candidate views
class CandidateApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    """Candidate's applications."""

    permission_classes = [IsAuthenticated, IsCandidate]
    filterset_fields = ['status', 'job__company']
    search_fields = ['job__title', 'job__company__name']
    ordering_fields = ['created_at', 'status_changed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Application.objects.filter(
            candidate=self.request.user
        ).select_related('job', 'job__company')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ApplicationDetailSerializer
        return CandidateApplicationSerializer

    @action(detail=False, methods=['get'])
    def counts(self, request):
        """Get application counts by status."""
        from django.db.models import Count

        counts = Application.objects.filter(
            candidate=request.user
        ).values('status').annotate(count=Count('id'))

        # Create a dict with all statuses (even if zero)
        status_counts = {
            choice[0]: 0 for choice in Application.STATUS_CHOICES
        }

        # Update with actual counts
        for item in counts:
            status_counts[item['status']] = item['count']

        return Response(status_counts)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Withdraw an application."""
        application = self.get_object()
        if application.status in ['hired', 'rejected', 'withdrawn']:
            return Response(
                {'error': 'Cannot withdraw application with current status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.update_status('withdrawn', changed_by=request.user)
        return Response({'message': 'Application withdrawn'})


class ApplyToJobView(generics.CreateAPIView):
    """Apply to a job."""

    serializer_class = ApplicationCreateSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def create(self, request, *args, **kwargs):
        """Override create to add Turnstile verification before application."""
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='applications',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)


class SavedJobViewSet(viewsets.ModelViewSet):
    """Candidate's saved jobs."""

    permission_classes = [IsAuthenticated, IsCandidate]
    ordering = ['-created_at']

    def get_queryset(self):
        return SavedJob.objects.filter(
            candidate=self.request.user
        ).select_related('job', 'job__company')

    def get_serializer_class(self):
        if self.action == 'create':
            return SavedJobCreateSerializer
        return SavedJobSerializer


class SavedSearchViewSet(viewsets.ModelViewSet):
    """Candidate's saved searches (job alerts)."""

    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated, IsCandidate]
    ordering = ['-created_at']

    def get_queryset(self):
        return SavedSearch.objects.filter(candidate=self.request.user)


# Company/Employer views
class CompanyApplicationViewSet(viewsets.ModelViewSet):
    """Company's received applications."""

    permission_classes = [IsAuthenticated, IsEmployer]
    filterset_fields = ['status', 'job', 'rating']
    search_fields = ['candidate__email', 'candidate__first_name', 'candidate__last_name', 'job__title']
    ordering_fields = ['created_at', 'status_changed_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        return Application.objects.filter(
            job__company=self.request.user.company
        ).select_related('job', 'candidate')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ApplicationDetailSerializer
        return ApplicationListSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update application status."""
        application = self.get_object()
        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')

        application.update_status(new_status, changed_by=request.user)

        if notes:
            ApplicationTimeline.objects.create(
                application=application,
                event='note_added',
                notes=notes,
                created_by=request.user
            )

        return Response({'message': 'Status updated'})

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add a note to application."""
        application = self.get_object()
        serializer = ApplicationNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application.notes = serializer.validated_data['notes']
        application.save(update_fields=['notes'])

        ApplicationTimeline.objects.create(
            application=application,
            event='note_added',
            notes=serializer.validated_data['notes'],
            created_by=request.user
        )

        return Response({'message': 'Note added'})

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Rate an application. Send rating=null or rating=0 to clear."""
        application = self.get_object()
        rating = request.data.get('rating')

        # Allow clearing rating with null or 0
        if rating is None or rating == 0:
            application.rating = None
            application.save(update_fields=['rating'])
            return Response({'message': 'Rating cleared'})

        if rating not in range(1, 6):
            return Response(
                {'error': 'Rating must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.rating = rating
        application.save(update_fields=['rating'])

        return Response({'message': 'Rating saved'})

    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        """Bulk update application status."""
        application_ids = request.data.get('application_ids', [])
        new_status = request.data.get('status')

        if not application_ids or not new_status:
            return Response(
                {'error': 'application_ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        applications = self.get_queryset().filter(id__in=application_ids)
        count = applications.count()

        for application in applications:
            application.update_status(new_status, changed_by=request.user)

        return Response({'message': f'Updated {count} applications'})


class ApplicationMessagesView(generics.ListCreateAPIView):
    """Messages for an application."""

    serializer_class = ApplicationMessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_application(self):
        """Get application with ownership verification."""
        from django.db.models import Q
        application_id = self.kwargs['application_id']
        user = self.request.user

        # Build ownership filter: candidate, company member, agency member, or admin
        ownership = Q(candidate=user)
        if getattr(user, 'company_id', None):
            ownership |= Q(job__company_id=user.company_id)
        if getattr(user, 'agency_id', None):
            ownership |= Q(job__agency_id=user.agency_id)
        if getattr(user, 'role', None) == 'admin':
            ownership = Q()  # Admin sees all

        try:
            return Application.objects.filter(ownership).get(id=application_id)
        except Application.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have access to this application')

    def get_queryset(self):
        application = self._get_application()
        return ApplicationMessage.objects.filter(
            application=application
        ).select_related('sender')

    def perform_create(self, serializer):
        application = self._get_application()
        user = self.request.user

        message = serializer.save(
            application=application,
            sender=user
        )

        # Update last contact time
        application.last_contact_at = timezone.now()
        application.save(update_fields=['last_contact_at'])

        # Create timeline entry
        ApplicationTimeline.objects.create(
            application=application,
            event='message_sent',
            created_by=user
        )


class MarkMessagesReadView(APIView):
    """Mark messages as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request, application_id):
        from django.db.models import Q

        # Verify user has access to this application
        user = request.user
        ownership = Q(candidate=user)
        if getattr(user, 'company_id', None):
            ownership |= Q(job__company_id=user.company_id)
        if getattr(user, 'agency_id', None):
            ownership |= Q(job__agency_id=user.agency_id)
        if getattr(user, 'role', None) == 'admin':
            ownership = Q()

        if not Application.objects.filter(ownership, id=application_id).exists():
            return Response(
                {'error': 'You do not have access to this application'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mark all unread messages not sent by this user as read
        ApplicationMessage.objects.filter(
            application_id=application_id,
            is_read=False
        ).exclude(
            sender=request.user
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

        return Response({'message': 'Messages marked as read'})


# Agency views
class AgencyAllApplicationsViewSet(viewsets.ReadOnlyModelViewSet):
    """List all applications for agency's jobs."""

    permission_classes = [IsAuthenticated, IsAgency]
    filterset_fields = ['status', 'job', 'job__company']
    search_fields = ['candidate__email', 'candidate__first_name', 'candidate__last_name', 'job__title']
    ordering_fields = ['created_at', 'status_changed_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        return Application.objects.filter(
            job__agency=self.request.user.agency
        ).select_related('job', 'job__company', 'candidate')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ApplicationDetailSerializer
        return AgencyApplicantSerializer


class AgencyJobApplicantsViewSet(viewsets.ModelViewSet):
    """Agency applicant tracking for a specific job."""

    permission_classes = [IsAuthenticated, IsAgency]
    filterset_fields = ['status', 'rating']
    search_fields = ['candidate__email', 'candidate__first_name', 'candidate__last_name']
    ordering_fields = ['created_at', 'status_changed_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        job_id = self.kwargs.get('job_id')
        return Application.objects.filter(
            job_id=job_id,
            job__agency=self.request.user.agency
        ).select_related('job', 'candidate')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ApplicationDetailSerializer
        return AgencyApplicantSerializer

    @action(detail=True, methods=['patch'])
    def update_status(self, request, job_id=None, pk=None):
        """Update application status."""
        application = self.get_object()
        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')

        application.update_status(new_status, changed_by=request.user)

        if notes:
            ApplicationTimeline.objects.create(
                application=application,
                event='note_added',
                notes=notes,
                created_by=request.user
            )

        return Response({'message': 'Status updated'})

    @action(detail=True, methods=['post'])
    def note(self, request, job_id=None, pk=None):
        """Add a note to application."""
        application = self.get_object()
        note_text = request.data.get('note')

        if not note_text:
            return Response(
                {'error': 'note is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ApplicationTimeline.objects.create(
            application=application,
            event='note_added',
            notes=note_text,
            created_by=request.user
        )

        return Response({'message': 'Note added'})

    @action(detail=True, methods=['post'])
    def submit(self, request, job_id=None, pk=None):
        """Submit applicant to client company."""
        application = self.get_object()
        notes = request.data.get('notes', '')

        # Update status to submitted (or shortlisted)
        application.update_status('shortlisted', changed_by=request.user)

        # Add timeline entry
        ApplicationTimeline.objects.create(
            application=application,
            event='note_added',
            notes=f'Submitted to client. {notes}',
            created_by=request.user
        )

        # TODO: Send notification to client company
        return Response({'message': 'Applicant submitted to client'})


# Admin views
class AdminApplicationViewSet(viewsets.ModelViewSet):
    """Admin application management."""

    queryset = Application.objects.all().select_related('job', 'job__company', 'candidate')
    serializer_class = ApplicationDetailSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'job', 'job__company']
    search_fields = ['candidate__email', 'job__title', 'job__company__name']
    ordering = ['-created_at']


# Additional company application endpoints
class CompanyBulkApplicationStatusView(APIView):
    """Bulk update application status."""

    permission_classes = [IsAuthenticated, IsEmployer]
    MAX_BATCH_SIZE = 100

    def post(self, request):
        application_ids = request.data.get('ids', [])
        new_status = request.data.get('status')

        if not application_ids or not new_status:
            return Response(
                {'error': 'ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(application_ids) > self.MAX_BATCH_SIZE:
            return Response(
                {'error': f'Maximum {self.MAX_BATCH_SIZE} applications per batch'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filter applications belonging to the user's company
        applications = Application.objects.filter(
            id__in=application_ids,
            job__company=request.user.company
        )
        count = applications.count()

        for application in applications:
            application.update_status(new_status, changed_by=request.user)

        return Response({'message': f'Updated {count} applications'})


class _CSVRenderer(BaseRenderer):
    """Renderer for CSV export — returns pre-built content as-is."""
    media_type = 'text/csv'
    format = 'csv'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class CompanyExportApplicationsView(APIView):
    """Export applications as CSV."""

    permission_classes = [IsAuthenticated, IsEmployer]
    renderer_classes = [_CSVRenderer]

    def get(self, request):
        import csv
        import io
        from django.http import StreamingHttpResponse

        qs = Application.objects.filter(
            job__company=request.user.company
        ).select_related('job', 'candidate')

        # Apply filters if provided
        status_filter = request.query_params.get('status')
        job_id = request.query_params.get('job_id')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        if job_id:
            qs = qs.filter(job_id=job_id)

        def csv_rows():
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                'ID', 'Candidate Name', 'Candidate Email', 'Job Title',
                'Status', 'Applied At', 'Rating', 'Notes'
            ])
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

            for app in qs.iterator(chunk_size=500):
                writer.writerow([
                    app.id, app.candidate.get_full_name(), app.candidate.email,
                    app.job.title, app.status, app.created_at,
                    app.rating or '', app.notes or ''
                ])
                yield buf.getvalue()
                buf.seek(0)
                buf.truncate(0)

        resp = StreamingHttpResponse(csv_rows(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="applications-export.csv"'
        return resp


class CompanyApplicationStatsView(APIView):
    """Application statistics for company."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        from django.db.models import Count

        qs = Application.objects.filter(job__company=request.user.company)

        total = qs.count()
        by_status = dict(
            qs.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        # Get applications in last 30 days
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = qs.filter(created_at__gte=thirty_days_ago).count()

        data = {
            'total': total,
            'recent_30_days': recent,
            'by_status': by_status,
        }

        return Response(data)

"""
Job views for Orion API.
"""
import csv
import uuid
from datetime import timedelta
from urllib.parse import urlparse
from django.db.models import F, Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse as DjangoHttpResponse
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

from core.permissions import IsAdmin, IsEmployer, IsAgency, IsCompanyMember
from apps.applications.models import Application
from apps.moderation.turnstile import verify_turnstile_token, get_client_ip
from .models import Job, JobReport, JobView
from .serializers import (
    JobListSerializer, JobDetailSerializer, JobCreateSerializer, JobUpdateSerializer,
    JobReportSerializer, JobReportCreateSerializer,
    AdminJobSerializer, AdminJobDetailSerializer, AdminJobApproveSerializer,
    AdminJobReportSerializer, BulkJobImportItemSerializer
)
from .services import (
    consume_credit, get_package_duration, get_credit_summary, was_credit_consumed,
    requires_approval, requires_reapproval_on_edit,
    can_edit_published_job, validate_max_active_jobs,
    validate_salary_required, validate_prohibited_keywords,
    validate_allowed_categories, validate_max_duration,
    validate_external_url, validate_refresh_allowed,
    run_spam_detection, check_for_duplicates,
    get_job_policy, InsufficientCreditsError, PolicyViolationError,
)


def get_visitor_id(request):
    """Get or create visitor ID for anonymous tracking."""
    visitor_id = request.COOKIES.get('visitor_id')
    if not visitor_id:
        visitor_id = str(uuid.uuid4())
    return visitor_id


class PublicJobViewSet(viewsets.ReadOnlyModelViewSet):
    """Public job listing and detail. Lookup by job_id (e.g. /api/jobs/K939V3/)."""

    queryset = Job.objects.filter(
        status='published',
        expires_at__gt=timezone.now()
    ).select_related('company')
    permission_classes = [AllowAny]
    lookup_field = 'job_id'
    filterset_fields = [
        'company', 'employment_type', 'experience_level',
        'category', 'location_type', 'country', 'city'
    ]
    search_fields = ['title', 'description', 'skills', 'company__name']
    ordering_fields = ['posted_at', 'salary_min', 'views']
    ordering = ['-featured', '-posted_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        # Track view
        visitor_id = get_visitor_id(request)
        ip = request.META.get('REMOTE_ADDR')

        # Check if this visitor has viewed this job recently
        recent_view = JobView.objects.filter(
            job=instance,
            visitor_id=visitor_id,
            created_at__gte=timezone.now() - timezone.timedelta(hours=24)
        ).exists()

        if not recent_view:
            JobView.objects.create(
                job=instance,
                visitor_id=visitor_id,
                user=request.user if request.user.is_authenticated else None,
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', '')
            )
            # Update counters
            Job.objects.filter(pk=instance.pk).update(
                views=F('views') + 1,
                unique_views=F('unique_views') + 1
            )
        else:
            Job.objects.filter(pk=instance.pk).update(views=F('views') + 1)

        serializer = self.get_serializer(instance)
        response = Response(serializer.data)
        from django.conf import settings as django_settings
        response.set_cookie(
            'visitor_id', visitor_id,
            max_age=365 * 24 * 60 * 60,
            httponly=True,
            samesite='Lax',
            secure=not django_settings.DEBUG,
        )
        return response


class CompanyJobViewSet(viewsets.ModelViewSet):
    """Company job management."""

    permission_classes = [IsAuthenticated, IsEmployer]
    lookup_field = 'job_id'
    filterset_fields = ['status', 'employment_type', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['posted_at', 'expires_at', 'applications_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Job.objects.filter(
            company=self.request.user.company
        ).select_related('company')

        # Include trashed jobs when explicitly requested
        show_trashed = self.request.query_params.get('trash')
        if show_trashed == 'true':
            qs = Job.all_objects.filter(
                company=self.request.user.company,
                deleted_at__isnull=False,
            ).select_related('company')

        return qs

    def get_serializer_class(self):
        if self.action in ['create']:
            return JobCreateSerializer
        if self.action in ['update', 'partial_update']:
            return JobUpdateSerializer
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobListSerializer

    def create(self, request, *args, **kwargs):
        """Override create to add Turnstile verification before job creation."""
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='jobs',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        company = self.request.user.company

        # Policy: validate salary if required
        validate_salary_required(serializer.validated_data)

        # Policy: validate allowed categories
        try:
            validate_allowed_categories(serializer.validated_data)
        except PolicyViolationError as e:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({'category': [str(e)]})

        # Policy: check prohibited keywords
        matches = validate_prohibited_keywords({
            'title': serializer.validated_data.get('title', ''),
            'description': serializer.validated_data.get('description', ''),
        })
        if matches:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({
                'prohibited_keywords': [
                    f'Prohibited keyword "{m["keyword"]}" found in {m["field"]}'
                    for m in matches
                ]
            })

        # Policy: validate external URL
        if serializer.validated_data.get('apply_method') == 'external':
            url_result = validate_external_url(
                serializer.validated_data.get('apply_url', '')
            )
            if not url_result.get('valid'):
                from rest_framework import serializers as drf_serializers
                raise drf_serializers.ValidationError({
                    'apply_url': [url_result.get('error', 'Invalid external URL')]
                })

        # Policy: check for duplicate jobs
        duplicates = check_for_duplicates(
            company, serializer.validated_data.get('title', '')
        )
        if duplicates:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({
                'title': [
                    f'A similar job already exists (ID: {duplicates[0]["id"]}). '
                    f'Please edit the existing job or change the title.'
                ],
                'duplicates': duplicates,
            })

        # Policy: run spam detection
        spam_result = run_spam_detection(serializer.validated_data)

        serializer.save(
            company=company,
            posted_by=self.request.user,
            spam_score=spam_result.get('spam_score', 0),
        )

        # If spam score exceeds threshold, force pending review
        job = serializer.instance
        policy = get_job_policy()
        threshold = policy.get('spam_detection_threshold', 70)
        if spam_result['spam_score'] >= threshold and job.status == 'draft':
            job.status = 'pending'
            job.save(update_fields=['status'])

            # Notify admins about spam-flagged job
            try:
                from apps.notifications.tasks import notify_job_pending_review
                notify_job_pending_review.delay(job.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue notify_job_pending_review for spam job %s", job.id,
                )

    def update(self, request, *args, **kwargs):
        """Override to return full job detail in response (not just writable fields)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        # Return full detail representation so frontend has id, status, company, etc.
        detail_serializer = JobDetailSerializer(instance)
        return Response(detail_serializer.data)

    def perform_update(self, serializer):
        """Enforce editing restrictions, audit trail, and re-approval policy."""
        job = serializer.instance
        company = job.company

        # Check if editing is locked for published jobs
        if job.status == 'published' and not can_edit_published_job(company):
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({
                'error': 'Editing is locked for published jobs. Contact platform admin.'
            })

        # Capture before-values for audit trail
        changed_fields = set(serializer.validated_data.keys())
        before_values = {}
        for field in changed_fields:
            old_val = getattr(job, field, None)
            # Coerce Decimal/datetime to str for JSON serialisation
            if hasattr(old_val, 'isoformat'):
                old_val = old_val.isoformat()
            elif hasattr(old_val, '__float__'):
                old_val = float(old_val)
            before_values[field] = old_val

        serializer.save()

        # Build after-values and compute diff
        changes = {}
        for field in changed_fields:
            new_val = getattr(job, field, None)
            if hasattr(new_val, 'isoformat'):
                new_val = new_val.isoformat()
            elif hasattr(new_val, '__float__'):
                new_val = float(new_val)
            old_val = before_values.get(field)
            if old_val != new_val:
                changes[field] = {'old': old_val, 'new': new_val}

        # Write audit log if anything actually changed
        if changes:
            from apps.audit.models import create_audit_log
            create_audit_log(
                actor=self.request.user,
                action='update',
                target=job,
                changes=changes,
                request=self.request,
            )

        # If published and critical fields changed, check re-approval
        if job.status == 'published' and requires_reapproval_on_edit(job, changed_fields):
            job.status = 'pending'
            job.save(update_fields=['status'])

    @action(detail=True, methods=['post'])
    def publish(self, request, job_id=None):
        """Publish a job immediately or schedule for a future date."""
        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='jobs',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            # Lock the job row to prevent concurrent publish (TOCTOU race)
            job = Job.objects.select_for_update().get(
                job_id=job_id, company=request.user.company
            )

            if job.status not in ['draft', 'paused', 'scheduled', 'pending_payment']:
                return Response(
                    {'error': 'Job cannot be published from current status'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            entity = job.agency or job.company

            # Policy: check max active jobs
            try:
                validate_max_active_jobs(job.company)
            except PolicyViolationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # Approval check: does this company need admin approval?
            # Credit is consumed at approve time (not here) to avoid losing
            # credits if the job is rejected.
            if requires_approval(job.company) and job.status != 'paused':
                job.status = 'pending'
                job.save(update_fields=['status'])

                # Notify admins that a job needs review
                try:
                    from apps.notifications.tasks import notify_job_pending_review
                    notify_job_pending_review.delay(job.id)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Failed to queue notify_job_pending_review for job %s", job.id,
                    )

                serializer = self.get_serializer(job)
                return Response(serializer.data)

            # Credit check: consume a job post credit (only for immediate publish)
            try:
                entitlement = consume_credit(entity, job, 'job_post')
                duration_days = entitlement.post_duration_days
            except InsufficientCreditsError:
                return Response(
                    {'error': 'No available job posting credits. Please purchase a package.'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # Policy: enforce max duration
            try:
                validate_max_duration(duration_days)
            except PolicyViolationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            scheduled_at = request.data.get('scheduled_publish_at')

            if scheduled_at:
                from dateutil.parser import parse as parse_dt
                publish_at = parse_dt(scheduled_at)
                if publish_at <= timezone.now():
                    return Response(
                        {'error': 'Scheduled date must be in the future'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                job.schedule(publish_at=publish_at, duration_days=duration_days)

                # Dispatch Celery task with eta for auto-publish
                try:
                    from .tasks import publish_scheduled_job
                    publish_scheduled_job.apply_async(args=[job.id], eta=publish_at)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Failed to queue publish_scheduled_job for job %s — broker may be unavailable",
                        job.id,
                    )

                serializer = self.get_serializer(job)
                return Response(serializer.data)
            else:
                job.publish(duration_days=duration_days)

                # Trigger async AI generation (SEO meta + social posts) if enabled
                try:
                    from apps.ai.tasks import auto_generate_on_publish
                    auto_generate_on_publish.delay(job.id, user_id=request.user.id)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Failed to queue auto_generate_on_publish for job %s — broker may be unavailable",
                        job.id,
                    )

                serializer = self.get_serializer(job)
                return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pause(self, request, job_id=None):
        """Pause a job."""
        job = self.get_object()
        if job.status not in ['published', 'scheduled']:
            return Response(
                {'error': 'Only published or scheduled jobs can be paused'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.pause()
        return Response({'message': 'Job paused'})

    @action(detail=True, methods=['post'])
    def extend(self, request, job_id=None):
        """Extend a published job — consumes a job post credit."""
        job = self.get_object()

        if job.status != 'published':
            return Response(
                {'error': 'Only published jobs can be extended. Expired jobs must be re-posted as a new listing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entity = job.agency or job.company

        # Consume a credit for extension
        try:
            consume_credit(entity, job, 'job_post')
        except InsufficientCreditsError:
            return Response(
                {'error': 'No available credits for extension. Please purchase a package.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        days = request.data.get('days', 30)
        job.extend(days=days)
        return Response({'message': f'Job extended by {days} days'})

    @action(detail=True, methods=['post'])
    def feature(self, request, job_id=None):
        """Toggle featured status — requires featured credits to enable."""
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            job = Job.objects.select_for_update().get(
                job_id=job_id, company=request.user.company
            )
            entity = job.agency or job.company

            if not job.featured:
                # Enabling featured — consume a featured credit
                try:
                    consume_credit(entity, job, 'featured')
                except InsufficientCreditsError:
                    return Response(
                        {'error': 'No available featured credits. Please purchase a package.'},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )

            job.featured = not job.featured
            job.save(update_fields=['featured'])
        return Response({
            'message': 'Featured status updated',
            'featured': job.featured
        })

    @action(detail=True, methods=['post'])
    def resume(self, request, job_id=None):
        """Resume a paused job (un-pause)."""
        job = self.get_object()
        if job.status != 'paused':
            return Response(
                {'error': 'Only paused jobs can be resumed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.status = 'published'
        job.save(update_fields=['status'])
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_filled(self, request, job_id=None):
        """Mark a job as filled (position closed)."""
        job = self.get_object()
        if job.status not in ['published', 'paused', 'expired']:
            return Response(
                {'error': 'Job cannot be marked as filled from current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.mark_filled()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, job_id=None):
        """Duplicate an existing job as a new draft."""
        original = self.get_object()
        new_job = Job(
            company=original.company,
            agency=original.agency,
            posted_by=request.user,
            title=f'{original.title} (Copy)',
            employment_type=original.employment_type,
            experience_level=original.experience_level,
            category=original.category,
            # Details
            description=original.description,
            responsibilities=original.responsibilities,
            requirements=original.requirements,
            nice_to_have=original.nice_to_have,
            skills=original.skills,
            benefits=original.benefits,
            # Location
            address=original.address,
            city=original.city,
            state=original.state,
            postal_code=original.postal_code,
            country=original.country,
            location_type=original.location_type,
            timezone=original.timezone,
            # Compensation
            salary_min=original.salary_min,
            salary_max=original.salary_max,
            salary_currency=original.salary_currency,
            salary_period=original.salary_period,
            show_salary=original.show_salary,
            equity=original.equity,
            equity_min=original.equity_min,
            equity_max=original.equity_max,
            # Application
            apply_method=original.apply_method,
            apply_url=original.apply_url,
            apply_email=original.apply_email,
            apply_instructions=original.apply_instructions,
            # Draft — no expiry until published
            status='draft',
            expires_at=None,
        )
        new_job.save()
        serializer = self.get_serializer(new_job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def refresh(self, request, job_id=None):
        """Refresh/bump a published job to the top of search results.

        Consumes one job_post credit.  Respects cooldown policy.
        """
        job = self.get_object()
        entity = job.agency or job.company

        try:
            validate_refresh_allowed(job)
        except PolicyViolationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            consume_credit(entity, job, 'job_post')
        except InsufficientCreditsError:
            return Response(
                {'error': 'No available credits for refresh. Please purchase a package.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        job.refresh()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='trash')
    def move_to_trash(self, request, job_id=None):
        """Soft-delete a job (move to trash)."""
        job = self.get_object()
        job.delete()  # SoftDeleteMixin sets deleted_at
        return Response({'message': 'Job moved to trash'})

    @action(detail=True, methods=['post'])
    def restore(self, request, job_id=None):
        """Restore a soft-deleted job from trash."""
        try:
            job = Job.all_objects.get(
                job_id=job_id,
                company=self.request.user.company,
                deleted_at__isnull=False,
            )
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )
        job.restore()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trash(self, request):
        """GET /api/jobs/company/trash/ — list trashed jobs."""
        qs = Job.all_objects.filter(
            company=self.request.user.company,
            deleted_at__isnull=False,
        ).select_related('company').order_by('-deleted_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/jobs/company/stats/ — job stats for the employer's company."""
        from django.db.models import Sum
        policy = get_job_policy()
        qs = self.get_queryset()
        return Response({
            'total_jobs': qs.count(),
            'published_jobs': qs.filter(status='published').count(),
            'draft_jobs': qs.filter(status='draft').count(),
            'pending_jobs': qs.filter(status='pending').count(),
            'paused_jobs': qs.filter(status='paused').count(),
            'expired_jobs': qs.filter(status='expired').count(),
            'filled_jobs': qs.filter(status='filled').count(),
            'total_views': qs.aggregate(total=Sum('views'))['total'] or 0,
            'total_applications': qs.aggregate(total=Sum('applications_count'))['total'] or 0,
            'expired_retention_days': policy.get('expired_retention_days', 0),
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """GET /api/jobs/company/analytics/ — time-series analytics for company jobs."""
        # Parse query params
        period = request.query_params.get('period', '30d')
        job_id = request.query_params.get('job_id')

        # Determine date range
        period_map = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
        }
        days = period_map.get(period, 30)
        start_date = timezone.now() - timedelta(days=days)

        # Base querysets
        company = self.request.user.company
        jobs_qs = Job.objects.filter(company=company)

        if job_id:
            jobs_qs = jobs_qs.filter(id=job_id)

        # Time-series data: views and applications by date
        views_by_date = (
            JobView.objects.filter(
                job__company=company,
                created_at__gte=start_date
            )
        )
        if job_id:
            views_by_date = views_by_date.filter(job_id=job_id)

        views_timeseries = (
            views_by_date
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                views=Count('id'),
                unique_views=Count('visitor_id', distinct=True)
            )
            .order_by('date')
        )

        applications_by_date = (
            Application.objects.filter(
                job__company=company,
                created_at__gte=start_date
            )
        )
        if job_id:
            applications_by_date = applications_by_date.filter(job_id=job_id)

        applications_timeseries = (
            applications_by_date
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(applications=Count('id'))
            .order_by('date')
        )

        # Merge views and applications by date
        views_dict = {str(item['date']): item for item in views_timeseries}
        apps_dict = {str(item['date']): item for item in applications_timeseries}

        all_dates = sorted(set(views_dict.keys()) | set(apps_dict.keys()))
        timeseries = []
        for date_str in all_dates:
            timeseries.append({
                'date': date_str,
                'views': views_dict.get(date_str, {}).get('views', 0),
                'unique_views': views_dict.get(date_str, {}).get('unique_views', 0),
                'applications': apps_dict.get(date_str, {}).get('applications', 0),
            })

        # Sources: parse referrer domain (limit to prevent memory issues)
        sources_qs = views_by_date.exclude(referrer='')
        sources_data = [
            urlparse(r).netloc or 'direct'
            for r in sources_qs.values_list('referrer', flat=True)[:5000]
        ]

        # Count direct views (empty referrer)
        direct_count = views_by_date.filter(referrer='').count()

        # Aggregate sources
        from collections import Counter
        source_counts = Counter(sources_data)
        source_counts['direct'] = direct_count
        sources = [
            {'source': source, 'count': count}
            for source, count in source_counts.most_common()
        ]

        # Summary stats
        total_views = sum(item['views'] for item in timeseries)
        total_unique_views = sum(item['unique_views'] for item in timeseries)
        total_applications = sum(item['applications'] for item in timeseries)
        conversion_rate = (total_applications / total_views * 100) if total_views > 0 else 0
        avg_views_per_day = total_views / days if days > 0 else 0

        return Response({
            'timeseries': timeseries,
            'sources': sources,
            'summary': {
                'total_views': total_views,
                'total_unique_views': total_unique_views,
                'total_applications': total_applications,
                'conversion_rate': round(conversion_rate, 2),
                'avg_views_per_day': round(avg_views_per_day, 2),
            }
        })


class AgencyJobViewSet(viewsets.ModelViewSet):
    """Agency job management — mirrors CompanyJobViewSet lifecycle actions."""

    permission_classes = [IsAuthenticated, IsAgency]
    lookup_field = 'job_id'
    filterset_fields = ['status', 'company', 'employment_type', 'category']
    search_fields = ['title', 'description', 'company__name']
    ordering_fields = ['posted_at', 'expires_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Job.objects.filter(
            agency=self.request.user.agency
        ).select_related('company', 'agency')

    def get_serializer_class(self):
        if self.action in ['create']:
            return JobCreateSerializer
        if self.action in ['update', 'partial_update']:
            return JobUpdateSerializer
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobListSerializer

    def create(self, request, *args, **kwargs):
        """Override create to add Turnstile verification before job creation."""
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='jobs',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers

        # Agency must specify the company
        company_id = self.request.data.get('company')
        if not company_id:
            raise drf_serializers.ValidationError({'company': 'Company is required'})

        from apps.companies.models import AgencyClient
        # Verify agency has this company as a client
        if not AgencyClient.objects.filter(
            agency=self.request.user.agency,
            company_id=company_id,
            is_active=True
        ).exists():
            raise drf_serializers.ValidationError({
                'company': 'Company is not an active client of this agency'
            })

        # Policy: validate salary if required
        validate_salary_required(serializer.validated_data)

        # Policy: validate allowed categories
        try:
            validate_allowed_categories(serializer.validated_data)
        except PolicyViolationError as e:
            raise drf_serializers.ValidationError({'category': [str(e)]})

        # Policy: check prohibited keywords (was missing for agency — bug fix)
        matches = validate_prohibited_keywords({
            'title': serializer.validated_data.get('title', ''),
            'description': serializer.validated_data.get('description', ''),
        })
        if matches:
            raise drf_serializers.ValidationError({
                'prohibited_keywords': [
                    f'Prohibited keyword "{m["keyword"]}" found in {m["field"]}'
                    for m in matches
                ]
            })

        # Policy: validate external URL
        if serializer.validated_data.get('apply_method') == 'external':
            url_result = validate_external_url(
                serializer.validated_data.get('apply_url', '')
            )
            if not url_result.get('valid'):
                raise drf_serializers.ValidationError({
                    'apply_url': [url_result.get('error', 'Invalid external URL')]
                })

        # Policy: check for duplicate jobs
        from apps.companies.models import Company as _Company
        try:
            dup_company = _Company.objects.get(id=company_id)
        except _Company.DoesNotExist:
            dup_company = None

        if dup_company:
            duplicates = check_for_duplicates(
                dup_company, serializer.validated_data.get('title', '')
            )
            if duplicates:
                raise drf_serializers.ValidationError({
                    'title': [
                        f'A similar job already exists (ID: {duplicates[0]["id"]}). '
                        f'Please edit the existing job or change the title.'
                    ],
                    'duplicates': duplicates,
                })

        # Policy: run spam detection
        spam_result = run_spam_detection(serializer.validated_data)

        serializer.save(
            agency=self.request.user.agency,
            posted_by=self.request.user,
            spam_score=spam_result.get('spam_score', 0),
        )

        # If spam score exceeds threshold, force pending review
        job = serializer.instance
        policy = get_job_policy()
        threshold = policy.get('spam_detection_threshold', 70)
        if spam_result['spam_score'] >= threshold and job.status == 'draft':
            job.status = 'pending'
            job.save(update_fields=['status'])

            # Notify admins about spam-flagged job
            try:
                from apps.notifications.tasks import notify_job_pending_review
                notify_job_pending_review.delay(job.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue notify_job_pending_review for spam job %s", job.id,
                )

    def update(self, request, *args, **kwargs):
        """Override to return full job detail in response (not just writable fields)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        detail_serializer = JobDetailSerializer(instance)
        return Response(detail_serializer.data)

    def perform_update(self, serializer):
        """Audit trail for agency job edits."""
        job = serializer.instance

        # Capture before-values
        changed_fields = set(serializer.validated_data.keys())
        before_values = {}
        for field in changed_fields:
            old_val = getattr(job, field, None)
            if hasattr(old_val, 'isoformat'):
                old_val = old_val.isoformat()
            elif hasattr(old_val, '__float__'):
                old_val = float(old_val)
            before_values[field] = old_val

        serializer.save()

        # Build diff
        changes = {}
        for field in changed_fields:
            new_val = getattr(job, field, None)
            if hasattr(new_val, 'isoformat'):
                new_val = new_val.isoformat()
            elif hasattr(new_val, '__float__'):
                new_val = float(new_val)
            old_val = before_values.get(field)
            if old_val != new_val:
                changes[field] = {'old': old_val, 'new': new_val}

        if changes:
            from apps.audit.models import create_audit_log
            create_audit_log(
                actor=self.request.user,
                action='update',
                target=job,
                changes=changes,
                request=self.request,
            )

    @action(detail=True, methods=['post'])
    def publish(self, request, job_id=None):
        """Publish a job — same logic as CompanyJobViewSet."""
        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='jobs',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        job = self.get_object()
        if job.status not in ['draft', 'paused', 'scheduled', 'pending_payment']:
            return Response(
                {'error': 'Job cannot be published from current status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        entity = job.agency or job.company

        try:
            validate_max_active_jobs(job.company)
        except PolicyViolationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Check approval requirement before consuming credits
        if requires_approval(job.company) and job.status != 'paused':
            job.status = 'pending'
            job.save(update_fields=['status'])

            # Notify admins that a job needs review
            try:
                from apps.notifications.tasks import notify_job_pending_review
                notify_job_pending_review.delay(job.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue notify_job_pending_review for job %s", job.id,
                )

            serializer = self.get_serializer(job)
            return Response(serializer.data)

        try:
            entitlement = consume_credit(entity, job, 'job_post')
            duration_days = entitlement.post_duration_days
        except InsufficientCreditsError:
            return Response(
                {'error': 'No available job posting credits. Please purchase a package.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # Policy: enforce max duration
        try:
            validate_max_duration(duration_days)
        except PolicyViolationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_at = request.data.get('scheduled_publish_at')
        if scheduled_at:
            from dateutil.parser import parse as parse_dt
            publish_at = parse_dt(scheduled_at)
            if publish_at <= timezone.now():
                return Response(
                    {'error': 'Scheduled date must be in the future'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            job.schedule(publish_at=publish_at, duration_days=duration_days)
            try:
                from .tasks import publish_scheduled_job
                publish_scheduled_job.apply_async(args=[job.id], eta=publish_at)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue publish_scheduled_job for job %s — broker may be unavailable",
                    job.id,
                )
        else:
            job.publish(duration_days=duration_days)

            # Trigger async AI generation (SEO meta + social posts) if enabled
            try:
                from apps.ai.tasks import auto_generate_on_publish
                auto_generate_on_publish.delay(job.id, user_id=request.user.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue auto_generate_on_publish for job %s — broker may be unavailable",
                    job.id,
                )

        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pause(self, request, job_id=None):
        """Pause a job."""
        job = self.get_object()
        if job.status not in ['published', 'scheduled']:
            return Response(
                {'error': 'Only published or scheduled jobs can be paused'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.pause()
        return Response({'message': 'Job paused'})

    @action(detail=True, methods=['post'])
    def resume(self, request, job_id=None):
        """Resume a paused job."""
        job = self.get_object()
        if job.status != 'paused':
            return Response(
                {'error': 'Only paused jobs can be resumed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.status = 'published'
        job.save(update_fields=['status'])
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def extend(self, request, job_id=None):
        """Extend a published job — consumes a job post credit."""
        job = self.get_object()

        if job.status != 'published':
            return Response(
                {'error': 'Only published jobs can be extended. Expired jobs must be re-posted as a new listing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entity = job.agency or job.company

        try:
            consume_credit(entity, job, 'job_post')
        except InsufficientCreditsError:
            return Response(
                {'error': 'No available credits for extension.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        days = request.data.get('days', 30)
        job.extend(days=days)
        return Response({'message': f'Job extended by {days} days'})

    @action(detail=True, methods=['post'])
    def feature(self, request, job_id=None):
        """Toggle featured status — requires featured credits."""
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            job = Job.objects.select_for_update().get(
                job_id=job_id, agency=request.user.agency
            )
            entity = job.agency or job.company

            if not job.featured:
                try:
                    consume_credit(entity, job, 'featured')
                except InsufficientCreditsError:
                    return Response(
                        {'error': 'No available featured credits.'},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )

            job.featured = not job.featured
            job.save(update_fields=['featured'])
        return Response({'message': 'Featured status updated', 'featured': job.featured})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, job_id=None):
        """Duplicate an existing job as a new draft."""
        original = self.get_object()
        new_job = Job(
            company=original.company,
            agency=original.agency,
            posted_by=request.user,
            title=f'{original.title} (Copy)',
            employment_type=original.employment_type,
            experience_level=original.experience_level,
            category=original.category,
            # Details
            description=original.description,
            responsibilities=original.responsibilities,
            requirements=original.requirements,
            nice_to_have=original.nice_to_have,
            skills=original.skills,
            benefits=original.benefits,
            # Location
            address=original.address,
            city=original.city,
            state=original.state,
            postal_code=original.postal_code,
            country=original.country,
            location_type=original.location_type,
            timezone=original.timezone,
            # Compensation
            salary_min=original.salary_min,
            salary_max=original.salary_max,
            salary_currency=original.salary_currency,
            salary_period=original.salary_period,
            show_salary=original.show_salary,
            equity=original.equity,
            equity_min=original.equity_min,
            equity_max=original.equity_max,
            # Application
            apply_method=original.apply_method,
            apply_url=original.apply_url,
            apply_email=original.apply_email,
            apply_instructions=original.apply_instructions,
            # Draft — no expiry until published
            status='draft',
            expires_at=None,
        )
        new_job.save()
        serializer = self.get_serializer(new_job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_filled(self, request, job_id=None):
        """Mark a job as filled."""
        job = self.get_object()
        if job.status not in ['published', 'paused', 'expired']:
            return Response(
                {'error': 'Job cannot be marked as filled from current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.mark_filled()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def refresh(self, request, job_id=None):
        """Refresh/bump a published job to the top of search results."""
        job = self.get_object()
        entity = job.agency or job.company

        try:
            validate_refresh_allowed(job)
        except PolicyViolationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            consume_credit(entity, job, 'job_post')
        except InsufficientCreditsError:
            return Response(
                {'error': 'No available credits for refresh.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        job.refresh()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='trash')
    def move_to_trash(self, request, job_id=None):
        """Soft-delete a job."""
        job = self.get_object()
        job.delete()
        return Response({'message': 'Job moved to trash'})

    @action(detail=True, methods=['post'])
    def restore(self, request, job_id=None):
        """Restore a trashed job."""
        try:
            job = Job.all_objects.get(
                job_id=job_id,
                agency=self.request.user.agency,
                deleted_at__isnull=False,
            )
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )
        job.restore()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Agency job stats."""
        from django.db.models import Sum
        policy = get_job_policy()
        qs = self.get_queryset()
        return Response({
            'total_jobs': qs.count(),
            'published_jobs': qs.filter(status='published').count(),
            'draft_jobs': qs.filter(status='draft').count(),
            'pending_jobs': qs.filter(status='pending').count(),
            'paused_jobs': qs.filter(status='paused').count(),
            'expired_jobs': qs.filter(status='expired').count(),
            'total_views': qs.aggregate(total=Sum('views'))['total'] or 0,
            'total_applications': qs.aggregate(total=Sum('applications_count'))['total'] or 0,
            'expired_retention_days': policy.get('expired_retention_days', 0),
        })


class JobCategoriesView(APIView):
    """Return the list of job categories with counts.

    Pulls active categories from the Category table (managed by admins),
    with a fallback to Job.CATEGORY_CHOICES if the table is empty.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.moderation.models import Category

        db_categories = Category.objects.filter(is_active=True).order_by('sort_order', 'name')

        if db_categories.exists():
            categories = []
            for cat in db_categories:
                count = Job.objects.filter(
                    category=cat.slug, status='published', expires_at__gt=timezone.now()
                ).count()
                categories.append({
                    'value': cat.slug,
                    'label': cat.name,
                    'count': count,
                })
        else:
            # Fallback to hardcoded choices
            categories = []
            for value, label in Job.CATEGORY_CHOICES:
                count = Job.objects.filter(
                    category=value, status='published', expires_at__gt=timezone.now()
                ).count()
                categories.append({
                    'value': value,
                    'label': label,
                    'count': count,
                })

        return Response(categories)


class JobReportView(generics.CreateAPIView):
    """Report a job (public)."""

    serializer_class = JobReportCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, status='published')
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report = JobReport.objects.create(
            job=job,
            reporter=request.user if request.user.is_authenticated else None,
            **serializer.validated_data
        )

        # Update report count
        Job.objects.filter(pk=job_id).update(report_count=F('report_count') + 1)

        return Response(
            {'message': 'Report submitted successfully'},
            status=status.HTTP_201_CREATED
        )


# Admin views
class AdminJobViewSet(viewsets.ModelViewSet):
    """Admin job management."""

    queryset = Job.all_objects.all().select_related('company', 'agency', 'posted_by')
    serializer_class = AdminJobSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = [
        'status', 'company', 'agency', 'employment_type',
        'category', 'location_type', 'featured'
    ]
    search_fields = ['title', 'description', 'company__name']
    ordering_fields = ['posted_at', 'expires_at', 'views', 'applications_count', 'report_count']
    ordering = ['-created_at']

    def get_queryset(self):
        """Exclude trashed jobs from normal operations.

        Trashed jobs are served by dedicated endpoints (trash_list,
        empty_trash, permanent_delete, restore).  Every other action
        — list, retrieve, export, and detail moderation endpoints —
        should never surface soft-deleted rows unless explicitly
        requested via ?include_trashed=true (used by "All Jobs" view).
        """
        qs = Job.all_objects.all().select_related('company', 'agency', 'posted_by')
        # Actions that explicitly operate on trashed jobs
        trash_actions = {'trash_list', 'empty_trash', 'permanent_delete', 'restore'}
        if self.action not in trash_actions:
            include_trashed = self.request.query_params.get('include_trashed', '').lower() == 'true'
            if not include_trashed:
                qs = qs.filter(deleted_at__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminJobDetailSerializer
        return AdminJobSerializer

    @staticmethod
    def _reject_if_trashed(job):
        """Guard: prevent moderation actions on trashed (soft-deleted) jobs."""
        if job.deleted_at is not None:
            return Response(
                {'error': 'Cannot perform this action on a trashed job. Restore it first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/admin/jobs/stats/ — aggregate job stats."""
        qs = Job.objects.all()
        data = {
            'total': qs.count() + Job.all_objects.filter(deleted_at__isnull=False).count(),
            'draft': qs.filter(status='draft').count(),
            'pending': qs.filter(status='pending').count(),
            'pending_payment': qs.filter(status='pending_payment').count(),
            'scheduled': qs.filter(status='scheduled').count(),
            'published': qs.filter(status='published').count(),
            'paused': qs.filter(status='paused').count(),
            'flagged': qs.filter(status='hidden').count(),
            'expired': qs.filter(status='expired').count(),
            'filled': qs.filter(status='filled').count(),
            'featured': qs.filter(featured=True).count(),
            'trashed': Job.all_objects.filter(deleted_at__isnull=False).count(),
        }
        return Response(data)

    @action(detail=False, methods=['post'], url_path='pre-approve-check')
    def pre_approve_check(self, request):
        """
        POST /api/admin/jobs/pre-approve-check/
        Body: { "job_ids": [1, 2, 3] }

        Pre-flight credit check before approving jobs.
        Returns per-entity credit summaries and identifies which jobs
        need credit consumption vs. which already had credits consumed.
        """
        job_ids = request.data.get('job_ids', [])
        if not job_ids:
            return Response(
                {'error': 'job_ids is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        jobs = (
            Job.all_objects
            .filter(id__in=job_ids, status__in=('pending', 'draft'))
            .select_related('company', 'agency')
        )

        # Group jobs by entity (company or agency) and check credits
        entity_map = {}  # entity_key -> { entity, jobs_needing_credit, jobs_already_paid }
        for job in jobs:
            entity = job.agency or job.company
            if not entity:
                continue

            entity_key = f'agency_{entity.id}' if job.agency else f'company_{entity.id}'
            if entity_key not in entity_map:
                entity_map[entity_key] = {
                    'entity': entity,
                    'entity_type': 'agency' if job.agency else 'company',
                    'entity_id': entity.id,
                    'entity_name': entity.name,
                    'jobs_needing_credit': [],
                    'jobs_already_paid': [],
                }

            if was_credit_consumed(job):
                entity_map[entity_key]['jobs_already_paid'].append({
                    'id': job.id, 'title': job.title, 'status': job.status,
                })
            else:
                entity_map[entity_key]['jobs_needing_credit'].append({
                    'id': job.id, 'title': job.title, 'status': job.status,
                })

        # Build response with credit summaries per entity
        results = []
        total_credits_needed = 0
        total_insufficient = 0

        for key, info in entity_map.items():
            needed = len(info['jobs_needing_credit'])
            total_credits_needed += needed
            summary = get_credit_summary(info['entity'])
            sufficient = summary['credits_remaining'] >= needed

            if not sufficient and needed > 0:
                total_insufficient += 1

            results.append({
                'entity_type': info['entity_type'],
                'entity_id': info['entity_id'],
                'entity_name': info['entity_name'],
                'credits_remaining': summary['credits_remaining'],
                'credits_total': summary['credits_total'],
                'credits_needed': needed,
                'sufficient': sufficient,
                'deficit': max(0, needed - summary['credits_remaining']),
                'post_duration_days': summary['post_duration_days'],
                'jobs_needing_credit': info['jobs_needing_credit'],
                'jobs_already_paid': info['jobs_already_paid'],
            })

        can_approve_all = total_insufficient == 0
        return Response({
            'can_approve_all': can_approve_all,
            'total_jobs': jobs.count(),
            'total_credits_needed': total_credits_needed,
            'entities': results,
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending/draft job with optional posted_at override."""
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            job = Job.all_objects.select_for_update().get(
                pk=pk, deleted_at__isnull=True
            )
            if job.status not in ('pending', 'draft'):
                return Response(
                    {'error': 'Only pending or draft jobs can be approved'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            entity = job.agency or job.company

            # Credit enforcement: consume credit if not yet consumed for this job
            if entity and not was_credit_consumed(job):
                try:
                    entitlement = consume_credit(entity, job, 'job_post', admin=request.user)
                    duration_days = entitlement.post_duration_days
                except InsufficientCreditsError:
                    summary = get_credit_summary(entity) if entity else None
                    return Response(
                        {
                            'error': (
                                f'Insufficient job posting credits for {entity.name}. '
                                f'Credits remaining: {summary["credits_remaining"] if summary else 0}. '
                                f'Please add credits or an active subscription before approving.'
                            ),
                            'code': 'insufficient_credits',
                            'entity_name': entity.name,
                            'credits_remaining': summary['credits_remaining'] if summary else 0,
                        },
                        status=status.HTTP_402_PAYMENT_REQUIRED,
                    )
            else:
                duration_days = get_package_duration(entity) if entity else get_job_policy().get('default_post_duration', 30)

            approve_serializer = AdminJobApproveSerializer(data=request.data)
            approve_serializer.is_valid(raise_exception=True)
            custom_posted_at = approve_serializer.validated_data.get('posted_at')

            posted_at = custom_posted_at or timezone.now()

            job.publish(posted_at=posted_at, duration_days=duration_days)

            # Trigger async AI generation (SEO meta + social posts) if enabled
            try:
                from apps.ai.tasks import auto_generate_on_publish
                auto_generate_on_publish.delay(job.id, user_id=request.user.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue auto_generate_on_publish for job %s — broker may be unavailable",
                    job.id,
                )

            # Notify employer that job was approved
            try:
                from apps.notifications.tasks import notify_job_approved
                notify_job_approved.delay(job.id)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue notify_job_approved for job %s", job.id,
                )

            job.refresh_from_db()
            serializer = self.get_serializer(job)
            return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a job — set status to hidden."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        reason = request.data.get('reason', '')
        job.status = 'hidden'
        job.save(update_fields=['status'])

        # Notify employer that job was rejected
        try:
            from apps.notifications.tasks import notify_job_rejected
            notify_job_rejected.delay(job.id, reason=reason)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to queue notify_job_rejected for job %s", job.id,
            )

        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        """Hide a job — returns serialized data."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        job.status = 'hidden'
        job.save(update_fields=['status'])
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unhide(self, request, pk=None):
        """Unhide a job."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        if job.status != 'hidden':
            return Response(
                {'error': 'Job is not hidden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.status = 'published' if job.expires_at and job.expires_at > timezone.now() else 'expired'
        job.save(update_fields=['status'])
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a published job."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        if job.status != 'published':
            return Response(
                {'error': 'Only published jobs can be paused'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.pause()
        job.refresh_from_db()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused job."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        if job.status != 'paused':
            return Response(
                {'error': 'Only paused jobs can be resumed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Resume keeps existing posted_at and expires_at
        job.status = 'published'
        job.save(update_fields=['status'])
        job.refresh_from_db()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def feature(self, request, pk=None):
        """Toggle featured status — returns serialized data."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        job.featured = not job.featured
        job.save(update_fields=['featured'])
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """Extend a published job — accepts expires_at date or days count."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err

        if job.status != 'published':
            return Response(
                {'error': 'Only published jobs can be extended. Expired jobs must be re-posted as a new listing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at_str = request.data.get('expires_at')
        if expires_at_str:
            from dateutil.parser import parse as parse_dt
            job.expires_at = parse_dt(expires_at_str)
            job.save(update_fields=['expires_at'])
        else:
            policy = get_job_policy()
            days = request.data.get('days', policy.get('default_post_duration', 30))
            job.extend(days=days)

        job.refresh_from_db()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def contact(self, request, pk=None):
        """Send a message to the job poster."""
        job = self.get_object()
        # In production, send an email/notification here
        return Response({'message': 'Message sent to job poster'})

    @action(detail=False, methods=['get', 'patch'], url_path='policy')
    def policy(self, request):
        """GET/PATCH /api/admin/jobs/policy/ — job policy settings.

        All job policy fields are stored in the job_policy KV store.
        """
        from apps.moderation.models import PlatformSetting

        if request.method == 'GET':
            return Response(get_job_policy())

        # PATCH — update the KV store
        incoming = dict(request.data)
        if incoming:
            setting, created = PlatformSetting.objects.get_or_create(
                key='job_policy',
                defaults={'value': {}, 'description': 'Job posting policy settings'}
            )
            if isinstance(setting.value, dict):
                setting.value.update(incoming)
            else:
                setting.value = dict(incoming)
            setting.updated_by = request.user
            setting.save()

        return Response(get_job_policy())

    @action(detail=False, methods=['get'])
    def export(self, request):
        """GET /api/admin/jobs/export/ — CSV export."""
        qs = self.filter_queryset(self.get_queryset())
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="jobs-export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Title', 'Company', 'Status', 'Location Type',
            'Category', 'Featured', 'Views', 'Applications',
            'Posted At', 'Expires At',
        ])

        for job in qs:
            writer.writerow([
                job.id, job.title,
                job.company.name if job.company else '',
                job.status, job.location_type, job.category,
                job.featured, job.views, job.applications_count,
                job.posted_at or '', job.expires_at,
            ])

        return response

    @action(detail=True, methods=['post'])
    def mark_filled(self, request, pk=None):
        """Mark a job as filled."""
        job = self.get_object()
        if err := self._reject_if_trashed(job):
            return err
        job.mark_filled()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='trash')
    def move_to_trash(self, request, pk=None):
        """Soft-delete a job."""
        job = self.get_object()
        job.delete()
        return Response({'message': 'Job moved to trash'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a trashed job."""
        try:
            job = Job.all_objects.get(pk=pk, deleted_at__isnull=False)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )
        job.restore()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='trash')
    def trash_list(self, request):
        """GET /api/admin/jobs/trash/ — list trashed jobs."""
        qs = Job.all_objects.filter(
            deleted_at__isnull=False,
        ).select_related('company', 'agency', 'posted_by').order_by('-deleted_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='empty-trash')
    def empty_trash(self, request):
        """Permanently delete ALL trashed jobs."""
        qs = Job.all_objects.filter(deleted_at__isnull=False)
        count = qs.count()
        qs.delete()
        return Response({'message': f'{count} trashed jobs permanently deleted', 'count': count})

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        """Permanently delete a single trashed job."""
        try:
            job = Job.all_objects.get(pk=pk, deleted_at__isnull=False)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='bulk-action')
    def bulk_action(self, request):
        """Perform bulk actions on jobs."""
        job_ids = request.data.get('job_ids', [])
        bulk_act = request.data.get('action')

        if not job_ids or not bulk_act:
            return Response(
                {'error': 'job_ids and action are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        jobs = Job.all_objects.filter(id__in=job_ids)
        count = jobs.count()

        # Moderation actions must exclude trashed jobs
        moderation_actions = {'approve', 'reject', 'hide', 'pause', 'resume', 'feature', 'unfeature'}
        if bulk_act in moderation_actions:
            jobs = jobs.filter(deleted_at__isnull=True)
            count = jobs.count()

        if bulk_act == 'approve':
            now = timezone.now()
            approved_ids = []
            skipped_no_credits = []

            for job in jobs.filter(status__in=('pending', 'draft')).select_related('company', 'agency'):
                entity = job.agency or job.company

                # Credit enforcement: consume credit if not yet consumed
                if entity and not was_credit_consumed(job):
                    try:
                        entitlement = consume_credit(entity, job, 'job_post', admin=request.user)
                        duration_days = entitlement.post_duration_days
                    except InsufficientCreditsError:
                        skipped_no_credits.append({
                            'id': job.id,
                            'title': job.title,
                            'entity_name': entity.name,
                        })
                        continue
                else:
                    duration_days = get_package_duration(entity) if entity else get_job_policy().get('default_post_duration', 30)

                job.publish(posted_at=now, duration_days=duration_days)
                approved_ids.append(job.id)

            # Trigger async AI generation + employer notifications for each approved job
            if approved_ids:
                try:
                    from apps.ai.tasks import auto_generate_on_publish
                    for job_id in approved_ids:
                        auto_generate_on_publish.delay(job_id, user_id=request.user.id)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Failed to queue auto_generate_on_publish for bulk approve — broker may be unavailable",
                    )
                try:
                    from apps.notifications.tasks import notify_job_approved
                    for job_id in approved_ids:
                        notify_job_approved.delay(job_id)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Failed to queue notify_job_approved for bulk approve — broker may be unavailable",
                    )
        elif bulk_act == 'reject':
            reason = request.data.get('reason', '')
            rejected_ids = list(jobs.values_list('id', flat=True))
            jobs.update(status='hidden')
            # Notify employers about rejection
            try:
                from apps.notifications.tasks import notify_job_rejected
                for job_id in rejected_ids:
                    notify_job_rejected.delay(job_id, reason=reason)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "Failed to queue notify_job_rejected for bulk reject — broker may be unavailable",
                )
        elif bulk_act == 'hide':
            jobs.update(status='hidden')
        elif bulk_act == 'pause':
            jobs.filter(status='published').update(status='paused')
        elif bulk_act == 'resume':
            jobs.filter(status='paused').update(
                status='published',
                posted_at=timezone.now()
            )
        elif bulk_act == 'feature':
            jobs.update(featured=True)
        elif bulk_act == 'unfeature':
            jobs.update(featured=False)
        elif bulk_act == 'delete':
            # Soft delete — must go through model method to save
            # pre_trash_status and unpublish live jobs.
            for job in jobs:
                job.delete()
        elif bulk_act == 'restore':
            # Restore — must go through model method to reinstate
            # pre_trash_status.
            for job in jobs.filter(deleted_at__isnull=False):
                job.restore()
        elif bulk_act == 'permanent_delete':
            # Hard delete — only for trashed jobs
            jobs.filter(deleted_at__isnull=False).delete()
        else:
            return Response(
                {'error': 'Invalid action'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if bulk_act == 'approve':
            resp = {
                'message': f'Approved {len(approved_ids)} of {count} jobs',
                'approved_count': len(approved_ids),
                'total_requested': count,
            }
            if skipped_no_credits:
                resp['skipped_no_credits'] = skipped_no_credits
                resp['message'] += (
                    f' ({len(skipped_no_credits)} skipped — insufficient credits)'
                )
            resp_status = (
                status.HTTP_200_OK if not skipped_no_credits
                else status.HTTP_207_MULTI_STATUS
            )
            return Response(resp, status=resp_status)

        return Response({'message': f'{bulk_act} applied to {count} jobs'})

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        POST /api/admin/jobs/bulk-import/ — Bulk create jobs as drafts.

        Two modes:
        - Company mode: company_id provided, all jobs assigned to that company.
        - Agency mode: agency_id provided, each job has company_name + company_email.
          Companies auto-created if not found, linked as AgencyClient.
        """
        import logging
        import re
        from django.db import transaction
        from apps.companies.models import Company, Agency, AgencyClient
        from .services import check_for_duplicates

        logger = logging.getLogger(__name__)

        jobs_data = request.data.get('jobs', [])
        company_id = request.data.get('company_id')
        agency_id = request.data.get('agency_id')

        # Validate request structure
        if not jobs_data:
            return Response(
                {'error': 'No jobs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(jobs_data, list):
            return Response(
                {'error': 'jobs must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(jobs_data) > 500:
            return Response(
                {'error': 'Maximum 500 jobs per import. Please split into smaller batches.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not company_id and not agency_id:
            return Response(
                {'error': 'Either company_id or agency_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if company_id and agency_id:
            return Response(
                {'error': 'Provide either company_id or agency_id, not both'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mode detection
        is_agency_mode = bool(agency_id)
        target_company = None
        target_agency = None

        # Validate company/agency exists
        if company_id:
            try:
                target_company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': f'Company with id {company_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            try:
                target_agency = Agency.objects.get(id=agency_id)
            except Agency.DoesNotExist:
                return Response(
                    {'error': f'Agency with id {agency_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Process jobs
        created_jobs = []
        errors = []
        companies_created = 0
        duplicates_skipped = 0

        # Company cache for agency mode to avoid N+1 queries
        company_cache = {}
        # Track titles within this batch for intra-batch duplicate detection
        batch_titles = {}  # {(company_id, title_lower): first_index}

        def get_or_create_company(name, email):
            """Find or create a company by name for agency imports."""
            nonlocal companies_created
            cache_key = name.strip().lower()

            if cache_key in company_cache:
                return company_cache[cache_key]

            # Try case-insensitive match
            company = Company.objects.filter(name__iexact=name.strip()).first()
            if not company:
                # Extract domain from email
                domain = ''
                if email and '@' in email:
                    domain = email.split('@')[1].strip().lower()

                company = Company(
                    name=name.strip(),
                    status='pending',
                    domain=domain,
                    represented_by_agency=target_agency,
                )
                company.save()  # triggers slug generation
                companies_created += 1
                logger.info(
                    f'Bulk import: Auto-created company "{company.name}" (id={company.id}) '
                    f'for agency "{target_agency.name}"'
                )

            # Ensure AgencyClient relationship exists
            AgencyClient.objects.get_or_create(
                agency=target_agency,
                company=company,
                defaults={'is_active': True}
            )

            # Set represented_by_agency if not already set
            if not company.represented_by_agency:
                company.represented_by_agency = target_agency
                company.save(update_fields=['represented_by_agency'])

            company_cache[cache_key] = company
            return company

        try:
            with transaction.atomic():
                for idx, job_data in enumerate(jobs_data):
                    # Validate with serializer
                    serializer = BulkJobImportItemSerializer(data=job_data)

                    if not serializer.is_valid():
                        errors.append({
                            'index': idx,
                            'title': job_data.get('title', ''),
                            'errors': serializer.errors,
                        })
                        continue

                    validated = serializer.validated_data

                    # Remove non-model fields
                    company_name = validated.pop('company_name', '')
                    company_email = validated.pop('company_email', '')

                    # Resolve company
                    if is_agency_mode:
                        if not company_name:
                            errors.append({
                                'index': idx,
                                'title': job_data.get('title', ''),
                                'errors': {'company_name': ['Company name is required in agency mode']},
                            })
                            continue
                        if not company_email:
                            errors.append({
                                'index': idx,
                                'title': job_data.get('title', ''),
                                'errors': {'company_email': ['Company email is required in agency mode']},
                            })
                            continue

                        job_company = get_or_create_company(company_name, company_email)
                    else:
                        job_company = target_company

                    # --- Duplicate detection ---
                    title_lower = validated.get('title', '').strip().lower()
                    batch_key = (job_company.id, title_lower)

                    # Check for intra-batch duplicates
                    if batch_key in batch_titles:
                        duplicates_skipped += 1
                        errors.append({
                            'index': idx,
                            'title': job_data.get('title', ''),
                            'errors': {
                                'title': [
                                    f'Duplicate of row {batch_titles[batch_key] + 1} '
                                    f'in this import batch'
                                ],
                            },
                        })
                        continue

                    # Check for duplicates against existing jobs in the DB
                    existing_dupes = check_for_duplicates(job_company, validated.get('title', ''))
                    if existing_dupes:
                        duplicates_skipped += 1
                        dupe = existing_dupes[0]
                        errors.append({
                            'index': idx,
                            'title': job_data.get('title', ''),
                            'errors': {
                                'title': [
                                    f'Duplicate of existing job "{dupe["title"]}" '
                                    f'(ID {dupe["id"]}, status: {dupe["status"]})'
                                ],
                            },
                        })
                        continue

                    batch_titles[batch_key] = idx

                    # Create job as draft
                    job = Job(
                        **validated,
                        company=job_company,
                        agency=target_agency,
                        posted_by=request.user,
                        status='draft',
                        expires_at=None,
                    )
                    job.save()  # triggers slug generation
                    created_jobs.append(job)

                logger.info(
                    f'Bulk import by {request.user.email}: '
                    f'{len(created_jobs)} jobs created, {len(errors)} failed, '
                    f'{duplicates_skipped} duplicates skipped, '
                    f'{companies_created} companies auto-created'
                )

        except Exception as e:
            logger.exception(f'Bulk import failed: {str(e)}')
            return Response(
                {'error': f'Import failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'total': len(jobs_data),
            'created': len(created_jobs),
            'failed': len(errors),
            'duplicates_skipped': duplicates_skipped,
            'companies_created': companies_created,
            'errors': errors,
        }, status=status.HTTP_201_CREATED if created_jobs else status.HTTP_400_BAD_REQUEST)


class AdminJobReportViewSet(viewsets.ModelViewSet):
    """Admin job report management."""

    queryset = JobReport.objects.all().select_related('job', 'reporter', 'reviewed_by')
    serializer_class = AdminJobReportSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'reason', 'job']
    search_fields = ['job__title', 'reporter_email', 'details']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Mark report as reviewed."""
        report = self.get_object()
        action = request.data.get('action')  # 'dismiss' or 'action_taken'
        notes = request.data.get('notes', '')

        if action not in ['dismiss', 'action_taken']:
            return Response(
                {'error': 'action must be "dismiss" or "action_taken"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = 'dismissed' if action == 'dismiss' else 'action_taken'
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.review_notes = notes
        report.save()

        return Response({'message': f'Report {action}'})

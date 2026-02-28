"""
AI service views for Orion API.

All endpoints require admin permission except generate endpoints
which are available to employers and agencies.
"""
import logging

from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from core.permissions import IsAdmin, IsEmployer, IsAgency
from apps.jobs.models import Job
from apps.social.models import SocialPost

from .models import AIProviderConfig, AIUsageLog
from .serializers import (
    AIProviderConfigSerializer, AIProviderConfigCreateSerializer,
    AIProviderConfigUpdateSerializer, AIUsageLogSerializer,
    GenerateSEOMetaSerializer, GenerateSEOMetaBulkSerializer,
    GenerateSocialContentSerializer, AIProviderDefaultsSerializer,
)
from .services import (
    generate_seo_meta, generate_social_content, get_usage_stats,
    AIServiceError, NoActiveProviderError,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Admin: Provider Config
# =============================================================================

class AIProviderConfigViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for AI provider configurations.

    list: GET /api/admin/ai/providers/
    create: POST /api/admin/ai/providers/
    retrieve: GET /api/admin/ai/providers/{id}/
    update: PUT/PATCH /api/admin/ai/providers/{id}/
    delete: DELETE /api/admin/ai/providers/{id}/
    """

    queryset = AIProviderConfig.objects.all().order_by('-is_active', 'provider')
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return AIProviderConfigCreateSerializer
        if self.action in ('update', 'partial_update'):
            return AIProviderConfigUpdateSerializer
        return AIProviderConfigSerializer

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test the AI provider connection with a simple prompt."""
        config = self.get_object()

        try:
            from .services import _call_provider, _log_usage
            result = _call_provider(
                config,
                'You are a helpful assistant.',
                'Respond with exactly: {"status": "ok"}',
                max_tokens=50,
            )
            _log_usage('connection_test', config, result, user=request.user)
            return Response({
                'success': True,
                'response': result['content'][:200],
                'tokens': result['total_tokens'],
                'duration_ms': result['duration_ms'],
            })
        except Exception as e:
            from .services import _log_usage
            _log_usage(
                'connection_test', config, {},
                user=request.user, error=e,
            )
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)


class AIProviderDefaultsView(APIView):
    """
    Get provider defaults (base URLs, suggested models).

    GET /api/admin/ai/defaults/
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        serializer = AIProviderDefaultsSerializer(instance=None)
        return Response(serializer.data)


# =============================================================================
# Admin: Usage Logs
# =============================================================================

class AIUsageLogListView(generics.ListAPIView):
    """
    List AI usage logs.

    GET /api/admin/ai/usage/
    Supports filtering by feature, status, user, company, date range.
    """

    serializer_class = AIUsageLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['feature', 'status', 'provider', 'user', 'company']
    search_fields = ['job__title', 'user__email', 'company__name']
    ordering_fields = ['created_at', 'total_tokens', 'cost_usd', 'duration_ms']
    ordering = ['-created_at']

    def get_queryset(self):
        return AIUsageLog.objects.select_related(
            'user', 'job', 'company'
        ).all()


class AIUsageStatsView(APIView):
    """
    Get AI usage statistics.

    GET /api/admin/ai/stats/
    Optional query params: days (default 30), company_id
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        company_id = request.query_params.get('company_id')
        company = None

        if company_id:
            from apps.companies.models import Company
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Company not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        stats = get_usage_stats(days=days, company=company)
        return Response(stats)


# =============================================================================
# SEO Generation (available to employers, agencies, and admins)
# =============================================================================

class GenerateSEOMetaView(APIView):
    """
    Generate SEO meta_title and meta_description for a job.

    POST /api/ai/seo/generate/
    Body: { "job_id": 123 }
    Returns: { "meta_title": "...", "meta_description": "..." }

    The job's SEO fields are updated automatically.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateSEOMetaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job_id = serializer.validated_data['job_id']

        try:
            job = Job.objects.select_related('company').get(job_id=job_id)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Permission check: admin can generate for any job,
        # employers/agencies only for their own jobs
        user = request.user
        if user.role != 'admin':
            if user.company and job.company_id != user.company_id:
                return Response(
                    {'error': 'You can only generate SEO meta for your own jobs'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if user.agency and job.agency_id != user.agency_id:
                return Response(
                    {'error': 'You can only generate SEO meta for your own jobs'},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            result = generate_seo_meta(job, user=user)

            # Save to job
            job.meta_title = result['meta_title']
            job.meta_description = result['meta_description']
            job.save(update_fields=['meta_title', 'meta_description', 'updated_at'])

            return Response(result)

        except NoActiveProviderError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except AIServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateSEOMetaBulkView(APIView):
    """
    Bulk generate SEO meta for multiple jobs.

    POST /api/admin/ai/seo/bulk/
    Body: { "scope": "missing", "limit": 50 }

    Queues a Celery task to process jobs asynchronously.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = GenerateSEOMetaBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scope = serializer.validated_data['scope']
        limit = serializer.validated_data['limit']
        company_id = serializer.validated_data.get('company_id')

        # Build queryset
        qs = Job.objects.filter(status='published')

        if scope == 'missing':
            from django.db.models import Q
            qs = qs.filter(Q(meta_title='') | Q(meta_description=''))
        elif scope == 'company' and company_id:
            qs = qs.filter(company_id=company_id)

        total = qs.count()
        processing = min(total, limit)

        if processing == 0:
            return Response({
                'message': 'No jobs to process',
                'total': 0,
                'processing': 0,
            })

        # Queue the Celery task
        from .tasks import bulk_generate_seo_meta
        task = bulk_generate_seo_meta.delay(
            scope=scope,
            limit=limit,
            company_id=company_id,
            user_id=request.user.id,
        )

        return Response({
            'message': f'Queued {processing} jobs for SEO meta generation',
            'task_id': str(task.id),
            'total': total,
            'processing': processing,
        })


# =============================================================================
# Social Content Generation
# =============================================================================

class GenerateSocialContentView(APIView):
    """
    Generate social media post content for a job.

    POST /api/ai/social/generate/
    Body: {
        "job_id": 123,
        "platforms": ["linkedin", "twitter"],
        "create_posts": false
    }
    Returns: { "linkedin": "...", "twitter": "..." }

    If create_posts=true, SocialPost records are created automatically.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateSocialContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job_id = serializer.validated_data['job_id']
        platforms = serializer.validated_data['platforms']
        create_posts = serializer.validated_data['create_posts']

        try:
            job = Job.objects.select_related('company').get(job_id=job_id)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Permission check
        user = request.user
        if user.role != 'admin':
            if user.company and job.company_id != user.company_id:
                return Response(
                    {'error': 'You can only generate social content for your own jobs'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if user.agency and job.agency_id != user.agency_id:
                return Response(
                    {'error': 'You can only generate social content for your own jobs'},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            from django.conf import settings
            generated = generate_social_content(job, platforms=platforms, user=user)

            # Replace {job_url} placeholder with actual URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            job_url = f'{frontend_url}/jobs/{job.id}'

            for platform in generated:
                generated[platform] = generated[platform].replace('{job_url}', job_url)

            # Optionally create SocialPost records
            created_posts = []
            if create_posts:
                for platform, content in generated.items():
                    post = SocialPost.objects.create(
                        job=job,
                        platform=platform,
                        content=content,
                        status='pending',
                        created_by=user,
                    )
                    created_posts.append({
                        'id': post.id,
                        'platform': platform,
                        'status': 'pending',
                    })

            response_data = {
                'content': generated,
            }
            if created_posts:
                response_data['posts_created'] = created_posts

            return Response(response_data)

        except NoActiveProviderError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except AIServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

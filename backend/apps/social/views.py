"""
Social media distribution views for Orion API.
"""
import secrets

from django.conf import settings as django_settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from core.permissions import IsAdmin, IsEmployer, IsAgency
from .models import SocialPost, SocialAccount
from .serializers import (
    SocialAccountSerializer, SocialAccountConnectSerializer,
    SocialPostSerializer, SocialPostCreateSerializer, SocialPostListSerializer,
    AdminSocialPostSerializer, AdminSocialAccountSerializer
)


class SocialAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing connected social media accounts.

    Employers and agencies can connect/disconnect their social accounts
    for posting job listings.
    """

    serializer_class = SocialAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return SocialAccount.objects.all().select_related('company', 'agency')

        if user.company:
            return SocialAccount.objects.filter(
                company=user.company
            ).select_related('company')

        if user.agency:
            return SocialAccount.objects.filter(
                agency=user.agency
            ).select_related('agency')

        return SocialAccount.objects.none()

    def get_serializer_class(self):
        if self.action == 'connect':
            return SocialAccountConnectSerializer
        return SocialAccountSerializer

    @action(detail=False, methods=['post'], url_path='connect-url')
    def connect_url(self, request):
        """
        Get OAuth URL to connect a social media account.

        Returns the platform-specific OAuth authorization URL
        that the frontend should redirect the user to.
        """
        platform = request.data.get('platform')
        redirect_uri = request.data.get('redirect_uri')

        if not platform or not redirect_uri:
            return Response(
                {'error': 'platform and redirect_uri are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate redirect_uri against allowed origins
        from urllib.parse import urlparse

        parsed = urlparse(redirect_uri)
        frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')
        allowed_origin = urlparse(frontend_url)

        if parsed.scheme not in ('http', 'https') or parsed.netloc != allowed_origin.netloc:
            return Response(
                {'error': 'Invalid redirect_uri'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate CSRF state token for OAuth flow (prevents cross-site request forgery)
        state = secrets.token_urlsafe(32)
        cache.set(f"oauth_state:{request.user.id}:{platform}", state, timeout=600)

        # Build OAuth URLs per platform
        oauth_urls = {
            'linkedin': f'https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={{LINKEDIN_CLIENT_ID}}&redirect_uri={redirect_uri}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state={state}',
            'facebook': f'https://www.facebook.com/v18.0/dialog/oauth?client_id={{FACEBOOK_APP_ID}}&redirect_uri={redirect_uri}&scope=pages_manage_posts,pages_read_engagement&state={state}',
            'twitter': f'https://twitter.com/i/oauth2/authorize?response_type=code&client_id={{TWITTER_CLIENT_ID}}&redirect_uri={redirect_uri}&scope=tweet.read%20tweet.write%20users.read&state={state}',
            'instagram': f'https://api.instagram.com/oauth/authorize?client_id={{INSTAGRAM_APP_ID}}&redirect_uri={redirect_uri}&scope=user_profile,user_media&response_type=code&state={state}',
        }

        url = oauth_urls.get(platform)
        if not url:
            return Response(
                {'error': f'Unsupported platform: {platform}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'url': url})

    @action(detail=False, methods=['post'])
    def connect(self, request):
        """
        Connect a new social media account via OAuth.

        This endpoint receives the OAuth authorization code after the user
        completes the OAuth flow on the frontend.
        """
        serializer = SocialAccountConnectSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        platform = serializer.validated_data['platform']
        oauth_code = serializer.validated_data['oauth_code']
        redirect_uri = serializer.validated_data['redirect_uri']

        # Verify OAuth state token to prevent CSRF attacks
        state = request.data.get('state', '')
        cache_key = f"oauth_state:{request.user.id}:{platform}"
        stored_state = cache.get(cache_key)
        if not stored_state or not secrets.compare_digest(stored_state, state):
            return Response(
                {'error': 'Invalid or expired OAuth state. Please restart the connection flow.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        cache.delete(cache_key)

        # Exchange OAuth code for tokens
        token_data = self._exchange_oauth_code(platform, oauth_code, redirect_uri)

        if not token_data:
            return Response(
                {'error': 'Failed to exchange OAuth code for tokens'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the social account
        account = SocialAccount.objects.create(
            company=request.user.company if request.user.company else None,
            agency=request.user.agency if request.user.agency else None,
            platform=platform,
            account_name=token_data.get('account_name', f'{platform} Account'),
            account_id=token_data.get('account_id', ''),
            access_token=token_data.get('access_token', ''),
            refresh_token=token_data.get('refresh_token', ''),
            token_expires_at=token_data.get('expires_at'),
            is_active=True
        )

        return Response(
            SocialAccountSerializer(account).data,
            status=status.HTTP_201_CREATED
        )

    def _exchange_oauth_code(self, platform, code, redirect_uri):
        """
        Exchange OAuth code for access tokens.

        In production, implement platform-specific OAuth flows:
        - LinkedIn: Use LinkedIn Marketing API
        - Twitter: Use Twitter API v2
        - Facebook: Use Facebook Graph API
        """
        # Block stub from running in production — prevents fake tokens in DB
        if not django_settings.DEBUG:
            return None

        # Stub: Return mock data for development only
        return {
            'account_name': f'Mock {platform.title()} Account',
            'account_id': f'mock_{platform}_{timezone.now().timestamp()}',
            'access_token': 'mock_access_token',
            'refresh_token': 'mock_refresh_token',
            'expires_at': timezone.now() + timezone.timedelta(days=60)
        }

    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """Disconnect (deactivate) a social account."""
        account = self.get_object()
        account.is_active = False
        account.save(update_fields=['is_active', 'updated_at'])

        return Response({'message': 'Account disconnected successfully'})

    @action(detail=True, methods=['post'])
    def refresh_token(self, request, pk=None):
        """
        Refresh the OAuth token for an account.

        Called when the access token is about to expire.
        """
        account = self.get_object()

        if not account.refresh_token:
            return Response(
                {'error': 'No refresh token available. Please reconnect the account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Implement actual token refresh logic per platform
        # For now, just update the expiration
        account.token_expires_at = timezone.now() + timezone.timedelta(days=60)
        account.save(update_fields=['token_expires_at', 'updated_at'])

        return Response({'message': 'Token refreshed successfully'})


class SocialPostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing social media posts.

    Allows employers and agencies to create, schedule, and manage
    social media posts for their job listings.
    """

    permission_classes = [IsAuthenticated]
    filterset_fields = ['job', 'platform', 'status']
    search_fields = ['content', 'job__title']
    ordering_fields = ['scheduled_at', 'posted_at', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return SocialPost.objects.all().select_related(
                'job', 'job__company', 'created_by'
            )

        if user.company:
            return SocialPost.objects.filter(
                job__company=user.company
            ).select_related('job', 'job__company', 'created_by')

        if user.agency:
            return SocialPost.objects.filter(
                job__agency=user.agency
            ).select_related('job', 'job__company', 'created_by')

        return SocialPost.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return SocialPostCreateSerializer
        if self.action == 'list':
            return SocialPostListSerializer
        return SocialPostSerializer

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a scheduled post."""
        post = self.get_object()

        if post.status != 'scheduled':
            return Response(
                {'error': 'Only scheduled posts can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        post.status = 'pending'
        post.scheduled_at = None
        post.save(update_fields=['status', 'scheduled_at', 'updated_at'])

        return Response({'message': 'Post cancelled and returned to pending'})

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed post."""
        post = self.get_object()

        if post.status != 'failed':
            return Response(
                {'error': 'Only failed posts can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )

        post.status = 'pending'
        post.error_message = ''
        post.save(update_fields=['status', 'error_message', 'updated_at'])

        # Trigger immediate posting
        from .tasks import post_to_social_media
        post_to_social_media.delay(post.id)

        return Response({'message': 'Post queued for retry'})

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Schedule or reschedule a post."""
        post = self.get_object()

        if post.status not in ['pending', 'scheduled']:
            return Response(
                {'error': 'Cannot schedule a post that has been posted or failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        scheduled_at = request.data.get('scheduled_at')
        if not scheduled_at:
            return Response(
                {'error': 'scheduled_at is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils.dateparse import parse_datetime
        scheduled_time = parse_datetime(scheduled_at)

        if not scheduled_time or scheduled_time <= timezone.now():
            return Response(
                {'error': 'Scheduled time must be in the future'},
                status=status.HTTP_400_BAD_REQUEST
            )

        post.scheduled_at = scheduled_time
        post.status = 'scheduled'
        post.save(update_fields=['scheduled_at', 'status', 'updated_at'])

        return Response({
            'message': 'Post scheduled successfully',
            'scheduled_at': post.scheduled_at
        })

    @action(detail=True, methods=['post'])
    def post_now(self, request, pk=None):
        """Immediately post to social media."""
        post = self.get_object()

        if post.status not in ['pending', 'scheduled']:
            return Response(
                {'error': 'Cannot post - already posted or failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger immediate posting
        from .tasks import post_to_social_media
        post_to_social_media.delay(post.id)

        return Response({'message': 'Post queued for immediate publishing'})


class JobSocialPostsView(generics.ListAPIView):
    """List all social posts for a specific job."""

    serializer_class = SocialPostListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        job_id = self.kwargs['job_id']
        user = self.request.user

        queryset = SocialPost.objects.filter(job_id=job_id).select_related(
            'job', 'job__company', 'created_by'
        )

        # Filter by ownership unless admin
        if user.role != 'admin':
            if user.company:
                queryset = queryset.filter(job__company=user.company)
            elif user.agency:
                queryset = queryset.filter(job__agency=user.agency)
            else:
                queryset = SocialPost.objects.none()

        return queryset.order_by('-created_at')


# Admin Views
class AdminSocialPostViewSet(viewsets.ModelViewSet):
    """Admin view for managing all social posts."""

    queryset = SocialPost.objects.all().select_related(
        'job', 'job__company', 'job__agency', 'created_by'
    )
    serializer_class = AdminSocialPostSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['job', 'platform', 'status', 'job__company']
    search_fields = ['content', 'job__title', 'job__company__name']
    ordering_fields = ['scheduled_at', 'posted_at', 'created_at', 'impressions', 'clicks']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get aggregate statistics for social posts."""
        from django.db.models import Sum, Count, Avg

        stats = SocialPost.objects.aggregate(
            total_posts=Count('id'),
            posted_count=Count('id', filter=models.Q(status='posted')),
            scheduled_count=Count('id', filter=models.Q(status='scheduled')),
            failed_count=Count('id', filter=models.Q(status='failed')),
            total_impressions=Sum('impressions'),
            total_clicks=Sum('clicks'),
            total_likes=Sum('likes'),
            total_shares=Sum('shares'),
            avg_impressions=Avg('impressions', filter=models.Q(status='posted')),
        )

        return Response(stats)

    @action(detail=False, methods=['post'])
    def bulk_retry(self, request):
        """Retry multiple failed posts."""
        post_ids = request.data.get('post_ids', [])

        if not post_ids:
            return Response(
                {'error': 'post_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        posts = SocialPost.objects.filter(
            id__in=post_ids,
            status='failed'
        )
        count = posts.count()

        posts.update(status='pending', error_message='')

        # Queue all for retry
        from .tasks import post_to_social_media
        for post in SocialPost.objects.filter(id__in=post_ids, status='pending'):
            post_to_social_media.delay(post.id)

        return Response({'message': f'{count} posts queued for retry'})


class AdminSocialAccountViewSet(viewsets.ModelViewSet):
    """Admin view for managing all social accounts."""

    queryset = SocialAccount.objects.all().select_related('company', 'agency')
    serializer_class = AdminSocialAccountSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['platform', 'is_active', 'company', 'agency']
    search_fields = ['account_name', 'company__name', 'agency__name']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle account active status."""
        account = self.get_object()
        account.is_active = not account.is_active
        account.save(update_fields=['is_active', 'updated_at'])

        return Response({
            'message': f'Account {"activated" if account.is_active else "deactivated"}',
            'is_active': account.is_active
        })


# Import models for Q objects in stats
from django.db import models

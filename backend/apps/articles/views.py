"""
Article views for Orion API.
"""
import uuid

from django.core.exceptions import ValidationError
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.validators import (
    UploadRateThrottle, validate_upload, sanitize_filename, convert_to_webp,
    COVER_IMAGE_PROFILE,
)
from .models import Article, ArticleCategory, ArticleView
from .serializers import (
    ArticleCategorySerializer,
    PublicArticleListSerializer,
    PublicArticleDetailSerializer,
    AdminArticleListSerializer,
    AdminArticleDetailSerializer,
    AdminArticleCreateSerializer,
    AdminArticleUpdateSerializer,
)


def get_visitor_id(request):
    """Get or create visitor ID for anonymous tracking."""
    visitor_id = request.COOKIES.get('visitor_id')
    if not visitor_id:
        visitor_id = str(uuid.uuid4())
    return visitor_id


class PublicArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """Public article listing and detail. Lookup by slug."""

    permission_classes = [AllowAny]
    lookup_field = 'slug'
    queryset = Article.objects.filter(
        status='published'
    ).select_related('author', 'category')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PublicArticleDetailSerializer
        return PublicArticleListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        # Track view
        visitor_id = get_visitor_id(request)
        ip = request.META.get('REMOTE_ADDR', '0.0.0.0')

        # Check if this visitor has viewed this article recently (24h dedup)
        recent_view = ArticleView.objects.filter(
            article=instance,
            visitor_id=visitor_id,
            created_at__gte=timezone.now() - timezone.timedelta(hours=24),
        ).exists()

        if not recent_view:
            ArticleView.objects.create(
                article=instance,
                visitor_id=visitor_id,
                user=request.user if request.user.is_authenticated else None,
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', ''),
            )
            Article.objects.filter(pk=instance.pk).update(
                views=F('views') + 1,
                unique_views=F('unique_views') + 1,
            )
        else:
            Article.objects.filter(pk=instance.pk).update(views=F('views') + 1)

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

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """List active article categories."""
        qs = ArticleCategory.objects.filter(is_active=True)
        serializer = ArticleCategorySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Return top 6 published featured articles."""
        qs = Article.objects.filter(
            status='published', featured=True
        ).select_related('author', 'category').order_by('-published_at')[:6]
        serializer = PublicArticleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'preview/(?P<token>[^/.]+)',
    )
    def preview(self, request, slug=None, token=None):
        """Token-gated preview for any article status."""
        try:
            article = Article.all_objects.select_related('author', 'category').get(
                slug=slug,
                preview_token=token,
            )
        except (Article.DoesNotExist, Exception):
            return Response(
                {'detail': 'Preview not found or token is invalid.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check token expiry if set
        if article.preview_expires_at and article.preview_expires_at < timezone.now():
            return Response(
                {'detail': 'Preview link has expired.'},
                status=status.HTTP_410_GONE,
            )

        serializer = PublicArticleDetailSerializer(article)
        return Response(serializer.data)


class AdminArticleViewSet(viewsets.ModelViewSet):
    """Admin article management."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        if self.request.query_params.get('trash') == 'true':
            return Article.all_objects.only_deleted().select_related('author', 'category')
        return Article.objects.all().select_related('author', 'category')

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminArticleCreateSerializer
        if self.action in ('update', 'partial_update'):
            return AdminArticleUpdateSerializer
        if self.action == 'retrieve':
            return AdminArticleDetailSerializer
        return AdminArticleListSerializer

    def create(self, request, *args, **kwargs):
        """Create article and return full detail serializer (with id)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = AdminArticleDetailSerializer(serializer.instance)
        return Response(detail.data, status=status.HTTP_201_CREATED)

    # --- State-transition actions ---

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish the article immediately."""
        article = self.get_object()
        article.publish()
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Revert published article to draft."""
        article = self.get_object()
        article.unpublish()
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Schedule the article for future publishing."""
        article = self.get_object()
        publish_at_raw = request.data.get('publish_at')
        if not publish_at_raw:
            return Response(
                {'detail': 'publish_at is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from rest_framework.fields import DateTimeField
        try:
            publish_at = DateTimeField().to_internal_value(publish_at_raw)
        except Exception:
            return Response(
                {'detail': 'Invalid publish_at value.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if publish_at <= timezone.now():
            return Response(
                {'detail': 'publish_at must be in the future.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        article.schedule(publish_at)
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive the article."""
        article = self.get_object()
        article.archive()
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def feature(self, request, pk=None):
        """Mark the article as featured."""
        article = self.get_object()
        article.feature()
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unfeature(self, request, pk=None):
        """Remove featured flag from article."""
        article = self.get_object()
        article.unfeature()
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='regenerate-preview-token')
    def regenerate_preview_token(self, request, pk=None):
        """Generate a new preview token for the article."""
        article = self.get_object()
        article.preview_token = uuid.uuid4()
        article.save(update_fields=['preview_token'])
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='upload-body-image',
            parser_classes=[MultiPartParser], throttle_classes=[UploadRateThrottle])
    def upload_body_image(self, request):
        """Upload an inline image for article body content.

        Returns the public URL so the editor can insert it as <img src="...">.
        """
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'detail': 'No image file provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_upload(image_file, COVER_IMAGE_PROFILE)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sanitize_filename(image_file)
        image_file = convert_to_webp(image_file)

        from django.core.files.storage import default_storage
        path = default_storage.save(f'articles/body/{image_file.name}', image_file)
        url = default_storage.url(path)

        return Response({'url': url})

    @action(detail=True, methods=['post'], url_path='upload-cover-image',
            parser_classes=[MultiPartParser], throttle_classes=[UploadRateThrottle])
    def upload_cover_image(self, request, pk=None):
        """Upload cover image for an article."""
        article = self.get_object()
        cover_file = request.FILES.get('cover_image')
        if not cover_file:
            return Response(
                {'detail': 'No cover_image file provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_upload(cover_file, COVER_IMAGE_PROFILE)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sanitize_filename(cover_file)
        cover_file = convert_to_webp(cover_file)

        if article.cover_image:
            article.cover_image.delete(save=False)
        article.cover_image = cover_file
        article.save(update_fields=['cover_image'])
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload-og-image',
            parser_classes=[MultiPartParser], throttle_classes=[UploadRateThrottle])
    def upload_og_image(self, request, pk=None):
        """Upload OG image for an article."""

        article = self.get_object()
        og_file = request.FILES.get('og_image')
        if not og_file:
            return Response(
                {'detail': 'No og_image file provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_upload(og_file, COVER_IMAGE_PROFILE)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sanitize_filename(og_file)
        og_file = convert_to_webp(og_file)

        if article.og_image:
            article.og_image.delete(save=False)
        article.og_image = og_file
        article.save(update_fields=['og_image'])
        serializer = AdminArticleDetailSerializer(article)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return article counts by status and total views."""
        qs = Article.objects.all()
        total = qs.count()
        draft = qs.filter(status='draft').count()
        scheduled = qs.filter(status='scheduled').count()
        published = qs.filter(status='published').count()
        archived = qs.filter(status='archived').count()
        total_views = qs.aggregate(total=Sum('views'))['total'] or 0
        return Response({
            'total': total,
            'draft': draft,
            'scheduled': scheduled,
            'published': published,
            'archived': archived,
            'total_views': total_views,
        })


class AdminArticleCategoryViewSet(viewsets.ModelViewSet):
    """Admin management of article categories."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ArticleCategorySerializer
    queryset = ArticleCategory.objects.all()

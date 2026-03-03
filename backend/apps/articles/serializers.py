"""
Article serializers for Orion API.
"""
from django.utils import timezone
from rest_framework import serializers

from .models import Article, ArticleCategory


class ArticleCategorySerializer(serializers.ModelSerializer):
    """Serializer for article categories."""

    article_count = serializers.SerializerMethodField()

    class Meta:
        model = ArticleCategory
        fields = [
            'id', 'name', 'slug', 'description', 'sort_order', 'is_active',
            'article_count', 'created_at', 'updated_at',
        ]

    def get_article_count(self, obj):
        return obj.articles.filter(status='published').count()


class PublicArticleListSerializer(serializers.ModelSerializer):
    """Serializer for public article listings."""

    author_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'article_id', 'title', 'slug', 'excerpt', 'cover_image',
            'author_name', 'category_name', 'category_slug',
            'tags', 'status', 'published_at', 'reading_time', 'views',
            'selected_template', 'featured',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return None

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return None

    def get_category_slug(self, obj):
        if obj.category:
            return obj.category.slug
        return None


class PublicArticleDetailSerializer(PublicArticleListSerializer):
    """Detailed serializer for a single public article."""

    category = ArticleCategorySerializer(read_only=True)

    class Meta(PublicArticleListSerializer.Meta):
        fields = PublicArticleListSerializer.Meta.fields + [
            'content', 'category', 'og_image',
            'meta_title', 'meta_description', 'canonical_url',
            'allow_inline_banners', 'affiliate_disclosure', 'sponsored_by',
            'updated_at',
        ]


class AdminArticleListSerializer(serializers.ModelSerializer):
    """Admin serializer for article listings."""

    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'article_id', 'title', 'slug', 'excerpt', 'cover_image',
            'author_name', 'author_email', 'category_name', 'category_slug',
            'tags', 'status', 'published_at', 'scheduled_publish_at',
            'reading_time', 'views', 'unique_views',
            'selected_template', 'featured',
            'deleted_at', 'created_at',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return None

    def get_author_email(self, obj):
        if obj.author:
            return obj.author.email
        return None

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return None

    def get_category_slug(self, obj):
        if obj.category:
            return obj.category.slug
        return None


class AdminArticleDetailSerializer(AdminArticleListSerializer):
    """Extended admin serializer for article detail view."""

    class Meta(AdminArticleListSerializer.Meta):
        fields = AdminArticleListSerializer.Meta.fields + [
            'content', 'og_image',
            'meta_title', 'meta_description', 'canonical_url',
            'allow_inline_banners', 'affiliate_disclosure', 'sponsored_by',
            'preview_token', 'preview_expires_at',
            'updated_at',
        ]


class AdminArticleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating articles (admin only)."""

    slug = serializers.SlugField(required=False, allow_blank=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ArticleCategory.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Article
        fields = [
            'title', 'slug', 'excerpt', 'content',
            'category', 'tags', 'featured', 'selected_template',
            'scheduled_publish_at',
            'meta_title', 'meta_description', 'canonical_url',
            'allow_inline_banners', 'affiliate_disclosure', 'sponsored_by',
        ]

    def validate_scheduled_publish_at(self, value):
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError(
                'Scheduled publish date must be in the future.'
            )
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['author'] = request.user
        return super().create(validated_data)


class AdminArticleUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating articles (admin only). Status changes via @actions."""

    slug = serializers.SlugField(required=False, allow_blank=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ArticleCategory.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Article
        fields = [
            'title', 'slug', 'excerpt', 'content',
            'category', 'tags', 'featured', 'selected_template',
            'scheduled_publish_at',
            'meta_title', 'meta_description', 'canonical_url',
            'allow_inline_banners', 'affiliate_disclosure', 'sponsored_by',
        ]

    def validate_scheduled_publish_at(self, value):
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError(
                'Scheduled publish date must be in the future.'
            )
        return value

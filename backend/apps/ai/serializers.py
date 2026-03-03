"""
AI service serializers for Orion API.
"""
from rest_framework import serializers

from .models import AIProviderConfig, AIUsageLog
from .services import PROVIDER_DEFAULTS


class AIProviderConfigSerializer(serializers.ModelSerializer):
    """Serializer for AI provider configuration."""

    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    # Never expose the full API key in responses
    api_key_set = serializers.SerializerMethodField()

    class Meta:
        model = AIProviderConfig
        fields = [
            'id', 'name', 'provider', 'provider_display', 'base_url',
            'model', 'is_active', 'api_key_set',
            'max_requests_per_minute', 'max_requests_per_day',
            'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens',
            'seo_generation_enabled', 'social_generation_enabled',
            'auto_generate_on_publish',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_api_key_set(self, obj):
        """Return whether an API key is configured (never expose it)."""
        return bool(obj.api_key)


class AIProviderConfigCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AI provider configs (accepts api_key)."""

    class Meta:
        model = AIProviderConfig
        fields = [
            'name', 'provider', 'base_url', 'api_key', 'model', 'is_active',
            'max_requests_per_minute', 'max_requests_per_day',
            'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens',
            'seo_generation_enabled', 'social_generation_enabled',
            'auto_generate_on_publish',
        ]

    def validate(self, data):
        # Auto-fill base_url from provider defaults if not provided
        provider = data.get('provider', '')
        if not data.get('base_url') and provider in PROVIDER_DEFAULTS:
            data['base_url'] = PROVIDER_DEFAULTS[provider].get('base_url', '')
        return data


class AIProviderConfigUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating AI provider configs. API key is optional."""

    api_key = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = AIProviderConfig
        fields = [
            'name', 'base_url', 'api_key', 'model', 'is_active',
            'max_requests_per_minute', 'max_requests_per_day',
            'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens',
            'seo_generation_enabled', 'social_generation_enabled',
            'auto_generate_on_publish',
        ]

    def update(self, instance, validated_data):
        # Only update API key if a non-empty value is provided
        api_key = validated_data.pop('api_key', None)
        if api_key:
            instance.api_key = api_key
        return super().update(instance, validated_data)


class AIProviderDefaultsSerializer(serializers.Serializer):
    """Returns provider defaults (base URLs, suggested models) for the frontend."""

    def to_representation(self, instance):
        return PROVIDER_DEFAULTS


class AIUsageLogSerializer(serializers.ModelSerializer):
    """Serializer for AI usage logs."""

    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)
    job_title = serializers.CharField(source='job.title', read_only=True, default=None)
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)

    class Meta:
        model = AIUsageLog
        fields = [
            'id', 'feature', 'status', 'provider', 'model',
            'input_tokens', 'output_tokens', 'total_tokens',
            'cost_usd', 'duration_ms',
            'user', 'user_email', 'job', 'job_title',
            'company', 'company_name',
            'error_message', 'created_at',
        ]


class GenerateSEOMetaSerializer(serializers.Serializer):
    """Request serializer for SEO meta generation."""

    job_id = serializers.CharField(max_length=10)


class GenerateSEOMetaBulkSerializer(serializers.Serializer):
    """Request serializer for bulk SEO meta generation."""

    scope = serializers.ChoiceField(
        choices=['missing', 'all', 'company'],
        default='missing',
        help_text='missing = only jobs without meta, all = regenerate all, company = specific company'
    )
    company_id = serializers.IntegerField(required=False)
    limit = serializers.IntegerField(default=50, min_value=1, max_value=200)


class GenerateSocialContentSerializer(serializers.Serializer):
    """Request serializer for social content generation."""

    job_id = serializers.CharField(max_length=10)
    platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=['linkedin', 'twitter', 'facebook', 'instagram']),
        required=False,
        default=['linkedin', 'twitter', 'facebook', 'instagram'],
    )
    create_posts = serializers.BooleanField(
        default=False,
        help_text='If true, automatically create SocialPost records with the generated content'
    )

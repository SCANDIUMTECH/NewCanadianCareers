"""
Social media distribution serializers for Orion API.
"""
from rest_framework import serializers
from django.utils import timezone

from .models import SocialPost, SocialAccount, SocialTemplate


class SocialAccountSerializer(serializers.ModelSerializer):
    """Serializer for listing connected social accounts."""

    platform_display = serializers.CharField(
        source='get_platform_display',
        read_only=True
    )
    is_token_valid = serializers.SerializerMethodField()

    class Meta:
        model = SocialAccount
        fields = [
            'id', 'platform', 'platform_display', 'account_name',
            'account_id', 'is_active', 'last_used_at',
            'token_expires_at', 'is_token_valid',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_token_valid(self, obj):
        """Check if the OAuth token is still valid."""
        if not obj.token_expires_at:
            return True
        return obj.token_expires_at > timezone.now()


class SocialAccountConnectSerializer(serializers.Serializer):
    """Serializer for connecting a new social account via OAuth."""

    platform = serializers.ChoiceField(choices=SocialAccount.PLATFORM_CHOICES)
    oauth_code = serializers.CharField(help_text='OAuth authorization code')
    redirect_uri = serializers.URLField(help_text='OAuth redirect URI used')

    def validate_platform(self, value):
        """Check if account for this platform already exists."""
        request = self.context.get('request')
        user = request.user

        # Determine company or agency
        company = getattr(user, 'company', None)
        agency = getattr(user, 'agency', None)

        existing = SocialAccount.objects.filter(
            platform=value,
            company=company if company else None,
            agency=agency if agency else None
        ).exists()

        if existing:
            raise serializers.ValidationError(
                f'A {value} account is already connected. Disconnect it first.'
            )

        return value


class SocialPostListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing social posts."""

    platform_display = serializers.CharField(
        source='get_platform_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_company = serializers.CharField(source='job.company.name', read_only=True)

    class Meta:
        model = SocialPost
        fields = [
            'id', 'job', 'job_title', 'job_company',
            'platform', 'platform_display',
            'status', 'status_display',
            'scheduled_at', 'posted_at',
            'impressions', 'clicks', 'likes', 'shares',
            'created_at'
        ]


class SocialPostSerializer(serializers.ModelSerializer):
    """Full serializer for social post details."""

    platform_display = serializers.CharField(
        source='get_platform_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_company = serializers.CharField(source='job.company.name', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = SocialPost
        fields = [
            'id', 'job', 'job_title', 'job_company',
            'platform', 'platform_display',
            'content', 'image',
            'scheduled_at', 'posted_at',
            'status', 'status_display', 'error_message',
            'external_id', 'external_url',
            'impressions', 'clicks', 'likes', 'shares',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'error_message', 'posted_at',
            'external_id', 'external_url',
            'impressions', 'clicks', 'likes', 'shares',
            'created_by', 'created_at', 'updated_at'
        ]


class SocialPostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new social posts."""

    class Meta:
        model = SocialPost
        fields = [
            'job', 'platform', 'content', 'image', 'scheduled_at'
        ]

    def validate_job(self, value):
        """Ensure user can only post for jobs they own."""
        request = self.context.get('request')
        user = request.user

        # Check ownership
        if user.company and value.company_id != user.company_id:
            raise serializers.ValidationError(
                'You can only create posts for jobs owned by your company.'
            )

        if user.agency and value.agency_id != user.agency_id:
            raise serializers.ValidationError(
                'You can only create posts for jobs managed by your agency.'
            )

        if not user.company and not user.agency:
            raise serializers.ValidationError(
                'You must belong to a company or agency to create social posts.'
            )

        return value

    def validate_platform(self, value):
        """Ensure there's a connected account for this platform."""
        request = self.context.get('request')
        user = request.user

        company = getattr(user, 'company', None)
        agency = getattr(user, 'agency', None)

        account_exists = SocialAccount.objects.filter(
            platform=value,
            is_active=True
        ).filter(
            models.Q(company=company) | models.Q(agency=agency)
        ).exists() if company or agency else False

        # Simpler check without Q objects
        if company:
            account_exists = SocialAccount.objects.filter(
                platform=value,
                company=company,
                is_active=True
            ).exists()
        elif agency:
            account_exists = SocialAccount.objects.filter(
                platform=value,
                agency=agency,
                is_active=True
            ).exists()
        else:
            account_exists = False

        if not account_exists:
            raise serializers.ValidationError(
                f'No active {value} account connected. Please connect an account first.'
            )

        return value

    def validate_scheduled_at(self, value):
        """Ensure scheduled time is in the future."""
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                'Scheduled time must be in the future.'
            )
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        # If no scheduled_at, the post will be sent immediately
        if not attrs.get('scheduled_at'):
            attrs['status'] = 'pending'
        else:
            attrs['status'] = 'scheduled'

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class AdminSocialPostSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields for social posts."""

    platform_display = serializers.CharField(
        source='get_platform_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_company = serializers.CharField(source='job.company.name', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = SocialPost
        fields = '__all__'
        read_only_fields = [
            'external_id', 'external_url', 'posted_at',
            'impressions', 'clicks', 'likes', 'shares',
            'created_at', 'updated_at',
        ]


class AdminSocialAccountSerializer(serializers.ModelSerializer):
    """Admin serializer for social accounts."""

    platform_display = serializers.CharField(
        source='get_platform_display',
        read_only=True
    )
    company_name = serializers.CharField(
        source='company.name',
        read_only=True,
        allow_null=True
    )
    agency_name = serializers.CharField(
        source='agency.name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = SocialAccount
        fields = '__all__'
        extra_kwargs = {
            'access_token': {'write_only': True},
            'refresh_token': {'write_only': True},
        }


class SocialTemplateSerializer(serializers.ModelSerializer):
    """Serializer for social post templates."""

    class Meta:
        model = SocialTemplate
        fields = [
            'id', 'provider', 'title_format', 'include_salary',
            'hashtags', 'utm_source', 'utm_medium', 'utm_campaign',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

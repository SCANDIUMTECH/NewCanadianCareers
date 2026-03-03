"""
Company serializers for Orion API.
"""
from rest_framework import serializers
from .models import Company, CompanyUser, Agency, AgencyUser, AgencyClient
from apps.jobs.models import Job


def _get_valid_industry_names():
    """Return set of active industry names from the Industry table.

    Falls back to Company.INDUSTRY_CHOICES if the table doesn't exist yet.
    """
    try:
        from apps.moderation.models import Industry
        names = set(Industry.objects.filter(is_active=True).values_list('name', flat=True))
        if names:
            return names
    except Exception:
        pass
    return {name for name, _ in Company.INDUSTRY_CHOICES}


def validate_dynamic_industry(value):
    """Validate that an industry name exists in the active Industry table."""
    if not value:
        return value
    valid = _get_valid_industry_names()
    if value not in valid:
        raise serializers.ValidationError(
            f'Invalid industry. Must be one of the configured industries.'
        )
    return value


class CompanySerializer(serializers.ModelSerializer):
    """Public company serializer."""

    is_verified = serializers.SerializerMethodField()

    def validate_industry(self, value):
        return validate_dynamic_industry(value)

    class Meta:
        model = Company
        fields = [
            'id', 'entity_id', 'name', 'slug', 'logo', 'banner', 'description', 'tagline',
            'website', 'industry', 'size', 'founded_year',
            'headquarters_address', 'headquarters_city', 'headquarters_state',
            'headquarters_country', 'headquarters_postal_code',
            'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
            'is_verified', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'entity_id', 'slug', 'status', 'created_at']

    def get_is_verified(self, obj):
        return obj.status == 'verified'


class CompanyDetailSerializer(CompanySerializer):
    """Detailed company serializer with member info."""

    member_count = serializers.SerializerMethodField()
    job_count = serializers.SerializerMethodField()

    class Meta(CompanySerializer.Meta):
        fields = CompanySerializer.Meta.fields + ['member_count', 'job_count']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_job_count(self, obj):
        return obj.jobs.filter(status='published').count()


class TeamMemberUserSerializer(serializers.ModelSerializer):
    """Nested user serializer for team members."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        from apps.users.models import User
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'avatar']
        read_only_fields = fields


class CompanyUserSerializer(serializers.ModelSerializer):
    """Company member serializer."""

    user = TeamMemberUserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False, source='user.id')

    class Meta:
        model = CompanyUser
        fields = [
            'id', 'user', 'user_id', 'role',
            'invited_at', 'joined_at', 'created_at'
        ]
        read_only_fields = ['id', 'invited_at', 'joined_at', 'created_at']


class CompanyUserInviteSerializer(serializers.Serializer):
    """Invite a user to company."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CompanyUser.ROLE_CHOICES)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)


class PendingInviteSerializer(serializers.ModelSerializer):
    """Serializer for pending company invites."""

    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    invited_by_email = serializers.CharField(source='invited_by.email', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    expires_at = serializers.SerializerMethodField()

    class Meta:
        model = CompanyUser
        fields = [
            'id', 'user_email', 'role', 'invited_by_name',
            'invited_by_email', 'invited_at', 'expires_at'
        ]

    def get_expires_at(self, obj):
        if obj.invited_at:
            from django.utils import timezone
            from datetime import timedelta
            expiry = obj.invited_at + timedelta(days=7)
            return expiry.isoformat()
        return None


class AgencyUserInviteSerializer(serializers.Serializer):
    """Invite a user to agency."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=AgencyUser.ROLE_CHOICES)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)


class AdminCompanySerializer(serializers.ModelSerializer):
    """Admin company serializer with all fields."""

    member_count = serializers.SerializerMethodField()
    job_count = serializers.SerializerMethodField()

    def validate_industry(self, value):
        return validate_dynamic_industry(value)
    active_jobs_count = serializers.SerializerMethodField()
    job_credits_remaining = serializers.SerializerMethodField()
    job_credits_total = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField(read_only=True)
    owner_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Company
        fields = [
            'id', 'created_at', 'updated_at',
            'name', 'slug', 'domain', 'logo', 'banner',
            'description', 'tagline', 'website',
            'industry', 'size', 'founded_year',
            'headquarters_address', 'headquarters_city', 'headquarters_state',
            'headquarters_country', 'headquarters_postal_code',
            'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
            'status', 'billing_status', 'risk_level',
            'stripe_customer_id', 'team_management_enabled', 'represented_by_agency',
            # Extra computed fields
            'member_count', 'job_count', 'active_jobs_count',
            'job_credits_remaining', 'job_credits_total',
            'owner', 'owner_id',
        ]
        read_only_fields = ['slug']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_job_count(self, obj):
        return obj.jobs.count()

    def get_active_jobs_count(self, obj):
        return obj.jobs.filter(status='published').count()

    def get_job_credits_remaining(self, obj):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone
        result = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            company=obj,
        ).aggregate(
            total=Sum('credits_total'),
            used=Sum('credits_used'),
        )
        total = result['total'] or 0
        used = result['used'] or 0
        return max(total - used, 0)

    def get_job_credits_total(self, obj):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone
        result = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            company=obj,
        ).aggregate(total=Sum('credits_total'))
        return result['total'] or 0

    def get_owner(self, obj):
        owner_membership = obj.members.filter(role='owner').select_related('user').first()
        if owner_membership:
            return {
                'id': owner_membership.user.id,
                'email': owner_membership.user.email,
                'full_name': owner_membership.user.get_full_name(),
            }
        return None


class AgencySerializer(serializers.ModelSerializer):
    """Agency serializer."""

    class Meta:
        model = Agency
        fields = [
            'id', 'entity_id', 'name', 'slug', 'logo', 'description', 'website',
            'specializations', 'city', 'state', 'country',
            'status', 'billing_model', 'created_at'
        ]
        read_only_fields = ['id', 'entity_id', 'slug', 'status', 'created_at']


class AgencyDetailSerializer(AgencySerializer):
    """Detailed agency serializer."""

    member_count = serializers.SerializerMethodField()
    client_count = serializers.SerializerMethodField()

    class Meta(AgencySerializer.Meta):
        fields = AgencySerializer.Meta.fields + ['member_count', 'client_count']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_client_count(self, obj):
        return obj.clients.filter(is_active=True).count()


class AgencyUserSerializer(serializers.ModelSerializer):
    """Agency member serializer."""

    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = AgencyUser
        fields = ['id', 'user', 'user_email', 'user_name', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


class AgencyClientSerializer(serializers.ModelSerializer):
    """Agency client serializer."""

    company_name = serializers.CharField(source='company.name', read_only=True)
    company_slug = serializers.CharField(source='company.slug', read_only=True)

    class Meta:
        model = AgencyClient
        fields = [
            'id', 'agency', 'company', 'company_name', 'company_slug',
            'is_active', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CreateAgencyClientByNameSerializer(serializers.Serializer):
    """Create a company and link it as an agency client in one step."""

    name = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False, allow_blank=True)
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_name(self, value):
        return value.strip()

    def validate(self, data):
        agency = self.context['agency']
        if AgencyClient.objects.filter(agency=agency, company__name__iexact=data['name']).exists():
            raise serializers.ValidationError({'name': f'"{data["name"]}" is already one of your clients.'})
        return data


class AdminAgencySerializer(serializers.ModelSerializer):
    """Admin agency serializer."""

    member_count = serializers.SerializerMethodField()
    client_count = serializers.SerializerMethodField()
    job_count = serializers.SerializerMethodField()
    active_jobs_count = serializers.SerializerMethodField()
    job_credits_remaining = serializers.SerializerMethodField()
    job_credits_total = serializers.SerializerMethodField()
    location = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner = serializers.SerializerMethodField(read_only=True)
    owner_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Agency
        fields = [
            'id', 'entity_id', 'name', 'slug', 'logo', 'description', 'website',
            'contact_email', 'industry', 'specializations',
            'city', 'state', 'country', 'location',
            'status', 'billing_status', 'billing_model', 'risk_level',
            'stripe_customer_id',
            'team_management_enabled', 'featured', 'allow_backdate_posting',
            'member_count', 'client_count', 'job_count',
            'active_jobs_count', 'job_credits_remaining', 'job_credits_total',
            'owner', 'owner_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'entity_id', 'slug', 'created_at', 'updated_at']

    def create(self, validated_data):
        location = validated_data.pop('location', '')
        validated_data.pop('owner_id', None)  # Handled in view's perform_create
        if location and not validated_data.get('city'):
            validated_data['city'] = location
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('owner_id', None)  # Handled in view's perform_update
        location = validated_data.pop('location', None)
        if location and not validated_data.get('city'):
            validated_data['city'] = location
        return super().update(instance, validated_data)

    def get_member_count(self, obj):
        return obj.members.count()

    def get_client_count(self, obj):
        return obj.clients.filter(is_active=True).count()

    def get_job_count(self, obj):
        return obj.jobs.count()

    def get_owner(self, obj):
        owner_membership = obj.members.filter(role='owner').select_related('user').first()
        if owner_membership:
            return {
                'id': owner_membership.user.id,
                'email': owner_membership.user.email,
                'full_name': owner_membership.user.get_full_name(),
            }
        return None

    def get_active_jobs_count(self, obj):
        return obj.jobs.filter(status='published').count()

    def get_job_credits_remaining(self, obj):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone
        result = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            agency=obj,
        ).aggregate(
            total=Sum('credits_total'),
            used=Sum('credits_used'),
        )
        total = result['total'] or 0
        used = result['used'] or 0
        return max(total - used, 0)

    def get_job_credits_total(self, obj):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone
        result = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            agency=obj,
        ).aggregate(total=Sum('credits_total'))
        return result['total'] or 0


class AdminAgencyTeamMemberSerializer(serializers.ModelSerializer):
    """Nested serializer for agency team members in detail view."""

    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    status = serializers.CharField(source='user.status', read_only=True)
    jobs_count = serializers.SerializerMethodField()

    class Meta:
        model = AgencyUser
        fields = ['id', 'full_name', 'email', 'role', 'status', 'jobs_count']

    def get_jobs_count(self, obj):
        return Job.objects.filter(posted_by=obj.user, agency=obj.agency).count()


class AdminAgencyClientDetailSerializer(serializers.ModelSerializer):
    """Nested serializer for agency clients in detail view."""

    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.IntegerField(source='company.id', read_only=True)
    status = serializers.SerializerMethodField()
    jobs_count = serializers.SerializerMethodField()
    added_at = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AgencyClient
        fields = ['id', 'company_name', 'company_id', 'status', 'jobs_count', 'added_at']

    def get_status(self, obj):
        return 'active' if obj.is_active else 'paused'

    def get_jobs_count(self, obj):
        return obj.company.jobs.filter(agency=obj.agency).count()


class AdminAgencyJobSerializer(serializers.ModelSerializer):
    """Lightweight job serializer for agency detail page."""

    client_company = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Job
        fields = ['id', 'title', 'client_company', 'status', 'posted_at']


class AdminAgencyDetailSerializer(AdminAgencySerializer):
    """Admin agency detail serializer with nested team, clients, and jobs."""

    team_members = serializers.SerializerMethodField()
    clients = serializers.SerializerMethodField()
    jobs = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta(AdminAgencySerializer.Meta):
        fields = AdminAgencySerializer.Meta.fields + ['team_members', 'clients', 'jobs']

    def get_team_members(self, obj):
        members = obj.members.select_related('user').all()
        return AdminAgencyTeamMemberSerializer(members, many=True).data

    def get_clients(self, obj):
        clients = obj.clients.select_related('company').all()
        return AdminAgencyClientDetailSerializer(clients, many=True).data

    def get_jobs(self, obj):
        jobs = obj.jobs.select_related('company').all()[:50]
        return AdminAgencyJobSerializer(jobs, many=True).data

    def get_location(self, obj):
        parts = [p for p in [obj.city, obj.state, obj.country] if p]
        return ', '.join(parts) if parts else None


class AdminCompanyStatsSerializer(serializers.Serializer):
    """Serializer for admin company statistics."""
    total = serializers.IntegerField()
    verified = serializers.IntegerField()
    pending = serializers.IntegerField()
    high_risk = serializers.IntegerField()
    low_credits = serializers.IntegerField(default=0)


class CompanyJobDefaultsSerializer(serializers.Serializer):
    """Company job posting defaults."""
    default_apply_method = serializers.ChoiceField(
        choices=['internal', 'email', 'external'],
        default='internal'
    )
    default_apply_email = serializers.EmailField(default='', allow_blank=True)


class CompanyNotificationPreferencesSerializer(serializers.Serializer):
    """Company notification preferences."""
    email_new_applications = serializers.BooleanField(default=True)
    email_job_published = serializers.BooleanField(default=True)
    email_job_expiring = serializers.BooleanField(default=True)
    email_low_credits = serializers.BooleanField(default=True)
    email_billing = serializers.BooleanField(default=True)
    email_weekly_digest = serializers.BooleanField(default=False)


class CompanySocialConnectionSerializer(serializers.Serializer):
    """Social media connection status."""
    platform = serializers.ChoiceField(choices=['linkedin', 'twitter', 'facebook', 'instagram'])
    connected = serializers.BooleanField(default=False)
    account_name = serializers.CharField(allow_null=True, required=False)
    default_post = serializers.BooleanField(default=False)


class CompanySettingsSerializer(serializers.Serializer):
    """Complete company settings response."""
    job_defaults = CompanyJobDefaultsSerializer()
    notifications = CompanyNotificationPreferencesSerializer()
    social_connections = CompanySocialConnectionSerializer(many=True)

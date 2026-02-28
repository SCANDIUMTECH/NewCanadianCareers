"""
Serializers for Admin Support endpoints.
"""
from rest_framework import serializers
from apps.users.models import User
from apps.companies.models import Company, CompanyUser


class SupportUserResultSerializer(serializers.Serializer):
    """Serializer for user search results in support."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    type = serializers.CharField()
    status = serializers.CharField()
    company = serializers.CharField(allow_null=True)
    companyId = serializers.IntegerField(allow_null=True, source='company_id')
    lastActive = serializers.DateTimeField(source='last_login')
    createdAt = serializers.DateTimeField(source='created_at')
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if isinstance(obj, dict):
            return obj.get('avatar')
        if obj.avatar:
            return obj.avatar.url
        return None


class SupportUserDetailSerializer(SupportUserResultSerializer):
    """Detailed user information for support."""
    phone = serializers.CharField(allow_null=True)
    emailVerified = serializers.BooleanField(source='email_verified')
    twoFactorEnabled = serializers.BooleanField(source='mfa_enabled')
    loginCount = serializers.IntegerField()
    applicationCount = serializers.IntegerField()
    savedJobsCount = serializers.IntegerField()
    notificationPreferences = serializers.DictField()


class SupportCompanyResultSerializer(serializers.Serializer):
    """Serializer for company search results in support."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    domain = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    jobCount = serializers.IntegerField(source='job_count')
    employeeCount = serializers.IntegerField(source='employee_count')
    createdAt = serializers.DateTimeField(source='created_at')
    logo = serializers.SerializerMethodField()

    def get_logo(self, obj):
        if isinstance(obj, dict):
            return obj.get('logo')
        if hasattr(obj, 'logo') and obj.logo:
            return obj.logo.url
        return None


class SupportCompanyDetailSerializer(SupportCompanyResultSerializer):
    """Detailed company information for support."""
    website = serializers.CharField(allow_null=True)
    industry = serializers.CharField(allow_null=True)
    size = serializers.CharField(allow_null=True)
    billingStatus = serializers.CharField(source='billing_status')
    subscription = serializers.CharField(allow_null=True)
    totalPayments = serializers.DecimalField(max_digits=10, decimal_places=2, source='total_payments')
    activeJobsCount = serializers.IntegerField(source='active_jobs_count')
    totalApplications = serializers.IntegerField(source='total_applications')
    teamMembers = serializers.ListField()


class TimelineEventSerializer(serializers.Serializer):
    """Serializer for timeline events."""
    id = serializers.CharField()
    type = serializers.CharField()
    description = serializers.CharField()
    timestamp = serializers.DateTimeField()
    ip = serializers.CharField(allow_null=True, required=False)
    userAgent = serializers.CharField(allow_null=True, required=False, source='user_agent')
    user = serializers.CharField(allow_null=True, required=False)
    metadata = serializers.DictField(required=False)


class ImpersonationSessionSerializer(serializers.Serializer):
    """Serializer for impersonation session."""
    token = serializers.CharField()
    expiresAt = serializers.DateTimeField(source='expires_at')
    targetUserId = serializers.IntegerField(source='target_user_id')
    targetUserEmail = serializers.EmailField(source='target_user_email')
    adminUserId = serializers.IntegerField(source='admin_user_id')
    reason = serializers.CharField()


class DataExportJobSerializer(serializers.Serializer):
    """Serializer for data export job."""
    id = serializers.CharField()
    status = serializers.CharField()
    downloadUrl = serializers.CharField(allow_null=True, source='download_url')
    expiresAt = serializers.DateTimeField(allow_null=True, source='expires_at')
    createdAt = serializers.DateTimeField(source='created_at')
    completedAt = serializers.DateTimeField(allow_null=True, source='completed_at')
    error = serializers.CharField(allow_null=True)


class ImpersonationStatusSerializer(serializers.Serializer):
    """Serializer for impersonation status."""
    isImpersonating = serializers.BooleanField(source='is_impersonating')
    session = ImpersonationSessionSerializer(allow_null=True)

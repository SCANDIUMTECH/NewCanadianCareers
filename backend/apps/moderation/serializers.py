"""
Moderation serializers for Orion API.
"""
from django.utils import timezone
from django.utils.timesince import timesince
from rest_framework import serializers
from .models import (
    PlatformSetting, Banner, Announcement, Affiliate, AffiliateReferral,
    SystemAlert, AdminActivity, FraudAlert, ComplianceRequest, FraudRule,
    SponsoredBanner, AffiliateLink, FeatureFlag, JobPackage, PlatformSettings,
    Category, Industry, BannerImpression, BannerClick, AffiliateLinkClick,
    RetentionRule, LegalDocument
)


class PlatformSettingSerializer(serializers.ModelSerializer):
    """Platform setting serializer."""

    updated_by_email = serializers.CharField(source='updated_by.email', read_only=True, allow_null=True)

    class Meta:
        model = PlatformSetting
        fields = ['key', 'value', 'description', 'updated_by_email', 'updated_at']
        read_only_fields = ['updated_at']


class BannerSerializer(serializers.ModelSerializer):
    """Banner serializer."""

    ctr = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            'id', 'title', 'content', 'image', 'link', 'position',
            'target_role', 'is_active', 'starts_at', 'ends_at',
            'impressions', 'clicks', 'ctr', 'created_at', 'updated_at',
        ]
        read_only_fields = ['impressions', 'clicks', 'created_at', 'updated_at']

    def get_ctr(self, obj):
        """Click-through rate."""
        if obj.impressions > 0:
            return round(obj.clicks / obj.impressions * 100, 2)
        return 0


class AnnouncementSerializer(serializers.ModelSerializer):
    """Announcement serializer."""

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'announcement_type', 'target_role',
            'is_active', 'starts_at', 'ends_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class AffiliateSerializer(serializers.ModelSerializer):
    """Affiliate serializer."""

    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    conversion_rate = serializers.SerializerMethodField()

    class Meta:
        model = Affiliate
        fields = [
            'id', 'name', 'code', 'user', 'user_email', 'commission_rate',
            'total_referrals', 'total_conversions', 'total_revenue',
            'total_commission', 'is_active', 'conversion_rate',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'total_referrals', 'total_conversions', 'total_revenue',
            'total_commission', 'created_at', 'updated_at',
        ]

    def get_conversion_rate(self, obj):
        if obj.total_referrals > 0:
            return round(obj.total_conversions / obj.total_referrals * 100, 2)
        return 0


class AffiliateReferralSerializer(serializers.ModelSerializer):
    """Affiliate referral serializer."""

    affiliate_code = serializers.CharField(source='affiliate.code', read_only=True)

    class Meta:
        model = AffiliateReferral
        fields = [
            'id', 'affiliate', 'affiliate_code', 'referred_user',
            'referred_company', 'ip_address', 'user_agent', 'landing_page',
            'converted', 'converted_at', 'revenue', 'commission',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class SystemAlertSerializer(serializers.ModelSerializer):
    """System alert serializer for admin dashboard."""

    time = serializers.SerializerMethodField()
    resolved = serializers.BooleanField(source='is_dismissed', read_only=True)

    class Meta:
        model = SystemAlert
        fields = ['id', 'message', 'severity', 'time', 'resolved']

    def get_time(self, obj):
        """Return human-readable time since creation."""
        return timesince(obj.created_at, timezone.now()).split(',')[0] + ' ago'


class AdminActivitySerializer(serializers.ModelSerializer):
    """Admin activity serializer for admin dashboard."""

    type = serializers.CharField(source='activity_type', read_only=True)
    company = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = AdminActivity
        fields = ['id', 'type', 'action', 'company', 'time']

    def get_company(self, obj):
        """Return company name or entity name as fallback."""
        if obj.company:
            return obj.company.name
        return obj.entity_name

    def get_time(self, obj):
        """Return human-readable time since creation."""
        return timesince(obj.created_at, timezone.now()).split(',')[0] + ' ago'


class AdminDashboardStatsSerializer(serializers.Serializer):
    """Serializer for admin dashboard stats response."""

    jobs_posted = serializers.IntegerField()
    jobs_change = serializers.CharField()
    active_companies = serializers.IntegerField()
    companies_change = serializers.CharField()
    revenue_mtd = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_change = serializers.CharField()
    pending_reviews = serializers.IntegerField()
    reviews_change = serializers.CharField()


class AdminDashboardTrendPointSerializer(serializers.Serializer):
    """Serializer for trend data points."""

    date = serializers.CharField()
    jobs = serializers.IntegerField(required=False)
    applications = serializers.IntegerField(required=False)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class AdminDashboardModerationItemSerializer(serializers.Serializer):
    """Serializer for moderation breakdown items."""

    name = serializers.CharField()
    value = serializers.IntegerField()
    color = serializers.CharField()


class FraudAlertSerializer(serializers.ModelSerializer):
    """Fraud alert serializer for admin dashboard."""

    subject = serializers.SerializerMethodField()
    resolved_by = serializers.CharField(
        source='resolved_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = FraudAlert
        fields = [
            'id', 'type', 'severity', 'status',
            'subject', 'description', 'indicators',
            'ip_address', 'affected_accounts',
            'detected_at', 'resolved_at', 'resolved_by',
            'resolution_notes', 'created_at',
        ]

    def get_subject(self, obj):
        return {
            'type': obj.subject_type,
            'id': obj.subject_id,
            'name': obj.subject_name,
        }


class FraudAlertStatsSerializer(serializers.Serializer):
    """Fraud statistics summary."""

    total_alerts = serializers.IntegerField()
    critical_count = serializers.IntegerField()
    open_count = serializers.IntegerField()
    blocked_count = serializers.IntegerField()
    open_alerts = serializers.IntegerField()
    resolved_today = serializers.IntegerField()
    avg_resolution_time_hours = serializers.FloatField()
    by_severity = serializers.DictField()


class FraudTrendSerializer(serializers.Serializer):
    """Fraud trend data point."""

    date = serializers.CharField()
    alerts = serializers.IntegerField()
    blocked = serializers.IntegerField(required=False, default=0)
    by_type = serializers.DictField(required=False)


class AdminTransactionSerializer(serializers.Serializer):
    """Maps Invoice to the AdminTransaction shape the frontend expects."""

    id = serializers.IntegerField()
    invoice_number = serializers.CharField()
    company = serializers.SerializerMethodField()
    agency = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.SerializerMethodField()
    description = serializers.CharField()
    payment_method = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    completed_at = serializers.DateTimeField(source='paid_at')

    def get_company(self, obj):
        if obj.company:
            return {'id': obj.company.id, 'name': obj.company.name}
        return None

    def get_agency(self, obj):
        if obj.agency:
            return {'id': obj.agency.id, 'name': obj.agency.name}
        return None

    def get_type(self, obj):
        """Derive transaction type from invoice context."""
        if obj.status == 'refunded':
            return 'refund'
        desc = (obj.description or '').lower()
        if 'subscription' in desc:
            return 'subscription'
        if 'credit' in desc:
            return 'credit'
        return 'package'

    def get_status(self, obj):
        """Map Invoice status to AdminTransactionStatus."""
        mapping = {
            'paid': 'completed',
            'pending': 'pending',
            'draft': 'pending',
            'failed': 'failed',
            'refunded': 'refunded',
            'void': 'failed',
        }
        return mapping.get(obj.status, 'pending')

    def get_payment_method(self, obj):
        """Return the payment method slug (stripe_card, e_transfer, etc.)."""
        if obj.payment_method:
            return obj.payment_method
        # Legacy fallback: infer from Stripe fields
        if obj.stripe_payment_intent_id:
            return 'stripe_card'
        return None


class AdminPaymentStatsSerializer(serializers.Serializer):
    """Payment statistics summary."""

    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_change = serializers.FloatField()
    transactions_count = serializers.IntegerField()
    average_transaction = serializers.DecimalField(max_digits=10, decimal_places=2)
    by_type = serializers.DictField()


class AdminRevenueTrendSerializer(serializers.Serializer):
    """Revenue trend data point."""

    date = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    transactions = serializers.IntegerField()


class ComplianceRequestSerializer(serializers.ModelSerializer):
    """Compliance request serializer."""

    requester = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    requester_email = serializers.CharField(source='requester.email', read_only=True)
    requester_type = serializers.CharField(source='requester.role', read_only=True)
    created_at = serializers.DateTimeField(source='submitted_at', read_only=True)
    processed_by = serializers.CharField(
        source='processed_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = ComplianceRequest
        fields = [
            'id', 'type', 'status', 'requester', 'reason',
            'requester_name', 'requester_email', 'requester_type',
            'submitted_at', 'created_at', 'due_at', 'completed_at',
            'processed_by', 'notes', 'verified_at'
        ]
        read_only_fields = ['submitted_at', 'created_at', 'due_at', 'completed_at', 'processed_by']

    def get_requester(self, obj):
        return {
            'id': obj.requester.id,
            'email': obj.requester.email,
            'full_name': obj.requester.get_full_name(),
        }

    def get_requester_name(self, obj):
        return obj.requester.get_full_name()


class ComplianceStatsSerializer(serializers.Serializer):
    """Compliance statistics summary."""

    pending_requests = serializers.IntegerField()
    due_soon = serializers.IntegerField()
    completed_this_month = serializers.IntegerField()
    average_completion_days = serializers.FloatField()
    pending_count = serializers.IntegerField()
    processing_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()


class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Serializer for the singleton PlatformSettings model.

    Note: Job posting policies are managed via the job_policy KV store
    and the /api/admin/jobs/policy/ endpoint.
    """

    SLACK_WEBHOOK_FIELDS = [
        'slack_webhook_default', 'slack_webhook_security',
        'slack_webhook_moderation', 'slack_webhook_billing',
        'slack_webhook_jobs', 'slack_webhook_system',
    ]

    class Meta:
        model = PlatformSettings
        fields = [
            'platform_name', 'platform_description', 'support_email',
            'timezone', 'maintenance_mode', 'maintenance_message',
            'billing_provider', 'billing_default_currency',
            'billing_invoice_prefix', 'billing_company_name',
            'billing_company_address',
            'integration_google_analytics_id', 'integration_mixpanel_token',
            'turnstile_site_key', 'turnstile_secret_key',
            'turnstile_enabled', 'turnstile_protect_auth',
            'turnstile_protect_jobs', 'turnstile_protect_applications',
            'slack_enabled',
            'slack_webhook_default', 'slack_webhook_security',
            'slack_webhook_moderation', 'slack_webhook_billing',
            'slack_webhook_jobs', 'slack_webhook_system',
            'require_2fa', 'session_timeout_minutes', 'max_login_attempts',
            'enable_ip_allowlist', 'ip_allowlist',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def to_representation(self, instance):
        """Mask webhook URLs on read — show only last 8 chars."""
        data = super().to_representation(instance)
        for field in self.SLACK_WEBHOOK_FIELDS:
            url = data.get(field, '')
            if url:
                # Show masked prefix + last 8 chars for identification
                data[field] = '\u2022' * 8 + url[-8:]
            else:
                data[field] = ''
        return data

    def update(self, instance, validated_data):
        """Skip webhook fields that still contain the masked value."""
        for field in self.SLACK_WEBHOOK_FIELDS:
            value = validated_data.get(field)
            if value and value.startswith('\u2022' * 8):
                validated_data.pop(field)
        return super().update(instance, validated_data)


class FraudRuleSerializer(serializers.ModelSerializer):
    """Fraud rule serializer."""

    class Meta:
        model = FraudRule
        fields = [
            'id', 'name', 'description', 'enabled', 'severity',
            'conditions', 'triggers_count', 'false_positives_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['triggers_count', 'false_positives_count', 'created_at', 'updated_at']


class SponsoredBannerSerializer(serializers.ModelSerializer):
    """Sponsored banner serializer."""

    ctr = serializers.SerializerMethodField()

    class Meta:
        model = SponsoredBanner
        fields = [
            'id', 'title', 'image_url', 'target_url', 'placement',
            'sponsor', 'is_active', 'start_date', 'end_date',
            'impressions', 'clicks', 'ctr', 'created_at', 'updated_at'
        ]
        read_only_fields = ['impressions', 'clicks', 'ctr', 'created_at', 'updated_at']

    def get_ctr(self, obj):
        """Calculate click-through rate."""
        if obj.impressions > 0:
            return round((obj.clicks / obj.impressions) * 100, 2)
        return 0.0


class AffiliateLinkSerializer(serializers.ModelSerializer):
    """Affiliate link serializer."""

    conversion_rate = serializers.SerializerMethodField()

    class Meta:
        model = AffiliateLink
        fields = [
            'id', 'name', 'company', 'url', 'placement',
            'disclosure_label', 'is_active', 'clicks', 'conversions',
            'revenue', 'conversion_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['clicks', 'conversions', 'revenue', 'conversion_rate', 'created_at', 'updated_at']

    def get_conversion_rate(self, obj):
        """Calculate conversion rate."""
        if obj.clicks > 0:
            return round((obj.conversions / obj.clicks) * 100, 2)
        return 0.0


class PublicBannerSerializer(serializers.ModelSerializer):
    """Public banner serializer — minimal fields, no admin data."""

    class Meta:
        model = SponsoredBanner
        fields = ['id', 'title', 'image_url', 'target_url', 'placement', 'sponsor']


class PublicAffiliateLinkSerializer(serializers.ModelSerializer):
    """Public affiliate link serializer — minimal fields, no admin data."""

    class Meta:
        model = AffiliateLink
        fields = ['id', 'name', 'company', 'url', 'placement', 'disclosure_label']


class FeatureFlagSerializer(serializers.ModelSerializer):
    """Feature flag serializer."""

    class Meta:
        model = FeatureFlag
        fields = [
            'id', 'name', 'key', 'description', 'enabled',
            'environment', 'rollout_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class JobPackageSerializer(serializers.ModelSerializer):
    """Job package serializer."""

    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    yearly_monthly_equivalent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    yearly_savings_percent = serializers.IntegerField(read_only=True)
    yearly_savings_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = JobPackage
        fields = [
            'id', 'name', 'slug', 'description',
            'credits', 'validity_days', 'package_validity_days',
            'price', 'sale_price', 'monthly_price', 'yearly_price',
            'tax_rate', 'currency',
            'effective_price', 'tax_amount', 'total_price',
            'yearly_monthly_equivalent', 'yearly_savings_percent', 'yearly_savings_amount',
            'payment_type', 'features',
            'stripe_product_id', 'stripe_price_id',
            'featured_credits', 'social_credits',
            'priority_support', 'team_management',
            'is_active', 'is_popular', 'disable_repeat_purchase',
            'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer."""

    job_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'is_active', 'sort_order', 'job_count', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_job_count(self, obj):
        from apps.jobs.models import Job
        return Job.objects.filter(category=obj.slug, status='published').count()


class IndustrySerializer(serializers.ModelSerializer):
    """Industry serializer."""

    company_count = serializers.SerializerMethodField()

    class Meta:
        model = Industry
        fields = ['id', 'name', 'slug', 'description', 'icon', 'is_active', 'sort_order', 'company_count', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_company_count(self, obj):
        from apps.companies.models import Company
        return Company.objects.filter(industry=obj.name).count()


class RetentionRuleSerializer(serializers.ModelSerializer):
    """Retention rule serializer."""

    class Meta:
        model = RetentionRule
        fields = [
            'id', 'category', 'description', 'retention_days',
            'is_deletable', 'is_active', 'enforcement', 'legal_basis',
            'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class LegalDocumentSerializer(serializers.ModelSerializer):
    """Legal document serializer."""

    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = LegalDocument
        fields = [
            'id', 'title', 'slug', 'document_type', 'content', 'status',
            'version', 'published_at', 'effective_date', 'last_reviewed_at',
            'reviewed_by', 'reviewed_by_name', 'public_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'published_at', 'last_reviewed_at', 'created_at', 'updated_at']

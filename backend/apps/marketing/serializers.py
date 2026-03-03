"""
Marketing serializers for Orion.
"""
from rest_framework import serializers
from .models import (
    MarketingConsent, SuppressionEntry, ContactAttribute, Segment,
    Campaign, CampaignVariant, CampaignRecipient,
    Coupon, CouponRedemption, StoreCreditWallet, StoreCreditTransaction,
    Journey, JourneyStep, JourneyEnrollment, JourneyStepLog,
    UnsubscribeToken,
)


class MarketingConsentSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = MarketingConsent
        fields = [
            'id', 'user', 'user_email', 'user_name', 'status', 'source',
            'consented_at', 'withdrawn_at', 'ip_address',
            'express_consent', 'consent_proof', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MarketingConsentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingConsent
        fields = ['status', 'source', 'express_consent', 'consent_proof']


class SuppressionEntrySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)

    class Meta:
        model = SuppressionEntry
        fields = [
            'id', 'email', 'user', 'user_email', 'reason', 'source',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SuppressionEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuppressionEntry
        fields = ['email', 'reason', 'source', 'notes']


class SuppressionImportSerializer(serializers.Serializer):
    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=10000,
    )
    reason = serializers.ChoiceField(choices=SuppressionEntry.REASON_CHOICES)
    source = serializers.CharField(max_length=100, required=False, default='import')


class ContactAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactAttribute
        fields = ['id', 'user', 'key', 'value', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SegmentSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Segment
        fields = [
            'id', 'name', 'slug', 'description', 'segment_type',
            'filter_rules', 'estimated_size', 'last_computed_at',
            'member_count', 'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'estimated_size', 'last_computed_at', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        if obj.segment_type == 'static':
            return obj.members.count()
        return obj.estimated_size


class SegmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segment
        fields = ['name', 'description', 'segment_type', 'filter_rules']

    def validate_filter_rules(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('filter_rules must be a JSON object.')
        if value and 'rules' not in value:
            raise serializers.ValidationError('filter_rules must contain a "rules" key.')
        rules = value.get('rules', [])
        if not isinstance(rules, list):
            raise serializers.ValidationError('"rules" must be a list.')
        for rule in rules:
            if not isinstance(rule, dict):
                raise serializers.ValidationError('Each rule must be a JSON object.')
            required_keys = {'field', 'op', 'value'}
            if not required_keys.issubset(rule.keys()):
                raise serializers.ValidationError(
                    f'Each rule must have keys: {required_keys}. Got: {set(rule.keys())}'
                )
        return value


class SegmentPreviewSerializer(serializers.Serializer):
    estimated_count = serializers.IntegerField()
    sample_users = serializers.ListField(
        child=serializers.DictField()
    )


class AudienceOverviewSerializer(serializers.Serializer):
    total_contacts = serializers.IntegerField()
    opted_in = serializers.IntegerField()
    opted_out = serializers.IntegerField()
    suppressed_count = serializers.IntegerField()
    segment_count = serializers.IntegerField()
    consent_rate = serializers.FloatField()


# ─── Campaign Serializers ─────────────────────────────────────────────


class CampaignVariantSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)

    class Meta:
        model = CampaignVariant
        fields = [
            'id', 'name', 'subject_line', 'preheader', 'template', 'template_name',
            'weight', 'is_winner', 'sent_count', 'delivered_count',
            'opened_count', 'clicked_count', 'bounced_count',
            'created_at',
        ]
        read_only_fields = [
            'id', 'sent_count', 'delivered_count', 'opened_count',
            'clicked_count', 'bounced_count', 'created_at',
        ]


class CampaignSerializer(serializers.ModelSerializer):
    segment_name = serializers.CharField(source='segment.name', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)
    approved_by_email = serializers.CharField(source='approved_by.email', read_only=True, default=None)
    variants = CampaignVariantSerializer(many=True, read_only=True)
    open_rate = serializers.FloatField(read_only=True)
    click_rate = serializers.FloatField(read_only=True)
    bounce_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'slug', 'status',
            'segment', 'segment_name',
            'template', 'template_name',
            'subject_line', 'preheader', 'from_name', 'from_email', 'reply_to',
            'personalization_schema',
            'scheduled_at', 'started_at', 'completed_at',
            'is_ab_test', 'requires_approval',
            'approved_by', 'approved_by_email', 'approved_at',
            'total_recipients', 'sent_count', 'delivered_count',
            'opened_count', 'clicked_count', 'bounced_count',
            'complained_count', 'unsubscribed_count', 'failed_count',
            'open_rate', 'click_rate', 'bounce_rate',
            'variants',
            'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'slug', 'started_at', 'completed_at',
            'approved_by', 'approved_at',
            'total_recipients', 'sent_count', 'delivered_count',
            'opened_count', 'clicked_count', 'bounced_count',
            'complained_count', 'unsubscribed_count', 'failed_count',
            'created_by', 'created_at', 'updated_at',
        ]


class CampaignCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            'name', 'segment', 'template',
            'subject_line', 'preheader', 'from_name', 'from_email', 'reply_to',
            'personalization_schema',
            'scheduled_at', 'is_ab_test', 'requires_approval',
        ]


class CampaignUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            'name', 'segment', 'template',
            'subject_line', 'preheader', 'from_name', 'from_email', 'reply_to',
            'personalization_schema',
            'scheduled_at', 'is_ab_test', 'requires_approval',
        ]

    def validate(self, data):
        if self.instance and self.instance.status not in ('draft', 'scheduled'):
            raise serializers.ValidationError(
                'Can only edit campaigns in draft or scheduled status.'
            )
        return data


class CampaignRecipientSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = CampaignRecipient
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'variant', 'status',
            'sent_at', 'delivered_at', 'opened_at', 'clicked_at',
            'created_at',
        ]
        read_only_fields = fields


class CampaignStatsSerializer(serializers.Serializer):
    total_recipients = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    delivered_count = serializers.IntegerField()
    opened_count = serializers.IntegerField()
    clicked_count = serializers.IntegerField()
    bounced_count = serializers.IntegerField()
    complained_count = serializers.IntegerField()
    unsubscribed_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    open_rate = serializers.FloatField()
    click_rate = serializers.FloatField()
    bounce_rate = serializers.FloatField()


# ─── Coupon Serializers ──────────────────────────────────────────


class CouponSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)
    redemption_count = serializers.IntegerField(source='redemptions.count', read_only=True)
    applicable_package_ids = serializers.PrimaryKeyRelatedField(
        source='applicable_packages', many=True, read_only=True
    )

    class Meta:
        model = Coupon
        fields = [
            'id', 'name', 'code', 'description',
            'discount_type', 'discount_value', 'max_discount_amount',
            'distribution', 'status',
            'min_purchase', 'max_uses_total', 'max_uses_per_customer', 'uses_count',
            'applicable_package_ids', 'eligibility_rules',
            'starts_at', 'expires_at',
            'campaign', 'one_per_ip', 'require_verified_email',
            'legacy_promo_code',
            'redemption_count',
            'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'uses_count', 'redemption_count',
            'created_by', 'created_at', 'updated_at',
        ]


class CouponCreateSerializer(serializers.ModelSerializer):
    applicable_package_ids = serializers.PrimaryKeyRelatedField(
        source='applicable_packages',
        many=True,
        queryset=Coupon.applicable_packages.field.related_model.objects.all(),
        required=False,
    )

    class Meta:
        model = Coupon
        fields = [
            'name', 'code', 'description',
            'discount_type', 'discount_value', 'max_discount_amount',
            'distribution', 'status',
            'min_purchase', 'max_uses_total', 'max_uses_per_customer',
            'applicable_package_ids', 'eligibility_rules',
            'starts_at', 'expires_at',
            'campaign', 'one_per_ip', 'require_verified_email',
        ]

    def validate_code(self, value):
        return value.upper().strip()

    def validate(self, data):
        if data.get('discount_type') == 'percentage':
            val = data.get('discount_value')
            if val is not None and (val <= 0 or val > 100):
                raise serializers.ValidationError({'discount_value': 'Percentage must be between 1 and 100.'})
        return data


class CouponUpdateSerializer(serializers.ModelSerializer):
    applicable_package_ids = serializers.PrimaryKeyRelatedField(
        source='applicable_packages',
        many=True,
        queryset=Coupon.applicable_packages.field.related_model.objects.all(),
        required=False,
    )

    class Meta:
        model = Coupon
        fields = [
            'name', 'description',
            'discount_type', 'discount_value', 'max_discount_amount',
            'distribution', 'status',
            'min_purchase', 'max_uses_total', 'max_uses_per_customer',
            'applicable_package_ids', 'eligibility_rules',
            'starts_at', 'expires_at',
            'campaign', 'one_per_ip', 'require_verified_email',
        ]


class CouponRedemptionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)

    class Meta:
        model = CouponRedemption
        fields = [
            'id', 'coupon', 'coupon_code', 'user', 'user_email', 'user_name',
            'company', 'agency', 'invoice',
            'discount_amount', 'credits_granted',
            'ip_address', 'created_at',
        ]
        read_only_fields = fields


class CouponStatsSerializer(serializers.Serializer):
    total_redemptions = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    total_discount_given = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_credits_granted = serializers.IntegerField()
    remaining_uses = serializers.IntegerField(allow_null=True)
    conversion_rate = serializers.FloatField()


# ─── Store Credit Serializers ────────────────────────────────────


class StoreCreditTransactionSerializer(serializers.ModelSerializer):
    admin_email = serializers.CharField(source='admin.email', read_only=True, default=None)

    class Meta:
        model = StoreCreditTransaction
        fields = [
            'id', 'wallet', 'transaction_type', 'amount', 'balance_after',
            'description', 'coupon', 'invoice', 'admin', 'admin_email',
            'expires_at', 'created_at',
        ]
        read_only_fields = fields


class StoreCreditWalletSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)
    agency_name = serializers.CharField(source='agency.name', read_only=True, default=None)
    owner_type = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreCreditWallet
        fields = [
            'id', 'company', 'company_name', 'agency', 'agency_name',
            'owner_type', 'owner_name', 'balance',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_owner_type(self, obj):
        return 'company' if obj.company_id else 'agency'

    def get_owner_name(self, obj):
        if obj.company:
            return obj.company.name
        if obj.agency:
            return obj.agency.name
        return None


class IssueCreditSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    description = serializers.CharField(max_length=255)


# ─── Journey Serializers ────────────────────────────────────────────


class JourneyStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyStep
        fields = [
            'id', 'journey', 'step_type', 'name', 'sort_order', 'config',
            'next_step', 'true_branch', 'false_branch',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class JourneyStepCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyStep
        fields = [
            'step_type', 'name', 'sort_order', 'config',
            'next_step', 'true_branch', 'false_branch',
        ]


class JourneySerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)
    steps = JourneyStepSerializer(many=True, read_only=True)
    step_count = serializers.SerializerMethodField()

    class Meta:
        model = Journey
        fields = [
            'id', 'name', 'slug', 'status', 'description',
            'trigger_type', 'trigger_config',
            'max_entries_per_user', 'cooldown_hours',
            'goal_type', 'goal_config',
            'active_enrollments_count', 'completed_enrollments_count', 'total_enrollments_count',
            'steps', 'step_count',
            'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'slug',
            'active_enrollments_count', 'completed_enrollments_count', 'total_enrollments_count',
            'created_by', 'created_at', 'updated_at',
        ]

    def get_step_count(self, obj):
        return obj.steps.count()


class JourneyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no nested steps)."""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)
    step_count = serializers.SerializerMethodField()

    class Meta:
        model = Journey
        fields = [
            'id', 'name', 'slug', 'status', 'description',
            'trigger_type',
            'active_enrollments_count', 'completed_enrollments_count', 'total_enrollments_count',
            'step_count',
            'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_step_count(self, obj):
        return obj.steps.count()


class JourneyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Journey
        fields = [
            'name', 'description',
            'trigger_type', 'trigger_config',
            'max_entries_per_user', 'cooldown_hours',
            'goal_type', 'goal_config',
        ]


class JourneyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Journey
        fields = [
            'name', 'description',
            'trigger_type', 'trigger_config',
            'max_entries_per_user', 'cooldown_hours',
            'goal_type', 'goal_config',
        ]

    def validate(self, data):
        if self.instance and self.instance.status not in ('draft', 'paused'):
            raise serializers.ValidationError(
                'Can only edit journeys in draft or paused status.'
            )
        return data


class JourneyEnrollmentSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    current_step_name = serializers.CharField(
        source='current_step.name', read_only=True, default=None
    )

    class Meta:
        model = JourneyEnrollment
        fields = [
            'id', 'journey', 'user', 'user_email', 'user_name',
            'status', 'current_step', 'current_step_name',
            'next_action_at', 'entered_at', 'completed_at',
            'created_at',
        ]
        read_only_fields = fields


class JourneyStepLogSerializer(serializers.ModelSerializer):
    step_name = serializers.CharField(source='step.name', read_only=True, default=None)
    step_type = serializers.CharField(source='step.step_type', read_only=True)

    class Meta:
        model = JourneyStepLog
        fields = [
            'id', 'enrollment', 'step', 'step_name', 'step_type',
            'status', 'result', 'executed_at',
        ]
        read_only_fields = fields


class JourneyStatsSerializer(serializers.Serializer):
    total_enrollments = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    completed_enrollments = serializers.IntegerField()
    exited_goal = serializers.IntegerField()
    exited_manual = serializers.IntegerField()
    failed_enrollments = serializers.IntegerField()
    emails_sent = serializers.IntegerField()
    coupons_issued = serializers.IntegerField()


# ─── Reporting Serializers ──────────────────────────────────────────


class MarketingOverviewSerializer(serializers.Serializer):
    # Campaign
    campaigns_total = serializers.IntegerField()
    campaigns_sent = serializers.IntegerField()
    campaigns_active = serializers.IntegerField()
    total_emails_sent = serializers.IntegerField()
    total_emails_delivered = serializers.IntegerField()
    total_emails_opened = serializers.IntegerField()
    total_emails_clicked = serializers.IntegerField()
    avg_open_rate = serializers.FloatField()
    avg_click_rate = serializers.FloatField()
    # Coupon
    coupons_active = serializers.IntegerField()
    total_redemptions = serializers.IntegerField()
    redemptions_30d = serializers.IntegerField()
    total_discount_given = serializers.FloatField()
    # Journey
    journeys_active = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    completed_enrollments = serializers.IntegerField()
    # Audience
    total_contacts = serializers.IntegerField()
    opted_in = serializers.IntegerField()
    suppressed = serializers.IntegerField()
    segments_count = serializers.IntegerField()
    consent_rate = serializers.FloatField()


class CampaignReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    status = serializers.CharField()
    total_recipients = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    delivered_count = serializers.IntegerField()
    opened_count = serializers.IntegerField()
    clicked_count = serializers.IntegerField()
    bounced_count = serializers.IntegerField()
    complained_count = serializers.IntegerField()
    unsubscribed_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    open_rate = serializers.FloatField()
    click_rate = serializers.FloatField()
    bounce_rate = serializers.FloatField()
    completed_at = serializers.DateTimeField()


class CouponReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    status = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.FloatField()
    uses_count = serializers.IntegerField()
    max_uses_total = serializers.IntegerField(allow_null=True)
    redemption_count = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    total_discount = serializers.FloatField()
    total_credits = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField(allow_null=True)


class JourneyReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    status = serializers.CharField()
    trigger_type = serializers.CharField()
    enrollment_count = serializers.IntegerField()
    active_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    emails_sent = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class AudienceHealthSerializer(serializers.Serializer):
    consent_breakdown = serializers.DictField()
    suppression_breakdown = serializers.DictField()
    consent_daily = serializers.ListField(child=serializers.DictField())
    suppression_daily = serializers.ListField(child=serializers.DictField())
    total_consents = serializers.IntegerField()
    total_opted_in = serializers.IntegerField()
    total_suppressed = serializers.IntegerField()


class RevenueAttributionItemSerializer(serializers.Serializer):
    coupon_id = serializers.IntegerField()
    coupon_code = serializers.CharField()
    coupon_name = serializers.CharField()
    discount_type = serializers.CharField()
    redemption_count = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    total_discount = serializers.FloatField()
    total_credits = serializers.IntegerField()


class RevenueAttributionSerializer(serializers.Serializer):
    by_coupon = RevenueAttributionItemSerializer(many=True)
    total_discount = serializers.FloatField()
    total_redemptions = serializers.IntegerField()


# ─── Compliance Serializers ───────────────────────────────────────────


class UnsubscribeTokenSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UnsubscribeToken
        fields = ['id', 'user', 'user_email', 'token', 'campaign', 'journey_step', 'created_at', 'used_at']
        read_only_fields = fields


class UnsubscribeRequestSerializer(serializers.Serializer):
    """For processing POST unsubscribe requests."""
    pass  # Token comes from URL path, no body needed


class PreferencesSerializer(serializers.Serializer):
    """Public preference center data."""
    email = serializers.EmailField()
    first_name = serializers.CharField()
    consent_status = serializers.CharField()
    token = serializers.CharField()


class PreferencesUpdateSerializer(serializers.Serializer):
    """Update preferences via token."""
    status = serializers.ChoiceField(choices=['opted_in', 'unsubscribed'])


class ComplianceOverviewSerializer(serializers.Serializer):
    total_consents = serializers.IntegerField()
    opted_in = serializers.IntegerField()
    consent_rate = serializers.FloatField()
    total_suppressed = serializers.IntegerField()
    consent_breakdown = serializers.DictField()
    suppression_breakdown = serializers.DictField()
    unsubscribes_30d = serializers.IntegerField()
    bounces_30d = serializers.IntegerField()
    complaints_30d = serializers.IntegerField()
    unsubscribe_daily = serializers.ListField(child=serializers.DictField())
    suppression_daily = serializers.ListField(child=serializers.DictField())


class ConsentAuditSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user_email = serializers.CharField()
    user_name = serializers.CharField()
    status = serializers.CharField()
    source = serializers.CharField()
    consented_at = serializers.CharField(allow_null=True)
    withdrawn_at = serializers.CharField(allow_null=True)
    express_consent = serializers.BooleanField()
    updated_at = serializers.CharField()


class DeliverabilitySerializer(serializers.Serializer):
    total_sent_30d = serializers.IntegerField()
    total_delivered_30d = serializers.IntegerField()
    total_bounced_30d = serializers.IntegerField()
    total_complained_30d = serializers.IntegerField()
    delivery_rate = serializers.FloatField()
    bounce_rate = serializers.FloatField()
    complaint_rate = serializers.FloatField()
    open_rate = serializers.FloatField()
    click_rate = serializers.FloatField()
    campaigns_sent_30d = serializers.IntegerField()
    suppression_growth = serializers.ListField(child=serializers.DictField())


class WebhookEventSerializer(serializers.Serializer):
    """Validates inbound webhook payloads."""
    event_type = serializers.CharField()
    email = serializers.EmailField(required=False)
    to = serializers.EmailField(required=False)
    recipient = serializers.EmailField(required=False)
    campaign_id = serializers.IntegerField(required=False)
    type = serializers.CharField(required=False)  # bounce type
    error = serializers.CharField(required=False)

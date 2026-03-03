"""
Billing serializers for Orion API.
"""
from rest_framework import serializers
from .models import Entitlement, EntitlementLedger, PaymentMethod, Invoice, InvoiceItem, PromoCode, Subscription
from apps.moderation.models import JobPackage


class PublicJobPackageSerializer(serializers.ModelSerializer):
    """Public-facing serializer for JobPackage (moderation app).

    Maps moderation.JobPackage fields to the shape the frontend Package type expects.
    Used by /api/billing/packages/ for company/agency publish flows.
    """

    job_credits = serializers.IntegerField(source='credits', read_only=True)
    post_duration_days = serializers.IntegerField(source='validity_days', read_only=True)
    package_type = serializers.CharField(source='payment_type', read_only=True)
    billing_period = serializers.SerializerMethodField()

    class Meta:
        model = JobPackage
        fields = [
            'id', 'name', 'slug', 'description',
            'package_type', 'price', 'currency',
            'credits', 'job_credits', 'post_duration_days',
            'featured_credits', 'social_credits',
            'priority_support', 'team_management',
            'billing_period', 'features',
            'is_popular', 'is_active', 'sort_order',
        ]

    def get_billing_period(self, obj):
        if obj.payment_type == 'subscription':
            return 'month'
        return ''


class EntitlementSerializer(serializers.ModelSerializer):
    """Entitlement serializer."""

    credits_remaining = serializers.IntegerField(read_only=True)
    featured_credits_remaining = serializers.IntegerField(read_only=True)
    social_credits_remaining = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)

    class Meta:
        model = Entitlement
        fields = [
            'id', 'package', 'package_name',
            'credits_total', 'credits_used', 'credits_remaining',
            'featured_credits_total', 'featured_credits_used', 'featured_credits_remaining',
            'social_credits_total', 'social_credits_used', 'social_credits_remaining',
            'post_duration_days', 'expires_at', 'is_expired', 'is_valid',
            'source', 'created_at'
        ]


class EntitlementLedgerSerializer(serializers.ModelSerializer):
    """Entitlement ledger serializer."""

    job_title = serializers.CharField(source='job.title', read_only=True, allow_null=True)

    class Meta:
        model = EntitlementLedger
        fields = ['id', 'change', 'reason', 'job', 'job_title', 'notes', 'created_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Payment method serializer."""

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'cardholder_name', 'is_default', 'created_at'
        ]


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Invoice item serializer."""

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice serializer."""

    items = InvoiceItemSerializer(many=True, read_only=True)
    number = serializers.CharField(source='invoice_number', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    pdf_status = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'amount', 'currency', 'description', 'status',
            'paid_at', 'refunded_at', 'pdf_url', 'pdf_status',
            'items', 'created_at'
        ]

    def get_pdf_url(self, obj):
        if obj.invoice_pdf_key or obj.status in ('paid', 'refunded'):
            return f'/api/billing/invoices/{obj.id}/download/'
        return None

    def get_pdf_status(self, obj):
        if obj.invoice_pdf_key:
            return 'available'
        if obj.status in ('paid', 'refunded'):
            return 'available'
        return 'unavailable'


class PromoCodeSerializer(serializers.ModelSerializer):
    """Promo code serializer (for validation)."""

    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = PromoCode
        fields = ['code', 'discount_type', 'discount_value', 'min_purchase', 'is_valid']


class CheckoutItemSerializer(serializers.Serializer):
    """Serializer for checkout items."""

    package_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=10)


class CheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating checkout sessions."""

    items = CheckoutItemSerializer(many=True)
    promo_code = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required')

        package_ids = [item['package_id'] for item in value]
        packages = JobPackage.objects.filter(id__in=package_ids, is_active=True)

        if len(packages) != len(package_ids):
            raise serializers.ValidationError('Invalid package ID')

        return value


class SubscriptionSerializer(serializers.ModelSerializer):
    """Subscription serializer."""

    package = PublicJobPackageSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'package', 'status',
            'current_period_start', 'current_period_end',
            'canceled_at', 'created_at'
        ]


class AdminEntitlementSerializer(serializers.ModelSerializer):
    """Admin entitlement serializer."""

    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True, allow_null=True)

    class Meta:
        model = Entitlement
        fields = [
            'id', 'company', 'company_name', 'agency', 'agency_name',
            'package', 'credits_total', 'credits_used',
            'featured_credits_total', 'featured_credits_used',
            'social_credits_total', 'social_credits_used',
            'post_duration_days', 'expires_at', 'source', 'source_reference',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'credits_used', 'featured_credits_used', 'social_credits_used', 'created_at', 'updated_at']


class AdminEntitlementCreateSerializer(serializers.ModelSerializer):
    """Serializer for admin granting entitlements."""

    class Meta:
        model = Entitlement
        fields = [
            'company', 'agency', 'credits_total',
            'featured_credits_total', 'social_credits_total',
            'post_duration_days', 'expires_at'
        ]

    def validate(self, attrs):
        if not attrs.get('company') and not attrs.get('agency'):
            raise serializers.ValidationError('Either company or agency is required')
        if attrs.get('company') and attrs.get('agency'):
            raise serializers.ValidationError('Cannot specify both company and agency')
        return attrs

    def create(self, validated_data):
        validated_data['source'] = 'admin_grant'
        request = self.context.get('request')
        if request and request.user:
            validated_data['source_reference'] = request.user.email
        return super().create(validated_data)


class EntitlementSummarySerializer(serializers.Serializer):
    """Summary of all entitlements for a company/agency."""

    total_credits = serializers.IntegerField()
    used_credits = serializers.IntegerField()
    remaining_credits = serializers.IntegerField()
    total_featured_credits = serializers.IntegerField()
    remaining_featured_credits = serializers.IntegerField()
    total_social_credits = serializers.IntegerField()
    remaining_social_credits = serializers.IntegerField()
    active_entitlements = serializers.IntegerField()

"""
Django admin registration for marketing models.
"""
from django.contrib import admin
from .models import (
    MarketingConsent, SuppressionEntry, ContactAttribute, Segment,
    Campaign, CampaignVariant, CampaignRecipient, Journey, JourneyStep,
    JourneyEnrollment, JourneyStepLog,
    Coupon, CouponRedemption, StoreCreditWallet, StoreCreditTransaction,
    UnsubscribeToken,
)


@admin.register(MarketingConsent)
class MarketingConsentAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'source', 'express_consent', 'consented_at', 'created_at']
    list_filter = ['status', 'source', 'express_consent']
    search_fields = ['user__email']
    raw_id_fields = ['user']


@admin.register(SuppressionEntry)
class SuppressionEntryAdmin(admin.ModelAdmin):
    list_display = ['email', 'reason', 'source', 'created_at']
    list_filter = ['reason']
    search_fields = ['email']


@admin.register(ContactAttribute)
class ContactAttributeAdmin(admin.ModelAdmin):
    list_display = ['user', 'key', 'value', 'created_at']
    search_fields = ['user__email', 'key']
    list_filter = ['key']


@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'segment_type', 'estimated_size', 'last_computed_at', 'created_at']
    list_filter = ['segment_type']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'segment', 'total_recipients', 'sent_count', 'created_at']
    list_filter = ['status', 'is_ab_test']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ['segment', 'template', 'created_by', 'approved_by']


@admin.register(CampaignVariant)
class CampaignVariantAdmin(admin.ModelAdmin):
    list_display = ['campaign', 'name', 'weight', 'is_winner', 'sent_count']
    list_filter = ['is_winner']
    raw_id_fields = ['campaign', 'template']


@admin.register(CampaignRecipient)
class CampaignRecipientAdmin(admin.ModelAdmin):
    list_display = ['campaign', 'user', 'status', 'sent_at']
    list_filter = ['status']
    raw_id_fields = ['campaign', 'user', 'variant', 'email_log']


@admin.register(Journey)
class JourneyAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'trigger_type', 'active_enrollments_count', 'total_enrollments_count', 'created_at']
    list_filter = ['status', 'trigger_type']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ['created_by']


@admin.register(JourneyStep)
class JourneyStepAdmin(admin.ModelAdmin):
    list_display = ['name', 'journey', 'step_type', 'sort_order']
    list_filter = ['step_type']
    raw_id_fields = ['journey', 'next_step', 'true_branch', 'false_branch']


@admin.register(JourneyEnrollment)
class JourneyEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['journey', 'user', 'status', 'current_step', 'next_action_at', 'entered_at']
    list_filter = ['status']
    raw_id_fields = ['journey', 'user', 'current_step']


@admin.register(JourneyStepLog)
class JourneyStepLogAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'step', 'status', 'executed_at']
    list_filter = ['status']
    raw_id_fields = ['enrollment', 'step']


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'discount_type', 'discount_value', 'status', 'uses_count', 'expires_at']
    list_filter = ['status', 'discount_type', 'distribution']
    search_fields = ['code', 'name']
    raw_id_fields = ['campaign', 'legacy_promo_code', 'created_by']


@admin.register(CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ['coupon', 'user', 'discount_amount', 'credits_granted', 'created_at']
    raw_id_fields = ['coupon', 'user', 'company', 'agency', 'invoice']


@admin.register(StoreCreditWallet)
class StoreCreditWalletAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'agency', 'balance', 'created_at']
    raw_id_fields = ['company', 'agency']


@admin.register(StoreCreditTransaction)
class StoreCreditTransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'transaction_type', 'amount', 'balance_after', 'created_at']
    list_filter = ['transaction_type']
    raw_id_fields = ['wallet', 'coupon', 'invoice', 'admin']


@admin.register(UnsubscribeToken)
class UnsubscribeTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'token', 'campaign', 'created_at', 'used_at']
    list_filter = ['used_at']
    search_fields = ['user__email', 'token']
    raw_id_fields = ['user', 'campaign', 'journey_step']
    readonly_fields = ['token', 'created_at', 'used_at']

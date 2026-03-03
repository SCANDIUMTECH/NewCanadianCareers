"""
Billing admin configuration.
"""
from django.contrib import admin
from .models import (
    Entitlement, EntitlementLedger, PaymentMethod, Invoice, InvoiceItem,
    PromoCode, Subscription, StripeWebhookEvent,
)


@admin.register(Entitlement)
class EntitlementAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'agency', 'credits_total', 'credits_used', 'source', 'expires_at', 'created_at']
    list_filter = ['source', 'created_at', 'expires_at']
    search_fields = ['company__name', 'agency__name']
    ordering = ['-created_at']


@admin.register(EntitlementLedger)
class EntitlementLedgerAdmin(admin.ModelAdmin):
    list_display = ['entitlement', 'change', 'reason', 'job', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['entitlement__company__name', 'entitlement__agency__name', 'job__title']
    ordering = ['-created_at']


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'agency', 'card_brand', 'card_last4', 'is_default', 'created_at']
    list_filter = ['card_brand', 'is_default']
    search_fields = ['company__name', 'agency__name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'agency', 'amount', 'status', 'paid_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['company__name', 'agency__name', 'description']
    ordering = ['-created_at']


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'description', 'quantity', 'unit_price', 'total']


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'discount_value', 'uses_count', 'max_uses', 'is_active', 'expires_at']
    list_filter = ['discount_type', 'is_active']
    search_fields = ['code', 'description']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'agency', 'package', 'status', 'current_period_end', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['company__name', 'agency__name']


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = ['stripe_event_id', 'event_type', 'status', 'attempts', 'created_at', 'processed_at']
    list_filter = ['status', 'event_type', 'created_at']
    search_fields = ['stripe_event_id']
    ordering = ['-created_at']
    readonly_fields = ['stripe_event_id', 'event_type', 'payload', 'created_at', 'processed_at']

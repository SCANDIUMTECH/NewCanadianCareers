"""
Django admin configuration for AI services.
"""
from django.contrib import admin
from .models import AIProviderConfig, AIUsageLog


@admin.register(AIProviderConfig)
class AIProviderConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'model', 'is_active', 'seo_generation_enabled', 'social_generation_enabled', 'updated_at']
    list_filter = ['provider', 'is_active']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ['feature', 'status', 'provider', 'model', 'total_tokens', 'cost_usd', 'duration_ms', 'created_at']
    list_filter = ['feature', 'status', 'provider']
    search_fields = ['job__title', 'user__email', 'company__name']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'

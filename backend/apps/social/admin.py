"""
Social admin configuration.
"""
from django.contrib import admin
from .models import SocialPost, SocialAccount, SocialTemplate


@admin.register(SocialPost)
class SocialPostAdmin(admin.ModelAdmin):
    list_display = ['job', 'platform', 'status', 'scheduled_at', 'posted_at', 'impressions', 'clicks']
    list_filter = ['platform', 'status', 'created_at']
    search_fields = ['job__title', 'content']
    ordering = ['-created_at']


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ['account_name', 'platform', 'company', 'agency', 'is_active', 'last_used_at']
    list_filter = ['platform', 'is_active']
    search_fields = ['account_name', 'company__name', 'agency__name']


@admin.register(SocialTemplate)
class SocialTemplateAdmin(admin.ModelAdmin):
    list_display = ['provider', 'title_format', 'include_salary', 'utm_source']
    list_filter = ['provider', 'include_salary']
    ordering = ['provider']

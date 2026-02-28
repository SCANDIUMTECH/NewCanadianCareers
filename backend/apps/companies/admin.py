"""
Company admin configuration.
"""
from django.contrib import admin
from .models import Company, CompanyUser, Agency, AgencyUser, AgencyClient, CompanySettings


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'status', 'billing_status', 'industry', 'size', 'created_at']
    list_filter = ['status', 'billing_status', 'risk_level', 'industry', 'size']
    search_fields = ['name', 'domain', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['-created_at']


@admin.register(CompanyUser)
class CompanyUserAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'role', 'joined_at', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['user__email', 'company__name']


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'status', 'billing_status', 'billing_model', 'created_at']
    list_filter = ['status', 'billing_status', 'billing_model']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['-created_at']


@admin.register(AgencyUser)
class AgencyUserAdmin(admin.ModelAdmin):
    list_display = ['user', 'agency', 'role', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['user__email', 'agency__name']


@admin.register(AgencyClient)
class AgencyClientAdmin(admin.ModelAdmin):
    list_display = ['agency', 'company', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['agency__name', 'company__name']


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ['company', 'created_at', 'updated_at']
    search_fields = ['company__name']
    readonly_fields = ['created_at', 'updated_at']

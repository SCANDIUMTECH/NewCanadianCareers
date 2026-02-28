"""
Job admin configuration.
"""
from django.contrib import admin
from .models import Job, JobReport, JobView, JobBookmark


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'company', 'status', 'employment_type',
        'location_type', 'featured', 'views', 'applications_count',
        'posted_at', 'expires_at'
    ]
    list_filter = [
        'status', 'employment_type', 'experience_level',
        'category', 'location_type', 'featured', 'urgent'
    ]
    search_fields = ['title', 'description', 'company__name']
    prepopulated_fields = {'slug': ('title',)}
    ordering = ['-created_at']
    date_hierarchy = 'posted_at'

    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'slug', 'company', 'agency', 'posted_by', 'department')
        }),
        ('Classification', {
            'fields': ('employment_type', 'experience_level', 'category')
        }),
        ('Description', {
            'fields': ('description', 'responsibilities', 'requirements', 'nice_to_have', 'skills', 'benefits')
        }),
        ('Location', {
            'fields': ('city', 'state', 'country', 'location_type', 'timezone')
        }),
        ('Compensation', {
            'fields': (
                'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'show_salary',
                'equity', 'equity_min', 'equity_max'
            )
        }),
        ('Application', {
            'fields': ('apply_method', 'apply_email', 'apply_url', 'apply_instructions')
        }),
        ('Status', {
            'fields': ('status', 'featured', 'urgent', 'posted_at', 'expires_at', 'closed_at')
        }),
        ('Metrics', {
            'fields': ('views', 'unique_views', 'applications_count', 'report_count'),
            'classes': ('collapse',)
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['views', 'unique_views', 'applications_count', 'report_count']


@admin.register(JobReport)
class JobReportAdmin(admin.ModelAdmin):
    list_display = ['job', 'reason', 'reporter_email', 'status', 'created_at', 'reviewed_at']
    list_filter = ['status', 'reason', 'created_at']
    search_fields = ['job__title', 'reporter_email', 'details']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(JobView)
class JobViewAdmin(admin.ModelAdmin):
    list_display = ['job', 'visitor_id', 'user', 'ip_address', 'created_at']
    list_filter = ['created_at']
    search_fields = ['job__title', 'visitor_id', 'ip_address']
    ordering = ['-created_at']


@admin.register(JobBookmark)
class JobBookmarkAdmin(admin.ModelAdmin):
    list_display = ['job', 'candidate', 'created_by', 'created_at']
    search_fields = ['job__title', 'candidate__email']
    ordering = ['-created_at']

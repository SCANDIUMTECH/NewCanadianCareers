"""
Application admin configuration.
"""
from django.contrib import admin
from .models import Application, ApplicationTimeline, SavedJob, SavedSearch, ApplicationMessage


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'job', 'status', 'rating', 'created_at', 'status_changed_at']
    list_filter = ['status', 'rating', 'created_at']
    search_fields = ['candidate__email', 'job__title', 'job__company__name']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'status_changed_at']


@admin.register(ApplicationTimeline)
class ApplicationTimelineAdmin(admin.ModelAdmin):
    list_display = ['application', 'event', 'created_by', 'created_at']
    list_filter = ['event', 'created_at']
    search_fields = ['application__candidate__email', 'application__job__title']
    ordering = ['-created_at']


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'job', 'created_at']
    search_fields = ['candidate__email', 'job__title']
    ordering = ['-created_at']


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'name', 'frequency', 'enabled', 'match_count', 'last_sent_at']
    list_filter = ['frequency', 'enabled']
    search_fields = ['candidate__email', 'name']
    ordering = ['-created_at']


@admin.register(ApplicationMessage)
class ApplicationMessageAdmin(admin.ModelAdmin):
    list_display = ['application', 'sender', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['application__candidate__email', 'sender__email', 'content']
    ordering = ['-created_at']

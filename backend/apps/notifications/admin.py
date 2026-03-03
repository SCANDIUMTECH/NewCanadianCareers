"""
Notification admin configuration.
"""
from django.contrib import admin
from .models import Notification, NotificationPreference, EmailLog, SlackInstallation


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    ordering = ['-created_at']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_job_alerts', 'email_messages', 'push_enabled']
    search_fields = ['user__email']


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['to_email', 'subject', 'template', 'status', 'sent_at', 'created_at']
    list_filter = ['status', 'template', 'created_at']
    search_fields = ['to_email', 'subject']
    ordering = ['-created_at']


@admin.register(SlackInstallation)
class SlackInstallationAdmin(admin.ModelAdmin):
    list_display = ['team_name', 'team_id', 'is_active', 'installed_at', 'updated_at']
    readonly_fields = ['bot_token_masked', 'installed_at', 'installed_by', 'updated_at']
    exclude = ['bot_token']

    @admin.display(description='Bot Token')
    def bot_token_masked(self, obj):
        token = obj.bot_token
        if not token:
            return '(not set)'
        return f'{token[:8]}...{token[-4:]}' if len(token) > 12 else '****'

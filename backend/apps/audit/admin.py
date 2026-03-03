"""
Audit admin configuration.
"""
from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'target_type', 'target_id', 'ip_address', 'created_at']
    list_filter = ['action', 'target_type', 'created_at']
    search_fields = ['actor__email', 'target_id', 'target_repr']
    ordering = ['-created_at']
    readonly_fields = [
        'actor', 'action', 'target_type', 'target_id', 'target_repr',
        'changes', 'reason', 'ip_address', 'user_agent', 'created_at'
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

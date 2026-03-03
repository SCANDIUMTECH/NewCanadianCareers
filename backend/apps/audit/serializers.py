"""
Audit serializers for Orion API.
"""
from rest_framework import serializers
from .models import AuditLog, LoginAttempt


class AuditLogSerializer(serializers.ModelSerializer):
    """Audit log serializer."""

    actor_email = serializers.CharField(source='actor.email', read_only=True, allow_null=True)
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_email', 'actor_name',
            'action', 'target_type', 'target_id', 'target_repr',
            'changes', 'reason', 'ip_address', 'created_at'
        ]


class LoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for login attempts with security context."""

    location = serializers.CharField(source='location_display', read_only=True)

    class Meta:
        model = LoginAttempt
        fields = [
            'id', 'email', 'status', 'failure_reason', 'ip_address',
            'location', 'location_city', 'location_country',
            'user_agent', 'created_at'
        ]

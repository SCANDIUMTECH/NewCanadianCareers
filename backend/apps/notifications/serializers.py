"""
Notification serializers for Orion API.
"""
from rest_framework import serializers
from .models import (
    Notification, NotificationPreference,
    EmailProvider, EmailTrigger, EmailTemplate, EmailTemplateVersion,
    EmailLog, EmailSettings
)


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer."""

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'data',
            'link', 'is_read', 'read_at', 'created_at'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Notification preference serializer."""

    class Meta:
        model = NotificationPreference
        fields = [
            'email_application_received', 'email_application_status',
            'email_job_alerts', 'email_job_status', 'email_messages',
            'email_job_expired', 'email_credits_low', 'email_billing',
            'email_weekly_digest', 'email_marketing', 'push_enabled',
        ]


# =============================================================================
# Email Management Serializers
# =============================================================================

class EmailProviderSerializer(serializers.ModelSerializer):
    """Email provider serializer."""

    id = serializers.CharField(source='provider_type', read_only=True)
    apiKey = serializers.SerializerMethodField()
    lastSync = serializers.DateTimeField(source='last_sync', allow_null=True)
    webhookEnabled = serializers.BooleanField(source='webhook_enabled')
    rateLimit = serializers.CharField(source='rate_limit')
    webhookSecret = serializers.SerializerMethodField()
    webhookUrl = serializers.URLField(source='webhook_url', read_only=True)
    smtpHost = serializers.CharField(source='smtp_host', read_only=True)
    smtpPort = serializers.IntegerField(source='smtp_port', read_only=True)
    smtpUsername = serializers.SerializerMethodField()
    smtpUseTls = serializers.BooleanField(source='smtp_use_tls', read_only=True)
    smtpUseSsl = serializers.BooleanField(source='smtp_use_ssl', read_only=True)

    class Meta:
        model = EmailProvider
        fields = [
            'id', 'name', 'logo', 'connected', 'apiKey', 'status',
            'lastSync', 'spf', 'dkim', 'dmarc', 'webhookEnabled',
            'rateLimit', 'region', 'webhookSecret', 'webhookUrl',
            'smtpHost', 'smtpPort', 'smtpUsername', 'smtpUseTls', 'smtpUseSsl',
        ]

    def get_apiKey(self, obj):
        """Mask API key for security."""
        if obj.api_key:
            return f"••••••••{obj.api_key[-4:]}" if len(obj.api_key) > 4 else "••••••••"
        return ""

    def get_webhookSecret(self, obj):
        """Mask webhook secret for security."""
        if obj.webhook_secret:
            secret = obj.webhook_secret
            if len(secret) > 8:
                return f"{secret[:6]}••••{secret[-4:]}"
            return "••••••••"
        return ""

    def get_smtpUsername(self, obj):
        """Mask SMTP username for security."""
        if obj.smtp_username:
            return f"••••••••{obj.smtp_username[-4:]}" if len(obj.smtp_username) > 4 else "••••••••"
        return ""


class EmailTriggerSerializer(serializers.ModelSerializer):
    """Email trigger serializer."""

    eventKey = serializers.CharField(source='event_key')
    lastUpdated = serializers.DateTimeField(source='updated_at')
    lastSent = serializers.DateTimeField(source='last_sent', allow_null=True)
    sends7d = serializers.IntegerField(source='sends_7d')
    errors7d = serializers.IntegerField(source='errors_7d')
    provider = serializers.SerializerMethodField()
    template = serializers.SerializerMethodField()

    class Meta:
        model = EmailTrigger
        fields = [
            'id', 'name', 'category', 'eventKey', 'status', 'audience',
            'provider', 'template', 'lastUpdated', 'lastSent', 'sends7d', 'errors7d'
        ]

    def get_provider(self, obj):
        """Return provider name."""
        return obj.provider.name if obj.provider else "Not Set"

    def get_template(self, obj):
        """Return template name."""
        return obj.template.name if obj.template else "Not Set"


class EmailTriggerCreateUpdateSerializer(serializers.ModelSerializer):
    """Email trigger create/update serializer."""

    eventKey = serializers.CharField(source='event_key', required=False)
    provider_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    template_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = EmailTrigger
        fields = [
            'name', 'category', 'eventKey', 'status', 'audience',
            'provider_id', 'template_id'
        ]

    def validate_provider_id(self, value):
        """Validate provider exists."""
        if value:
            try:
                EmailProvider.objects.get(provider_type=value)
            except EmailProvider.DoesNotExist:
                raise serializers.ValidationError("Provider not found")
        return value

    def create(self, validated_data):
        provider_id = validated_data.pop('provider_id', None)
        template_id = validated_data.pop('template_id', None)

        if provider_id:
            validated_data['provider'] = EmailProvider.objects.get(provider_type=provider_id)
        if template_id:
            validated_data['template_id'] = template_id

        return super().create(validated_data)

    def update(self, instance, validated_data):
        provider_id = validated_data.pop('provider_id', None)
        template_id = validated_data.pop('template_id', None)

        if provider_id:
            validated_data['provider'] = EmailProvider.objects.get(provider_type=provider_id)
        if template_id is not None:
            validated_data['template_id'] = template_id

        return super().update(instance, validated_data)


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Email template list serializer."""

    lastUpdated = serializers.DateTimeField(source='updated_at')
    usedBy = serializers.IntegerField(source='used_by')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'slug', 'type', 'subcategory', 'lastUpdated',
            'usedBy', 'status', 'version', 'createdAt'
        ]


class EmailTemplateDetailSerializer(serializers.ModelSerializer):
    """Email template detail serializer."""

    lastUpdated = serializers.DateTimeField(source='updated_at', read_only=True)
    usedBy = serializers.IntegerField(source='used_by', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'slug', 'type', 'subcategory', 'status', 'subject',
            'preheader', 'html', 'variables', 'lastUpdated', 'usedBy',
            'version', 'createdAt'
        ]
        read_only_fields = ['version']


class EmailTemplateVersionSerializer(serializers.ModelSerializer):
    """Email template version history serializer."""

    savedAt = serializers.DateTimeField(source='created_at', read_only=True)
    savedBy = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplateVersion
        fields = ['id', 'version', 'html', 'subject', 'preheader', 'savedAt', 'savedBy']

    def get_savedBy(self, obj):
        if obj.saved_by:
            return obj.saved_by.get_full_name() or obj.saved_by.email
        return 'System'


class EmailLogSerializer(serializers.ModelSerializer):
    """Email log serializer."""

    recipient = serializers.EmailField(source='to_email')
    trigger = serializers.SerializerMethodField()
    template = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at')
    errorCode = serializers.SerializerMethodField()
    traceId = serializers.SerializerMethodField()
    userId = serializers.IntegerField(source='user_id', allow_null=True, read_only=True)
    userName = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = [
            'id', 'timestamp', 'recipient', 'trigger', 'template', 'provider',
            'status', 'errorCode', 'traceId', 'userId', 'userName'
        ]

    def get_userName(self, obj):
        return obj.user.get_full_name() or obj.user.email if obj.user else None

    def get_trigger(self, obj):
        return "N/A"  # Simple EmailLog doesn't have trigger relation yet

    def get_template(self, obj):
        return obj.template if obj.template else "N/A"

    def get_provider(self, obj):
        return "Resend" if obj.provider_id else "N/A"

    def get_errorCode(self, obj):
        return None  # Simple EmailLog doesn't have error_code field

    def get_traceId(self, obj):
        return str(obj.id)  # Use ID as trace ID for now


class EmailLogDetailSerializer(serializers.ModelSerializer):
    """Email log detail serializer with full information."""

    recipient = serializers.EmailField(source='to_email')
    trigger = serializers.SerializerMethodField()
    template = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at')
    errorCode = serializers.SerializerMethodField()
    traceId = serializers.SerializerMethodField()
    payload = serializers.JSONField(source='context')
    renderedHtml = serializers.SerializerMethodField()
    providerResponse = serializers.SerializerMethodField()
    userId = serializers.IntegerField(source='user_id', allow_null=True, read_only=True)
    userName = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = [
            'id', 'timestamp', 'recipient', 'trigger', 'template', 'provider',
            'status', 'errorCode', 'traceId', 'payload', 'renderedHtml', 'providerResponse',
            'userId', 'userName'
        ]

    def get_userName(self, obj):
        return obj.user.get_full_name() or obj.user.email if obj.user else None

    def get_trigger(self, obj):
        return "N/A"

    def get_template(self, obj):
        return obj.template if obj.template else "N/A"

    def get_provider(self, obj):
        return "Resend" if obj.provider_id else "N/A"

    def get_errorCode(self, obj):
        return None

    def get_traceId(self, obj):
        return str(obj.id)

    def get_renderedHtml(self, obj):
        return ""  # Not available in simple EmailLog

    def get_providerResponse(self, obj):
        return {}  # Not available in simple EmailLog


class EmailSettingsSerializer(serializers.ModelSerializer):
    """Email settings serializer."""

    defaultFromName = serializers.CharField(source='default_from_name')
    defaultFromEmail = serializers.EmailField(source='default_from_email')
    replyToAddress = serializers.EmailField(source='reply_to_address', allow_blank=True)
    sendingDomain = serializers.CharField(source='sending_domain')
    unsubscribeText = serializers.CharField(source='unsubscribe_text')
    includeUnsubscribe = serializers.BooleanField(source='include_unsubscribe')
    maxEmailsPerSecond = serializers.IntegerField(source='max_emails_per_second')
    maxEmailsPerMinute = serializers.IntegerField(source='max_emails_per_minute')
    maxRetries = serializers.IntegerField(source='max_retries')
    initialBackoff = serializers.IntegerField(source='initial_backoff')
    backoffMultiplier = serializers.FloatField(source='backoff_multiplier')
    productionMode = serializers.BooleanField(source='production_mode')
    killSwitchEnabled = serializers.BooleanField(source='kill_switch_enabled')
    logRetentionDays = serializers.IntegerField(source='log_retention_days')
    complianceRetentionDays = serializers.IntegerField(source='compliance_retention_days')
    lastCleanupAt = serializers.DateTimeField(source='last_cleanup_at', read_only=True, allow_null=True)
    lastCleanupCount = serializers.IntegerField(source='last_cleanup_count', read_only=True)

    class Meta:
        model = EmailSettings
        fields = [
            'defaultFromName', 'defaultFromEmail', 'replyToAddress', 'sendingDomain',
            'unsubscribeText', 'includeUnsubscribe', 'maxEmailsPerSecond',
            'maxEmailsPerMinute', 'maxRetries', 'initialBackoff', 'backoffMultiplier',
            'productionMode', 'killSwitchEnabled',
            'logRetentionDays', 'complianceRetentionDays', 'lastCleanupAt', 'lastCleanupCount',
        ]

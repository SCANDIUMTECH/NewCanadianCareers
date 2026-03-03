"""
Notification models for Orion.
"""
from django.db import models
from core.mixins import TimestampMixin
from core.encryption import EncryptedTextField


class Notification(TimestampMixin, models.Model):
    """User notifications."""

    TYPE_CHOICES = [
        ('application_received', 'New Application Received'),
        ('application_status', 'Application Status Update'),
        ('job_alert', 'Job Alert'),
        ('job_pending_review', 'Job Pending Review'),
        ('job_approved', 'Job Approved'),
        ('job_rejected', 'Job Rejected'),
        ('message', 'New Message'),
        ('job_expired', 'Job Expired'),
        ('credits_low', 'Credits Running Low'),
        ('system', 'System Notification'),
        ('payment_success', 'Payment Successful'),
        ('payment_failed', 'Payment Failed'),
        ('payment_action_required', 'Payment Action Required'),
        ('subscription_past_due', 'Subscription Past Due'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Additional context

    # Links
    link = models.CharField(max_length=500, blank=True)  # Frontend URL to navigate to

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Email sent
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} - {self.title}'

    def mark_as_read(self):
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])


class NotificationPreference(models.Model):
    """User notification preferences."""

    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # Email preferences
    email_application_received = models.BooleanField(default=True)
    email_application_status = models.BooleanField(default=True)
    email_job_alerts = models.BooleanField(default=True)
    email_job_status = models.BooleanField(default=True)  # approved/rejected/pending review
    email_messages = models.BooleanField(default=True)
    email_job_expired = models.BooleanField(default=True)
    email_credits_low = models.BooleanField(default=True)
    email_billing = models.BooleanField(default=True)
    email_weekly_digest = models.BooleanField(default=False)
    email_marketing = models.BooleanField(default=False)

    # In-app preferences
    push_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'notification_preferences'

    def __str__(self):
        return f'Preferences for {self.user.email}'


class EmailProvider(TimestampMixin, models.Model):
    """Email service providers."""

    PROVIDER_CHOICES = [
        ('resend', 'Resend'),
        ('zeptomail', 'ZeptoMail'),
        ('smtp', 'SMTP'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('disconnected', 'Disconnected'),
        ('error', 'Error'),
    ]

    DNS_STATUS_CHOICES = [
        ('verified', 'Verified'),
        ('warning', 'Warning'),
        ('missing', 'Missing'),
    ]

    provider_type = models.CharField(max_length=20, choices=PROVIDER_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    logo = models.CharField(max_length=255, blank=True)  # URL to logo
    connected = models.BooleanField(default=False)
    api_key = EncryptedTextField(blank=True, default='')  # Fernet-encrypted at rest
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disconnected')
    last_sync = models.DateTimeField(null=True, blank=True)

    # DNS verification
    spf = models.CharField(max_length=10, choices=DNS_STATUS_CHOICES, default='missing')
    dkim = models.CharField(max_length=10, choices=DNS_STATUS_CHOICES, default='missing')
    dmarc = models.CharField(max_length=10, choices=DNS_STATUS_CHOICES, default='missing')

    # Config
    webhook_enabled = models.BooleanField(default=False)
    rate_limit = models.CharField(max_length=50, default='100/min')
    region = models.CharField(max_length=50, default='us-east-1')
    sending_domain = models.CharField(max_length=255, blank=True)

    # Per-provider webhook config
    webhook_secret = EncryptedTextField(blank=True, default='')
    webhook_url = models.URLField(blank=True, default='')

    # SMTP config (only when provider_type='smtp')
    smtp_host = models.CharField(max_length=255, blank=True, default='')
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = EncryptedTextField(blank=True, default='')
    smtp_password = EncryptedTextField(blank=True, default='')
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)

    # Active provider
    is_active = models.BooleanField(default=False)

    class Meta:
        db_table = 'email_providers'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class EmailTrigger(TimestampMixin, models.Model):
    """Email triggers for automated emails."""

    CATEGORY_CHOICES = [
        ('Onboarding', 'Onboarding'),
        ('Activation', 'Activation'),
        ('Jobs', 'Jobs'),
        ('Billing', 'Billing'),
        ('Trust & Safety', 'Trust & Safety'),
        ('Support', 'Support'),
        ('Notifications', 'Notifications'),
        ('Marketing', 'Marketing'),
        ('System', 'System'),
    ]

    AUDIENCE_CHOICES = [
        ('Admin', 'Admin'),
        ('Agency', 'Agency'),
        ('Company', 'Company'),
        ('Candidate', 'Candidate'),
        ('All Users', 'All Users'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    event_key = models.CharField(max_length=100, unique=True)
    status = models.BooleanField(default=True)  # enabled/disabled
    audience = models.CharField(max_length=50, choices=AUDIENCE_CHOICES)

    # Relations
    provider = models.ForeignKey(
        EmailProvider,
        on_delete=models.SET_NULL,
        null=True,
        related_name='triggers'
    )
    template = models.ForeignKey(
        'EmailTemplate',
        on_delete=models.SET_NULL,
        null=True,
        related_name='triggers'
    )

    # Metrics
    last_sent = models.DateTimeField(null=True, blank=True)
    sends_7d = models.PositiveIntegerField(default=0)
    errors_7d = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'email_triggers'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['event_key']),
            models.Index(fields=['status', 'category']),
        ]

    def __str__(self):
        return f'{self.name} ({self.event_key})'


class EmailTemplate(TimestampMixin, models.Model):
    """Email templates."""

    TYPE_CHOICES = [
        ('Transactional', 'Transactional'),
        ('Marketing', 'Marketing'),
        ('System', 'System'),
    ]

    STATUS_CHOICES = [
        ('Published', 'Published'),
        ('Draft', 'Draft'),
        ('Archived', 'Archived'),
    ]

    SUBCATEGORY_CHOICES = [
        # Transactional
        ('Authentication', 'Authentication'),
        ('Jobs', 'Jobs'),
        ('Applications', 'Applications'),
        ('Billing', 'Billing'),
        ('Alerts', 'Alerts'),
        # Marketing
        ('Campaign', 'Campaign'),
        ('Promotional', 'Promotional'),
        ('Newsletter', 'Newsletter'),
        ('Coupon', 'Coupon'),
        ('Announcement', 'Announcement'),
        # System
        ('Default', 'Default'),
        ('Internal', 'Internal'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    subcategory = models.CharField(max_length=30, choices=SUBCATEGORY_CHOICES, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')

    # Content
    subject = models.CharField(max_length=255)
    preheader = models.CharField(max_length=255, blank=True)
    html = models.TextField()
    variables = models.JSONField(default=list, blank=True)  # List of variable names

    # Version tracking
    version = models.PositiveIntegerField(default=1)

    # Metrics
    used_by = models.PositiveIntegerField(default=0)  # Number of triggers using this template

    class Meta:
        db_table = 'email_templates'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status', 'type', 'subcategory']),
        ]

    def __str__(self):
        return self.name


class EmailTemplateVersion(TimestampMixin, models.Model):
    """Snapshot of a template at a specific version."""

    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version = models.PositiveIntegerField()
    html = models.TextField()
    subject = models.CharField(max_length=255)
    preheader = models.CharField(max_length=255, blank=True)
    saved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'email_template_versions'
        ordering = ['-version']
        unique_together = [('template', 'version')]

    def __str__(self):
        return f'{self.template.name} v{self.version}'


class EmailLog(TimestampMixin, models.Model):
    """Log of sent emails."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='email_logs'
    )
    to_email = models.EmailField()
    subject = models.CharField(max_length=255)
    template = models.CharField(max_length=100)
    context = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Provider tracking
    provider_id = models.CharField(max_length=100, blank=True)  # Resend message ID

    # Marketing campaign attribution (nullable — only set for campaign/journey sends)
    campaign = models.ForeignKey(
        'marketing.Campaign',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    journey_step = models.ForeignKey(
        'marketing.JourneyStep',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign'], condition=models.Q(campaign__isnull=False), name='idx_email_log_campaign'),
            models.Index(fields=['created_at'], name='idx_email_log_created_at'),
            models.Index(fields=['status', 'created_at'], name='idx_email_log_status_date'),
        ]

    def __str__(self):
        return f'{self.to_email} - {self.subject}'


class EmailSettings(TimestampMixin, models.Model):
    """Email system settings (singleton)."""

    # Default sender
    default_from_name = models.CharField(max_length=100, default='Orion')
    default_from_email = models.EmailField(default='noreply@orion.jobs')
    reply_to_address = models.EmailField(blank=True)
    sending_domain = models.CharField(max_length=255, default='orion.jobs')

    # Unsubscribe
    unsubscribe_text = models.TextField(default='Unsubscribe from these emails')
    include_unsubscribe = models.BooleanField(default=True)

    # Rate limits
    max_emails_per_second = models.PositiveIntegerField(default=10)
    max_emails_per_minute = models.PositiveIntegerField(default=100)

    # Retry config
    max_retries = models.PositiveIntegerField(default=3)
    initial_backoff = models.PositiveIntegerField(default=60)  # seconds
    backoff_multiplier = models.FloatField(default=2.0)

    # Safety
    production_mode = models.BooleanField(default=False)
    kill_switch_enabled = models.BooleanField(default=False)  # Disable all emails

    # Dismissed suggestion IDs (persisted so they don't reappear on refresh)
    dismissed_suggestions = models.JSONField(default=list, blank=True)

    # Log retention (GDPR + CAN-SPAM compliance)
    log_retention_days = models.PositiveIntegerField(
        default=90,
        help_text='Days to retain sent/pending email logs. 0 = keep forever.'
    )
    compliance_retention_days = models.PositiveIntegerField(
        default=1095,
        help_text='Days to retain bounced/failed email logs (CAN-SPAM: 3 years). 0 = keep forever.'
    )
    last_cleanup_at = models.DateTimeField(null=True, blank=True)
    last_cleanup_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'email_settings'
        verbose_name_plural = 'Email settings'

    def __str__(self):
        return 'Email Settings'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class SlackInstallation(models.Model):
    """Singleton: Slack OAuth App installation for platform-wide notifications.

    Stores the bot token (Fernet-encrypted at rest) and per-category channel ID mappings.
    The bot token is stored server-side and never exposed to the frontend.
    channel_* fields store Slack channel IDs (e.g., 'C0123456789'), not names.
    """

    # Slack App credentials (configurable from admin UI, env vars as fallback)
    client_id = models.CharField(max_length=200, blank=True, default='')
    client_secret = EncryptedTextField(blank=True, default='')  # Fernet-encrypted at rest

    # OAuth identity (populated after OAuth flow completes)
    team_id = models.CharField(max_length=50, blank=True, default='')
    team_name = models.CharField(max_length=255, blank=True, default='')
    bot_user_id = models.CharField(max_length=50, blank=True, default='')

    # Fernet-encrypted at rest — transparent encrypt on save, decrypt on read
    bot_token = EncryptedTextField(blank=True, default='')

    # OAuth app state
    installed_at = models.DateTimeField(null=True, blank=True)
    installed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='slack_installations',
    )
    is_active = models.BooleanField(default=False)

    # Channel ID mappings per notification category
    channel_default = models.CharField(max_length=50, blank=True, default='')
    channel_security = models.CharField(max_length=50, blank=True, default='')
    channel_moderation = models.CharField(max_length=50, blank=True, default='')
    channel_billing = models.CharField(max_length=50, blank=True, default='')
    channel_jobs = models.CharField(max_length=50, blank=True, default='')
    channel_system = models.CharField(max_length=50, blank=True, default='')

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'slack_installation'
        verbose_name = 'Slack Installation'

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_installation(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f'Slack: {self.team_name or "not installed"}'

"""
Moderation models for Orion.
"""
from django.db import models
from core.mixins import TimestampMixin
from core.encryption import EncryptedTextField


class PlatformSetting(TimestampMixin, models.Model):
    """Platform-wide settings."""

    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='setting_updates'
    )

    class Meta:
        db_table = 'platform_settings'

    def __str__(self):
        return self.key


class Banner(TimestampMixin, models.Model):
    """Promotional banners."""

    POSITION_CHOICES = [
        ('homepage_top', 'Homepage Top'),
        ('homepage_sidebar', 'Homepage Sidebar'),
        ('job_listing', 'Job Listing Page'),
        ('job_detail', 'Job Detail Page'),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='banners/', null=True, blank=True)
    link = models.URLField(blank=True)
    position = models.CharField(max_length=30, choices=POSITION_CHOICES)

    # Targeting
    target_role = models.CharField(max_length=20, blank=True)  # candidate, employer, agency, or blank for all

    # Schedule
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    # Metrics
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'banners'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Announcement(TimestampMixin, models.Model):
    """System announcements."""

    TYPE_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('maintenance', 'Maintenance'),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField()
    announcement_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')

    # Targeting
    target_role = models.CharField(max_length=20, blank=True)

    # Schedule
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Affiliate(TimestampMixin, models.Model):
    """Affiliate partners."""

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    user = models.OneToOneField(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='affiliate_profile'
    )

    # Commission
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Percentage

    # Metrics
    total_referrals = models.PositiveIntegerField(default=0)
    total_conversions = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'affiliates'

    def __str__(self):
        return f'{self.name} ({self.code})'


class AffiliateReferral(TimestampMixin, models.Model):
    """Track affiliate referrals."""

    affiliate = models.ForeignKey(Affiliate, on_delete=models.CASCADE, related_name='referrals')
    referred_user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='affiliate_referral'
    )
    referred_company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        related_name='affiliate_referral'
    )

    # Tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    landing_page = models.URLField(blank=True)

    # Conversion
    converted = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'affiliate_referrals'

    def __str__(self):
        return f'{self.affiliate.code} - {self.referred_user or self.referred_company}'


class SystemAlert(TimestampMixin, models.Model):
    """System alerts for admin dashboard."""

    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]

    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='info')
    is_dismissed = models.BooleanField(default=False)
    dismissed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dismissed_alerts'
    )
    dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'system_alerts'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.severity}] {self.message[:50]}'


class FraudAlert(TimestampMixin, models.Model):
    """Fraud detection alerts for admin dashboard."""

    TYPE_CHOICES = [
        ('suspicious_activity', 'Suspicious Activity'),
        ('payment_fraud', 'Payment Fraud'),
        ('fake_job', 'Fake Job'),
        ('spam', 'Spam'),
        ('identity_fraud', 'Identity Fraud'),
        ('multiple_accounts', 'Multiple Accounts'),
        ('credential_stuffing', 'Credential Stuffing'),
        ('fake_listings', 'Fake Listings'),
        ('disposable_email', 'Disposable Email'),
    ]

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
        ('blocked', 'Blocked'),
    ]

    SUBJECT_TYPE_CHOICES = [
        ('user', 'User'),
        ('company', 'Company'),
        ('agency', 'Agency'),
        ('job', 'Job'),
    ]

    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    # Subject of the alert
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE_CHOICES)
    subject_id = models.PositiveIntegerField()
    subject_name = models.CharField(max_length=255)

    # Details
    description = models.TextField()
    indicators = models.JSONField(default=list, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    affected_accounts = models.JSONField(default=list, blank=True)

    # Resolution
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_fraud_alerts'
    )
    resolution_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'fraud_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'severity'], name='fraud_alert_status_sev_idx'),
            models.Index(fields=['type', 'status'], name='fraud_alert_type_status_idx'),
        ]

    def __str__(self):
        return f'[{self.severity}] {self.type} - {self.subject_name}'


class AdminActivity(TimestampMixin, models.Model):
    """Activity log for admin dashboard."""

    TYPE_CHOICES = [
        ('job', 'Job'),
        ('user', 'User'),
        ('moderation', 'Moderation'),
        ('payment', 'Payment'),
    ]

    activity_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    action = models.CharField(max_length=255)
    entity_name = models.CharField(max_length=255)
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_activities'
    )
    actor = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_activities'
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'admin_activities'
        ordering = ['-created_at']
        verbose_name_plural = 'Admin activities'

    def __str__(self):
        return f'{self.activity_type}: {self.action}'


class ComplianceRequest(TimestampMixin, models.Model):
    """GDPR/CCPA compliance requests."""

    TYPE_CHOICES = [
        ('gdpr_access', 'GDPR Data Access'),
        ('gdpr_delete', 'GDPR Data Deletion'),
        ('gdpr_portability', 'GDPR Data Portability'),
        ('ccpa_access', 'CCPA Data Access'),
        ('ccpa_delete', 'CCPA Data Deletion'),
        ('ccpa_opt_out', 'CCPA Opt-Out'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]

    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requester = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='compliance_requests'
    )
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    # Processing
    submitted_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_compliance_requests'
    )

    # Verification
    verification_code = models.CharField(max_length=64, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Export data
    export_file = models.FileField(upload_to='compliance_exports/', null=True, blank=True)

    class Meta:
        db_table = 'compliance_requests'
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.get_type_display()} - {self.requester.email}'


class PlatformSettings(models.Model):
    """Singleton model for platform-wide settings.

    Note: Job posting policies are managed via PlatformSetting KV store
    (key='job_policy'). See apps/jobs/services.py get_job_policy().
    """

    # General
    platform_name = models.CharField(max_length=200, default='Orion')
    platform_description = models.TextField(blank=True, default='')
    support_email = models.EmailField(default='support@orion.com')
    timezone = models.CharField(max_length=50, default='UTC')
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True, default='')

    # Billing
    billing_provider = models.CharField(max_length=20, default='stripe')
    billing_default_currency = models.CharField(max_length=10, default='usd')
    billing_invoice_prefix = models.CharField(max_length=20, default='INV-')
    billing_company_name = models.CharField(max_length=255, default='Orion Jobs Inc.')
    billing_company_address = models.TextField(blank=True, default='')

    # Stripe Keys (encrypted at rest via Fernet)
    stripe_publishable_key = EncryptedTextField(blank=True, default='')
    stripe_secret_key = EncryptedTextField(blank=True, default='')
    stripe_webhook_secret = EncryptedTextField(blank=True, default='')

    # Integrations
    integration_google_analytics_id = models.CharField(max_length=50, blank=True, default='')
    integration_mixpanel_token = EncryptedTextField(blank=True, default='')

    # Cloudflare Turnstile
    turnstile_site_key = models.CharField(max_length=100, blank=True, default='')
    turnstile_secret_key = EncryptedTextField(blank=True, default='')
    turnstile_enabled = models.BooleanField(default=False)
    turnstile_protect_auth = models.BooleanField(default=True)
    turnstile_protect_jobs = models.BooleanField(default=True)
    turnstile_protect_applications = models.BooleanField(default=True)

    # Slack Integration
    slack_enabled = models.BooleanField(default=False)
    slack_webhook_default = EncryptedTextField(blank=True, default='')
    slack_webhook_security = EncryptedTextField(blank=True, default='')
    slack_webhook_moderation = EncryptedTextField(blank=True, default='')
    slack_webhook_billing = EncryptedTextField(blank=True, default='')
    slack_webhook_jobs = EncryptedTextField(blank=True, default='')
    slack_webhook_system = EncryptedTextField(blank=True, default='')

    # Security
    require_2fa = models.BooleanField(default=False)
    session_timeout_minutes = models.IntegerField(default=60)
    max_login_attempts = models.IntegerField(default=5)
    enable_ip_allowlist = models.BooleanField(default=False)
    ip_allowlist = models.TextField(blank=True, default='')

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings_singleton'
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f'Platform Settings (updated {self.updated_at})'


class FraudRule(TimestampMixin, models.Model):
    """Fraud detection rules."""

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
    enabled = models.BooleanField(default=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    conditions = models.JSONField(default=dict)

    # Metrics
    triggers_count = models.PositiveIntegerField(default=0)
    false_positives_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'fraud_rules'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SponsoredBanner(TimestampMixin, models.Model):
    """Sponsored banners for job board monetization."""

    PLACEMENT_CHOICES = [
        ('search_top', 'Search Top'),
        ('search_sidebar', 'Search Sidebar'),
        ('job_detail', 'Job Detail'),
        ('homepage', 'Homepage'),
    ]

    title = models.CharField(max_length=200)
    image_url = models.URLField(blank=True)
    target_url = models.URLField()
    placement = models.CharField(max_length=50, choices=PLACEMENT_CHOICES)
    sponsor = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    impressions = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)

    class Meta:
        db_table = 'sponsored_banners'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class AffiliateLink(TimestampMixin, models.Model):
    """Affiliate links for job board monetization."""

    PLACEMENT_CHOICES = [
        ('job_detail', 'Job Detail'),
        ('search_results', 'Search Results'),
        ('email', 'Email'),
        ('footer', 'Footer'),
    ]

    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    url = models.URLField()
    placement = models.CharField(max_length=50, choices=PLACEMENT_CHOICES)
    disclosure_label = models.CharField(max_length=100, default='Sponsored')
    is_active = models.BooleanField(default=True)
    clicks = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'affiliate_links'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class BannerImpression(models.Model):
    """Tracks individual banner impressions for analytics."""

    banner = models.ForeignKey(SponsoredBanner, on_delete=models.CASCADE, related_name='impression_records')
    visitor_id = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    placement = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banner_impressions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['banner', 'visitor_id', 'created_at']),
        ]


class BannerClick(models.Model):
    """Tracks individual banner clicks for analytics."""

    banner = models.ForeignKey(SponsoredBanner, on_delete=models.CASCADE, related_name='click_records')
    visitor_id = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banner_clicks'
        ordering = ['-created_at']


class AffiliateLinkClick(models.Model):
    """Tracks individual affiliate link clicks for analytics."""

    link = models.ForeignKey(AffiliateLink, on_delete=models.CASCADE, related_name='click_records')
    visitor_id = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'affiliate_link_clicks'
        ordering = ['-created_at']


class FeatureFlag(TimestampMixin, models.Model):
    """Feature flags for platform configuration."""

    ENVIRONMENT_CHOICES = [
        ('all', 'All'),
        ('production', 'Production'),
        ('staging', 'Staging'),
        ('development', 'Development'),
    ]

    name = models.CharField(max_length=200)
    key = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=False)
    environment = models.CharField(max_length=20, choices=ENVIRONMENT_CHOICES, default='all')
    rollout_percentage = models.IntegerField(default=100)

    class Meta:
        db_table = 'feature_flags'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class JobPackage(TimestampMixin, models.Model):
    """Job posting packages for monetization."""

    PAYMENT_TYPE_CHOICES = [
        ('one_time', 'One Time'),
        ('subscription', 'Subscription'),
        ('bundle', 'Credit Bundle'),
    ]

    # Basic info
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)

    # Credits & duration
    credits = models.IntegerField(default=1)
    validity_days = models.IntegerField(default=30, help_text='How long each job post stays live (days)')
    package_validity_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='How long the package/entitlement is valid after purchase (days). Null = never expires.'
    )

    # Pricing — one-time / bundle
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Discounted price. If set, the original price is shown as struck-through.'
    )

    # Pricing — subscription (monthly + yearly with savings, like Claude/OpenAI/v0)
    monthly_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Monthly subscription price. Required for subscription packages.'
    )
    yearly_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Yearly subscription price (total per year, not per month). Required for subscription packages.'
    )

    # Tax & currency
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Tax percentage (e.g., 13.00 for 13% HST). 0 means tax-exempt.'
    )
    currency = models.CharField(max_length=3, default='CAD')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='one_time')

    # Stripe
    stripe_product_id = models.CharField(max_length=100, blank=True, default='')
    stripe_price_id = models.CharField(max_length=100, blank=True, default='')

    # Extra credits
    featured_credits = models.PositiveIntegerField(default=0)
    social_credits = models.PositiveIntegerField(default=0)

    # Feature flags
    priority_support = models.BooleanField(default=False)
    team_management = models.BooleanField(default=False)

    # Features & flags
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)
    disable_repeat_purchase = models.BooleanField(
        default=False,
        help_text='If true, a customer can only purchase this package once (e.g., free trials, welcome offers).'
    )

    # Display
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'job_packages'
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while JobPackage.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def effective_price(self):
        """Return the sale price if set, otherwise the regular price."""
        return self.sale_price if self.sale_price is not None else self.price

    @property
    def tax_amount(self):
        """Calculate tax amount based on effective price."""
        if self.tax_rate:
            return round(self.effective_price * self.tax_rate / 100, 2)
        return 0

    @property
    def total_price(self):
        """Effective price + tax."""
        return self.effective_price + self.tax_amount

    @property
    def yearly_monthly_equivalent(self):
        """For subscriptions: what the yearly plan costs per month."""
        if self.yearly_price and self.yearly_price > 0:
            from decimal import Decimal, ROUND_HALF_UP
            return (self.yearly_price / Decimal('12')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return None

    @property
    def yearly_savings_percent(self):
        """For subscriptions: percentage saved on yearly vs monthly."""
        if self.monthly_price and self.yearly_price and self.monthly_price > 0:
            monthly_annual = self.monthly_price * 12
            savings = ((monthly_annual - self.yearly_price) / monthly_annual) * 100
            return round(float(savings))
        return 0

    @property
    def yearly_savings_amount(self):
        """For subscriptions: dollar amount saved per year on yearly vs monthly."""
        if self.monthly_price and self.yearly_price:
            monthly_annual = self.monthly_price * 12
            return monthly_annual - self.yearly_price
        return 0

    @property
    def post_duration_days(self):
        """Alias for validity_days — used by billing/entitlement code."""
        return self.validity_days


class Category(TimestampMixin, models.Model):
    """Job categories managed by platform admin."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text='Lucide icon name')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'categories'
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Industry(TimestampMixin, models.Model):
    """Company industries managed by platform admin."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text='Lucide icon name')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'industries'
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Industries'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class RetentionRule(TimestampMixin, models.Model):
    """Data retention rules for compliance management."""

    ENFORCEMENT_CHOICES = [
        ('manual', 'Manual'),
        ('automated', 'Automated'),
        ('legal_hold', 'Legal Hold'),
    ]

    category = models.CharField(max_length=100)
    description = models.TextField()
    retention_days = models.PositiveIntegerField(
        help_text='Number of days to retain data (e.g., 1095 for 3 years)'
    )
    is_deletable = models.BooleanField(
        default=False,
        help_text='Whether users can request deletion of this data category'
    )
    is_active = models.BooleanField(default=True)
    enforcement = models.CharField(
        max_length=20, choices=ENFORCEMENT_CHOICES, default='manual'
    )
    legal_basis = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'retention_rules'
        ordering = ['sort_order', 'category']

    def __str__(self):
        return self.category


class LegalDocument(TimestampMixin, models.Model):
    """Legal documents (privacy policy, terms of service, etc.)."""

    DOCUMENT_TYPE_CHOICES = [
        ('privacy_policy', 'Privacy Policy'),
        ('terms_of_service', 'Terms of Service'),
        ('cookie_policy', 'Cookie Policy'),
        ('dpa', 'Data Processing Agreement'),
        ('acceptable_use', 'Acceptable Use Policy'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    content = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    version = models.CharField(max_length=20, default='1.0')
    published_at = models.DateTimeField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_legal_documents'
    )
    public_url = models.URLField(blank=True)

    class Meta:
        db_table = 'legal_documents'
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.title} v{self.version}'

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while LegalDocument.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

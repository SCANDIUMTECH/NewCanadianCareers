"""
Marketing models for Orion.
Audience segmentation, consent tracking, suppression lists, and campaigns.
"""
from django.db import models
from core.mixins import TimestampMixin, SoftDeleteMixin, SoftDeleteManager


class MarketingConsent(TimestampMixin, models.Model):
    """Tracks marketing consent status per user (CASL/CAN-SPAM ready)."""

    STATUS_CHOICES = [
        ('opted_in', 'Opted In'),
        ('opted_out', 'Opted Out'),
        ('unsubscribed', 'Unsubscribed'),
        ('bounced', 'Bounced'),
        ('complained', 'Complained'),
    ]

    SOURCE_CHOICES = [
        ('signup', 'Signup Form'),
        ('preference_center', 'Preference Center'),
        ('import', 'CSV Import'),
        ('api', 'API'),
        ('admin', 'Admin Grant'),
    ]

    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='marketing_consent'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='opted_out')
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='signup')
    consented_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # CASL fields
    express_consent = models.BooleanField(default=False)
    consent_proof = models.TextField(blank=True)

    class Meta:
        db_table = 'marketing_consents'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.status}'


class SuppressionEntry(TimestampMixin, models.Model):
    """Global suppression list for marketing emails."""

    REASON_CHOICES = [
        ('bounce_hard', 'Hard Bounce'),
        ('bounce_soft', 'Soft Bounce'),
        ('complaint', 'Spam Complaint'),
        ('unsubscribe', 'Unsubscribed'),
        ('admin', 'Admin Suppression'),
        ('compliance', 'Compliance Request'),
    ]

    email = models.EmailField(unique=True, db_index=True)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suppression_entries'
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    source = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'marketing_suppression_list'
        indexes = [
            models.Index(fields=['reason']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} - {self.reason}'


class ContactAttribute(TimestampMixin, models.Model):
    """Custom key-value attributes for marketing segmentation."""

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='marketing_attributes'
    )
    key = models.CharField(max_length=100)
    value = models.TextField()

    class Meta:
        db_table = 'marketing_contact_attributes'
        unique_together = [('user', 'key')]
        indexes = [
            models.Index(fields=['key', 'value']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.key}={self.value}'


class Segment(TimestampMixin, SoftDeleteMixin, models.Model):
    """Audience segments for targeting campaigns and journeys."""

    TYPE_CHOICES = [
        ('static', 'Static'),
        ('dynamic', 'Dynamic'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    segment_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='dynamic')

    # Dynamic segment: JSON filter rules
    # {"rules": [{"field": "role", "op": "eq", "value": "employer"}], "logic": "AND"}
    filter_rules = models.JSONField(default=dict, blank=True)

    # Static segment: manual user list
    members = models.ManyToManyField(
        'users.User',
        blank=True,
        related_name='marketing_segments'
    )

    # Cached count
    estimated_size = models.PositiveIntegerField(default=0)
    last_computed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'marketing_segments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['segment_type']),
        ]

    def __str__(self):
        return f'{self.name} ({self.estimated_size} contacts)'


# ─── Campaign Models ──────────────────────────────────────────────────


class Campaign(TimestampMixin, SoftDeleteMixin, models.Model):
    """Email campaign targeting a segment with a template."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('paused', 'Paused'),
        ('canceled', 'Canceled'),
        ('failed', 'Failed'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Targeting
    segment = models.ForeignKey(
        Segment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaigns'
    )

    # Content — references the existing EmailTemplate model
    template = models.ForeignKey(
        'notifications.EmailTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaigns'
    )
    subject_line = models.CharField(max_length=255, blank=True)
    preheader = models.CharField(max_length=255, blank=True)
    from_name = models.CharField(max_length=100, blank=True)
    from_email = models.EmailField(blank=True)
    reply_to = models.EmailField(blank=True)

    # Personalization context schema
    personalization_schema = models.JSONField(default=dict, blank=True)

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # A/B test
    is_ab_test = models.BooleanField(default=False)

    # Approval
    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_campaigns'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Denormalized metrics
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    opened_count = models.PositiveIntegerField(default=0)
    clicked_count = models.PositiveIntegerField(default=0)
    bounced_count = models.PositiveIntegerField(default=0)
    complained_count = models.PositiveIntegerField(default=0)
    unsubscribed_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_campaigns'
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'marketing_campaigns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['slug']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f'{self.name} ({self.status})'

    @property
    def open_rate(self):
        if self.delivered_count == 0:
            return 0.0
        return round((self.opened_count / self.delivered_count) * 100, 2)

    @property
    def click_rate(self):
        if self.delivered_count == 0:
            return 0.0
        return round((self.clicked_count / self.delivered_count) * 100, 2)

    @property
    def bounce_rate(self):
        if self.sent_count == 0:
            return 0.0
        return round((self.bounced_count / self.sent_count) * 100, 2)


class JourneyStep(TimestampMixin, models.Model):
    """A single step in an automation journey.

    Steps form a linked list / tree via next_step, true_branch, false_branch.
    Config JSON is step-type-specific:
      send_email: {template_id, subject, delay_seconds}
      wait: {duration_seconds, until_datetime}
      condition: {rules: [...], operator: 'and'|'or'}
      issue_coupon: {coupon_id, generate_unique: bool}
      add_tag / remove_tag: {tag: str}
      update_attribute: {key, value}
      add_to_segment: {segment_id}
      webhook: {url, method, headers, body_template}
    """

    STEP_TYPE_CHOICES = [
        ('send_email', 'Send Email'),
        ('wait', 'Wait'),
        ('condition', 'Condition'),
        ('issue_coupon', 'Issue Coupon'),
        ('add_tag', 'Add Tag'),
        ('remove_tag', 'Remove Tag'),
        ('update_attribute', 'Update Attribute'),
        ('add_to_segment', 'Add to Segment'),
        ('webhook', 'Webhook'),
    ]

    journey = models.ForeignKey(
        'marketing.Journey',
        on_delete=models.CASCADE,
        related_name='steps',
    )
    step_type = models.CharField(max_length=30, choices=STEP_TYPE_CHOICES)
    name = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    config = models.JSONField(default=dict, blank=True)

    # Linked-list / branching pointers
    next_step = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='prev_steps',
        help_text='Default next step (or next for non-condition steps)',
    )
    true_branch = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='condition_true_sources',
        help_text='Next step when condition evaluates to True',
    )
    false_branch = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='condition_false_sources',
        help_text='Next step when condition evaluates to False',
    )

    class Meta:
        db_table = 'marketing_journey_steps'
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.name or self.step_type} (#{self.sort_order})'

    def get_next_step(self, condition_result=None):
        """Return the next step based on step type and condition result."""
        if self.step_type == 'condition' and condition_result is not None:
            return self.true_branch if condition_result else self.false_branch
        return self.next_step


class Journey(TimestampMixin, SoftDeleteMixin, models.Model):
    """An automation journey that enrolls users and walks them through steps."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('archived', 'Archived'),
    ]

    TRIGGER_TYPE_CHOICES = [
        ('user_signup', 'User Signup'),
        ('package_purchase', 'Package Purchase'),
        ('job_published', 'Job Published'),
        ('manual', 'Manual Enrollment'),
        ('segment_entry', 'Segment Entry'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    description = models.TextField(blank=True)

    # Trigger configuration
    trigger_type = models.CharField(
        max_length=30, choices=TRIGGER_TYPE_CHOICES, default='manual'
    )
    trigger_config = models.JSONField(
        default=dict, blank=True,
        help_text='Trigger-specific config, e.g. {"segment_id": 5} for segment_entry',
    )

    # Entry limits
    max_entries_per_user = models.PositiveIntegerField(
        default=1, help_text='Max times a user can enter this journey'
    )
    cooldown_hours = models.PositiveIntegerField(
        default=0, help_text='Hours to wait before re-entry is allowed (0 = no cooldown)'
    )

    # Goal (optional exit condition)
    goal_type = models.CharField(
        max_length=50, blank=True,
        help_text='Goal identifier, e.g. "package_purchase", "job_published"',
    )
    goal_config = models.JSONField(
        default=dict, blank=True,
        help_text='Goal-specific config, e.g. {"package_ids": [1, 2]}',
    )

    # Denormalized stats
    active_enrollments_count = models.PositiveIntegerField(default=0)
    completed_enrollments_count = models.PositiveIntegerField(default=0)
    total_enrollments_count = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_journeys'
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'marketing_journeys'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'

    @property
    def first_step(self):
        """Return the first step in this journey (lowest sort_order)."""
        return self.steps.order_by('sort_order').first()


class CampaignVariant(TimestampMixin, models.Model):
    """A/B test variant of a campaign."""

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='variants'
    )
    name = models.CharField(max_length=50)  # "A", "B", etc.
    subject_line = models.CharField(max_length=255, blank=True)
    preheader = models.CharField(max_length=255, blank=True)
    template = models.ForeignKey(
        'notifications.EmailTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaign_variants'
    )
    weight = models.PositiveSmallIntegerField(default=50)  # Percentage allocation
    is_winner = models.BooleanField(default=False)

    # Variant-level metrics
    sent_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    opened_count = models.PositiveIntegerField(default=0)
    clicked_count = models.PositiveIntegerField(default=0)
    bounced_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'marketing_campaign_variants'
        ordering = ['name']

    def __str__(self):
        return f'{self.campaign.name} - Variant {self.name}'


class CampaignRecipient(TimestampMixin, models.Model):
    """Individual recipient record for a campaign send."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('complained', 'Complained'),
        ('unsubscribed', 'Unsubscribed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='recipients'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='campaign_receipts'
    )
    variant = models.ForeignKey(
        CampaignVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recipients'
    )
    email_log = models.ForeignKey(
        'notifications.EmailLog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaign_recipient'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'marketing_campaign_recipients'
        unique_together = [('campaign', 'user')]
        indexes = [
            models.Index(fields=['campaign', 'status']),
            models.Index(fields=['user', 'campaign']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.campaign.name} ({self.status})'


# ─── Coupon & Credit Models ─────────────────────────────────────────


class Coupon(TimestampMixin, SoftDeleteMixin, models.Model):
    """Marketing coupons with flexible discount types and eligibility rules."""

    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage Off'),
        ('fixed', 'Fixed Amount Off'),
        ('credits', 'Bonus Credits'),
        ('free_trial', 'Free Trial Days'),
    ]

    DISTRIBUTION_CHOICES = [
        ('public', 'Public'),
        ('private', 'Private'),
        ('url', 'URL Auto-Apply'),
        ('campaign', 'Campaign'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('expired', 'Expired'),
        ('exhausted', 'Exhausted'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)

    # Discount
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Cap for percentage discounts'
    )
    stripe_coupon_id = models.CharField(max_length=100, blank=True, default='')

    # Distribution
    distribution = models.CharField(max_length=20, choices=DISTRIBUTION_CHOICES, default='public')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Restrictions
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_uses_total = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_customer = models.PositiveIntegerField(default=1)
    uses_count = models.PositiveIntegerField(default=0)

    # Applicable packages
    applicable_packages = models.ManyToManyField(
        'moderation.JobPackage', blank=True, related_name='marketing_coupons'
    )

    # Eligibility rules (JSON) — e.g., {"roles": ["employer"], "min_account_age_days": 30}
    eligibility_rules = models.JSONField(default=dict, blank=True)

    # Validity
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Campaign link
    campaign = models.ForeignKey(
        Campaign, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='coupons'
    )

    # Security
    one_per_ip = models.BooleanField(default=False)
    require_verified_email = models.BooleanField(default=False)

    # Legacy promo code link (for migration / backwards compat)
    legacy_promo_code = models.OneToOneField(
        'billing.PromoCode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='marketing_coupon'
    )

    created_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True,
        related_name='created_coupons'
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'marketing_coupons'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['status']),
            models.Index(fields=['distribution']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f'{self.code} - {self.discount_type} ({self.status})'

    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        if self.status != 'active':
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.expires_at and now > self.expires_at:
            return False
        if self.max_uses_total and self.uses_count >= self.max_uses_total:
            return False
        return True


class CouponRedemption(TimestampMixin, models.Model):
    """Records each coupon redemption."""

    coupon = models.ForeignKey(
        Coupon, on_delete=models.CASCADE, related_name='redemptions'
    )
    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='coupon_redemptions'
    )
    company = models.ForeignKey(
        'companies.Company', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='coupon_redemptions'
    )
    agency = models.ForeignKey(
        'companies.Agency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='coupon_redemptions'
    )
    invoice = models.ForeignKey(
        'billing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='coupon_redemptions'
    )

    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    credits_granted = models.PositiveIntegerField(default=0)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'marketing_coupon_redemptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['coupon', 'user']),
        ]

    def __str__(self):
        return f'{self.user.email} redeemed {self.coupon.code}'


class StoreCreditWallet(TimestampMixin, models.Model):
    """Store credit wallet for a company or agency."""

    company = models.OneToOneField(
        'companies.Company', on_delete=models.CASCADE, null=True, blank=True,
        related_name='store_credit_wallet'
    )
    agency = models.OneToOneField(
        'companies.Agency', on_delete=models.CASCADE, null=True, blank=True,
        related_name='store_credit_wallet'
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'marketing_store_credit_wallets'
        constraints = [
            models.CheckConstraint(
                check=models.Q(balance__gte=0),
                name='wallet_balance_non_negative'
            ),
        ]

    def __str__(self):
        owner = self.company or self.agency
        return f'{owner} - ${self.balance}'


class StoreCreditTransaction(TimestampMixin, models.Model):
    """Ledger entry for store credit changes."""

    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('refund', 'Refund'),
        ('expired', 'Expired'),
    ]

    wallet = models.ForeignKey(
        StoreCreditWallet, on_delete=models.CASCADE, related_name='transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)

    # References
    coupon = models.ForeignKey(
        Coupon, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='credit_transactions'
    )
    invoice = models.ForeignKey(
        'billing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='credit_transactions'
    )
    admin = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='admin_credit_transactions'
    )

    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'marketing_store_credit_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', 'transaction_type']),
        ]

    def __str__(self):
        return f'{self.transaction_type} ${self.amount} - {self.description}'


# ─── Journey Enrollment & Logging ─────────────────────────────────────


class JourneyEnrollment(TimestampMixin, models.Model):
    """Tracks a user's progress through an automation journey."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('exited_goal', 'Exited (Goal Met)'),
        ('exited_manual', 'Exited (Manual)'),
        ('failed', 'Failed'),
    ]

    journey = models.ForeignKey(
        Journey, on_delete=models.CASCADE, related_name='enrollments'
    )
    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='journey_enrollments'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    current_step = models.ForeignKey(
        JourneyStep, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='active_enrollments',
    )
    next_action_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text='When the next step should fire (indexed for periodic task query)',
    )

    entered_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'marketing_journey_enrollments'
        ordering = ['-entered_at']
        indexes = [
            models.Index(fields=['status', 'next_action_at']),
            models.Index(fields=['journey', 'user']),
        ]

    def __str__(self):
        return f'{self.user} in {self.journey.name} ({self.status})'


class JourneyStepLog(TimestampMixin, models.Model):
    """Log of each step execution within a journey enrollment."""

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    enrollment = models.ForeignKey(
        JourneyEnrollment, on_delete=models.CASCADE, related_name='step_logs'
    )
    step = models.ForeignKey(
        JourneyStep, on_delete=models.CASCADE, related_name='logs'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    result = models.JSONField(default=dict, blank=True, help_text='Step execution result data')
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'marketing_journey_step_logs'
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['enrollment', 'step']),
        ]

    def __str__(self):
        return f'{self.step.name or self.step.step_type} - {self.status}'


# ─── Compliance Models ─────────────────────────────────────────────────


class UnsubscribeToken(models.Model):
    """One-click unsubscribe tokens for CAN-SPAM / RFC 8058 compliance.

    Each marketing email includes a unique token that allows the recipient
    to unsubscribe without authentication. Tokens are single-use.
    """

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='unsubscribe_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)

    # Context: which email triggered this token
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unsubscribe_tokens'
    )
    journey_step = models.ForeignKey(
        JourneyStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unsubscribe_tokens'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'marketing_unsubscribe_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        status = 'used' if self.used_at else 'active'
        return f'Unsubscribe {self.user.email} ({status})'

    @property
    def is_used(self):
        return self.used_at is not None

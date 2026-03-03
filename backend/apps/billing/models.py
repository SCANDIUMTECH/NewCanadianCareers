"""
Billing models for Orion.
"""
from django.db import models
from django.utils import timezone
from core.mixins import TimestampMixin


class Entitlement(TimestampMixin, models.Model):
    """Credit entitlements for companies/agencies."""

    SOURCE_CHOICES = [
        ('package_purchase', 'Package Purchase'),
        ('admin_grant', 'Admin Grant'),
        ('subscription', 'Subscription'),
        ('promotion', 'Promotion'),
        ('refund', 'Refund'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='entitlements'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='entitlements'
    )
    package = models.ForeignKey(
        'moderation.JobPackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Credits
    credits_total = models.PositiveIntegerField()
    credits_used = models.PositiveIntegerField(default=0)
    featured_credits_total = models.PositiveIntegerField(default=0)
    featured_credits_used = models.PositiveIntegerField(default=0)
    social_credits_total = models.PositiveIntegerField(default=0)
    social_credits_used = models.PositiveIntegerField(default=0)

    # Duration
    post_duration_days = models.PositiveIntegerField(default=30)

    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True)

    # Source
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_reference = models.CharField(max_length=100, blank=True)  # e.g., order ID, admin username

    class Meta:
        db_table = 'entitlements'
        indexes = [
            models.Index(fields=['company', 'expires_at']),
            models.Index(fields=['agency', 'expires_at']),
        ]

    def __str__(self):
        owner = self.company or self.agency
        return f'{owner} - {self.credits_remaining} credits'

    @property
    def credits_remaining(self):
        return self.credits_total - self.credits_used

    @property
    def featured_credits_remaining(self):
        return self.featured_credits_total - self.featured_credits_used

    @property
    def social_credits_remaining(self):
        return self.social_credits_total - self.social_credits_used

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_expired and self.credits_remaining > 0

    def use_credit(self, job=None, admin=None):
        """Use one credit from this entitlement.

        Uses SELECT FOR UPDATE + F() to prevent double-spend under
        concurrent requests. Must be called inside transaction.atomic().
        """
        from django.db import transaction
        from django.db.models import F

        with transaction.atomic():
            # Lock the row first, then check validity to avoid TOCTOU race
            locked = Entitlement.objects.select_for_update().filter(id=self.id).first()
            if not locked or locked.is_expired or locked.credits_remaining <= 0:
                raise ValueError('Entitlement is not valid')

            Entitlement.objects.filter(id=self.id).update(
                credits_used=F('credits_used') + 1
            )
            self.refresh_from_db()

            # Create ledger entry
            EntitlementLedger.objects.create(
                entitlement=self,
                change=-1,
                reason='job_post',
                job=job,
                admin=admin
            )

        return True


class EntitlementLedger(models.Model):
    """Audit log for entitlement changes."""

    entitlement = models.ForeignKey(
        Entitlement,
        on_delete=models.CASCADE,
        related_name='ledger'
    )
    change = models.IntegerField()  # positive = add, negative = use
    reason = models.CharField(max_length=50)
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    admin = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'entitlement_ledger'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.entitlement} - {self.change:+d} ({self.reason})'


class PaymentMethod(TimestampMixin, models.Model):
    """Stored payment methods."""

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_methods'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_methods'
    )

    # Stripe
    stripe_payment_method_id = models.CharField(max_length=100)

    # Card details (for display only)
    card_brand = models.CharField(max_length=20)
    card_last4 = models.CharField(max_length=4)
    card_exp_month = models.CharField(max_length=2)
    card_exp_year = models.CharField(max_length=4)
    cardholder_name = models.CharField(max_length=255, blank=True, default='')

    # Status
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'payment_methods'

    def __str__(self):
        return f'{self.card_brand} •••• {self.card_last4}'


class Invoice(TimestampMixin, models.Model):
    """Invoice records."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('void', 'Void'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('stripe_card', 'Use stored card'),
        ('e_transfer', 'E-Transfer received'),
        ('invoice', 'Send invoice to company'),
        ('manual_card', 'Card payment (phone/manual)'),
        ('complimentary', 'Complimentary (no charge)'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        related_name='invoices'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        related_name='invoices'
    )

    # Invoice number
    invoice_number = models.CharField(max_length=50, unique=True, null=True, blank=True, db_index=True)

    # Stripe
    stripe_invoice_id = models.CharField(max_length=100, blank=True)
    stripe_checkout_session_id = models.CharField(max_length=100, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)

    # Details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='CAD')
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES,
        default='stripe_card', blank=True
    )

    # Dates
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    # PDF (MinIO object key, e.g. "invoices/2026/02/INV-202602-00042.pdf")
    invoice_pdf_key = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invoice {self.id} - ${self.amount}'


class InvoiceItem(models.Model):
    """Line items for invoices."""

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    package = models.ForeignKey(
        'moderation.JobPackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'

    def __str__(self):
        return f'{self.description} x {self.quantity}'


class PromoCode(TimestampMixin, models.Model):
    """Promotional codes."""

    TYPE_CHOICES = [
        ('percentage', 'Percentage Off'),
        ('fixed', 'Fixed Amount Off'),
        ('credits', 'Bonus Credits'),
    ]

    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)

    # Discount
    discount_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)

    # Restrictions
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    uses_count = models.PositiveIntegerField(default=0)
    max_uses_per_customer = models.PositiveIntegerField(default=1)

    # Applicable packages
    applicable_packages = models.ManyToManyField('moderation.JobPackage', blank=True, related_name='promo_codes')

    # Validity
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'promo_codes'

    def __str__(self):
        return self.code

    @property
    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.expires_at and now > self.expires_at:
            return False
        if self.max_uses and self.uses_count >= self.max_uses:
            return False
        return True


class StripeWebhookEvent(models.Model):
    """Tracks processed Stripe webhook events for idempotency.

    Stripe may deliver the same event multiple times (retries on failure,
    network issues, etc.). This model ensures each event is processed
    exactly once.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'stripe_webhook_events'
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'{self.stripe_event_id} ({self.event_type}) - {self.status}'


class Subscription(TimestampMixin, models.Model):
    """Subscription records."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('paused', 'Paused'),
        ('incomplete', 'Incomplete'),
        ('incomplete_expired', 'Incomplete Expired'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        related_name='subscriptions'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        related_name='subscriptions'
    )
    package = models.ForeignKey('moderation.JobPackage', on_delete=models.SET_NULL, null=True)

    # Stripe
    stripe_subscription_id = models.CharField(max_length=100)
    stripe_customer_id = models.CharField(max_length=100)

    # Status
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active')

    # Billing
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    canceled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        owner = self.company or self.agency
        return f'{owner} - {self.package}'

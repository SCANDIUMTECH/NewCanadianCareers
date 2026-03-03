"""
Audit models for Orion.
"""
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Audit log for tracking admin actions."""

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('suspend', 'Suspend'),
        ('activate', 'Activate'),
        ('verify', 'Verify'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('grant', 'Grant Credits'),
        ('revoke', 'Revoke'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('impersonate', 'Impersonate'),
        # Marketing
        ('campaign_create', 'Campaign Create'),
        ('campaign_send', 'Campaign Send'),
        ('campaign_pause', 'Campaign Pause'),
        ('campaign_delete', 'Campaign Delete'),
        ('campaign_approve', 'Campaign Approve'),
        ('coupon_create', 'Coupon Create'),
        ('coupon_delete', 'Coupon Delete'),
        ('coupon_pause', 'Coupon Pause'),
        ('coupon_activate', 'Coupon Activate'),
        ('coupon_duplicate', 'Coupon Duplicate'),
        ('coupon_redeem', 'Coupon Redeem'),
        ('store_credit_issue', 'Store Credit Issue'),
        ('payment', 'Payment'),
        ('coupon_checkout', 'Coupon Applied at Checkout'),
        ('journey_create', 'Journey Create'),
        ('journey_activate', 'Journey Activate'),
        ('journey_pause', 'Journey Pause'),
        ('journey_archive', 'Journey Archive'),
        ('journey_duplicate', 'Journey Duplicate'),
        ('segment_create', 'Segment Create'),
        ('consent_update', 'Consent Update'),
        ('suppression_add', 'Suppression Add'),
    ]

    actor = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50)  # 'user', 'company', 'job', etc.
    target_id = models.CharField(max_length=50)
    target_repr = models.CharField(max_length=255, blank=True)  # String representation

    # Changes
    changes = models.JSONField(default=dict)  # {'field': {'old': x, 'new': y}}

    # Context
    reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['action', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor} {self.action} {self.target_type}:{self.target_id}'


def create_audit_log(
    actor,
    action,
    target,
    changes=None,
    reason='',
    request=None
):
    """Helper function to create audit log entries."""
    ip_address = None
    user_agent = ''

    if request:
        # Prefer CF-Connecting-IP (Cloudflare), fall back to REMOTE_ADDR
        ip_address = (
            request.META.get('HTTP_CF_CONNECTING_IP', '').strip()
            or request.META.get('REMOTE_ADDR')
        )
        user_agent = request.META.get('HTTP_USER_AGENT', '')

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target.__class__.__name__.lower(),
        target_id=str(target.pk),
        target_repr=str(target)[:255],
        changes=changes or {},
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )


class LoginAttempt(models.Model):
    """Track all login attempts for security monitoring."""

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('locked', 'Account Locked'),
    ]

    FAILURE_REASON_CHOICES = [
        ('invalid_credentials', 'Invalid Credentials'),
        ('account_suspended', 'Account Suspended'),
        ('account_locked', 'Account Locked'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts'
    )
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    failure_reason = models.CharField(max_length=30, choices=FAILURE_REASON_CHOICES, blank=True)

    # Context
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)

    # Cloudflare geolocation (from headers)
    location_city = models.CharField(max_length=100, blank=True)
    location_country = models.CharField(max_length=100, blank=True)
    location_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_attempts'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} - {self.status} at {self.created_at}'

    @property
    def location_display(self):
        """Return human-readable location string."""
        parts = filter(None, [self.location_city, self.location_country])
        return ', '.join(parts) or 'Unknown'

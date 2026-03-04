import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class ServiceCategory(models.Model):
    """Groups cookie services into categories (Necessary, Analytics, Marketing, etc.)."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Service categories"

    def __str__(self):
        return self.name


class Service(models.Model):
    """A trackable cookie/script service (e.g., Google Analytics, Facebook Pixel)."""

    class LegalBasis(models.TextChoices):
        CONSENT = "consent", "Consent (Art. 6(1)(a))"
        CONTRACT = "contract", "Contract Performance (Art. 6(1)(b))"
        LEGAL_OBLIGATION = "legal_obligation", "Legal Obligation (Art. 6(1)(c))"
        VITAL_INTEREST = "vital_interest", "Vital Interest (Art. 6(1)(d))"
        PUBLIC_INTEREST = "public_interest", "Public Interest (Art. 6(1)(e))"
        LEGITIMATE_INTEREST = "legitimate_interest", "Legitimate Interest (Art. 6(1)(f))"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services",
    )
    is_deactivatable = models.BooleanField(
        default=True,
        help_text="Whether users can toggle this service on/off.",
    )
    default_enabled = models.BooleanField(
        default=False,
        help_text="Whether this service is enabled by default before user consent.",
    )
    legal_basis = models.CharField(
        max_length=30,
        choices=LegalBasis.choices,
        default=LegalBasis.CONSENT,
        help_text="GDPR legal basis for processing. Art. 6(1).",
    )
    cookies = models.TextField(
        blank=True,
        default="",
        help_text="Comma-separated list of cookie names this service sets.",
    )
    head_script = models.TextField(
        blank=True,
        default="",
        help_text="Script code injected into <head> when service is enabled.",
    )
    body_script = models.TextField(
        blank=True,
        default="",
        help_text="Script code injected into <body> when service is enabled.",
    )
    is_analytics = models.BooleanField(default=False)
    is_advertising = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__order", "name"]

    def __str__(self):
        return self.name

    def clean(self):
        """Validate: only strictly necessary services can be default_enabled (ePrivacy Art. 5(3))."""
        if self.default_enabled and self.is_deactivatable:
            raise ValidationError(
                {
                    "default_enabled": (
                        "Only strictly necessary (non-deactivatable) services may be "
                        "enabled by default without consent. Set is_deactivatable=False "
                        "for necessary services, or set default_enabled=False."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def get_cookie_list(self):
        if not self.cookies:
            return []
        return [c.strip() for c in self.cookies.split(",") if c.strip()]


class ConsentLog(models.Model):
    """Consent record for anonymous (non-authenticated) visitors, identified by masked IP."""

    ip_address = models.CharField(
        max_length=255,
        unique=True,
        help_text="Masked IP address (last octet replaced).",
    )
    consents = models.JSONField(
        default=dict,
        help_text='Map of service_id -> true/false, e.g. {"1": true, "3": false}.',
    )
    consent_version = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Consent banner version when consent was last given.",
    )
    consent_given_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When consent was last actively given (for expiry).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"ConsentLog({self.ip_address})"


class UserConsent(models.Model):
    """Consent record for authenticated users."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gdpr_consent",
    )
    consents = models.JSONField(
        default=dict,
        help_text='Map of service_id -> true/false.',
    )
    consent_version = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Consent banner version when consent was last given.",
    )
    consent_given_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When consent was last actively given (for expiry).",
    )
    privacy_policy_accepted = models.BooleanField(default=False)
    privacy_policy_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    last_login_recorded = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"UserConsent({self.user})"


class ConsentHistory(models.Model):
    """Immutable, append-only audit trail for consent changes.

    GDPR Art. 7(1) requires controllers to demonstrate that the data subject consented.
    This model stores every consent grant/revoke event with full context.
    """

    class Action(models.TextChoices):
        GRANT = "grant", "Grant"
        REVOKE = "revoke", "Revoke"
        ALLOW_ALL = "allow_all", "Allow All"
        DECLINE_ALL = "decline_all", "Decline All"

    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consent_history",
    )
    ip_address = models.CharField(max_length=255, help_text="Masked IP address.")
    service_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Service ID for grant/revoke. Null for bulk actions.",
    )
    service_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Service name at time of action (denormalized for audit permanence).",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    consent_version = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Banner/settings version at time of consent.",
    )
    user_agent = models.TextField(blank=True, default="")
    consents_snapshot = models.JSONField(
        default=dict,
        help_text="Full consent state after this action.",
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Consent History Entry"
        verbose_name_plural = "Consent History"
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["ip_address", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.action} by {self.user or self.ip_address} at {self.timestamp}"


class DataRequest(models.Model):
    """A GDPR data request (right to access, right to erasure, rectification, DPO contact)."""

    class RequestType(models.TextChoices):
        FORGET_ME = "forget_me", "Forget Me (Erasure)"
        REQUEST_DATA = "request_data", "Request Data (Access)"
        RECTIFICATION = "rectification", "Data Rectification"
        DPO_CONTACT = "dpo_contact", "Contact DPO"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        DONE = "done", "Done"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField(blank=True, default="")
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_email_confirmed = models.BooleanField(default=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gdpr_requests",
    )
    # GDPR Art. 12(3): Response deadline tracking
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="DSAR response deadline (auto-set to 30 days from creation).",
    )
    deadline_extended = models.BooleanField(
        default=False,
        help_text="Whether deadline was extended (max +2 months per Art. 12(3)).",
    )
    deadline_extension_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for deadline extension (must notify data subject).",
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_request_type_display()} - {self.email} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.deadline and not self.pk:
            self.deadline = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if self.deadline and self.status not in (self.Status.DONE, self.Status.REJECTED):
            return timezone.now() > self.deadline
        return False

    @property
    def days_until_deadline(self):
        if self.deadline:
            return (self.deadline - timezone.now()).days
        return None


class DataBreach(models.Model):
    """Data breach tracking — GDPR Art. 33 (72h DPA notification) and Art. 34."""

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    nature_of_breach = models.TextField(
        help_text="Description of the nature of the breach.",
    )
    categories_of_data = models.TextField(blank=True, default="")
    approximate_records_affected = models.IntegerField(default=0)
    consequences = models.TextField(blank=True, default="")
    measures_taken = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM
    )
    discovered_at = models.DateTimeField(
        help_text="When the breach was first discovered.",
    )
    dpa_notification_deadline = models.DateTimeField(
        null=True, blank=True,
        help_text="72-hour deadline for DPA notification (auto-calculated).",
    )
    dpa_notified_at = models.DateTimeField(null=True, blank=True)
    users_notified_at = models.DateTimeField(null=True, blank=True)
    users_notified_count = models.IntegerField(default=0)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reported_breaches",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-discovered_at"]
        verbose_name = "Data Breach"
        verbose_name_plural = "Data Breaches"

    def __str__(self):
        return f"Breach: {self.title} ({self.severity})"

    def save(self, *args, **kwargs):
        if not self.dpa_notification_deadline and self.discovered_at:
            self.dpa_notification_deadline = self.discovered_at + timedelta(hours=72)
        super().save(*args, **kwargs)

    @property
    def is_dpa_overdue(self):
        if self.dpa_notified_at:
            return False
        if self.dpa_notification_deadline:
            return timezone.now() > self.dpa_notification_deadline
        return False

    @property
    def hours_until_dpa_deadline(self):
        if self.dpa_notification_deadline and not self.dpa_notified_at:
            delta = self.dpa_notification_deadline - timezone.now()
            return round(delta.total_seconds() / 3600, 1)
        return None


class ProcessingActivity(models.Model):
    """Records of Processing Activities (RoPA) — GDPR Art. 30."""

    name = models.CharField(max_length=500)
    purpose = models.TextField(help_text="Purpose(s) of processing.")
    legal_basis = models.CharField(
        max_length=30,
        choices=Service.LegalBasis.choices,
        default=Service.LegalBasis.CONSENT,
    )
    categories_of_data_subjects = models.TextField(blank=True, default="")
    categories_of_personal_data = models.TextField(blank=True, default="")
    recipients = models.TextField(blank=True, default="")
    third_country_transfers = models.TextField(blank=True, default="")
    retention_period = models.CharField(max_length=255, blank=True, default="")
    security_measures = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Processing Activity"
        verbose_name_plural = "Processing Activities (RoPA)"

    def __str__(self):
        return self.name


class AdminAuditLog(models.Model):
    """Audit log for admin actions on GDPR-sensitive data (ISO 27701, NIST)."""

    class ActionType(models.TextChoices):
        SETTINGS_UPDATE = "settings_update", "Settings Updated"
        DSAR_PROCESSED = "dsar_processed", "DSAR Processed"
        DATA_DELETED = "data_deleted", "Data Deleted"
        DATA_EXPORTED = "data_exported", "Data Exported"
        BREACH_CREATED = "breach_created", "Breach Created"
        BREACH_UPDATED = "breach_updated", "Breach Updated"
        BREACH_NOTIFIED = "breach_notified", "Breach Notification Sent"
        POLICY_NOTIFIED = "policy_notified", "Policy Update Sent"
        SERVICE_MODIFIED = "service_modified", "Service Modified"
        CATEGORY_MODIFIED = "category_modified", "Category Modified"
        ROPA_MODIFIED = "ropa_modified", "RoPA Modified"

    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gdpr_audit_logs",
    )
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    description = models.TextField()
    target_model = models.CharField(max_length=100, blank=True, default="")
    target_id = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Admin Audit Log"
        verbose_name_plural = "Admin Audit Logs"

    def __str__(self):
        return f"{self.action_type} by {self.user} at {self.timestamp}"


class GDPRSettings(models.Model):
    """Singleton model for GDPR module configuration."""

    # General
    is_enabled = models.BooleanField(default=True)
    cookie_lifetime_days = models.IntegerField(default=365)
    cookie_domain = models.CharField(max_length=255, blank=True, default="")
    consent_logging_enabled = models.BooleanField(default=True)
    consent_mode_v2 = models.BooleanField(
        default=False, help_text="Enable Google Consent Mode v2."
    )

    # Consent versioning & expiry
    consent_version = models.CharField(
        max_length=20,
        default="1",
        help_text="Increment when services/categories change to trigger re-consent.",
    )
    consent_expiry_days = models.IntegerField(
        default=395,
        help_text="Days before consent expires. CNIL recommends max 13 months (395 days).",
    )

    # Cookie Popup
    popup_enabled = models.BooleanField(default=True)
    popup_text = models.TextField(
        default="We use cookies to ensure you get the best experience on our website."
    )
    popup_agree_text = models.CharField(max_length=100, default="Accept All")
    popup_decline_text = models.CharField(max_length=100, default="Decline All")
    popup_preferences_text = models.CharField(max_length=100, default="Preferences")
    popup_style = models.CharField(
        max_length=30,
        default="full_width",
        choices=[
            ("full_width", "Full Width Bar"),
            ("full_width_right", "Full Width Bar (Buttons Right)"),
            ("small", "Small Floating Box"),
            ("overlay", "Full Screen Overlay"),
        ],
    )
    popup_position = models.CharField(
        max_length=10,
        default="bottom",
        choices=[("top", "Top"), ("bottom", "Bottom")],
    )

    # Popup Colors
    popup_bg_color = models.CharField(max_length=20, default="#333333")
    popup_text_color = models.CharField(max_length=20, default="#ffffff")
    agree_btn_bg_color = models.CharField(max_length=20, default="#4CAF50")
    agree_btn_text_color = models.CharField(max_length=20, default="#ffffff")
    decline_btn_bg_color = models.CharField(max_length=20, default="#f44336")
    decline_btn_text_color = models.CharField(max_length=20, default="#ffffff")
    preferences_btn_bg_color = models.CharField(max_length=20, default="#2196F3")
    preferences_btn_text_color = models.CharField(max_length=20, default="#ffffff")

    # Privacy Settings
    privacy_settings_trigger_enabled = models.BooleanField(default=True)
    privacy_settings_trigger_position = models.CharField(
        max_length=20,
        default="bottom_left",
        choices=[
            ("bottom_left", "Bottom Left"),
            ("bottom_right", "Bottom Right"),
            ("top_left", "Top Left"),
            ("top_right", "Top Right"),
        ],
    )
    privacy_settings_backdrop_close = models.BooleanField(default=True)

    # Privacy Policy Link (EDPB, CNIL, ICO requirement)
    privacy_policy_url = models.URLField(
        blank=True,
        default="",
        help_text="URL to privacy policy. Displayed in the cookie banner.",
    )

    # Behavior
    first_visit_allow_all = models.BooleanField(
        default=False,
        help_text=(
            "⚠️ NON-COMPLIANT IN EU/EEA. Auto-allow all cookies on first visit. "
            "Only use for non-EU deployments."
        ),
    )
    returning_visitor_allow_all = models.BooleanField(
        default=False,
        help_text=(
            "⚠️ NON-COMPLIANT IN EU/EEA. Auto-allow all cookies for returning visitors. "
            "Only use for non-EU deployments."
        ),
    )
    geo_ip_eu_only = models.BooleanField(
        default=False,
        help_text="Only show consent popup to EU/EEA visitors.",
    )

    # Features
    forget_me_enabled = models.BooleanField(default=True)
    request_data_enabled = models.BooleanField(default=True)
    contact_dpo_enabled = models.BooleanField(default=True)
    data_rectification_enabled = models.BooleanField(default=True)
    data_breach_notification_enabled = models.BooleanField(default=True)
    data_retention_enabled = models.BooleanField(default=False)
    data_retention_days = models.IntegerField(default=730)
    privacy_policy_acceptance_enabled = models.BooleanField(default=False)
    terms_acceptance_enabled = models.BooleanField(default=False)

    # Emails
    dpo_email = models.EmailField(default="dpo@example.com")
    data_breach_subject = models.CharField(
        max_length=255, default="Data Breach Notification"
    )
    data_breach_body = models.TextField(
        default="Dear %s,\n\nWe are writing to inform you of a data breach that may have affected your personal data."
    )
    policy_update_subject = models.CharField(
        max_length=255, default="Privacy Policy Update"
    )
    policy_update_body = models.TextField(
        default="Dear %s,\n\nWe have updated our privacy policy. Please review the changes."
    )

    # Google Tag Manager
    gtm_id = models.CharField(max_length=50, blank=True, default="")

    # Custom CSS
    custom_css = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "GDPR Settings"
        verbose_name_plural = "GDPR Settings"

    def __str__(self):
        return "GDPR Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

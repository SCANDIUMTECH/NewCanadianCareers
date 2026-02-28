"""
Company and Agency models for Orion.
"""
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.text import slugify

from core.mixins import TimestampMixin
from core.utils import generate_entity_id

LOGO_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp']


class Company(TimestampMixin, models.Model):
    """Company/Employer model. Public lookup by entity_id."""

    STATUS_CHOICES = [
        ('verified', 'Verified'),
        ('pending', 'Pending Verification'),
        ('unverified', 'Unverified'),
    ]

    BILLING_STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('trial', 'Trial'),
    ]

    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    INDUSTRY_CHOICES = [
        ('Technology', 'Technology'),
        ('Finance & Banking', 'Finance & Banking'),
        ('Healthcare', 'Healthcare'),
        ('Retail', 'Retail'),
        ('Sales', 'Sales'),
        ('Manufacturing', 'Manufacturing'),
        ('Education', 'Education'),
        ('Energy & Utilities', 'Energy & Utilities'),
        ('Media & Entertainment', 'Media & Entertainment'),
        ('Real Estate', 'Real Estate'),
        ('Transportation & Logistics', 'Transportation & Logistics'),
        ('Construction', 'Construction'),
        ('Hospitality & Tourism', 'Hospitality & Tourism'),
        ('Legal Services', 'Legal Services'),
        ('Nonprofit', 'Nonprofit'),
        ('Government', 'Government'),
        ('Agriculture', 'Agriculture'),
        ('Telecommunications', 'Telecommunications'),
        ('Professional Services', 'Professional Services'),
        ('Consumer Goods', 'Consumer Goods'),
        ('Automotive', 'Automotive'),
        ('Aerospace & Defense', 'Aerospace & Defense'),
        ('Pharmaceuticals', 'Pharmaceuticals'),
        ('Insurance', 'Insurance'),
        ('Food & Beverage', 'Food & Beverage'),
        ('Fashion & Apparel', 'Fashion & Apparel'),
        ('E-commerce', 'E-commerce'),
        ('Consulting', 'Consulting'),
        ('Marketing & Advertising', 'Marketing & Advertising'),
        ('Human Resources', 'Human Resources'),
        ('Mining & Metals', 'Mining & Metals'),
        ('Environmental Services', 'Environmental Services'),
        ('Sports & Recreation', 'Sports & Recreation'),
        ('Arts & Design', 'Arts & Design'),
        ('Security & Investigations', 'Security & Investigations'),
        ('Venture Capital & Private Equity', 'Venture Capital & Private Equity'),
        ('Staffing & Recruiting', 'Staffing & Recruiting'),
        ('Biotechnology', 'Biotechnology'),
        ('Logistics & Supply Chain', 'Logistics & Supply Chain'),
        ('Information Services', 'Information Services'),
        ('Other', 'Other'),
    ]

    SIZE_CHOICES = [
        ('1-10', '1-10 employees'),
        ('11-50', '11-50 employees'),
        ('51-200', '51-200 employees'),
        ('201-500', '201-500 employees'),
        ('501-1000', '501-1000 employees'),
        ('1001-5000', '1001-5000 employees'),
        ('5001+', '5001+ employees'),
    ]

    # Basic info
    name = models.CharField(max_length=255)
    entity_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        blank=True,
        db_index=True,
        help_text='Unique 8-character alphanumeric identifier (generated on save)',
    )
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    domain = models.CharField(max_length=255, blank=True)
    logo = models.FileField(
        upload_to='company_logos/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=LOGO_EXTENSIONS)],
    )
    banner = models.FileField(
        upload_to='company_banners/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=LOGO_EXTENSIONS)],
    )

    # Details
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)

    # Location
    headquarters_address = models.CharField(max_length=255, blank=True)
    headquarters_city = models.CharField(max_length=100, blank=True)
    headquarters_state = models.CharField(max_length=100, blank=True)
    headquarters_country = models.CharField(max_length=100, blank=True)
    headquarters_postal_code = models.CharField(max_length=20, blank=True)

    # Social links
    linkedin_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    billing_status = models.CharField(max_length=20, choices=BILLING_STATUS_CHOICES, default='trial')
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='low')

    # Stripe
    stripe_customer_id = models.CharField(max_length=100, blank=True)

    # Feature overrides (admin-controlled)
    team_management_enabled = models.BooleanField(
        default=False,
        help_text='Admin override: enable team management regardless of package'
    )
    editing_locked_after_publish = models.BooleanField(
        null=True, blank=True, default=None,
        help_text='Per-company override: lock editing after publish. None = use platform default.'
    )

    # Agency relationship
    represented_by_agency = models.ForeignKey(
        'Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='represented_companies'
    )

    class Meta:
        db_table = 'companies'
        verbose_name_plural = 'Companies'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['billing_status']),
            models.Index(fields=['industry']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.entity_id:
            for _ in range(10):
                candidate = generate_entity_id()
                if not Company.objects.filter(entity_id=candidate).exists():
                    self.entity_id = candidate
                    break
            else:
                self.entity_id = generate_entity_id(10)
        if not self.slug:
            self.slug = slugify(self.name)
            original_slug = self.slug
            counter = 1
            while Company.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{original_slug}-{counter}'
                counter += 1
        super().save(*args, **kwargs)


class CompanyUser(TimestampMixin, models.Model):
    """Association between users and companies with roles."""

    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('recruiter', 'Recruiter'),
        ('viewer', 'Viewer'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='company_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    invited_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_invitations_sent'
    )
    invited_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'company_users'
        unique_together = ['company', 'user']

    def __str__(self):
        return f'{self.user.email} - {self.company.name} ({self.role})'


class Agency(TimestampMixin, models.Model):
    """Recruitment agency model. Public lookup by entity_id."""

    BILLING_MODEL_CHOICES = [
        ('agency_pays', 'Agency Pays'),
        ('company_pays', 'Company Pays'),
    ]

    STATUS_CHOICES = [
        ('verified', 'Verified'),
        ('pending', 'Pending Verification'),
        ('unverified', 'Unverified'),
    ]

    BILLING_STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('trial', 'Trial'),
    ]

    # Basic info
    name = models.CharField(max_length=255)
    entity_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        blank=True,
        db_index=True,
        help_text='Unique 8-character alphanumeric identifier (generated on save)',
    )
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    logo = models.FileField(
        upload_to='agency_logos/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=LOGO_EXTENSIONS)],
    )

    # Details
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    specializations = models.JSONField(default=list, blank=True)  # List of industries/roles they specialize in

    # Location
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    billing_status = models.CharField(max_length=20, choices=BILLING_STATUS_CHOICES, default='trial')
    billing_model = models.CharField(max_length=20, choices=BILLING_MODEL_CHOICES, default='agency_pays')
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='low')

    # Stripe
    stripe_customer_id = models.CharField(max_length=100, blank=True)

    # Feature overrides (admin-controlled)
    team_management_enabled = models.BooleanField(
        default=True,
        help_text='Admin override: enable/disable team management for this agency'
    )
    featured = models.BooleanField(
        default=False,
        help_text='Show this agency in featured listings'
    )
    allow_backdate_posting = models.BooleanField(
        default=False,
        help_text='Allow this agency to backdate job postings up to 5 months in the past'
    )

    class Meta:
        db_table = 'agencies'
        verbose_name_plural = 'Agencies'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['billing_status']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.entity_id:
            for _ in range(10):
                candidate = generate_entity_id()
                if not Agency.objects.filter(entity_id=candidate).exists():
                    self.entity_id = candidate
                    break
            else:
                self.entity_id = generate_entity_id(10)
        if not self.slug:
            self.slug = slugify(self.name)
            original_slug = self.slug
            counter = 1
            while Agency.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{original_slug}-{counter}'
                counter += 1
        super().save(*args, **kwargs)


class AgencyUser(TimestampMixin, models.Model):
    """Association between users and agencies with roles."""

    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('recruiter', 'Recruiter'),
        ('viewer', 'Viewer'),
    ]

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='agency_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')

    class Meta:
        db_table = 'agency_users'
        unique_together = ['agency', 'user']

    def __str__(self):
        return f'{self.user.email} - {self.agency.name} ({self.role})'


class AgencyClient(TimestampMixin, models.Model):
    """Agency-Company client relationship."""

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='clients')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='agency_relationships')
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'agency_clients'
        unique_together = ['agency', 'company']

    def __str__(self):
        return f'{self.agency.name} - {self.company.name}'


class CompanySettings(TimestampMixin, models.Model):
    """Company settings for job defaults and notification preferences."""

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='settings',
        primary_key=True
    )

    # Job defaults - stored as JSON
    job_defaults = models.JSONField(
        default=dict,
        blank=True,
        help_text='Job posting defaults: default_apply_method, require_salary, etc.'
    )

    # Notification preferences - stored as JSON
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text='Email notification settings: email_new_applications, email_job_published, etc.'
    )

    class Meta:
        db_table = 'company_settings'

    def __str__(self):
        return f'Settings for {self.company.name}'

    @staticmethod
    def get_default_job_defaults():
        """Return default job posting settings."""
        return {
            'default_apply_method': 'internal',
            'default_apply_email': '',
        }

    @staticmethod
    def get_default_notification_preferences():
        """Return default notification settings."""
        return {
            'email_new_applications': True,
            'email_job_published': True,
            'email_job_expiring': True,
            'email_low_credits': True,
            'email_billing': True,
            'email_weekly_digest': False,
        }

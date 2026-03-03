"""
Job models for Orion.
"""
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.mixins import TimestampMixin, SoftDeleteMixin, SoftDeleteManager
from core.utils import generate_entity_id


class Job(TimestampMixin, SoftDeleteMixin, models.Model):
    """Job posting model."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Review'),
        ('pending_payment', 'Pending Payment'),
        ('scheduled', 'Scheduled'),
        ('published', 'Published'),
        ('paused', 'Paused'),
        ('expired', 'Expired'),
        ('filled', 'Filled'),
        ('hidden', 'Hidden'),
    ]

    # Default manager excludes soft-deleted jobs
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # includes deleted

    EMPLOYMENT_TYPE_CHOICES = [
        ('full_time', 'Full-time'),
        ('part_time', 'Part-time'),
        ('contract', 'Contract'),
        ('temporary', 'Temporary'),
        ('internship', 'Internship'),
        ('freelance', 'Freelance'),
    ]

    EXPERIENCE_LEVEL_CHOICES = [
        ('entry', 'Entry Level'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior Level'),
        ('lead', 'Lead'),
        ('executive', 'Executive'),
    ]

    LOCATION_TYPE_CHOICES = [
        ('remote', 'Remote'),
        ('onsite', 'On-site'),
        ('hybrid', 'Hybrid'),
    ]

    SALARY_PERIOD_CHOICES = [
        ('hour', 'Per Hour'),
        ('day', 'Per Day'),
        ('week', 'Per Week'),
        ('month', 'Per Month'),
        ('year', 'Per Year'),
    ]

    APPLY_METHOD_CHOICES = [
        ('internal', 'Apply on Orion'),
        ('email', 'Apply via Email'),
        ('external', 'External URL'),
    ]

    CATEGORY_CHOICES = [
        ('engineering', 'Engineering'),
        ('design', 'Design'),
        ('marketing', 'Marketing'),
        ('sales', 'Sales'),
        ('customer_support', 'Customer Support'),
        ('finance', 'Finance'),
        ('hr', 'Human Resources'),
        ('operations', 'Operations'),
        ('product', 'Product'),
        ('data', 'Data & Analytics'),
        ('legal', 'Legal'),
        ('other', 'Other'),
    ]

    # Relationships
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobs'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs'
    )
    posted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='posted_jobs'
    )

    # Human-readable unique identifier (e.g. "A7K2MX")
    job_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        blank=True,
        db_index=True,
        help_text='Unique 8-character alphanumeric identifier (generated on save)',
    )

    # Basic info
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, db_index=True)
    department = models.CharField(max_length=100, blank=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES)
    category = models.CharField(max_length=50, default='other')

    # Details
    description = models.TextField()
    responsibilities = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    nice_to_have = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    benefits = models.JSONField(default=list, blank=True)

    # Location
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100)
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES)
    timezone = models.CharField(max_length=50, blank=True)

    # Compensation
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default='CAD')
    salary_period = models.CharField(max_length=10, choices=SALARY_PERIOD_CHOICES, default='year')
    show_salary = models.BooleanField(default=True)
    equity = models.BooleanField(default=False)
    equity_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    equity_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Application
    apply_method = models.CharField(max_length=20, choices=APPLY_METHOD_CHOICES, default='internal')
    apply_email = models.EmailField(blank=True)
    apply_url = models.URLField(blank=True)
    apply_instructions = models.TextField(blank=True)

    # Status & metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    featured = models.BooleanField(default=False)
    urgent = models.BooleanField(default=False)

    # Dates
    posted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    scheduled_publish_at = models.DateTimeField(
        null=True, blank=True,
        help_text='When to auto-publish this job'
    )

    # Metrics
    views = models.PositiveIntegerField(default=0)
    unique_views = models.PositiveIntegerField(default=0)
    applications_count = models.PositiveIntegerField(default=0)
    report_count = models.PositiveIntegerField(default=0)

    # Refresh tracking
    last_refreshed_at = models.DateTimeField(null=True, blank=True)

    # Spam detection
    spam_score = models.IntegerField(default=0)

    # Stores the status before trashing so restore can reinstate it
    pre_trash_status = models.CharField(max_length=20, blank=True, default='')

    # SEO
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)

    class Meta:
        db_table = 'jobs'
        indexes = [
            models.Index(fields=['status', 'posted_at']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['location_type', 'status']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['featured', 'status']),
            models.Index(fields=['status', 'scheduled_publish_at']),
            models.Index(fields=['deleted_at']),
            models.Index(fields=['spam_score', 'status']),
        ]
        ordering = ['-featured', '-posted_at']

    def __str__(self):
        return f'{self.title} at {self.company.name}'

    def save(self, *args, **kwargs):
        if not self.job_id:
            for _ in range(10):  # retry on collision
                candidate = generate_entity_id()
                if not Job.all_objects.filter(job_id=candidate).exists():
                    self.job_id = candidate
                    break
            else:
                # Extremely unlikely — fallback to 10-char
                self.job_id = generate_entity_id(10)
        if not self.slug:
            base_slug = slugify(f'{self.title}-{self.company.name}')
            self.slug = base_slug
            counter = 1
            while Job.all_objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{base_slug}-{counter}'
                counter += 1

        # Auto-fill SEO meta fields with template-based defaults (zero AI cost).
        # Only fills empty fields — never overwrites user or AI-generated content.
        if not self.meta_title and self.title and self.company_id:
            from apps.search.seo_utils import generate_meta_title
            self.meta_title = generate_meta_title(self)
        if not self.meta_description and self.title and self.company_id:
            from apps.search.seo_utils import generate_meta_description
            self.meta_description = generate_meta_description(self)

        super().save(*args, **kwargs)

    def publish(self, posted_at=None, duration_days=30):
        """Publish the job with calculated expiry."""
        self.status = 'published'
        self.posted_at = posted_at or timezone.now()
        self.expires_at = self.posted_at + timezone.timedelta(days=duration_days)
        self.scheduled_publish_at = None
        self.save(update_fields=['status', 'posted_at', 'expires_at', 'scheduled_publish_at'])

    def schedule(self, publish_at, duration_days=30):
        """Schedule job for future publishing."""
        self.status = 'scheduled'
        self.scheduled_publish_at = publish_at
        self.expires_at = publish_at + timezone.timedelta(days=duration_days)
        self.save(update_fields=['status', 'scheduled_publish_at', 'expires_at'])

    def pause(self):
        """Pause the job."""
        self.status = 'paused'
        self.save(update_fields=['status'])

    def expire(self):
        """Mark job as expired."""
        self.status = 'expired'
        self.closed_at = timezone.now()
        self.save(update_fields=['status', 'closed_at'])

    def extend(self, days=30):
        """Extend a published job's expiration.

        Only published jobs can be extended. Expired jobs must be
        re-posted as new listings (which consumes a fresh credit).
        """
        if self.status != 'published':
            raise ValueError(
                f'Only published jobs can be extended (current status: {self.status})'
            )
        self.expires_at = timezone.now() + timezone.timedelta(days=days)
        self.save(update_fields=['expires_at'])

    def refresh(self):
        """Bump job to top of search by updating posted_at."""
        now = timezone.now()
        self.posted_at = now
        self.last_refreshed_at = now
        self.save(update_fields=['posted_at', 'last_refreshed_at'])

    def mark_filled(self):
        """Mark job as filled (position closed)."""
        self.status = 'filled'
        self.closed_at = timezone.now()
        self.save(update_fields=['status', 'closed_at'])

    def delete(self, using=None, keep_parents=False):
        """Soft-delete: save current status, then unpublish before trashing."""
        self.pre_trash_status = self.status
        self.deleted_at = timezone.now()
        # Unpublish so the job is no longer live in any external feed
        if self.status in ('published', 'scheduled'):
            self.status = 'hidden'
        self.save(update_fields=['deleted_at', 'pre_trash_status', 'status'])

    def restore(self):
        """Restore a trashed job, reinstating its pre-trash status."""
        if self.pre_trash_status:
            self.status = self.pre_trash_status
            self.pre_trash_status = ''
        self.deleted_at = None
        self.save(update_fields=['deleted_at', 'status', 'pre_trash_status'])

    @property
    def is_active(self):
        return self.status == 'published' and self.expires_at is not None and self.expires_at > timezone.now()

    @property
    def location_display(self):
        parts = [self.city]
        if self.state:
            parts.append(self.state)
        parts.append(self.country)
        return ', '.join(parts)

    @property
    def salary_display(self):
        if not self.show_salary or not self.salary_min:
            return None
        if self.salary_max and self.salary_min != self.salary_max:
            return f'{self.salary_currency} {self.salary_min:,.0f} - {self.salary_max:,.0f}/{self.salary_period}'
        return f'{self.salary_currency} {self.salary_min:,.0f}/{self.salary_period}'


class JobReport(TimestampMixin, models.Model):
    """Job report for flagging inappropriate jobs."""

    REASON_CHOICES = [
        ('spam', 'Spam or Scam'),
        ('discriminatory', 'Discriminatory'),
        ('misleading', 'Misleading Information'),
        ('illegal', 'Illegal Activity'),
        ('inappropriate', 'Inappropriate Content'),
        ('duplicate', 'Duplicate Posting'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('dismissed', 'Dismissed'),
        ('action_taken', 'Action Taken'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_reports'
    )
    reporter_email = models.EmailField()
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    details = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_job_reports'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'job_reports'
        indexes = [
            models.Index(fields=['job', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'Report for {self.job.title} - {self.reason}'


class JobView(models.Model):
    """Track job views."""

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='view_records')
    visitor_id = models.CharField(max_length=100, db_index=True)  # Anonymous tracking
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_views'
        indexes = [
            models.Index(fields=['job', 'created_at']),
            models.Index(fields=['visitor_id', 'job']),
        ]


class JobBookmark(TimestampMixin, models.Model):
    """Job bookmarks by employers for tracking candidates."""

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='bookmarks')
    candidate = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='bookmarked_by_jobs'
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='job_bookmarks_created'
    )

    class Meta:
        db_table = 'job_bookmarks'
        unique_together = ['job', 'candidate']

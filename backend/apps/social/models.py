"""
Social distribution models for Orion.
"""
from django.db import models
from core.mixins import TimestampMixin
from core.encryption import EncryptedTextField


class SocialPost(TimestampMixin, models.Model):
    """Track social media posts for jobs."""

    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('twitter', 'Twitter/X'),
    ]

    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('posted', 'Posted'),
        ('failed', 'Failed'),
    ]

    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='social_posts'
    )
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)

    # Content
    content = models.TextField()
    image = models.ImageField(upload_to='social_images/', null=True, blank=True)

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)

    # External reference
    external_id = models.CharField(max_length=100, blank=True)  # Post ID from platform
    external_url = models.URLField(blank=True)

    # Metrics (updated via webhook or periodic sync)
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)

    # Created by
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='social_posts_created'
    )

    class Meta:
        db_table = 'social_posts'
        indexes = [
            models.Index(fields=['job', 'platform']),
            models.Index(fields=['status', 'scheduled_at']),
        ]

    def __str__(self):
        return f'{self.job.title} - {self.platform}'


class SocialAccount(TimestampMixin, models.Model):
    """Connected social media accounts."""

    PLATFORM_CHOICES = [
        ('linkedin', 'LinkedIn'),
        ('twitter', 'Twitter/X'),
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='social_accounts'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='social_accounts'
    )

    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    account_name = models.CharField(max_length=255)
    account_id = models.CharField(max_length=100)

    # OAuth tokens — Fernet-encrypted at rest
    access_token = EncryptedTextField()
    refresh_token = EncryptedTextField(blank=True, default='')
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'social_accounts'
        unique_together = [['company', 'platform'], ['agency', 'platform']]

    def __str__(self):
        return f'{self.account_name} ({self.platform})'


class SocialTemplate(TimestampMixin, models.Model):
    """Template for formatting social media posts."""

    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('twitter', 'Twitter/X'),
    ]

    provider = models.CharField(max_length=20, choices=PLATFORM_CHOICES, unique=True)
    title_format = models.CharField(
        max_length=500,
        help_text='Template for post title. Use {job_title}, {company}, {location}, {salary} placeholders'
    )
    include_salary = models.BooleanField(default=True)
    hashtags = models.JSONField(default=list, blank=True)
    utm_source = models.CharField(max_length=100, default='social')
    utm_medium = models.CharField(max_length=100, default='post')
    utm_campaign = models.CharField(max_length=100, default='job_posting')

    class Meta:
        db_table = 'social_templates'
        ordering = ['provider']

    def __str__(self):
        return f'{self.get_provider_display()} Template'

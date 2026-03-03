"""
Application models for Orion.
"""
from django.db import models
from django.utils import timezone
from core.mixins import TimestampMixin


class Application(TimestampMixin, models.Model):
    """Job application model."""

    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('reviewing', 'Under Review'),
        ('shortlisted', 'Shortlisted'),
        ('interviewing', 'Interviewing'),
        ('offered', 'Offer Extended'),
        ('hired', 'Hired'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]

    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='applications'
    )
    candidate = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='applications'
    )

    # Application materials
    resume = models.FileField(upload_to='resumes/')
    cover_letter = models.TextField(blank=True)
    portfolio_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)

    # Custom questions/answers
    custom_answers = models.JSONField(default=dict, blank=True)

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    status_changed_at = models.DateTimeField(auto_now_add=False, default=timezone.now)
    status_changed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='application_status_changes'
    )

    # Employer notes (internal)
    notes = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5 stars

    # Candidate communication
    last_contact_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'applications'
        unique_together = ['job', 'candidate']
        indexes = [
            models.Index(fields=['job', 'status']),
            models.Index(fields=['candidate', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.candidate.email} - {self.job.title}'

    def update_status(self, new_status, changed_by=None):
        """Update application status with tracking."""
        from django.utils import timezone

        old_status = self.status
        self.status = new_status
        self.status_changed_at = timezone.now()
        self.status_changed_by = changed_by
        self.save(update_fields=['status', 'status_changed_at', 'status_changed_by'])

        # Create timeline entry
        ApplicationTimeline.objects.create(
            application=self,
            event='status_change',
            old_value=old_status,
            new_value=new_status,
            created_by=changed_by
        )


class ApplicationTimeline(models.Model):
    """Track application status changes and events."""

    EVENT_CHOICES = [
        ('status_change', 'Status Changed'),
        ('note_added', 'Note Added'),
        ('message_sent', 'Message Sent'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('document_uploaded', 'Document Uploaded'),
    ]

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='timeline'
    )
    event = models.CharField(max_length=30, choices=EVENT_CHOICES)
    old_value = models.CharField(max_length=100, blank=True)
    new_value = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_timeline'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.application} - {self.event}'


class SavedJob(TimestampMixin, models.Model):
    """Saved jobs for candidates."""

    candidate = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='saved_jobs'
    )
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='saved_by'
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'saved_jobs'
        unique_together = ['candidate', 'job']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.candidate.email} saved {self.job.title}'


class SavedSearch(TimestampMixin, models.Model):
    """Saved job searches for candidates."""

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('off', 'Off'),
    ]

    candidate = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='saved_searches'
    )
    name = models.CharField(max_length=100)
    query = models.JSONField(default=dict)  # Search criteria
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='daily')
    enabled = models.BooleanField(default=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    match_count = models.PositiveIntegerField(default=0)  # Current matching jobs

    class Meta:
        db_table = 'saved_searches'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.candidate.email} - {self.name}'


class ApplicationMessage(TimestampMixin, models.Model):
    """Messages between candidate and employer."""

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_application_messages'
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'application_messages'
        ordering = ['created_at']

    def __str__(self):
        return f'Message for {self.application}'

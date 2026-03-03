"""
Reusable mixins for models and views.
"""
from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """Adds created_at and updated_at timestamps to models."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """Adds soft delete functionality to models."""

    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete the object."""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the object."""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted object."""
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])

    @property
    def is_deleted(self):
        return self.deleted_at is not None


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted objects by default."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def with_deleted(self):
        """Include soft-deleted objects."""
        return super().get_queryset()

    def only_deleted(self):
        """Only return soft-deleted objects."""
        return super().get_queryset().filter(deleted_at__isnull=False)


class SlugMixin(models.Model):
    """Adds a unique slug field to models."""

    slug = models.SlugField(max_length=255, unique=True, db_index=True)

    class Meta:
        abstract = True


class StatusMixin(models.Model):
    """Adds a status field with common statuses."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending'),
        ('suspended', 'Suspended'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )

    class Meta:
        abstract = True

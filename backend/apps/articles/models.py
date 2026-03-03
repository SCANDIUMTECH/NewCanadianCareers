"""
Article/News models for Orion.
"""
import uuid
import json
import re

from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.mixins import TimestampMixin, SoftDeleteMixin, SoftDeleteManager
from core.utils import generate_entity_id


def _extract_text_from_tiptap(node):
    """Recursively extract plain text from a TipTap JSON node.

    Handles both raw JSON (dict) and HTML strings. Returns a plain text
    string suitable for word-count / reading-time estimation.
    """
    if isinstance(node, str):
        # Could be a raw HTML string — strip tags
        return re.sub(r'<[^>]+>', ' ', node)

    if not isinstance(node, dict):
        return ''

    text_parts = []

    # Leaf text node
    if node.get('type') == 'text':
        text_parts.append(node.get('text', ''))

    # Recurse into children
    for child in node.get('content', []):
        text_parts.append(_extract_text_from_tiptap(child))

    return ' '.join(text_parts)


class ArticleCategory(TimestampMixin, models.Model):
    """Category for articles."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'article_categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Article(TimestampMixin, SoftDeleteMixin, models.Model):
    """Article/news post model."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    TEMPLATE_CHOICES = [
        ('editorial_hero', 'Editorial Hero'),
        ('split_magazine', 'Split Magazine'),
        ('minimal_luxury', 'Minimal Luxury'),
        ('bold_typography', 'Bold Typography'),
        ('image_led', 'Image Led'),
        ('modern_grid', 'Modern Grid'),
    ]

    AFFILIATE_DISCLOSURE_CHOICES = [
        ('auto', 'Auto'),
        ('manual', 'Manual'),
        ('none', 'None'),
    ]

    # Default manager excludes soft-deleted articles
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # includes deleted

    # Human-readable unique identifier
    article_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        blank=True,
        db_index=True,
        help_text='Unique 8-character alphanumeric identifier (generated on save)',
    )

    # Core fields
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, unique=True, db_index=True)
    excerpt = models.TextField(max_length=500, blank=True)
    content = models.TextField(blank=True)  # TipTap JSON as string
    cover_image = models.ImageField(upload_to='articles/', blank=True)
    og_image = models.ImageField(upload_to='articles/og/', blank=True)

    # Relationships
    author = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles',
    )
    category = models.ForeignKey(
        ArticleCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles',
    )

    # Taxonomy
    tags = models.JSONField(default=list, blank=True)

    # Status & display
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    featured = models.BooleanField(default=False)
    selected_template = models.CharField(
        max_length=30, choices=TEMPLATE_CHOICES, default='editorial_hero'
    )

    # Dates
    published_at = models.DateTimeField(null=True, blank=True)
    scheduled_publish_at = models.DateTimeField(null=True, blank=True)

    # Computed metrics
    reading_time = models.PositiveSmallIntegerField(default=0)  # minutes
    views = models.PositiveIntegerField(default=0)
    unique_views = models.PositiveIntegerField(default=0)

    # SEO
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    canonical_url = models.URLField(blank=True)

    # Commercial
    allow_inline_banners = models.BooleanField(default=True)
    affiliate_disclosure = models.CharField(
        max_length=20, choices=AFFILIATE_DISCLOSURE_CHOICES, default='auto'
    )
    sponsored_by = models.CharField(max_length=100, blank=True)

    # Preview (token-gated access before publish)
    preview_token = models.UUIDField(unique=True, editable=False, null=True, blank=True)
    preview_expires_at = models.DateTimeField(null=True, blank=True)

    # Stores the status before trashing so restore can reinstate it
    pre_trash_status = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        db_table = 'articles'
        indexes = [
            models.Index(fields=['status', 'published_at']),
            models.Index(fields=['status', 'scheduled_publish_at']),
            models.Index(fields=['featured', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['-featured', '-published_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Generate article_id
        if not self.article_id:
            for _ in range(10):  # retry on collision
                candidate = generate_entity_id()
                if not Article.all_objects.filter(article_id=candidate).exists():
                    self.article_id = candidate
                    break
            else:
                # Extremely unlikely — fallback to 10-char
                self.article_id = generate_entity_id(10)

        # Generate slug from title if not provided
        if not self.slug and self.title:
            self.slug = slugify(self.title)

        # Deduplicate slug against existing articles
        if self.slug:
            base_slug = self.slug
            counter = 1
            while Article.all_objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{base_slug}-{counter}'
                counter += 1

        # Generate preview_token if not set
        if not self.preview_token:
            self.preview_token = uuid.uuid4()

        # Calculate reading_time from content (~220 wpm)
        if self.content:
            try:
                content_data = json.loads(self.content)
                text = _extract_text_from_tiptap(content_data)
            except (json.JSONDecodeError, TypeError):
                text = _extract_text_from_tiptap(self.content)
            word_count = len(text.split())
            self.reading_time = max(1, round(word_count / 220))

        super().save(*args, **kwargs)

    # --- Business methods ---

    def publish(self):
        """Publish the article immediately."""
        self.status = 'published'
        self.published_at = timezone.now()
        self.scheduled_publish_at = None
        self.save(update_fields=['status', 'published_at', 'scheduled_publish_at'])

    def schedule(self, publish_at):
        """Schedule article for future publishing."""
        self.status = 'scheduled'
        self.scheduled_publish_at = publish_at
        self.save(update_fields=['status', 'scheduled_publish_at'])

    def unpublish(self):
        """Revert a published article to draft."""
        self.status = 'draft'
        self.published_at = None
        self.save(update_fields=['status', 'published_at'])

    def archive(self):
        """Archive the article."""
        self.status = 'archived'
        self.save(update_fields=['status'])

    def feature(self):
        """Mark the article as featured."""
        self.featured = True
        self.save(update_fields=['featured'])

    def unfeature(self):
        """Remove the featured flag."""
        self.featured = False
        self.save(update_fields=['featured'])

    def delete(self, using=None, keep_parents=False):
        """Soft-delete: save current status, then archive before trashing."""
        self.pre_trash_status = self.status
        self.deleted_at = timezone.now()
        if self.status == 'published':
            self.status = 'archived'
        self.save(update_fields=['deleted_at', 'pre_trash_status', 'status'])

    def restore(self):
        """Restore a trashed article, reinstating its pre-trash status."""
        if self.pre_trash_status:
            self.status = self.pre_trash_status
            self.pre_trash_status = ''
        self.deleted_at = None
        self.save(update_fields=['deleted_at', 'status', 'pre_trash_status'])


class ArticleView(models.Model):
    """Track article views for analytics."""

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='view_records',
    )
    visitor_id = models.CharField(max_length=100, db_index=True)  # Anonymous tracking
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'article_views'
        indexes = [
            models.Index(fields=['article', 'created_at']),
            models.Index(fields=['visitor_id', 'article']),
        ]

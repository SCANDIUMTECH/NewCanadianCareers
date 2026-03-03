"""
AI service models for Orion.

Tracks AI provider configuration and usage for SEO and social content generation.
"""
from django.db import models
from core.mixins import TimestampMixin
from core.encryption import EncryptedTextField


class AIProviderConfig(TimestampMixin, models.Model):
    """
    AI provider configuration.

    Supports multiple providers and multiple configs per provider.
    Only one config can be active at a time.
    """

    PROVIDER_CHOICES = [
        ('anthropic', 'Anthropic (Claude)'),
        ('openai', 'OpenAI (GPT)'),
        ('openrouter', 'OpenRouter'),
        ('gemini', 'Google Gemini'),
        ('mistral', 'Mistral AI'),
        ('deepseek', 'DeepSeek'),
        ('groq', 'Groq'),
        ('xai', 'xAI (Grok)'),
        ('together', 'Together AI'),
    ]

    name = models.CharField(
        max_length=100,
        help_text='Display name for this configuration (e.g. "Groq - Llama 3.1 8B")'
    )
    provider = models.CharField(max_length=30, choices=PROVIDER_CHOICES)
    base_url = models.URLField(
        blank=True,
        help_text='Custom API base URL for OpenAI-compatible providers'
    )
    api_key = EncryptedTextField(help_text='Encrypted API key for the provider')
    model = models.CharField(
        max_length=100,
        help_text='Model identifier (e.g. claude-sonnet-4-20250514, gpt-4o)'
    )
    is_active = models.BooleanField(
        default=False,
        help_text='Only one config can be active at a time'
    )

    # Rate limiting
    max_requests_per_minute = models.PositiveIntegerField(default=30)
    max_requests_per_day = models.PositiveIntegerField(default=5000)

    # Cost tracking
    cost_per_1k_input_tokens = models.DecimalField(
        max_digits=8, decimal_places=5, default=0,
        help_text='Cost per 1000 input tokens in USD'
    )
    cost_per_1k_output_tokens = models.DecimalField(
        max_digits=8, decimal_places=5, default=0,
        help_text='Cost per 1000 output tokens in USD'
    )

    # Feature toggles
    seo_generation_enabled = models.BooleanField(default=True)
    social_generation_enabled = models.BooleanField(default=True)
    auto_generate_on_publish = models.BooleanField(
        default=False,
        help_text='Auto-generate SEO meta + social posts when a job is published'
    )

    class Meta:
        db_table = 'ai_provider_configs'
        verbose_name = 'AI Provider Config'
        verbose_name_plural = 'AI Provider Configs'

    def __str__(self):
        status = 'active' if self.is_active else 'inactive'
        return f'{self.name} [{status}]'

    def save(self, *args, **kwargs):
        # Ensure only one config is active
        if self.is_active:
            AIProviderConfig.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class AIUsageLog(models.Model):
    """
    Tracks every AI API call for cost monitoring and analytics.
    """

    FEATURE_CHOICES = [
        ('seo_meta', 'SEO Meta Generation'),
        ('seo_meta_bulk', 'SEO Meta Bulk Generation'),
        ('social_content', 'Social Content Generation'),
        ('connection_test', 'Connection Test'),
    ]

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('error', 'Error'),
        ('rate_limited', 'Rate Limited'),
    ]

    # What was generated
    feature = models.CharField(max_length=30, choices=FEATURE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')

    # Provider details
    provider = models.CharField(max_length=30)
    model = models.CharField(max_length=100)

    # Token usage
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)

    # Cost (computed from provider config rates)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)

    # Context
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_usage_logs'
    )
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_usage_logs'
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_usage_logs'
    )

    # Error details
    error_message = models.TextField(blank=True)

    # Timing
    duration_ms = models.PositiveIntegerField(default=0, help_text='API call duration in milliseconds')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_usage_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['feature', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['company', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'{self.feature} - {self.provider}/{self.model} ({self.total_tokens} tokens)'

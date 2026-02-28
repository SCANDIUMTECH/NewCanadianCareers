"""
AI service layer for Orion.

Provider-agnostic abstraction for AI content generation.
Supports Anthropic Claude (native SDK), OpenAI (native SDK),
and all OpenAI-compatible providers via custom base_url.
"""
import json
import logging
import time
from decimal import Decimal

from django.conf import settings

from .models import AIProviderConfig, AIUsageLog

logger = logging.getLogger(__name__)


# =============================================================================
# Provider Defaults
# =============================================================================

PROVIDER_DEFAULTS = {
    'anthropic': {
        'base_url': '',  # uses native SDK
        'models': [
            'claude-sonnet-4-20250514',
            'claude-haiku-4-20250514',
            'claude-opus-4-20250514',
        ],
    },
    'openai': {
        'base_url': '',  # uses native SDK
        'models': [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4.1',
            'gpt-4.1-mini',
            'gpt-4.1-nano',
        ],
    },
    'openrouter': {
        'base_url': 'https://openrouter.ai/api/v1',
        'models': [
            'deepseek/deepseek-chat-v3-0324',
            'meta-llama/llama-4-maverick',
            'google/gemini-2.5-flash-preview',
            'mistralai/mistral-small-3.1-24b-instruct',
            'meta-llama/llama-3.3-70b-instruct:free',
        ],
    },
    'gemini': {
        'base_url': 'https://generativelanguage.googleapis.com/v1beta/openai/',
        'models': [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
        ],
    },
    'mistral': {
        'base_url': 'https://api.mistral.ai/v1',
        'models': [
            'mistral-small-latest',
            'open-mistral-nemo',
            'mistral-medium-latest',
            'mistral-large-latest',
        ],
    },
    'deepseek': {
        'base_url': 'https://api.deepseek.com/v1',
        'models': [
            'deepseek-chat',
            'deepseek-reasoner',
        ],
    },
    'groq': {
        'base_url': 'https://api.groq.com/openai/v1',
        'models': [
            'llama-3.1-8b-instant',
            'llama-3.3-70b-versatile',
            'llama-4-scout-17b-16e-instruct',
            'qwen-qwq-32b',
            'meta-llama/llama-4-maverick-17b-128e-instruct',
        ],
    },
    'xai': {
        'base_url': 'https://api.x.ai/v1',
        'models': [
            'grok-3-fast',
            'grok-3-mini-fast',
            'grok-3',
            'grok-3-mini',
        ],
    },
    'together': {
        'base_url': 'https://api.together.xyz/v1',
        'models': [
            'meta-llama/Llama-3.2-3B-Instruct-Turbo',
            'mistralai/Mistral-Small-24B-Instruct-2501',
            'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
            'Qwen/Qwen2.5-72B-Instruct-Turbo',
        ],
    },
}


# =============================================================================
# Exceptions
# =============================================================================

class AIServiceError(Exception):
    """Base exception for AI service errors."""
    pass


class NoActiveProviderError(AIServiceError):
    """No active AI provider configured."""
    pass


class AIRateLimitError(AIServiceError):
    """AI provider rate limit exceeded."""
    pass


# =============================================================================
# Provider Dispatch
# =============================================================================

def get_active_provider():
    """Get the currently active AI provider config."""
    config = AIProviderConfig.objects.filter(is_active=True).first()
    if not config:
        raise NoActiveProviderError(
            'No active AI provider configured. '
            'Go to Admin > AI Settings to configure a provider.'
        )
    return config


def _call_anthropic(config, system_prompt, user_prompt, max_tokens=1024):
    """Call Anthropic Claude API using the native SDK."""
    import anthropic

    client = anthropic.Anthropic(api_key=config.api_key)

    start = time.time()
    message = client.messages.create(
        model=config.model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[
            {'role': 'user', 'content': user_prompt}
        ]
    )
    duration_ms = int((time.time() - start) * 1000)

    return {
        'content': message.content[0].text,
        'input_tokens': message.usage.input_tokens,
        'output_tokens': message.usage.output_tokens,
        'total_tokens': message.usage.input_tokens + message.usage.output_tokens,
        'duration_ms': duration_ms,
    }


def _call_openai(config, system_prompt, user_prompt, max_tokens=1024):
    """Call OpenAI API using the native SDK."""
    import openai

    client = openai.OpenAI(api_key=config.api_key)

    start = time.time()
    response = client.chat.completions.create(
        model=config.model,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    duration_ms = int((time.time() - start) * 1000)

    usage = response.usage
    return {
        'content': response.choices[0].message.content,
        'input_tokens': usage.prompt_tokens,
        'output_tokens': usage.completion_tokens,
        'total_tokens': usage.total_tokens,
        'duration_ms': duration_ms,
    }


def _call_openai_compatible(config, system_prompt, user_prompt, max_tokens=1024):
    """
    Call any OpenAI-compatible provider using the openai SDK with a custom base_url.

    Works with: OpenRouter, Gemini, Mistral, DeepSeek, Groq, xAI, Together AI.
    """
    import openai

    base_url = config.base_url
    if not base_url:
        # Fall back to provider defaults
        defaults = PROVIDER_DEFAULTS.get(config.provider, {})
        base_url = defaults.get('base_url', '')

    if not base_url:
        raise AIServiceError(
            f'No base URL configured for provider {config.provider}. '
            f'Set a base URL in the provider config.'
        )

    # OpenRouter requires extra headers for free models
    extra_headers = {}
    if config.provider == 'openrouter':
        extra_headers = {
            'HTTP-Referer': 'https://orion.jobs',
            'X-Title': 'Orion Job Board',
        }

    client = openai.OpenAI(
        api_key=config.api_key,
        base_url=base_url,
        default_headers=extra_headers,
    )

    start = time.time()
    response = client.chat.completions.create(
        model=config.model,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    duration_ms = int((time.time() - start) * 1000)

    usage = response.usage
    input_tokens = getattr(usage, 'prompt_tokens', 0) or 0
    output_tokens = getattr(usage, 'completion_tokens', 0) or 0

    return {
        'content': response.choices[0].message.content,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'total_tokens': input_tokens + output_tokens,
        'duration_ms': duration_ms,
    }


def _call_provider(config, system_prompt, user_prompt, max_tokens=1024):
    """Route to the correct provider implementation."""
    if config.provider == 'anthropic':
        return _call_anthropic(config, system_prompt, user_prompt, max_tokens=max_tokens)
    elif config.provider == 'openai':
        return _call_openai(config, system_prompt, user_prompt, max_tokens=max_tokens)
    else:
        # All other providers use the OpenAI-compatible endpoint
        return _call_openai_compatible(config, system_prompt, user_prompt, max_tokens=max_tokens)


# =============================================================================
# Cost & Logging
# =============================================================================

def _compute_cost(config, input_tokens, output_tokens):
    """Compute cost in USD from token counts and provider rates."""
    input_cost = (Decimal(input_tokens) / 1000) * config.cost_per_1k_input_tokens
    output_cost = (Decimal(output_tokens) / 1000) * config.cost_per_1k_output_tokens
    return input_cost + output_cost


def _log_usage(feature, config, result, user=None, job=None, company=None, error=None):
    """Log AI usage to the database."""
    status = 'error' if error else 'success'
    cost = _compute_cost(
        config,
        result.get('input_tokens', 0),
        result.get('output_tokens', 0)
    ) if not error else Decimal('0')

    AIUsageLog.objects.create(
        feature=feature,
        status=status,
        provider=config.provider,
        model=config.model,
        input_tokens=result.get('input_tokens', 0),
        output_tokens=result.get('output_tokens', 0),
        total_tokens=result.get('total_tokens', 0),
        cost_usd=cost,
        user=user,
        job=job,
        company=company if company else (job.company if job else None),
        error_message=str(error) if error else '',
        duration_ms=result.get('duration_ms', 0),
    )


# =============================================================================
# SEO Generation
# =============================================================================

SEO_SYSTEM_PROMPT = """You are an expert SEO specialist for a job board platform called Orion.
Your task is to generate optimized SEO metadata for job postings.

Rules:
- meta_title: Max 60 characters. Include job title, company name, and location if it fits. Make it compelling for search clicks.
- meta_description: Max 155 characters. Summarize the role's key selling points (salary, perks, tech stack). Include a call to action.
- Focus on Google for Jobs optimization.
- Use natural language, avoid keyword stuffing.
- Include the employment type (Full-time, Part-time, etc.) when space allows.

Return ONLY valid JSON with exactly these keys:
{"meta_title": "...", "meta_description": "..."}"""


def generate_seo_meta(job, user=None):
    """
    Generate SEO meta_title and meta_description for a job posting.

    Args:
        job: Job model instance
        user: User who triggered the generation (for logging)

    Returns:
        dict with 'meta_title' and 'meta_description'
    """
    config = get_active_provider()

    # Build the user prompt with job details
    salary_info = ''
    if job.show_salary and job.salary_min:
        if job.salary_max and job.salary_min != job.salary_max:
            salary_info = f'Salary: {job.salary_currency} {job.salary_min:,.0f} - {job.salary_max:,.0f}/{job.salary_period}'
        else:
            salary_info = f'Salary: {job.salary_currency} {job.salary_min:,.0f}/{job.salary_period}'

    skills_str = ', '.join(job.skills[:8]) if job.skills else 'Not specified'
    benefits_str = ', '.join(job.benefits[:5]) if job.benefits else 'Not specified'

    user_prompt = f"""Generate SEO meta_title and meta_description for this job:

Title: {job.title}
Company: {job.company.name}
Location: {job.city}, {job.state + ', ' if job.state else ''}{job.country}
Location Type: {job.get_location_type_display()}
Employment Type: {job.get_employment_type_display()}
Experience Level: {job.get_experience_level_display()}
Category: {job.get_category_display()}
{salary_info}
Skills: {skills_str}
Benefits: {benefits_str}
Description (first 300 chars): {job.description[:300]}"""

    result = {}
    try:
        result = _call_provider(config, SEO_SYSTEM_PROMPT, user_prompt)

        # Parse the JSON response
        content = result['content'].strip()
        # Handle potential markdown code blocks
        if content.startswith('```'):
            content = content.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        parsed = json.loads(content)
        meta_title = parsed.get('meta_title', '')[:70]
        meta_description = parsed.get('meta_description', '')[:160]

        _log_usage('seo_meta', config, result, user=user, job=job)

        return {
            'meta_title': meta_title,
            'meta_description': meta_description,
        }

    except json.JSONDecodeError as e:
        logger.error(f'Failed to parse AI response for job {job.id}: {e}')
        _log_usage('seo_meta', config, result, user=user, job=job, error=e)
        raise AIServiceError(f'AI returned invalid JSON: {e}')

    except Exception as e:
        logger.exception(f'AI SEO generation failed for job {job.id}')
        _log_usage('seo_meta', config, result, user=user, job=job, error=e)
        raise AIServiceError(str(e))


# =============================================================================
# Social Content Generation
# =============================================================================

SOCIAL_SYSTEM_PROMPT = """You are an expert social media marketer for a job board platform called Orion.
Your task is to generate platform-specific social media posts to promote job listings.

Platform guidelines:
- LinkedIn: Professional tone, 1-3 short paragraphs, 1300 char max. Use line breaks. Include 3-5 relevant hashtags at the end.
- Twitter/X: Concise and punchy, 280 char max including hashtags. Use 2-3 hashtags. Include a hook.
- Facebook: Conversational tone, 500 char max. Engaging question or statement opening. 2-3 hashtags.
- Instagram: Inspirational tone, 2200 char max. Use emojis sparingly. 5-10 hashtags at the end.

Rules:
- Include the job URL placeholder: {job_url}
- Highlight key selling points: salary (if shown), location/remote, notable benefits.
- Do NOT fabricate details not provided.
- Make each platform version genuinely different, not just a trim of the same text.

Return ONLY valid JSON with platform keys:
{"linkedin": "...", "twitter": "...", "facebook": "...", "instagram": "..."}"""


def generate_social_content(job, platforms=None, user=None):
    """
    Generate social media post content for a job across specified platforms.

    Args:
        job: Job model instance
        platforms: List of platform names (default: all four)
        user: User who triggered the generation (for logging)

    Returns:
        dict with platform keys and generated content values
    """
    config = get_active_provider()

    if not config.social_generation_enabled:
        raise AIServiceError('Social content generation is disabled')

    if platforms is None:
        platforms = ['linkedin', 'twitter', 'facebook', 'instagram']

    salary_info = ''
    if job.show_salary and job.salary_min:
        if job.salary_max and job.salary_min != job.salary_max:
            salary_info = f'Salary: {job.salary_currency} {job.salary_min:,.0f} - {job.salary_max:,.0f}/{job.salary_period}'
        else:
            salary_info = f'Salary: {job.salary_currency} {job.salary_min:,.0f}/{job.salary_period}'

    skills_str = ', '.join(job.skills[:8]) if job.skills else 'Not specified'
    benefits_str = ', '.join(job.benefits[:5]) if job.benefits else 'Not specified'

    platforms_str = ', '.join(platforms)
    user_prompt = f"""Generate social media posts for these platforms: {platforms_str}

Job Details:
Title: {job.title}
Company: {job.company.name}
Location: {job.city}, {job.state + ', ' if job.state else ''}{job.country}
Location Type: {job.get_location_type_display()}
Employment Type: {job.get_employment_type_display()}
Experience Level: {job.get_experience_level_display()}
{salary_info}
Skills: {skills_str}
Benefits: {benefits_str}
Description (first 500 chars): {job.description[:500]}

Job URL: {{job_url}}"""

    result = {}
    try:
        result = _call_provider(config, SOCIAL_SYSTEM_PROMPT, user_prompt)

        content = result['content'].strip()
        if content.startswith('```'):
            content = content.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        parsed = json.loads(content)

        # Filter to requested platforms only
        generated = {}
        for platform in platforms:
            if platform in parsed:
                generated[platform] = parsed[platform]

        _log_usage('social_content', config, result, user=user, job=job)

        return generated

    except json.JSONDecodeError as e:
        logger.error(f'Failed to parse AI social response for job {job.id}: {e}')
        _log_usage('social_content', config, result, user=user, job=job, error=e)
        raise AIServiceError(f'AI returned invalid JSON: {e}')

    except Exception as e:
        logger.exception(f'AI social generation failed for job {job.id}')
        _log_usage('social_content', config, result, user=user, job=job, error=e)
        raise AIServiceError(str(e))


# =============================================================================
# Usage Stats
# =============================================================================

def get_usage_stats(days=30, company=None):
    """Get AI usage statistics for the dashboard."""
    from django.db.models import Sum, Count, Avg, Q
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=days)
    qs = AIUsageLog.objects.filter(created_at__gte=cutoff)

    if company:
        qs = qs.filter(company=company)

    stats = qs.aggregate(
        total_requests=Count('id'),
        successful_requests=Count('id', filter=Q(status='success')),
        failed_requests=Count('id', filter=Q(status='error')),
        total_tokens=Sum('total_tokens'),
        total_cost=Sum('cost_usd'),
        avg_duration_ms=Avg('duration_ms'),
        seo_requests=Count('id', filter=Q(feature='seo_meta')),
        seo_bulk_requests=Count('id', filter=Q(feature='seo_meta_bulk')),
        social_requests=Count('id', filter=Q(feature='social_content')),
        test_requests=Count('id', filter=Q(feature='connection_test')),
    )

    # Set defaults for None values
    for key in stats:
        if stats[key] is None:
            stats[key] = 0

    return stats

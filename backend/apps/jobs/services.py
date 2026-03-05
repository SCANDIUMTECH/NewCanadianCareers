"""
Job policy enforcement service for Orion.

Centralises all platform policy checks so that views stay thin.
Reads from PlatformSettings (singleton) and PlatformSetting (KV store).
"""
import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class InsufficientCreditsError(Exception):
    """Raised when entity has no valid entitlement with remaining credits."""

    def __init__(self, credit_type='job_post'):
        self.credit_type = credit_type
        super().__init__(f'No available {credit_type} credits')


class PolicyViolationError(Exception):
    """Raised when a policy check fails."""

    def __init__(self, message, code='policy_violation'):
        self.code = code
        super().__init__(message)


def get_platform_settings():
    """Return the PlatformSettings singleton, creating defaults if needed."""
    from apps.moderation.models import PlatformSettings
    return PlatformSettings.get_settings()


def get_job_policy():
    """Return all job policy settings from the KV store, merged with defaults.

    This is the single source of truth for all job posting policies.
    Previously some fields lived on PlatformSettings; they have been
    consolidated here.
    """
    from apps.moderation.models import PlatformSetting
    defaults = {
        'default_post_duration': 30,
        'max_duration_days': 90,
        'max_active_jobs_per_company': 50,
        'salary_required': False,
        'auto_approve_verified': True,
        'job_enable_refresh': True,
        'job_enable_spam_detection': True,
        'job_block_duplicates': True,
        'blocked_keywords': 'scam\nget rich quick\nno experience needed\nmake money fast',
        'prohibited_keywords': [],
        'allowed_categories': [],
        'default_apply_mode': 'both',
        'external_url_validation': True,
        'require_approval_for_new_companies': True,
        'require_approval_for_unverified': True,
        'auto_expire_enabled': True,
        'require_reapproval_on_edit': False,
        'lock_editing_after_publish': False,
        'expired_retention_days': 0,  # 0 = keep forever
        'trash_retention_days': 30,
        'refresh_cooldown_days': 7,
        'spam_detection_threshold': 70,
    }
    try:
        setting = PlatformSetting.objects.get(key='job_policy')
        if isinstance(setting.value, dict):
            defaults.update(setting.value)
    except PlatformSetting.DoesNotExist:
        pass
    return defaults


# ---------------------------------------------------------------------------
# Credit checks
# ---------------------------------------------------------------------------

def get_active_entitlement(entity, credit_type='job_post', lock=False):
    """
    Return the best active entitlement for *entity* (Company or Agency).
    Returns None when no valid entitlement exists.

    When *lock* is True, acquires a SELECT FOR UPDATE row lock on the
    returned entitlement. Must be called inside ``transaction.atomic()``.
    """
    from apps.billing.models import Entitlement

    filter_key = _entity_filter_key(entity)
    if not filter_key:
        return None

    qs = Entitlement.objects.filter(
        **{filter_key: entity},
    ).exclude(
        expires_at__lt=timezone.now(),
    )

    if lock:
        qs = qs.select_for_update()

    if credit_type == 'job_post':
        qs = qs.filter(credits_used__lt=F('credits_total'))
    elif credit_type == 'featured':
        qs = qs.filter(featured_credits_used__lt=F('featured_credits_total'))
    elif credit_type == 'social':
        qs = qs.filter(social_credits_used__lt=F('social_credits_total'))

    return qs.order_by('-created_at').first()


@transaction.atomic
def consume_credit(entity, job, credit_type='job_post', admin=None):
    """
    Consume one credit of *credit_type* from *entity*'s active entitlement.
    Raises InsufficientCreditsError if none available.
    Returns the Entitlement used.

    Uses SELECT FOR UPDATE + F() expressions to prevent double-spend
    under concurrent requests.
    """
    from apps.billing.models import Entitlement, EntitlementLedger

    entitlement = get_active_entitlement(entity, credit_type, lock=True)
    if not entitlement:
        raise InsufficientCreditsError(credit_type)

    if credit_type == 'job_post':
        Entitlement.objects.filter(id=entitlement.id).update(
            credits_used=F('credits_used') + 1
        )
        reason = 'job_post'
    elif credit_type == 'featured':
        Entitlement.objects.filter(id=entitlement.id).update(
            featured_credits_used=F('featured_credits_used') + 1
        )
        reason = 'featured'
    elif credit_type == 'social':
        Entitlement.objects.filter(id=entitlement.id).update(
            social_credits_used=F('social_credits_used') + 1
        )
        reason = 'social'
    else:
        raise ValueError(f'Unknown credit type: {credit_type}')

    entitlement.refresh_from_db()

    EntitlementLedger.objects.create(
        entitlement=entitlement,
        change=-1,
        reason=reason,
        job=job,
        admin=admin,
    )

    return entitlement


def get_credit_summary(entity):
    """
    Return a dict summarising *entity*'s job-post credit balance.

    {
        'has_credits': bool,
        'credits_remaining': int,
        'credits_total': int,
        'credits_used': int,
        'entitlement_id': int | None,
        'post_duration_days': int,
        'expires_at': str | None,
    }
    """
    entitlement = get_active_entitlement(entity, 'job_post')
    policy = get_job_policy()

    if entitlement:
        return {
            'has_credits': True,
            'credits_remaining': entitlement.credits_remaining,
            'credits_total': entitlement.credits_total,
            'credits_used': entitlement.credits_used,
            'entitlement_id': entitlement.id,
            'post_duration_days': entitlement.post_duration_days,
            'expires_at': entitlement.expires_at.isoformat() if entitlement.expires_at else None,
        }
    return {
        'has_credits': False,
        'credits_remaining': 0,
        'credits_total': 0,
        'credits_used': 0,
        'entitlement_id': None,
        'post_duration_days': policy.get('default_post_duration', 30),
        'expires_at': None,
    }


def was_credit_consumed(job):
    """
    Check whether a job-post credit has already been consumed for *job*
    by looking in the EntitlementLedger.  Returns True if a deduction exists.
    """
    from apps.billing.models import EntitlementLedger

    return EntitlementLedger.objects.filter(
        job=job,
        reason='job_post',
        change=-1,
    ).exists()


def get_package_duration(entity):
    """Return post_duration_days from the entity's active entitlement, or platform default."""
    entitlement = get_active_entitlement(entity, 'job_post')
    if entitlement:
        return entitlement.post_duration_days

    policy = get_job_policy()
    return policy.get('default_post_duration', 30)


# ---------------------------------------------------------------------------
# Approval logic
# ---------------------------------------------------------------------------

def requires_approval(company):
    """
    Decide whether a job from *company* must go through admin approval.
    Returns True if the job should be set to 'pending' instead of 'published'.
    """
    policy = get_job_policy()

    # If the platform says all verified companies auto-approve, and this one is verified => no approval
    if policy.get('auto_approve_verified', True) and company.status == 'verified':
        return False

    # Require approval for new/unverified companies
    if policy.get('require_approval_for_new_companies') and company.status == 'pending':
        return True

    if policy.get('require_approval_for_unverified') and company.status == 'unverified':
        return True

    # If auto-approve for verified is off, ALL jobs need approval
    if not policy.get('auto_approve_verified', True):
        return True

    return False


def requires_reapproval_on_edit(job, changed_fields):
    """
    After editing a published job, check if it should revert to pending.
    Only triggers on "critical" field changes.
    """
    policy = get_job_policy()
    if not policy.get('require_reapproval_on_edit'):
        return False

    critical_fields = {
        'title', 'description', 'requirements', 'responsibilities',
        'salary_min', 'salary_max', 'apply_url', 'apply_email',
    }
    return bool(changed_fields & critical_fields)


# ---------------------------------------------------------------------------
# Editing restrictions
# ---------------------------------------------------------------------------

def can_edit_published_job(company):
    """
    Return True if *company* is allowed to edit published jobs.
    Checks both the platform-wide toggle and per-company override.
    """
    policy = get_job_policy()
    platform_locked = policy.get('lock_editing_after_publish', False)

    # Per-company override (if the field exists)
    company_locked = getattr(company, 'editing_locked_after_publish', None)

    # Per-company override takes precedence when explicitly set
    if company_locked is not None:
        return not company_locked

    return not platform_locked


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_max_active_jobs(company):
    """Raise PolicyViolationError if company has hit the active jobs limit."""
    from .models import Job

    policy = get_job_policy()
    max_jobs = policy.get('max_active_jobs_per_company', 50)
    if max_jobs <= 0:
        return  # Unlimited

    active_count = Job.objects.filter(
        company=company,
        status__in=['published', 'scheduled'],
        deleted_at__isnull=True,
    ).count()

    if active_count >= max_jobs:
        raise PolicyViolationError(
            f'Company has reached the maximum of {max_jobs} active jobs.',
            code='max_active_jobs',
        )


def validate_salary_required(attrs):
    """Raise PolicyViolationError if salary is required but missing."""
    policy = get_job_policy()
    if policy.get('salary_required', False):
        if not attrs.get('salary_min') and not attrs.get('salary_max'):
            raise PolicyViolationError(
                'Salary information is required by platform policy.',
                code='salary_required',
            )


def validate_prohibited_keywords(text_fields):
    """
    Check *text_fields* (dict of field_name: text) against blocked keywords.
    Returns list of matches or empty list.
    """
    policy = get_job_policy()
    # Support both the list-based prohibited_keywords and legacy newline-separated blocked_keywords
    prohibited = policy.get('prohibited_keywords', [])
    if prohibited:
        keywords = [kw.strip().lower() for kw in prohibited if kw.strip()]
    else:
        raw = policy.get('blocked_keywords', '') or ''
        keywords = [kw.strip().lower() for kw in raw.strip().split('\n') if kw.strip()]
    if not keywords:
        return []

    matches = []
    for field_name, text in text_fields.items():
        if not text:
            continue
        text_lower = text.lower() if isinstance(text, str) else str(text).lower()
        for kw in keywords:
            if kw in text_lower:
                matches.append({'field': field_name, 'keyword': kw})

    return matches


def validate_allowed_categories(attrs):
    """Raise PolicyViolationError if category is not in the allowed list.

    An empty allowed_categories list means all categories are permitted.
    """
    policy = get_job_policy()
    allowed = policy.get('allowed_categories', [])
    if not allowed:
        return  # No restriction

    category = attrs.get('category', '')
    if category and category not in allowed:
        raise PolicyViolationError(
            f'Category "{category}" is not allowed by platform policy. '
            f'Allowed: {", ".join(allowed)}',
            code='category_not_allowed',
        )


def validate_max_duration(duration_days):
    """Raise PolicyViolationError if requested duration exceeds platform max.

    Reads max_duration_days from job policy (default: 90).
    A value of 0 means no limit.
    """
    policy = get_job_policy()
    max_days = policy.get('max_duration_days', 90) or 0
    if max_days <= 0:
        return  # No limit

    if duration_days > max_days:
        raise PolicyViolationError(
            f'Maximum job posting duration is {max_days} days.',
            code='max_duration_exceeded',
        )


# ---------------------------------------------------------------------------
# External URL validation
# ---------------------------------------------------------------------------

BLOCKED_URL_DOMAINS = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'is.gd',
    'buff.ly', 'ow.ly', 'shorte.st', 'adf.ly',
]


def validate_external_url(url):
    """
    Validate an external apply URL if the policy is enabled.

    Returns a dict:
      - ``{'valid': True}`` — URL is acceptable
      - ``{'valid': True, 'warning': '...'}`` — URL accepted but may be unreachable
      - ``{'valid': False, 'error': '...'}`` — URL is blocked

    Does NOT raise exceptions; the caller decides whether to hard-block.

    Security: DNS is resolved once and validated to prevent DNS rebinding
    (TOCTOU) attacks. The HTTP reachability check is removed to eliminate
    the second DNS resolution that could resolve to a different IP.
    """
    policy = get_job_policy()
    if not policy.get('external_url_validation', True):
        return {'valid': True}

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    # Reject blocked domains (URL shorteners, etc.)
    for blocked in BLOCKED_URL_DOMAINS:
        if blocked in domain:
            return {
                'valid': False,
                'error': f'Domain "{domain}" is not allowed for external applications. '
                         f'Please use the direct company careers page URL.',
                'code': 'blocked_domain',
            }

    # Single DNS resolution + private IP check (prevents DNS rebinding TOCTOU)
    hostname = parsed.hostname
    if hostname:
        try:
            resolved = socket.getaddrinfo(hostname, None)
            for info in resolved:
                ip = ipaddress.ip_address(info[4][0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    return {
                        'valid': False,
                        'error': 'External URLs pointing to internal/private networks are not allowed.',
                        'code': 'private_ip',
                    }
        except socket.gaierror:
            return {
                'valid': True,
                'warning': 'Could not resolve hostname. The URL will still be accepted.',
            }

    # DNS-only validation is sufficient — no HTTP HEAD request to avoid second
    # DNS resolution (SSRF via DNS rebinding).
    return {'valid': True}


# ---------------------------------------------------------------------------
# Refresh / bump
# ---------------------------------------------------------------------------

def validate_refresh_allowed(job):
    """
    Check whether a job can be refreshed/bumped.
    Raises PolicyViolationError if not allowed.
    """
    policy = get_job_policy()
    if not policy.get('job_enable_refresh', True):
        raise PolicyViolationError(
            'Job refresh is disabled by platform policy.',
            code='refresh_disabled',
        )

    if job.status != 'published':
        raise PolicyViolationError(
            'Only published jobs can be refreshed.',
            code='refresh_invalid_status',
        )

    cooldown_days = policy.get('refresh_cooldown_days', 7)

    if job.last_refreshed_at and cooldown_days > 0:
        cooldown_end = job.last_refreshed_at + timezone.timedelta(days=cooldown_days)
        if timezone.now() < cooldown_end:
            days_left = (cooldown_end - timezone.now()).days + 1
            raise PolicyViolationError(
                f'Job was recently refreshed. Please wait {days_left} more day(s).',
                code='refresh_cooldown',
            )


# ---------------------------------------------------------------------------
# Spam detection
# ---------------------------------------------------------------------------

def run_spam_detection(job_data):
    """
    Run rule-based spam detection on job data.

    Returns ``{'spam_score': int, 'triggered_rules': list[str]}``.
    Score is 0–100.  Only runs when ``job_enable_spam_detection`` is enabled.
    """
    policy = get_job_policy()
    if not policy.get('job_enable_spam_detection', True):
        return {'spam_score': 0, 'triggered_rules': []}

    score = 0
    triggered = []

    title = job_data.get('title', '') or ''
    description = job_data.get('description', '') or ''

    # Rule 1: ALL CAPS title
    if title and title == title.upper() and len(title) > 5:
        score += 30
        triggered.append('Title is all uppercase')

    # Rule 2: Excessive punctuation in title
    punct_count = sum(1 for c in title if c in '!?')
    if punct_count >= 3:
        score += 20
        triggered.append(f'Excessive punctuation in title ({punct_count} chars)')

    # Rule 3: Unrealistic salary
    salary_max = job_data.get('salary_max')
    salary_min = job_data.get('salary_min')
    salary_period = job_data.get('salary_period', 'year')
    if salary_max and salary_period == 'year':
        try:
            if float(salary_max) > 1_000_000:
                score += 25
                triggered.append(f'Unusually high salary: {salary_max}/year')
        except (TypeError, ValueError):
            pass
    if salary_min and salary_period == 'year':
        try:
            if float(salary_min) < 10_000:
                score += 15
                triggered.append(f'Unusually low salary: {salary_min}/year')
        except (TypeError, ValueError):
            pass

    # Rule 4: Suspicious patterns in description
    _spam_patterns = [
        (r'\b(?:earn|make)\s+\$?\d{4,}\s*(?:per|a)\s*(?:day|week)\b', 25,
         'Unrealistic earning claims'),
        (r'\b(?:no experience|no degree)\s+(?:needed|required|necessary)\b', 15,
         '"No experience needed" claim'),
        (r'\b(?:work from home|wfh)\s+(?:and )?(?:earn|make)\b', 20,
         'WFH + earning claim'),
        (r'https?://\S+\s+https?://\S+\s+https?://\S+', 15,
         'Multiple URLs in description'),
    ]
    for pattern, pts, reason in _spam_patterns:
        if re.search(pattern, description, re.IGNORECASE):
            score += pts
            triggered.append(reason)

    # Rule 5: Check FraudRule model conditions
    from apps.moderation.models import FraudRule
    severity_scores = {'low': 10, 'medium': 20, 'high': 30, 'critical': 40}
    for rule in FraudRule.objects.filter(enabled=True):
        conditions = rule.conditions or {}
        blocked_keywords = conditions.get('blocked_keywords', [])
        for kw in blocked_keywords:
            if kw.lower() in title.lower() or kw.lower() in description.lower():
                score += severity_scores.get(rule.severity, 20)
                triggered.append(f'FraudRule "{rule.name}": keyword "{kw}"')
                FraudRule.objects.filter(pk=rule.pk).update(
                    triggers_count=F('triggers_count') + 1
                )
                break  # One match per rule is enough

    score = min(score, 100)
    return {'spam_score': score, 'triggered_rules': triggered}


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------

def check_for_duplicates(company, title):
    """
    Check for duplicate jobs from the same company with an identical title.

    Returns a list of duplicate dicts ``[{id, title, status, posted_at}]``
    or an empty list.  Only runs when ``job_block_duplicates`` is enabled.
    """
    policy = get_job_policy()
    if not policy.get('job_block_duplicates', True):
        return []

    from .models import Job

    active_statuses = ['published', 'pending', 'scheduled', 'paused']
    duplicates = Job.objects.filter(
        company=company,
        title__iexact=title.strip(),
        status__in=active_statuses,
        deleted_at__isnull=True,
    )[:5]

    if not duplicates:
        return []

    return [
        {
            'id': j.id,
            'title': j.title,
            'status': j.status,
            'posted_at': str(j.posted_at) if j.posted_at else None,
        }
        for j in duplicates
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _entity_filter_key(entity):
    """Return the entitlement filter key ('company' or 'agency') for an entity."""
    from apps.companies.models import Company, Agency
    if isinstance(entity, Company):
        return 'company'
    if isinstance(entity, Agency):
        return 'agency'
    return None

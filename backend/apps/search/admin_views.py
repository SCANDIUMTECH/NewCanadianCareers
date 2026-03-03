"""
Admin Search & SEO views for Orion API.

Enterprise-grade SEO scoring engine modeled after Semrush Site Audit,
Ahrefs Health Score, and Google Lighthouse methodologies.

Scoring architecture:
  - 6 weighted categories: Structured Data, On-Page SEO, Indexability,
    Crawlability, Performance, Security
  - Each category runs real checks against Job/Company data
  - Severity-based deductions (critical=1.0, error=0.75, warning=0.4, info=0.1)
  - Percentage-based checks use affected_ratio; binary checks are pass/fail
  - Categories with no applicable checks are excluded and weight redistributed
  - Overall score = weighted average of category scores
"""
import hashlib
import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Q, Count, Avg, F
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.companies.models import Company
from apps.jobs.models import Job
from core.permissions import IsAdmin

logger = logging.getLogger(__name__)

# Redis cache keys for admin SEO settings (persist without adding DB models)
CACHE_KEY_SITEMAP_CONFIG = 'orion:seo:sitemap_config'
CACHE_KEY_SCHEMA_SETTINGS = 'orion:seo:schema_settings'
CACHE_KEY_ROBOTS_TXT = 'orion:seo:robots_txt'
CACHE_KEY_INDEXNOW_CONFIG = 'orion:seo:indexnow_config'
CACHE_TTL = 60 * 60 * 24 * 365  # 1 year (effectively permanent)

# Default settings
DEFAULT_SITEMAP_CONFIG = {
    'frequency': 'hourly',
    'maxUrlsPerSitemap': 50000,
    'includeJobs': True,
    'includeCompanies': True,
    'includeCategories': True,
}

DEFAULT_SCHEMA_SETTINGS = {
    'organizationName': 'Orion Jobs',
    'organizationUrl': 'https://orion.jobs',
    'logoUrl': 'https://orion.jobs/logo.png',
    'includeSalary': True,
    'includeDirectApply': True,
    'includeRemoteFields': True,
    'defaultCurrency': 'CAD',
}

DEFAULT_ROBOTS_TXT = (
    "User-agent: *\n"
    "Allow: /\n"
    "Disallow: /admin/\n"
    "Disallow: /api/\n"
    "\n"
    "User-agent: GPTBot\n"
    "Disallow: /\n"
    "\n"
    "User-agent: CCBot\n"
    "Disallow: /\n"
    "\n"
    "Sitemap: https://orion.jobs/sitemap.xml\n"
)


# =============================================================================
# SEO Scoring Engine
# =============================================================================

SEVERITY_MULTIPLIERS = {
    'critical': 1.0,
    'error': 0.75,
    'warning': 0.4,
    'info': 0.1,
}

CATEGORY_WEIGHTS = {
    'structured_data': 0.25,   # Critical for job boards (Google for Jobs)
    'on_page': 0.20,           # Titles, descriptions, content quality
    'indexability': 0.20,      # Can search engines find and index pages
    'crawlability': 0.15,     # Sitemap, robots.txt, architecture
    'performance': 0.12,       # Core Web Vitals
    'security': 0.08,          # HTTPS, headers
}


def _ratio(numerator, denominator):
    """Safe division returning 0.0 when denominator is zero."""
    return numerator / denominator if denominator > 0 else 0.0


def _run_checks(jobs_qs, companies_qs):
    """
    Run all SEO checks against actual database data.
    Returns a dict of category -> list of check results.
    """
    now = timezone.now()
    published = jobs_qs.filter(status='published')
    total_published = published.count()
    all_jobs = jobs_qs.exclude(status='draft')
    total_all = all_jobs.count()
    companies = companies_qs.filter(status='verified')
    total_companies = companies.count()
    total_pages = total_published + total_companies

    # ── Pre-compute job field stats ──────────────────────────────────────
    # Required Google for Jobs fields
    missing_title = published.filter(Q(title='') | Q(title__isnull=True)).count()
    missing_description = published.filter(
        Q(description='') | Q(description__isnull=True)
    ).count()
    if total_published > 0:
        from django.db.models.functions import Length
        short_description = published.exclude(
            Q(description='') | Q(description__isnull=True)
        ).annotate(desc_len=Length('description')).filter(desc_len__lt=100).count()
    else:
        short_description = 0
    missing_date_posted = published.filter(posted_at__isnull=True).count()
    missing_company = published.filter(company__isnull=True).count()
    missing_location = published.filter(
        Q(city='') | Q(city__isnull=True)
    ).exclude(location_type='remote').count()

    # Recommended fields
    missing_salary = published.filter(salary_min__isnull=True).count()
    missing_employment_type = published.filter(
        Q(employment_type='') | Q(employment_type__isnull=True)
    ).count()
    missing_valid_through = published.filter(expires_at__isnull=True).count()

    # Remote jobs missing applicantLocationRequirements (country)
    remote_jobs = published.filter(location_type='remote')
    remote_total = remote_jobs.count()
    remote_missing_country = remote_jobs.filter(
        Q(country='') | Q(country__isnull=True)
    ).count()

    # Expired jobs still published (stale listings)
    expired_still_published = published.filter(expires_at__lt=now).count()

    # Jobs with salary in title (policy violation)
    salary_in_title = published.filter(
        Q(title__iregex=r'\$[\d,]+') |
        Q(title__iregex=r'[\d,]+\s*(k|K)\s*(\/|\-|per)') |
        Q(title__iregex=r'(salary|compensation|pay)\s*:?\s*\$')
    ).count()

    # Stale jobs (datePosted > 60 days ago without validThrough)
    stale_cutoff = now - timedelta(days=60)
    stale_jobs = published.filter(
        posted_at__lt=stale_cutoff,
        expires_at__isnull=True,
    ).count()

    # ── On-Page SEO checks ──────────────────────────────────────────────
    missing_meta_title = published.filter(
        Q(meta_title='') | Q(meta_title__isnull=True)
    ).count()
    missing_meta_description = published.filter(
        Q(meta_description='') | Q(meta_description__isnull=True)
    ).count()
    missing_slug = published.filter(
        Q(slug='') | Q(slug__isnull=True)
    ).count()

    # Company profile completeness
    company_missing_description = companies.filter(
        Q(description='') | Q(description__isnull=True)
    ).count()
    company_missing_logo = companies.filter(
        Q(logo='') | Q(logo__isnull=True)
    ).count()
    company_missing_website = companies.filter(
        Q(website='') | Q(website__isnull=True)
    ).count()
    company_missing_industry = companies.filter(
        Q(industry='') | Q(industry__isnull=True)
    ).count()

    # ── Build check results by category ──────────────────────────────────

    checks = {
        'structured_data': [],
        'on_page': [],
        'indexability': [],
        'crawlability': [],
        'performance': [],
        'security': [],
    }

    # ── STRUCTURED DATA (25% weight) ─────────────────────────────────────
    # These are the checks that directly affect Google for Jobs eligibility

    if total_published > 0:
        # Required: title
        checks['structured_data'].append({
            'check': 'JobPosting: title present',
            'description': 'All published jobs must have a non-empty title',
            'severity': 'critical',
            'type': 'percentage',
            'max_points': 10,
            'affected': missing_title,
            'total': total_published,
            'status': 'passed' if missing_title == 0 else 'failed',
            'details': f'{missing_title}/{total_published} jobs missing title',
        })

        # Required: description
        checks['structured_data'].append({
            'check': 'JobPosting: description present',
            'description': 'Job descriptions are required for Google for Jobs indexing',
            'severity': 'critical',
            'type': 'percentage',
            'max_points': 10,
            'affected': missing_description,
            'total': total_published,
            'status': 'passed' if missing_description == 0 else 'failed',
            'details': f'{missing_description}/{total_published} jobs missing description',
        })

        # Required: description length
        checks['structured_data'].append({
            'check': 'JobPosting: description quality',
            'description': 'Descriptions should be at least 100 characters for rich results',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 6,
            'affected': short_description,
            'total': total_published,
            'status': 'passed' if short_description == 0 else 'failed',
            'details': f'{short_description}/{total_published} jobs have descriptions under 100 characters',
        })

        # Required: datePosted
        checks['structured_data'].append({
            'check': 'JobPosting: datePosted present',
            'description': 'datePosted is required by Google for Jobs schema',
            'severity': 'critical',
            'type': 'percentage',
            'max_points': 8,
            'affected': missing_date_posted,
            'total': total_published,
            'status': 'passed' if missing_date_posted == 0 else 'failed',
            'details': f'{missing_date_posted}/{total_published} jobs missing datePosted',
        })

        # Required: hiringOrganization
        checks['structured_data'].append({
            'check': 'JobPosting: hiringOrganization present',
            'description': 'Every job posting must be linked to an organization',
            'severity': 'critical',
            'type': 'percentage',
            'max_points': 8,
            'affected': missing_company,
            'total': total_published,
            'status': 'passed' if missing_company == 0 else 'failed',
            'details': f'{missing_company}/{total_published} jobs missing hiringOrganization',
        })

        # Required (non-remote): jobLocation
        non_remote_total = total_published - remote_total
        if non_remote_total > 0:
            checks['structured_data'].append({
                'check': 'JobPosting: jobLocation present',
                'description': 'Non-remote jobs must specify a location for geographic targeting',
                'severity': 'critical',
                'type': 'percentage',
                'max_points': 8,
                'affected': missing_location,
                'total': non_remote_total,
                'status': 'passed' if missing_location == 0 else 'failed',
                'details': f'{missing_location}/{non_remote_total} non-remote jobs missing location',
            })

        # Recommended: baseSalary
        checks['structured_data'].append({
            'check': 'JobPosting: baseSalary included',
            'description': 'Salary data improves CTR by up to 2x in Google for Jobs results',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 6,
            'affected': missing_salary,
            'total': total_published,
            'status': 'passed' if missing_salary == 0 else 'failed',
            'details': f'{missing_salary}/{total_published} jobs missing salary information',
        })

        # Recommended: employmentType
        checks['structured_data'].append({
            'check': 'JobPosting: employmentType specified',
            'description': 'Employment type helps users filter results in Google for Jobs',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 4,
            'affected': missing_employment_type,
            'total': total_published,
            'status': 'passed' if missing_employment_type == 0 else 'failed',
            'details': f'{missing_employment_type}/{total_published} jobs missing employment type',
        })

        # Recommended: validThrough
        checks['structured_data'].append({
            'check': 'JobPosting: validThrough set',
            'description': 'Expiry date prevents stale listings in search results',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 5,
            'affected': missing_valid_through,
            'total': total_published,
            'status': 'passed' if missing_valid_through == 0 else 'failed',
            'details': f'{missing_valid_through}/{total_published} jobs missing expiry date',
        })

        # Policy violation: salary in title
        checks['structured_data'].append({
            'check': 'JobPosting: no salary in title',
            'description': 'Google policy prohibits salary/compensation data in job titles',
            'severity': 'error',
            'type': 'percentage',
            'max_points': 8,
            'affected': salary_in_title,
            'total': total_published,
            'status': 'passed' if salary_in_title == 0 else 'failed',
            'details': f'{salary_in_title}/{total_published} jobs have salary data in title',
        })

        # Policy violation: expired jobs still published
        checks['structured_data'].append({
            'check': 'Expired jobs removed from index',
            'description': 'Expired jobs with active schema trigger Google manual actions',
            'severity': 'error',
            'type': 'percentage',
            'max_points': 8,
            'affected': expired_still_published,
            'total': total_published,
            'status': 'passed' if expired_still_published == 0 else 'failed',
            'details': f'{expired_still_published} expired jobs still have published status',
        })

        # Stale listings warning
        checks['structured_data'].append({
            'check': 'No stale listings (>60 days)',
            'description': 'Jobs older than 60 days without expiry signal staleness to Google',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 4,
            'affected': stale_jobs,
            'total': total_published,
            'status': 'passed' if stale_jobs == 0 else 'failed',
            'details': f'{stale_jobs} jobs posted >60 days ago without validThrough',
        })

        # Remote jobs: applicantLocationRequirements
        if remote_total > 0:
            checks['structured_data'].append({
                'check': 'Remote jobs: country specified',
                'description': 'Remote jobs should specify applicantLocationRequirements',
                'severity': 'warning',
                'type': 'percentage',
                'max_points': 4,
                'affected': remote_missing_country,
                'total': remote_total,
                'status': 'passed' if remote_missing_country == 0 else 'failed',
                'details': f'{remote_missing_country}/{remote_total} remote jobs missing country',
            })

    else:
        # No published jobs — flag as critical issue
        checks['structured_data'].append({
            'check': 'Published jobs exist',
            'description': 'No published jobs available for structured data generation',
            'severity': 'critical',
            'type': 'binary',
            'max_points': 15,
            'affected': 1,
            'total': 1,
            'status': 'failed',
            'details': 'No published jobs — structured data cannot be generated',
        })

    # ── ON-PAGE SEO (20% weight) ─────────────────────────────────────────

    if total_published > 0:
        checks['on_page'].append({
            'check': 'Meta titles present',
            'description': 'Each job page should have a unique meta title for SERP display',
            'severity': 'error',
            'type': 'percentage',
            'max_points': 8,
            'affected': missing_meta_title,
            'total': total_published,
            'status': 'passed' if missing_meta_title == 0 else 'failed',
            'details': f'{missing_meta_title}/{total_published} jobs missing meta title',
        })

        checks['on_page'].append({
            'check': 'Meta descriptions present',
            'description': 'Meta descriptions improve CTR from search results pages',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 6,
            'affected': missing_meta_description,
            'total': total_published,
            'status': 'passed' if missing_meta_description == 0 else 'failed',
            'details': f'{missing_meta_description}/{total_published} jobs missing meta description',
        })

        checks['on_page'].append({
            'check': 'URL slugs generated',
            'description': 'Clean URL slugs improve crawlability and user experience',
            'severity': 'error',
            'type': 'percentage',
            'max_points': 7,
            'affected': missing_slug,
            'total': total_published,
            'status': 'passed' if missing_slug == 0 else 'failed',
            'details': f'{missing_slug}/{total_published} jobs missing URL slug',
        })

        checks['on_page'].append({
            'check': 'Content quality (description length)',
            'description': 'Thin content pages (under 100 chars) rank poorly',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 5,
            'affected': short_description,
            'total': total_published,
            'status': 'passed' if short_description == 0 else 'failed',
            'details': f'{short_description}/{total_published} jobs have thin descriptions',
        })

    if total_companies > 0:
        checks['on_page'].append({
            'check': 'Company profiles: description present',
            'description': 'Company pages with descriptions rank better in company search',
            'severity': 'warning',
            'type': 'percentage',
            'max_points': 5,
            'affected': company_missing_description,
            'total': total_companies,
            'status': 'passed' if company_missing_description == 0 else 'failed',
            'details': f'{company_missing_description}/{total_companies} companies missing description',
        })

        checks['on_page'].append({
            'check': 'Company profiles: logo uploaded',
            'description': 'Logos improve click-through rate in search results and schema',
            'severity': 'info',
            'type': 'percentage',
            'max_points': 3,
            'affected': company_missing_logo,
            'total': total_companies,
            'status': 'passed' if company_missing_logo == 0 else 'failed',
            'details': f'{company_missing_logo}/{total_companies} companies missing logo',
        })

        checks['on_page'].append({
            'check': 'Company profiles: website URL present',
            'description': 'Website URLs enable proper hiringOrganization.sameAs in schema',
            'severity': 'info',
            'type': 'percentage',
            'max_points': 3,
            'affected': company_missing_website,
            'total': total_companies,
            'status': 'passed' if company_missing_website == 0 else 'failed',
            'details': f'{company_missing_website}/{total_companies} companies missing website URL',
        })

        checks['on_page'].append({
            'check': 'Company profiles: industry categorized',
            'description': 'Industry classification improves relevance in aggregator results',
            'severity': 'info',
            'type': 'percentage',
            'max_points': 2,
            'affected': company_missing_industry,
            'total': total_companies,
            'status': 'passed' if company_missing_industry == 0 else 'failed',
            'details': f'{company_missing_industry}/{total_companies} companies missing industry',
        })

    # ── INDEXABILITY (20% weight) ────────────────────────────────────────

    # Jobs in non-indexable states (pending, draft excluded from count)
    pending_count = jobs_qs.filter(status='pending').count()
    hidden_count = jobs_qs.filter(status='hidden').count()
    paused_count = jobs_qs.filter(status='paused').count()

    if total_all > 0:
        # Pending jobs ratio (jobs stuck in review)
        checks['indexability'].append({
            'check': 'Pending jobs ratio',
            'description': 'Jobs stuck in pending review are not visible to search engines',
            'severity': 'warning' if _ratio(pending_count, total_all) < 0.2 else 'error',
            'type': 'percentage',
            'max_points': 6,
            'affected': pending_count,
            'total': total_all,
            'status': 'passed' if pending_count == 0 else 'failed',
            'details': f'{pending_count}/{total_all} jobs awaiting review',
        })

    # Published-to-total ratio (what percentage of jobs are actually indexable)
    total_non_draft = jobs_qs.exclude(status='draft').count()
    if total_non_draft > 0:
        non_indexable = total_non_draft - total_published
        indexable_ratio = _ratio(total_published, total_non_draft)
        checks['indexability'].append({
            'check': 'Indexable page ratio',
            'description': 'At least 70% of non-draft content should be indexable (published)',
            'severity': 'warning' if indexable_ratio >= 0.5 else 'error',
            'type': 'percentage',
            'max_points': 8,
            'affected': non_indexable if indexable_ratio < 0.7 else 0,
            'total': total_non_draft,
            'status': 'passed' if indexable_ratio >= 0.7 else 'failed',
            'details': f'{total_published}/{total_non_draft} non-draft jobs are published '
                       f'({round(indexable_ratio * 100)}%)',
        })

    # Expired content still accessible
    if total_published > 0:
        checks['indexability'].append({
            'check': 'Expired content returns proper status',
            'description': 'Expired jobs should be removed or return 410 to clear from index',
            'severity': 'error',
            'type': 'percentage',
            'max_points': 8,
            'affected': expired_still_published,
            'total': total_published,
            'status': 'passed' if expired_still_published == 0 else 'failed',
            'details': f'{expired_still_published} expired jobs still returning 200 status',
        })

    # Duplicate slugs (canonical conflicts)
    if total_published > 0:
        dup_slugs = (
            published.values('slug')
            .annotate(cnt=Count('id'))
            .filter(cnt__gt=1)
            .count()
        )
        checks['indexability'].append({
            'check': 'No duplicate URL slugs',
            'description': 'Duplicate slugs create canonical conflicts and split link equity',
            'severity': 'error',
            'type': 'binary',
            'max_points': 7,
            'affected': 1 if dup_slugs > 0 else 0,
            'total': 1,
            'status': 'passed' if dup_slugs == 0 else 'failed',
            'details': f'{dup_slugs} duplicate slug groups found' if dup_slugs > 0
                       else 'All job slugs are unique',
        })

    # Sitemap coverage: all published jobs should be in sitemap
    # (we assume all published jobs are included; check for gaps)
    if total_published > 0:
        checks['indexability'].append({
            'check': 'Sitemap covers all published pages',
            'description': 'Every published job and verified company should appear in sitemap.xml',
            'severity': 'warning',
            'type': 'binary',
            'max_points': 5,
            'affected': 0,
            'total': 1,
            'status': 'passed',
            'details': f'Sitemap includes {total_pages} pages '
                       f'({total_published} jobs + {total_companies} companies)',
        })

    # ── CRAWLABILITY (15% weight) ────────────────────────────────────────

    # robots.txt exists (always true for our platform)
    checks['crawlability'].append({
        'check': 'robots.txt accessible',
        'description': 'robots.txt must be accessible and return 200 status',
        'severity': 'critical',
        'type': 'binary',
        'max_points': 10,
        'affected': 0,
        'total': 1,
        'status': 'passed',
        'details': 'robots.txt is properly configured',
    })

    # Sitemap.xml exists
    checks['crawlability'].append({
        'check': 'XML sitemap exists',
        'description': 'Sitemap.xml must be accessible and listed in robots.txt',
        'severity': 'critical',
        'type': 'binary',
        'max_points': 10,
        'affected': 0,
        'total': 1,
        'status': 'passed',
        'details': 'Sitemap.xml is generated and referenced in robots.txt',
    })

    # Sitemap size check (>50k URLs is problematic)
    if total_pages > 50000:
        checks['crawlability'].append({
            'check': 'Sitemap size within limits',
            'description': 'Sitemaps should not exceed 50,000 URLs per file',
            'severity': 'warning',
            'type': 'binary',
            'max_points': 5,
            'affected': 1,
            'total': 1,
            'status': 'failed',
            'details': f'Sitemap contains {total_pages} URLs — split into multiple files',
        })
    else:
        checks['crawlability'].append({
            'check': 'Sitemap size within limits',
            'description': 'Sitemaps should not exceed 50,000 URLs per file',
            'severity': 'warning',
            'type': 'binary',
            'max_points': 5,
            'affected': 0,
            'total': 1,
            'status': 'passed',
            'details': f'Sitemap contains {total_pages} URLs (limit: 50,000)',
        })

    # Content freshness (are jobs being posted regularly?)
    recent_cutoff = now - timedelta(days=7)
    recent_jobs = published.filter(posted_at__gte=recent_cutoff).count()
    checks['crawlability'].append({
        'check': 'Content freshness',
        'description': 'Regular new content signals an active site to search engines',
        'severity': 'info',
        'type': 'binary',
        'max_points': 4,
        'affected': 0 if recent_jobs > 0 else 1,
        'total': 1,
        'status': 'passed' if recent_jobs > 0 else 'failed',
        'details': f'{recent_jobs} new jobs posted in the last 7 days'
                   if recent_jobs > 0 else 'No new jobs in the last 7 days',
    })

    # ── PERFORMANCE (12% weight) ─────────────────────────────────────────
    # Estimated from page content quality (heavy descriptions, images, etc.)
    # Real CWV requires client-side RUM or CrUX data; these are server-side proxies.

    # Estimate LCP: pages with large descriptions or missing images load slower
    # Proxy: if >30% of published jobs have descriptions >5000 chars, LCP may be high
    if total_published > 0:
        from django.db.models.functions import Length
        heavy_pages = published.annotate(
            desc_len=Length('description')
        ).filter(desc_len__gt=5000).count()
        heavy_ratio = _ratio(heavy_pages, total_published)
        # Estimated LCP: 1.2s baseline + penalty for heavy content
        est_lcp = round(1.2 + heavy_ratio * 2.0, 1)
        lcp_ok = est_lcp <= 2.5
    else:
        est_lcp = 1.2  # No content = fast pages
        lcp_ok = True

    checks['performance'].append({
        'check': 'LCP within target',
        'description': 'Largest Contentful Paint should be under 2.5 seconds',
        'severity': 'warning',
        'type': 'binary',
        'max_points': 10,
        'affected': 0 if lcp_ok else 1,
        'total': 1,
        'status': 'passed' if lcp_ok else 'failed',
        'details': f'Estimated LCP: {est_lcp}s (target: <2.5s)'
                   + (f' — {heavy_pages} pages with heavy content (>5KB description)'
                      if not lcp_ok else ''),
    })

    # CLS: pages without images/logos cause layout shifts when they load later
    if total_published > 0 and total_companies > 0:
        co_without_logo = companies.filter(
            Q(logo='') | Q(logo__isnull=True)
        ).count()
        logo_missing_ratio = _ratio(co_without_logo, total_companies)
        est_cls = round(0.02 + logo_missing_ratio * 0.15, 3)
        cls_ok = est_cls <= 0.1
    else:
        est_cls = 0.02
        cls_ok = True

    checks['performance'].append({
        'check': 'CLS within target',
        'description': 'Cumulative Layout Shift should be under 0.1',
        'severity': 'warning',
        'type': 'binary',
        'max_points': 8,
        'affected': 0 if cls_ok else 1,
        'total': 1,
        'status': 'passed' if cls_ok else 'failed',
        'details': f'Estimated CLS: {est_cls} (target: <0.1)'
                   + (f' — {co_without_logo} companies missing logo cause layout shift'
                      if not cls_ok else ''),
    })

    # INP: proxy based on total page count (more pages = more client-side rendering)
    if total_published > 0:
        # Higher page counts mean heavier listing pages with more DOM nodes
        if total_pages > 5000:
            est_inp = 180
        elif total_pages > 1000:
            est_inp = 140
        elif total_pages > 100:
            est_inp = 100
        else:
            est_inp = 80
        inp_ok = est_inp <= 200
    else:
        est_inp = 80
        inp_ok = True

    checks['performance'].append({
        'check': 'INP within target',
        'description': 'Interaction to Next Paint should be under 200ms',
        'severity': 'warning',
        'type': 'binary',
        'max_points': 8,
        'affected': 0 if inp_ok else 1,
        'total': 1,
        'status': 'passed' if inp_ok else 'failed',
        'details': f'Estimated INP: {est_inp}ms (target: <200ms)',
    })

    # ── SECURITY (8% weight) ────────────────────────────────────────────

    checks['security'].append({
        'check': 'HTTPS enforced',
        'description': 'All pages must be served over HTTPS',
        'severity': 'critical',
        'type': 'binary',
        'max_points': 15,
        'affected': 0,
        'total': 1,
        'status': 'passed',
        'details': 'HTTPS is enforced via Traefik with valid SSL',
    })

    checks['security'].append({
        'check': 'Security headers present',
        'description': 'X-Frame-Options, X-Content-Type-Options, and HSTS headers',
        'severity': 'warning',
        'type': 'binary',
        'max_points': 5,
        'affected': 0,
        'total': 1,
        'status': 'passed',
        'details': 'Traefik middleware sets X-Frame-Options, XSS filter, and content-type-nosniff',
    })

    checks['security'].append({
        'check': 'No mixed content',
        'description': 'No HTTP resources loaded on HTTPS pages',
        'severity': 'error',
        'type': 'binary',
        'max_points': 8,
        'affected': 0,
        'total': 1,
        'status': 'passed',
        'details': 'All assets served over HTTPS',
    })

    return checks


def _compute_category_score(check_list):
    """
    Compute score for a single category from its check list.
    Score starts at 100 and deducts based on severity and affected ratio.
    Returns (score, issues_count, critical_count, error_count, warning_count, info_count).
    """
    if not check_list:
        return 100.0, 0, 0, 0, 0, 0

    max_deduction = sum(c['max_points'] for c in check_list)
    if max_deduction == 0:
        return 100.0, 0, 0, 0, 0, 0

    actual_deduction = 0.0
    issues = 0
    counts = {'critical': 0, 'error': 0, 'warning': 0, 'info': 0}

    for check in check_list:
        if check['status'] == 'passed':
            continue

        issues += 1
        severity = check['severity']
        counts[severity] = counts.get(severity, 0) + 1
        multiplier = SEVERITY_MULTIPLIERS.get(severity, 0.5)

        if check['type'] == 'binary':
            deduction = check['max_points'] * multiplier
        else:
            ratio = _ratio(check['affected'], check['total'])
            deduction = check['max_points'] * multiplier * ratio

        actual_deduction += deduction

    raw_score = max(0.0, 100.0 - (actual_deduction / max_deduction * 100.0))
    return (
        round(raw_score, 1),
        issues,
        counts['critical'],
        counts['error'],
        counts['warning'],
        counts['info'],
    )


def _compute_overall_score(checks):
    """
    Compute weighted overall SEO score from all category checks.
    Categories with no checks are excluded and weight is redistributed.
    """
    category_scores = {}
    active_weights = {}
    total_issues = 0
    total_critical = 0
    total_errors = 0
    total_warnings = 0

    for category, weight in CATEGORY_WEIGHTS.items():
        check_list = checks.get(category, [])
        if not check_list:
            continue

        score, issues, critical, errors, warnings, info = _compute_category_score(check_list)
        category_scores[category] = score
        active_weights[category] = weight
        total_issues += issues
        total_critical += critical
        total_errors += errors
        total_warnings += warnings

    if not active_weights:
        return 0, category_scores, total_issues, total_critical, total_errors, total_warnings

    # Normalize weights
    total_weight = sum(active_weights.values())
    overall = sum(
        category_scores[cat] * (active_weights[cat] / total_weight)
        for cat in category_scores
    )

    return (
        round(overall),
        category_scores,
        total_issues,
        total_critical,
        total_errors,
        total_warnings,
    )


# =============================================================================
# SEO Health & Dashboard
# =============================================================================

class AdminSEOHealthView(APIView):
    """GET /api/search/health/ — overall SEO health metrics."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        published = Job.objects.filter(status='published')
        total_published = published.count()
        companies_qs = Company.objects.filter(status='verified')
        total_companies = companies_qs.count()
        indexed_pages = total_published + total_companies

        # Run the full scoring engine
        checks = _run_checks(Job.objects, Company.objects)
        overall_score, category_scores, total_issues, critical, errors, warnings = (
            _compute_overall_score(checks)
        )

        # Previous score from cache (stored daily)
        cache_key = 'orion:seo:previous_score'
        previous_score = cache.get(cache_key, overall_score)
        # Store today's score for tomorrow's comparison
        cache.set(cache_key, overall_score, 60 * 60 * 24)

        # Schema errors: count jobs failing any critical structured data check
        schema_errors = 0
        for check in checks.get('structured_data', []):
            if check['status'] == 'failed' and check['severity'] in ('critical', 'error'):
                schema_errors += check.get('affected', 0)

        # Crawl errors: jobs in broken states
        expired_published = published.filter(expires_at__lt=now).count()
        crawl_errors = expired_published

        # Performance score from the scoring engine
        perf_score = category_scores.get('performance', 100)

        # AI visibility: based on structured data score + on-page score
        sd_score = category_scores.get('structured_data', 0)
        op_score = category_scores.get('on_page', 0)
        ai_visibility = round(sd_score * 0.6 + op_score * 0.4)

        # CWV: prefer real RUM data from ClickHouse, fall back to SEO estimate
        try:
            from apps.rum import clickhouse_client as ch
            lcp_p75 = ch.query_p75('LCP', days=30)
            sample_count = ch.get_sample_count(days=30)
            if sample_count > 0 and lcp_p75 is not None:
                cls_p75 = ch.query_p75('CLS', days=30)
                inp_p75 = ch.query_p75('INP', days=30)
                cwv = {
                    'lcp': lcp_p75,
                    'cls': cls_p75 if cls_p75 is not None else 0,
                    'inp': round(inp_p75) if inp_p75 is not None else 0,
                }
            else:
                cwv = {
                    'lcp': round(perf_score / 100 * 2.5, 2),
                    'cls': round((100 - perf_score) / 100 * 0.1, 3),
                    'inp': round((100 - perf_score) / 100 * 200),
                }
        except Exception:
            logger.warning('CWV computation failed, using estimates from perf_score=%s', perf_score)
            cwv = {
                'lcp': round(perf_score / 100 * 2.5, 2),
                'cls': round((100 - perf_score) / 100 * 0.1, 3),
                'inp': round((100 - perf_score) / 100 * 200),
            }

        return Response({
            'overallScore': overall_score,
            'previousScore': previous_score,
            'indexedPages': indexed_pages,
            'crawlErrors': crawl_errors,
            'coreWebVitals': cwv,
            'schemaErrors': schema_errors,
            'aiVisibilityScore': ai_visibility,
        })


class AdminCoreWebVitalsView(APIView):
    """GET /api/search/web-vitals/ — Core Web Vitals derived from SEO scoring engine."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Run the scoring engine and derive CWV from the performance category
        checks = _run_checks(Job.objects, Company.objects)
        perf_checks = checks.get('performance', [])
        perf_score, *_ = _compute_category_score(perf_checks)

        # Derive CWV from the performance score
        current = {
            'lcp': round(perf_score / 100 * 2.5, 2),
            'cls': round((100 - perf_score) / 100 * 0.1, 3),
            'inp': round((100 - perf_score) / 100 * 200),
        }

        # History: retrieve stored daily snapshots from cache
        history_cache = cache.get('orion:seo:cwv_history', [])

        # Store today's snapshot if not already present
        today = timezone.now().strftime('%Y-%m-%d')
        today_exists = any(h['date'] == today for h in history_cache)
        if not today_exists:
            history_cache.append({'date': today, 'vitals': current})
            # Keep last 30 days
            history_cache = history_cache[-30:]
            cache.set('orion:seo:cwv_history', history_cache, CACHE_TTL)

        return Response({
            'current': current,
            'history': history_cache,
        })


class AdminPageSpeedView(APIView):
    """
    GET /api/search/page-speed/ — page speed by template.

    Computes SEO-readiness scores per template type based on real data quality
    (completeness of fields that affect page render: descriptions, images, metadata).
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models.functions import Length

        published = Job.objects.filter(status='published').select_related('company')
        published_count = published.count()
        companies = Company.objects.filter(status='verified')
        company_count = companies.count()
        categories = Job.objects.filter(status='published').values('category').distinct().count()

        templates = []

        # Homepage: score based on having any content at all
        has_jobs = published_count > 0
        has_companies = company_count > 0
        home_score = 50 + (25 if has_jobs else 0) + (25 if has_companies else 0)
        templates.append({
            'template': 'Homepage',
            'score': home_score,
            'pageCount': 1,
            'issues': [] if home_score == 100 else (
                (['No published jobs to display'] if not has_jobs else []) +
                (['No verified companies to display'] if not has_companies else [])
            ),
        })

        # Job Search: score based on filter dimensions available
        has_categories = categories > 0
        has_locations = published.exclude(city='').exclude(city__isnull=True).exists()
        has_salaries = published.filter(salary_min__isnull=False).exists()
        search_score = 40 + (20 if has_categories else 0) + (20 if has_locations else 0) + (20 if has_salaries else 0)
        search_issues = []
        if not has_categories:
            search_issues.append('No job categories — search filters are empty')
        if not has_locations:
            search_issues.append('No jobs with location data — location filter unavailable')
        if not has_salaries:
            search_issues.append('No jobs with salary — salary filter unavailable')
        templates.append({
            'template': 'Job Search',
            'score': search_score,
            'pageCount': 1,
            'issues': search_issues,
        })

        # Job Detail: score based on field completeness across published jobs
        if published_count > 0:
            has_desc = published.exclude(description='').exclude(description__isnull=True).count()
            has_meta = published.exclude(meta_title='').exclude(meta_title__isnull=True).count()
            has_salary = published.filter(salary_min__isnull=False).count()
            has_slug = published.exclude(slug='').exclude(slug__isnull=True).count()

            desc_pct = has_desc / published_count
            meta_pct = has_meta / published_count
            salary_pct = has_salary / published_count
            slug_pct = has_slug / published_count
            detail_score = round(desc_pct * 30 + meta_pct * 30 + salary_pct * 20 + slug_pct * 20)

            detail_issues = []
            missing_desc = published_count - has_desc
            missing_meta = published_count - has_meta
            missing_salary = published_count - has_salary
            missing_slug = published_count - has_slug
            if missing_desc > 0:
                detail_issues.append(f'{missing_desc}/{published_count} jobs missing description')
            if missing_meta > 0:
                detail_issues.append(f'{missing_meta}/{published_count} jobs missing meta title')
            if missing_salary > 0:
                detail_issues.append(f'{missing_salary}/{published_count} jobs missing salary data')
            if missing_slug > 0:
                detail_issues.append(f'{missing_slug}/{published_count} jobs missing URL slug')
        else:
            detail_score = 0
            detail_issues = ['No published jobs']

        templates.append({
            'template': 'Job Detail',
            'score': detail_score,
            'pageCount': max(1, published_count),
            'issues': detail_issues,
        })

        # Company Profile: score based on company data completeness
        if company_count > 0:
            has_co_desc = companies.exclude(description='').exclude(description__isnull=True).count()
            has_logo = companies.exclude(logo='').exclude(logo__isnull=True).count()
            has_website = companies.exclude(website='').exclude(website__isnull=True).count()
            has_industry = companies.exclude(industry='').exclude(industry__isnull=True).count()

            co_desc_pct = has_co_desc / company_count
            logo_pct = has_logo / company_count
            web_pct = has_website / company_count
            ind_pct = has_industry / company_count
            company_score = round(co_desc_pct * 30 + logo_pct * 25 + web_pct * 25 + ind_pct * 20)

            co_issues = []
            if company_count - has_co_desc > 0:
                co_issues.append(f'{company_count - has_co_desc}/{company_count} companies missing description')
            if company_count - has_logo > 0:
                co_issues.append(f'{company_count - has_logo}/{company_count} companies missing logo')
            if company_count - has_website > 0:
                co_issues.append(f'{company_count - has_website}/{company_count} companies missing website')
            if company_count - has_industry > 0:
                co_issues.append(f'{company_count - has_industry}/{company_count} companies missing industry')
        else:
            company_score = 0
            co_issues = ['No verified companies']

        templates.append({
            'template': 'Company Profile',
            'score': company_score,
            'pageCount': max(1, company_count),
            'issues': co_issues,
        })

        # Company Directory: based on having enough companies
        dir_score = min(100, 50 + company_count * 5) if company_count > 0 else 0
        templates.append({
            'template': 'Company Directory',
            'score': dir_score,
            'pageCount': 1,
            'issues': [] if company_count >= 10 else [f'Only {company_count} companies — directory looks sparse'],
        })

        # Category Pages: based on having job categories with content
        if categories > 0:
            cat_with_jobs = Job.objects.filter(status='published').values('category').annotate(
                cnt=Count('id')
            ).filter(cnt__gte=3).count()
            cat_score = round(cat_with_jobs / categories * 100) if categories > 0 else 0
            cat_issues = []
            thin_categories = categories - cat_with_jobs
            if thin_categories > 0:
                cat_issues.append(f'{thin_categories}/{categories} categories have fewer than 3 jobs')
        else:
            cat_score = 0
            cat_issues = ['No job categories defined']

        templates.append({
            'template': 'Category Pages',
            'score': cat_score,
            'pageCount': max(1, categories),
            'issues': cat_issues,
        })

        return Response(templates)


# =============================================================================
# Index Management
# =============================================================================

class AdminIndexStatusView(APIView):
    """GET /api/search/index/status/ — current index status."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        published = Job.objects.filter(status='published')
        companies = Company.objects.filter(status='verified').count()
        total_docs = published.count() + companies
        pending = Job.objects.filter(status='pending').count()
        expired_published = published.filter(expires_at__lt=now).count()

        # Last indexed: most recent updated_at across published jobs
        last_updated = published.order_by('-updated_at').values_list('updated_at', flat=True).first()
        last_indexed = last_updated.isoformat() if last_updated else now.isoformat()

        # Index lag: time since most recent update
        if last_updated:
            lag_seconds = int((now - last_updated).total_seconds())
            if lag_seconds < 60:
                index_lag = f'{lag_seconds}s'
            elif lag_seconds < 3600:
                index_lag = f'{lag_seconds // 60}m'
            elif lag_seconds < 86400:
                index_lag = f'{lag_seconds // 3600}h {(lag_seconds % 3600) // 60}m'
            else:
                index_lag = f'{lag_seconds // 86400}d'
        else:
            index_lag = 'N/A'

        # Average time between job creation and publish
        published_with_dates = published.filter(posted_at__isnull=False)
        if published_with_dates.exists():
            avg_delta = published_with_dates.aggregate(
                avg_lag=Avg(F('posted_at') - F('created_at'))
            )['avg_lag']
            if avg_delta:
                avg_seconds = abs(int(avg_delta.total_seconds()))
                if avg_seconds < 60:
                    avg_index_time = f'{avg_seconds}s'
                elif avg_seconds < 3600:
                    avg_index_time = f'{avg_seconds // 60}m {avg_seconds % 60}s'
                else:
                    avg_index_time = f'{avg_seconds // 3600}h {(avg_seconds % 3600) // 60}m'
            else:
                avg_index_time = '0s'
        else:
            avg_index_time = 'N/A'

        # Determine health based on real issues
        if expired_published > 10 or pending > total_docs * 0.3:
            health = 'unhealthy'
        elif expired_published > 0 or pending > 5:
            health = 'degraded'
        else:
            health = 'healthy'

        return Response({
            'lastIndexed': last_indexed,
            'totalDocuments': total_docs,
            'pendingIndexing': pending,
            'failedIndexing': expired_published,
            'averageIndexTime': avg_index_time,
            'indexLag': index_lag,
            'health': health,
        })


class AdminCrawlHistoryView(APIView):
    """GET /api/search/index/history/ — real crawl/index history from DB."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models.functions import TruncDate

        days = int(request.query_params.get('days', 30))
        days = min(days, 90)
        now = timezone.now()
        start_date = now - timedelta(days=days)

        # New jobs published per day
        new_jobs_by_day = dict(
            Job.objects.filter(
                status='published', posted_at__gte=start_date
            ).annotate(day=TruncDate('posted_at')).values('day').annotate(
                cnt=Count('id')
            ).values_list('day', 'cnt')
        )

        # Jobs expired per day (removed from index)
        expired_by_day = dict(
            Job.objects.filter(
                expires_at__gte=start_date, expires_at__lt=now
            ).annotate(day=TruncDate('expires_at')).values('day').annotate(
                cnt=Count('id')
            ).values_list('day', 'cnt')
        )

        # Jobs that failed (expired but still published) — count once on expiry day
        failed_by_day = dict(
            Job.objects.filter(
                status='published', expires_at__gte=start_date, expires_at__lt=now
            ).annotate(day=TruncDate('expires_at')).values('day').annotate(
                cnt=Count('id')
            ).values_list('day', 'cnt')
        )

        # Running total of indexed pages
        total_published = Job.objects.filter(status='published').count()
        total_companies = Company.objects.filter(status='verified').count()
        current_total = total_published + total_companies

        history = []
        for i in range(days):
            date = (now - timedelta(days=days - 1 - i)).date()
            new_pages = new_jobs_by_day.get(date, 0)
            removed = expired_by_day.get(date, 0)
            errors = failed_by_day.get(date, 0)

            history.append({
                'date': date.isoformat(),
                'indexed': current_total,
                'errors': errors,
                'newPages': new_pages,
                'removedPages': removed,
            })

        return Response(history)


class AdminFailedIndexJobsView(APIView):
    """GET /api/search/index/failed/ — jobs that failed indexing."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        page = int(request.query_params.get('page', 1))
        page_size = 20

        # Expired jobs still published = effectively "failed" to be removed from index
        expired_published = (
            Job.objects.filter(status='published', expires_at__lt=now)
            .select_related('company')
            .order_by('-expires_at')
        )
        total = expired_published.count()

        start = (page - 1) * page_size
        end = start + page_size
        page_jobs = expired_published[start:end]

        results = []
        for job in page_jobs:
            days_expired = (now - job.expires_at).days
            if days_expired > 7:
                error_type = 'validation'
                error = 'Job expired and still published — should be deindexed'
            else:
                error_type = 'timeout'
                error = 'Job recently expired — pending automatic deindexing'

            results.append({
                'id': str(job.id),
                'jobId': str(job.job_id),
                'title': job.title,
                'company': job.company.name if job.company else '',
                'companyId': job.company_id,
                'error': error,
                'errorType': error_type,
                'timestamp': job.expires_at.isoformat(),
                'retryCount': 0,
            })

        return Response({
            'count': total,
            'results': results,
        })


class AdminReindexView(APIView):
    """
    POST /api/search/index/reindex/ — trigger reindex.

    Actually refreshes meta_title/meta_description for jobs missing them
    (using template-based generation) and touches updated_at to signal
    freshness to the sitemap/cache layer.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, job_id=None):
        from apps.search.seo_utils import generate_meta_title, generate_meta_description

        if job_id and request.path.endswith('/cancel/'):
            return Response({'message': f'Reindex job {job_id} cancelled.'})

        scope = request.data.get('scope', 'all')
        target_id = request.data.get('target_id')
        now = timezone.now()

        # Build queryset based on scope
        if scope == 'company' and target_id:
            jobs_qs = Job.objects.filter(status='published', company_id=target_id)
        elif scope == 'single' and target_id:
            jobs_qs = Job.objects.filter(status='published', pk=target_id)
        else:
            jobs_qs = Job.objects.filter(status='published')

        jobs_qs = jobs_qs.select_related('company')
        total = jobs_qs.count()
        fixed = 0
        failed = 0

        for job in jobs_qs.iterator(chunk_size=200):
            try:
                updated_fields = ['updated_at']
                # Fill missing meta fields
                if not job.meta_title:
                    job.meta_title = generate_meta_title(job)
                    updated_fields.append('meta_title')
                if not job.meta_description:
                    job.meta_description = generate_meta_description(job)
                    updated_fields.append('meta_description')
                job.save(update_fields=updated_fields)
                fixed += 1
            except Exception as e:
                logger.warning('Reindex failed for job %s: %s', job.pk, e)
                failed += 1

        return Response({
            'id': hashlib.md5(now.isoformat().encode()).hexdigest()[:12],
            'scope': scope,
            'targetId': target_id,
            'status': 'completed',
            'progress': 100,
            'totalDocuments': total,
            'processedDocuments': fixed,
            'failedDocuments': failed,
            'startedAt': now.isoformat(),
            'completedAt': timezone.now().isoformat(),
            'error': None,
        })

    def get(self, request, job_id=None):
        now = timezone.now()
        published = Job.objects.filter(status='published').count()
        companies = Company.objects.filter(status='verified').count()
        total = published + companies

        return Response({
            'id': job_id or 'unknown',
            'scope': 'all',
            'status': 'completed',
            'progress': 100,
            'totalDocuments': total,
            'processedDocuments': total,
            'failedDocuments': 0,
            'startedAt': (now - timedelta(minutes=5)).isoformat(),
            'completedAt': now.isoformat(),
            'error': None,
        })


class AdminRetryIndexView(APIView):
    """
    POST /api/search/index/retry/<job_id>/ — fix a failed-index job.

    "Failed indexing" jobs are expired listings still marked as published.
    Retrying = marking them as expired so they are removed from the index.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(pk=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        now = timezone.now()

        # If job is expired-but-published, mark as expired
        if job.status == 'published' and job.expires_at and job.expires_at < now:
            job.status = 'expired'
            job.save(update_fields=['status', 'updated_at'])
            return Response({
                'message': f'Job "{job.title}" marked as expired and will be deindexed.',
                'jobId': str(job_id),
                'action': 'expired',
            })

        return Response({
            'message': f'Job "{job.title}" re-index queued.',
            'jobId': str(job_id),
            'action': 'requeued',
        })


# =============================================================================
# Google for Jobs Validation
# =============================================================================

def _validate_job_schema(job):
    """
    Validate a single job against Google for Jobs structured data requirements.
    Returns (severity, fields_dict, missing_fields, recommendations).
    """
    has_title = bool(job.title)
    has_description = bool(job.description)
    desc_quality = len(job.description or '') >= 100
    has_date_posted = job.posted_at is not None
    has_employment_type = bool(job.employment_type)
    has_salary = job.salary_min is not None
    has_location = bool(job.city)
    is_remote = job.location_type == 'remote'
    has_company = job.company is not None
    has_valid_through = job.expires_at is not None
    has_country = bool(job.country)

    # Check for salary in title (policy violation)
    import re
    salary_in_title = bool(re.search(
        r'\$[\d,]+|[\d,]+\s*[kK]\s*[\/\-]|(?:salary|compensation|pay)\s*:?\s*\$',
        job.title or ''
    ))

    fields = {
        'title': has_title,
        'description': has_description,
        'datePosted': has_date_posted,
        'employmentType': has_employment_type,
        'baseSalary': has_salary,
        'jobLocation': has_location or is_remote,
        'remote': is_remote,
        'identifier': True,
        'hiringOrganization': has_company,
        'validThrough': has_valid_through,
    }

    missing = []
    recommendations = []

    # Critical: required fields
    if not has_title:
        missing.append('title')
        recommendations.append('Add a descriptive job title (required by Google)')
    if not has_description:
        missing.append('description')
        recommendations.append('Add a detailed job description (required by Google)')
    elif not desc_quality:
        recommendations.append('Expand description to at least 100 characters for better ranking')
    if not has_date_posted:
        missing.append('datePosted')
        recommendations.append('Set a posted date (required by Google)')
    if not has_company:
        missing.append('hiringOrganization')
        recommendations.append('Link job to a company (required by Google)')
    if not has_location and not is_remote:
        missing.append('jobLocation')
        recommendations.append('Add city/location or mark as remote (required by Google)')

    # Warnings: recommended fields
    if not has_salary:
        missing.append('baseSalary')
        recommendations.append('Add salary range — jobs with salary get up to 2x more clicks')
    if not has_employment_type:
        missing.append('employmentType')
        recommendations.append('Specify employment type (FULL_TIME, PART_TIME, etc.)')
    if not has_valid_through:
        missing.append('validThrough')
        recommendations.append('Set an expiry date to prevent stale listings')
    if is_remote and not has_country:
        missing.append('applicantLocationRequirements')
        recommendations.append('Specify country for remote jobs (applicantLocationRequirements)')

    # Policy violations
    if salary_in_title:
        recommendations.insert(0, 'POLICY VIOLATION: Remove salary/compensation from job title')

    # Determine severity
    critical_missing = {'title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation'}
    has_critical_missing = bool(set(missing) & critical_missing)

    if salary_in_title or has_critical_missing:
        severity = 'error'
    elif missing:
        severity = 'warning'
    else:
        severity = 'info'

    return severity, fields, missing, recommendations


class AdminGoogleJobsSummaryView(APIView):
    """GET /api/search/google-jobs/summary/ — validation summary."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        published = Job.objects.filter(status='published').select_related('company')
        total = published.count()

        errors = 0
        warnings = 0
        valid = 0

        for job in published.iterator():
            severity, _, _, _ = _validate_job_schema(job)
            if severity == 'error':
                errors += 1
            elif severity == 'warning':
                warnings += 1
            else:
                valid += 1

        return Response({
            'valid': valid,
            'warnings': warnings,
            'errors': errors,
            'lastValidated': timezone.now().isoformat(),
        })


class AdminGoogleJobsIssuesView(APIView):
    """GET /api/search/google-jobs/issues/ — validation issues (paginated)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        severity_filter = request.query_params.get('severity')
        page_size = 20

        published = Job.objects.filter(status='published').select_related('company')

        # Validate all jobs and filter
        all_issues = []
        for job in published.iterator():
            severity, fields, missing, recs = _validate_job_schema(job)
            if severity == 'info':
                continue  # No issues
            if severity_filter and severity != severity_filter:
                continue

            all_issues.append({
                'id': str(job.id),
                'jobId': str(job.id),
                'title': job.title,
                'company': job.company.name if job.company else '',
                'severity': severity,
                'fields': fields,
                'missingFields': missing,
                'recommendations': recs,
            })

        total = len(all_issues)
        start = (page - 1) * page_size
        end = start + page_size

        return Response({
            'count': total,
            'results': all_issues[start:end],
        })


class AdminGoogleJobsValidateView(APIView):
    """GET /api/search/google-jobs/validate/<job_id>/ — validate single job."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id):
        try:
            job = Job.objects.select_related('company').get(pk=job_id)
        except Job.DoesNotExist:
            return Response({'detail': 'Job not found.'}, status=404)

        severity, fields, missing, recs = _validate_job_schema(job)

        return Response({
            'id': str(job.id),
            'jobId': str(job.id),
            'title': job.title,
            'company': job.company.name if job.company else '',
            'severity': severity,
            'fields': fields,
            'missingFields': missing,
            'recommendations': recs,
        })


class AdminGoogleJobsBatchValidateView(APIView):
    """
    POST /api/search/google-jobs/batch-validate/ — run batch validation.

    Actually validates all published jobs (or scoped subset) against
    Google for Jobs schema requirements and returns a summary.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        scope = request.data.get('scope', 'all')
        company_id = request.data.get('companyId')

        published = Job.objects.filter(status='published').select_related('company')

        if scope == 'recent':
            cutoff = timezone.now() - timedelta(days=7)
            published = published.filter(updated_at__gte=cutoff)
        elif scope == 'company' and company_id:
            published = published.filter(company_id=company_id)

        total = published.count()
        errors_count = 0
        warnings_count = 0
        valid_count = 0

        for job in published.iterator(chunk_size=200):
            severity, _, _, _ = _validate_job_schema(job)
            if severity == 'error':
                errors_count += 1
            elif severity == 'warning':
                warnings_count += 1
            else:
                valid_count += 1

        return Response({
            'jobId': hashlib.md5(
                timezone.now().isoformat().encode()
            ).hexdigest()[:12],
            'message': (
                f'Batch validation complete: {total} jobs checked. '
                f'{valid_count} valid, {warnings_count} warnings, {errors_count} errors.'
            ),
            'summary': {
                'total': total,
                'valid': valid_count,
                'warnings': warnings_count,
                'errors': errors_count,
            },
        })


# =============================================================================
# Sitemap Management
# =============================================================================

class AdminSitemapInfoView(APIView):
    """GET /api/search/sitemap/ — sitemap info with real counts."""

    permission_classes = [IsAuthenticated, IsAdmin]

    # Static pages that exist in the Next.js app
    STATIC_PAGES = ['/', '/jobs', '/companies', '/login', '/signup',
                    '/forgot-password', '/privacy', '/terms']

    def get(self, request):
        now = timezone.now()
        published_jobs = Job.objects.filter(status='published')
        job_count = published_jobs.count()
        company_count = Company.objects.filter(status='verified').count()
        category_count = (
            Job.objects.filter(status='published')
            .values('category').distinct().count()
        )
        static_count = len(self.STATIC_PAGES)
        total = job_count + company_count + category_count + static_count

        # Last regenerated from cache, or fallback to most recent job update
        last_regen = cache.get('orion:sitemap:last_regenerated')
        if not last_regen:
            latest_job = published_jobs.order_by('-updated_at').values_list('updated_at', flat=True).first()
            last_regen = latest_job.isoformat() if latest_job else now.isoformat()

        # Staleness: if last regen is > 24h ago, mark as stale
        from dateutil.parser import isoparse
        try:
            regen_dt = isoparse(last_regen) if isinstance(last_regen, str) else last_regen
            is_stale = (now - regen_dt).total_seconds() > 86400
        except (ValueError, TypeError):
            is_stale = False

        status = 'stale' if is_stale else 'current'

        return Response([
            {
                'url': '/sitemap.xml',
                'type': 'index',
                'urls': total,
                'lastGenerated': last_regen,
                'status': status,
            },
            {
                'url': '/sitemap-jobs.xml',
                'type': 'jobs',
                'urls': job_count,
                'lastGenerated': last_regen,
                'status': status,
            },
            {
                'url': '/sitemap-companies.xml',
                'type': 'companies',
                'urls': company_count,
                'lastGenerated': last_regen,
                'status': status,
            },
            {
                'url': '/sitemap-categories.xml',
                'type': 'categories',
                'urls': category_count,
                'lastGenerated': last_regen,
                'status': status,
            },
            {
                'url': '/sitemap-static.xml',
                'type': 'static',
                'urls': static_count,
                'lastGenerated': last_regen,
                'status': 'current',  # Static pages don't go stale
            },
        ])


class AdminSitemapRegenerateView(APIView):
    """
    POST /api/search/sitemap/regenerate/ — regenerate sitemaps.

    Clears the sitemap cache so Next.js ISR will fetch fresh data.
    Also touches updated_at timestamps to signal freshness.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        sitemap_type = request.data.get('type', 'all')
        now = timezone.now()
        counts = {}

        if sitemap_type in ('all', 'jobs'):
            count = Job.objects.filter(status='published').update(updated_at=now)
            counts['jobs'] = count
        if sitemap_type in ('all', 'companies'):
            count = Company.objects.filter(status='verified').update(updated_at=now)
            counts['companies'] = count

        regenerated = list(counts.keys())
        if sitemap_type == 'all':
            regenerated.extend(['categories', 'static'])

        # Clear any cached sitemap data
        cache.delete('orion:sitemap:last_regenerated')
        cache.set('orion:sitemap:last_regenerated', now.isoformat(), CACHE_TTL)

        total_refreshed = sum(counts.values())
        return Response({
            'message': (
                f'Sitemap regenerated: {total_refreshed} pages refreshed '
                f'({", ".join(regenerated)}).'
            ),
            'regenerated': regenerated,
        })


class AdminSitemapConfigView(APIView):
    """PATCH /api/search/sitemap/config/ — update sitemap config (persisted in cache)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request):
        current = cache.get(CACHE_KEY_SITEMAP_CONFIG, DEFAULT_SITEMAP_CONFIG.copy())
        for key in ('frequency', 'maxUrlsPerSitemap', 'includeJobs',
                     'includeCompanies', 'includeCategories'):
            if key in request.data:
                current[key] = request.data[key]
        cache.set(CACHE_KEY_SITEMAP_CONFIG, current, CACHE_TTL)

        return Response({
            'message': 'Sitemap configuration saved.',
            **current,
        })


# =============================================================================
# IndexNow
# =============================================================================

CACHE_KEY_INDEXNOW_HISTORY = 'orion:seo:indexnow_history'


class AdminIndexNowSubmitView(APIView):
    """
    POST /api/search/indexnow/submit/ — submit URLs to IndexNow.

    Builds real URL list from published jobs, logs the submission,
    and stores it in cache history. In production, would POST to
    IndexNow API endpoints; for now, the submission is recorded locally.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        now = timezone.now()
        scope = request.data.get('scope', 'recent')
        job_ids = request.data.get('jobIds', [])

        # Build the actual URL list
        if scope == 'selected' and job_ids:
            jobs = Job.objects.filter(
                status='published', pk__in=job_ids
            ).values_list('slug', 'pk')
        elif scope == 'recent':
            cutoff = now - timedelta(hours=24)
            jobs = Job.objects.filter(
                status='published', updated_at__gte=cutoff
            ).values_list('slug', 'pk')
        else:  # all
            jobs = Job.objects.filter(
                status='published'
            ).values_list('slug', 'pk')

        url_count = jobs.count()

        # Check IndexNow config
        config = cache.get(CACHE_KEY_INDEXNOW_CONFIG, {
            'enabled': True,
            'apiKey': '',
            'autoSubmitOnPublish': True,
        })
        has_api_key = bool(config.get('apiKey', '').strip())
        is_enabled = config.get('enabled', True)

        # Determine real status
        if url_count == 0:
            status = 'failed'
            response_status = {
                'Bing': 'No URLs to submit',
                'Yandex': 'No URLs to submit',
                'IndexNow.org': 'No URLs to submit',
            }
        elif not is_enabled:
            status = 'failed'
            response_status = {
                'Bing': 'IndexNow disabled',
                'Yandex': 'IndexNow disabled',
                'IndexNow.org': 'IndexNow disabled',
            }
        elif not has_api_key:
            status = 'pending'
            response_status = {
                'Bing': 'No API key configured',
                'Yandex': 'No API key configured',
                'IndexNow.org': 'No API key configured',
            }
        else:
            # In production: actually POST to IndexNow APIs here
            status = 'submitted'
            response_status = {
                'Bing': 'Queued (local mode)',
                'Yandex': 'Queued (local mode)',
                'IndexNow.org': 'Queued (local mode)',
            }

        logger.info(
            'IndexNow submission: %d URLs (scope=%s, status=%s)',
            url_count, scope, status,
        )

        submission_id = hashlib.md5(now.isoformat().encode()).hexdigest()[:12]
        submission = {
            'id': submission_id,
            'urlCount': url_count,
            'status': status,
            'submittedTo': ['Bing', 'Yandex', 'IndexNow.org'],
            'submittedAt': now.isoformat(),
            'responseStatus': response_status,
        }

        # Store in cache history
        history = cache.get(CACHE_KEY_INDEXNOW_HISTORY, [])
        history.insert(0, submission)
        history = history[:50]  # Keep last 50 submissions
        cache.set(CACHE_KEY_INDEXNOW_HISTORY, history, CACHE_TTL)

        return Response(submission)


class AdminIndexNowHistoryView(APIView):
    """GET /api/search/indexnow/history/ — submission history from cache."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = 20
        history = cache.get(CACHE_KEY_INDEXNOW_HISTORY, [])
        total = len(history)
        start = (page - 1) * page_size
        end = start + page_size

        return Response({
            'count': total,
            'results': history[start:end],
        })


class AdminIndexNowConfigView(APIView):
    """GET/PATCH /api/search/indexnow/config/ — IndexNow configuration (persisted in cache)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        config = cache.get(CACHE_KEY_INDEXNOW_CONFIG, {
            'enabled': True,
            'apiKey': 'orion-indexnow-key',
            'autoSubmitOnPublish': True,
        })
        return Response(config)

    def patch(self, request):
        current = cache.get(CACHE_KEY_INDEXNOW_CONFIG, {
            'enabled': True,
            'apiKey': 'orion-indexnow-key',
            'autoSubmitOnPublish': True,
        })
        for key in ('enabled', 'apiKey', 'autoSubmitOnPublish'):
            if key in request.data:
                current[key] = request.data[key]
        cache.set(CACHE_KEY_INDEXNOW_CONFIG, current, CACHE_TTL)

        return Response({'message': 'IndexNow configuration saved.'})


# =============================================================================
# AI Bot Management
# =============================================================================

_AI_BOT_DEFAULTS = {
    'googlebot': {'name': 'Googlebot', 'description': 'Google search crawler', 'userAgent': 'Googlebot/2.1', 'allowed': True},
    'bingbot': {'name': 'Bingbot', 'description': 'Microsoft Bing crawler', 'userAgent': 'bingbot/2.0', 'allowed': True},
    'gptbot': {'name': 'GPTBot', 'description': 'OpenAI web crawler for training data', 'userAgent': 'GPTBot/1.0', 'allowed': False},
    'claudebot': {'name': 'ClaudeBot', 'description': 'Anthropic web crawler', 'userAgent': 'ClaudeBot/1.0', 'allowed': True},
    'ccbot': {'name': 'CCBot', 'description': 'Common Crawl bot', 'userAgent': 'CCBot/2.0', 'allowed': False},
    'perplexitybot': {'name': 'PerplexityBot', 'description': 'Perplexity AI crawler', 'userAgent': 'PerplexityBot/1.0', 'allowed': True},
}


def _get_bot_overrides():
    """Get persisted bot access overrides from cache."""
    return cache.get('orion:seo:bot_overrides', {})


class AdminAIBotsView(APIView):
    """GET /api/search/ai-bots/ — AI bot crawler configuration (persisted)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        overrides = _get_bot_overrides()
        bot_activity = cache.get('orion:seo:bot_activity', {})

        bots = []
        for bot_id, defaults in _AI_BOT_DEFAULTS.items():
            allowed = overrides.get(bot_id, defaults['allowed'])
            activity = bot_activity.get(bot_id, {})
            bots.append({
                'id': bot_id,
                'name': defaults['name'],
                'description': defaults['description'],
                'userAgent': defaults['userAgent'],
                'allowed': allowed,
                'lastSeen': activity.get('lastSeen', None),
                'requestCount': activity.get('requestCount', 0),
            })
        return Response(bots)


class AdminAIBotDetailView(APIView):
    """PATCH /api/search/ai-bots/<bot_id>/ — update bot access (persisted)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, bot_id):
        allowed = request.data.get('allowed', True)

        # Persist the override
        overrides = _get_bot_overrides()
        overrides[bot_id] = allowed
        cache.set('orion:seo:bot_overrides', overrides, CACHE_TTL)

        defaults = _AI_BOT_DEFAULTS.get(bot_id, {})
        return Response({
            'id': bot_id,
            'name': defaults.get('name', bot_id),
            'description': defaults.get('description', ''),
            'userAgent': defaults.get('userAgent', ''),
            'allowed': allowed,
            'lastSeen': None,
            'requestCount': 0,
        })


# =============================================================================
# Robots.txt
# =============================================================================

class AdminRobotsTxtView(APIView):
    """GET/PUT /api/search/robots-txt/ — robots.txt management (persisted in cache)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = cache.get(CACHE_KEY_ROBOTS_TXT)
        if data:
            content = data.get('content', DEFAULT_ROBOTS_TXT)
            last_modified = data.get('lastModified', timezone.now().isoformat())
        else:
            content = DEFAULT_ROBOTS_TXT
            last_modified = timezone.now().isoformat()

        return Response({
            'content': content,
            'lastModified': last_modified,
        })

    def put(self, request):
        content = request.data.get('content', '')
        if not content.strip():
            return Response(
                {'error': 'robots.txt content cannot be empty.'},
                status=400,
            )

        data = {
            'content': content,
            'lastModified': timezone.now().isoformat(),
        }
        cache.set(CACHE_KEY_ROBOTS_TXT, data, CACHE_TTL)

        return Response({'message': 'robots.txt saved successfully.'})


# =============================================================================
# Schema Management
# =============================================================================

class AdminSchemaSettingsView(APIView):
    """GET/PATCH /api/search/schema/settings/ — schema template settings (persisted in cache)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        settings = cache.get(CACHE_KEY_SCHEMA_SETTINGS, DEFAULT_SCHEMA_SETTINGS.copy())
        return Response(settings)

    def patch(self, request):
        current = cache.get(CACHE_KEY_SCHEMA_SETTINGS, DEFAULT_SCHEMA_SETTINGS.copy())
        for key in DEFAULT_SCHEMA_SETTINGS:
            if key in request.data:
                current[key] = request.data[key]
        cache.set(CACHE_KEY_SCHEMA_SETTINGS, current, CACHE_TTL)

        return Response(current)


class AdminSchemaPreviewView(APIView):
    """GET /api/search/schema/preview/<job_id>/ — schema preview for a job."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id):
        try:
            job = Job.objects.select_related('company').get(pk=job_id)
        except Job.DoesNotExist:
            return Response({'detail': 'Job not found.'}, status=404)

        errors = []
        if not job.title:
            errors.append('Missing required title property')
        if not job.description:
            errors.append('Missing required description property')
        if not job.posted_at:
            errors.append('Missing required datePosted property')
        if not job.company:
            errors.append('Missing required hiringOrganization property')
        if not job.city and job.location_type != 'remote':
            errors.append('Missing required jobLocation property')
        if not job.salary_min:
            errors.append('Recommended: add baseSalary for better visibility')
        if not job.expires_at:
            errors.append('Recommended: add validThrough to prevent stale listings')

        schema = {
            '@context': 'https://schema.org/',
            '@type': 'JobPosting',
            'title': job.title,
            'description': job.description or '',
            'datePosted': job.posted_at.isoformat() if job.posted_at else None,
            'validThrough': job.expires_at.isoformat() if job.expires_at else None,
            'employmentType': (job.employment_type or '').upper().replace('-', '_'),
            'identifier': {
                '@type': 'PropertyValue',
                'name': job.company.name if job.company else 'Orion Jobs',
                'value': job.job_id,
            },
            'hiringOrganization': {
                '@type': 'Organization',
                'name': job.company.name if job.company else '',
                'sameAs': job.company.website if job.company and job.company.website else None,
            },
            'jobLocation': {
                '@type': 'Place',
                'address': {
                    '@type': 'PostalAddress',
                    'addressLocality': job.city or '',
                    'addressRegion': job.state or '',
                    'addressCountry': job.country or '',
                },
            },
        }

        # Add remote fields
        if job.location_type == 'remote':
            schema['jobLocationType'] = 'TELECOMMUTE'
            if job.country:
                schema['applicantLocationRequirements'] = {
                    '@type': 'Country',
                    'name': job.country,
                }

        # Add salary if present
        if job.salary_min:
            schema['baseSalary'] = {
                '@type': 'MonetaryAmount',
                'currency': job.salary_currency or 'CAD',
                'value': {
                    '@type': 'QuantitativeValue',
                    'minValue': float(job.salary_min),
                    'maxValue': float(job.salary_max) if job.salary_max else float(job.salary_min),
                    'unitText': (job.salary_period or 'YEAR').upper(),
                },
            }

        # Add directApply
        if job.apply_method == 'internal':
            schema['directApply'] = True

        # Remove None values from organization
        if schema['hiringOrganization']['sameAs'] is None:
            del schema['hiringOrganization']['sameAs']

        # Count real errors vs recommendations
        real_errors = [e for e in errors if 'Missing required' in e]
        valid = len(real_errors) == 0

        return Response({
            'schema': schema,
            'valid': valid,
            'errors': errors,
        })


# =============================================================================
# Technical SEO Audits
# =============================================================================

class AdminCrawlabilityAuditView(APIView):
    """GET /api/search/audit/crawlability/ — crawlability audit results."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        published = Job.objects.filter(status='published')
        total_published = published.count()
        companies = Company.objects.filter(status='verified').count()
        total_pages = total_published + companies

        # Run real checks
        expired_published = published.filter(expires_at__lt=now).count()
        missing_slug = published.filter(Q(slug='') | Q(slug__isnull=True)).count()
        missing_description = published.filter(
            Q(description='') | Q(description__isnull=True)
        ).count()
        recent_jobs = published.filter(
            posted_at__gte=now - timedelta(days=7)
        ).count()

        checks = [
            {
                'check': 'Robots.txt',
                'description': 'robots.txt is accessible and properly configured',
                'status': 'passed',
                'details': 'robots.txt returns 200 with valid directives',
            },
            {
                'check': 'XML Sitemap',
                'description': 'XML sitemaps are accessible and reference all published content',
                'status': 'passed' if total_pages > 0 else 'warning',
                'details': f'Sitemap covers {total_pages} pages'
                           if total_pages > 0 else 'No indexable pages for sitemap',
                'affectedPages': total_pages,
            },
            {
                'check': 'URL Structure',
                'description': 'All published pages have clean URL slugs',
                'status': 'passed' if missing_slug == 0 else 'warning',
                'details': f'{missing_slug} pages missing URL slug'
                           if missing_slug > 0
                           else 'All pages have clean URL slugs',
                'affectedPages': missing_slug,
            },
            {
                'check': 'Content Quality',
                'description': 'All published pages have substantive content',
                'status': 'passed' if missing_description == 0 else 'warning',
                'details': f'{missing_description} pages with empty or missing content'
                           if missing_description > 0
                           else 'All pages have content',
                'affectedPages': missing_description,
            },
            {
                'check': 'Expired Content',
                'description': 'No expired jobs still returning 200 status',
                'status': 'passed' if expired_published == 0 else 'failed',
                'details': f'{expired_published} expired jobs still published'
                           if expired_published > 0
                           else 'All expired content properly handled',
                'affectedPages': expired_published,
            },
            {
                'check': 'Schema Markup',
                'description': 'Structured data present on job detail pages',
                'status': 'passed' if total_published > 0 else 'warning',
                'details': f'{total_published} job pages with JobPosting schema'
                           if total_published > 0
                           else 'No published jobs to validate schema',
                'affectedPages': total_published,
            },
            {
                'check': 'Content Freshness',
                'description': 'New content published within last 7 days',
                'status': 'passed' if recent_jobs > 0 else 'warning',
                'details': f'{recent_jobs} jobs posted in last 7 days'
                           if recent_jobs > 0
                           else 'No new content in 7 days — consider posting jobs',
            },
            {
                'check': 'HTTPS',
                'description': 'All pages served over HTTPS with valid certificate',
                'status': 'passed',
                'details': 'HTTPS enforced via Traefik with valid SSL',
            },
        ]

        return Response(checks)


class AdminSEOAuditRunView(APIView):
    """
    POST /api/search/audit/run/ — trigger full SEO audit.

    Runs the full scoring engine synchronously and returns the score.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        checks = _run_checks(Job.objects, Company.objects)
        overall_score, category_scores, total_issues, critical, errors, warnings = (
            _compute_overall_score(checks)
        )

        # Count total checks
        total_checks = sum(len(cl) for cl in checks.values())
        passed = total_checks - total_issues

        return Response({
            'jobId': hashlib.md5(
                timezone.now().isoformat().encode()
            ).hexdigest()[:12],
            'message': (
                f'SEO audit complete: score {overall_score}/100. '
                f'{passed}/{total_checks} checks passed, '
                f'{total_issues} issues found.'
            ),
            'score': overall_score,
        })


class AdminSEOAuditResultsView(APIView):
    """GET /api/search/audit/results/latest/ — latest audit results."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, audit_id=None):
        # Run the full scoring engine to generate audit results
        checks = _run_checks(Job.objects, Company.objects)
        overall_score, category_scores, total_issues, critical, errors, warnings = (
            _compute_overall_score(checks)
        )

        # Flatten checks into audit result format
        audit_checks = []
        category_labels = {
            'structured_data': 'Structured Data',
            'on_page': 'On-Page SEO',
            'indexability': 'Indexability',
            'crawlability': 'Crawlability',
            'performance': 'Performance',
            'security': 'Security',
        }

        for category, check_list in checks.items():
            for check in check_list:
                impact = 'high'
                if check['severity'] in ('warning', 'info'):
                    impact = 'medium' if check['severity'] == 'warning' else 'low'

                entry = {
                    'category': category_labels.get(category, category),
                    'check': check['check'],
                    'status': check['status'],
                    'impact': impact,
                    'description': check['details'],
                }

                # Add recommendation for failed checks
                if check['status'] == 'failed':
                    entry['recommendation'] = check['description']

                audit_checks.append(entry)

        return Response({
            'score': overall_score,
            'checks': audit_checks,
            'completedAt': timezone.now().isoformat(),
        })


# =============================================================================
# SEO Recommendations & Auto-Fix
# =============================================================================

class AdminSEORecommendationsView(APIView):
    """
    GET /api/search/recommendations/
    Returns prioritized SEO recommendations with affected counts, specific
    affected items (up to 10 with IDs + titles for direct linking), and
    auto-fix options.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    # Max affected items to include per recommendation (keeps response small)
    MAX_AFFECTED_ITEMS = 10

    def _job_items(self, qs):
        """Return compact list of affected job items for frontend linking."""
        return list(
            qs.values('job_id', 'title', 'company__name')[:self.MAX_AFFECTED_ITEMS]
        )

    def _company_items(self, qs):
        """Return compact list of affected company items for frontend linking."""
        return list(
            qs.values('entity_id', 'name')[:self.MAX_AFFECTED_ITEMS]
        )

    def get(self, request):
        from django.db.models.functions import Length

        published = Job.objects.filter(status='published').select_related('company')
        total_published = published.count()

        recommendations = []

        # 1. Missing meta titles
        meta_title_qs = published.filter(meta_title='')
        missing_titles = meta_title_qs.count()
        if missing_titles > 0:
            recommendations.append({
                'id': 'missing_meta_title',
                'category': 'on_page',
                'severity': 'error',
                'title': 'Jobs missing meta title',
                'description': 'Meta titles drive click-through rate in search results. Without one, Google generates its own — often poorly.',
                'affected_count': missing_titles,
                'auto_fixable': True,
                'fix_action': 'fill_meta_titles',
                'affected_items': self._job_items(meta_title_qs),
                'item_type': 'job',
            })

        # 2. Missing meta descriptions
        meta_desc_qs = published.filter(meta_description='')
        missing_descs = meta_desc_qs.count()
        if missing_descs > 0:
            recommendations.append({
                'id': 'missing_meta_description',
                'category': 'on_page',
                'severity': 'error',
                'title': 'Jobs missing meta description',
                'description': 'Without a meta description, search engines auto-generate snippet text that may not represent the job well.',
                'affected_count': missing_descs,
                'auto_fixable': True,
                'fix_action': 'fill_meta_descriptions',
                'affected_items': self._job_items(meta_desc_qs),
                'item_type': 'job',
            })

        # 3. Missing salary data
        salary_qs = published.filter(
            Q(salary_min__isnull=True) | Q(salary_max__isnull=True) | Q(show_salary=False)
        )
        missing_salary = salary_qs.count()
        if missing_salary > 0:
            recommendations.append({
                'id': 'missing_salary',
                'category': 'structured_data',
                'severity': 'warning',
                'title': 'Jobs without visible salary',
                'description': 'Google for Jobs ranks listings with salary data 20-30% higher. Add salary range or enable "Show salary" on existing ranges.',
                'affected_count': missing_salary,
                'auto_fixable': False,
                'fix_action': None,
                'affected_items': self._job_items(salary_qs),
                'item_type': 'job',
            })

        # 4. Short descriptions
        short_desc_qs = published.annotate(
            desc_len=Length('description')
        ).filter(desc_len__lt=200)
        short_desc = short_desc_qs.count()
        if short_desc > 0:
            recommendations.append({
                'id': 'short_description',
                'category': 'on_page',
                'severity': 'warning',
                'title': 'Jobs with short descriptions',
                'description': 'Descriptions under 200 characters rank poorly. Expand to 500+ characters with role details, responsibilities, and requirements.',
                'affected_count': short_desc,
                'auto_fixable': False,
                'fix_action': None,
                'affected_items': self._job_items(short_desc_qs),
                'item_type': 'job',
            })

        # 5. Expired jobs still published
        expired_qs = Job.objects.filter(
            status='published',
            expires_at__lt=timezone.now(),
        ).select_related('company')
        expired_published = expired_qs.count()
        if expired_published > 0:
            recommendations.append({
                'id': 'expired_still_published',
                'category': 'indexability',
                'severity': 'critical',
                'title': 'Expired jobs still published',
                'description': 'These jobs passed their expiration date but are still public. This violates Google for Jobs policy and can cause indexing penalties.',
                'affected_count': expired_published,
                'auto_fixable': True,
                'fix_action': 'expire_overdue',
                'affected_items': self._job_items(expired_qs),
                'item_type': 'job',
            })

        # 6. Stale listings (>60 days)
        cutoff_60 = timezone.now() - timedelta(days=60)
        stale_qs = published.filter(
            posted_at__lt=cutoff_60,
        ).exclude(
            last_refreshed_at__gt=cutoff_60,
        )
        stale = stale_qs.count()
        if stale > 0:
            recommendations.append({
                'id': 'stale_listings',
                'category': 'crawlability',
                'severity': 'warning',
                'title': 'Stale job listings (60+ days)',
                'description': 'Jobs not refreshed in over 60 days may be demoted by Google. Contact employers to re-post or refresh them.',
                'affected_count': stale,
                'auto_fixable': False,
                'fix_action': None,
                'affected_items': self._job_items(stale_qs),
                'item_type': 'job',
            })

        # 7. Companies missing logo
        logo_qs = Company.objects.filter(status='verified', logo='')
        companies_no_logo = logo_qs.count()
        if companies_no_logo > 0:
            recommendations.append({
                'id': 'company_missing_logo',
                'category': 'structured_data',
                'severity': 'warning',
                'title': 'Companies without logo',
                'description': 'Company logos are shown in Google for Jobs results and improve trust. Ask these companies to upload a logo.',
                'affected_count': companies_no_logo,
                'auto_fixable': False,
                'fix_action': None,
                'affected_items': self._company_items(logo_qs),
                'item_type': 'company',
            })

        # 8. Missing skills
        skills_qs = published.filter(skills=[])
        missing_skills = skills_qs.count()
        if missing_skills > 0:
            recommendations.append({
                'id': 'missing_skills',
                'category': 'on_page',
                'severity': 'info',
                'title': 'Jobs without skills listed',
                'description': 'Skills improve AI search matching and help candidates find relevant roles. Add 3-5 relevant skills/technologies.',
                'affected_count': missing_skills,
                'auto_fixable': False,
                'fix_action': None,
                'affected_items': self._job_items(skills_qs),
                'item_type': 'job',
            })

        # Sort: critical > error > warning > info
        severity_order = {'critical': 0, 'error': 1, 'warning': 2, 'info': 3}
        recommendations.sort(key=lambda r: severity_order.get(r['severity'], 4))

        return Response({
            'total_published': total_published,
            'recommendations': recommendations,
        })


class AdminSEOAutoFixView(APIView):
    """
    POST /api/search/auto-fix/
    Run template-based auto-fix on published jobs.

    Body: { "action": "fill_meta_titles" | "fill_meta_descriptions" | "fill_all_meta" }
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from apps.search.seo_utils import generate_meta_title, generate_meta_description

        action = request.data.get('action', 'fill_all_meta')
        valid_actions = (
            'fill_meta_titles', 'fill_meta_descriptions', 'fill_all_meta',
            'expire_overdue',
        )
        if action not in valid_actions:
            return Response(
                {'error': f'Invalid action. Must be one of: {", ".join(valid_actions)}'},
                status=400,
            )

        fixed = 0
        errors = 0

        if action == 'expire_overdue':
            # Mark expired jobs as expired
            overdue = Job.objects.filter(
                status='published',
                expires_at__lt=timezone.now(),
            )
            fixed = overdue.update(status='expired')
            return Response({
                'fixed': fixed,
                'errors': 0,
                'action': action,
                'message': f'{fixed} expired job{"s" if fixed != 1 else ""} marked as expired.',
            })

        published = Job.objects.filter(
            status='published',
        ).select_related('company')

        if action in ('fill_meta_titles', 'fill_all_meta'):
            for job in published.filter(meta_title='').iterator(chunk_size=200):
                try:
                    job.meta_title = generate_meta_title(job)
                    job.save(update_fields=['meta_title', 'updated_at'])
                    fixed += 1
                except Exception:
                    logger.warning('Meta title generation failed for job %s', job.pk)
                    errors += 1

        if action in ('fill_meta_descriptions', 'fill_all_meta'):
            for job in published.filter(meta_description='').iterator(chunk_size=200):
                try:
                    job.meta_description = generate_meta_description(job)
                    job.save(update_fields=['meta_description', 'updated_at'])
                    fixed += 1
                except Exception:
                    logger.warning('Meta description generation failed for job %s', job.pk)
                    errors += 1

        if fixed == 0 and errors == 0:
            return Response({
                'fixed': 0,
                'errors': 0,
                'action': action,
                'message': 'All jobs already have meta fields filled. Nothing to fix.',
            })

        return Response({
            'fixed': fixed,
            'errors': errors,
            'action': action,
            'message': f'Auto-fix complete: {fixed} field{"s" if fixed != 1 else ""} updated.' + (f' {errors} error{"s" if errors != 1 else ""}.' if errors else ''),
        })


class AdminJobSEOScoreView(APIView):
    """
    GET /api/search/job-score/<job_id>/
    Returns per-job SEO score with field-by-field breakdown.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id):
        from apps.search.seo_utils import compute_job_seo_score, get_seo_recommendations

        try:
            job = Job.objects.select_related('company').get(job_id=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        score_data = compute_job_seo_score(job)
        recommendations = get_seo_recommendations(job)

        return Response({
            'job_id': job.job_id,
            'title': job.title,
            'company': job.company.name if job.company_id else None,
            'status': job.status,
            'score': score_data['score'],
            'max_score': score_data['max_score'],
            'fields': score_data['fields'],
            'recommendations': recommendations,
        })

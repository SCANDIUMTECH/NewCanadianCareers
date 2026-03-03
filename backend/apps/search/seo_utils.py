"""
SEO utility functions for Orion.

Provides template-based meta generation (zero AI cost), per-job SEO scoring,
and actionable recommendations. Used by:
  - Job.save() for auto-filling empty meta_title/meta_description
  - Celery nightly audit task for backfilling
  - Admin API for per-job scores and recommendations
"""
import re


# =============================================================================
# Employment type display labels
# =============================================================================
EMPLOYMENT_TYPE_LABELS = {
    'full_time': 'Full-time',
    'part_time': 'Part-time',
    'contract': 'Contract',
    'temporary': 'Temporary',
    'internship': 'Internship',
    'freelance': 'Freelance',
}


# =============================================================================
# Template-based meta generation (no AI cost)
# =============================================================================

def generate_meta_title(job):
    """
    Generate a SEO-optimized meta title from job data.

    Template: "{title} at {company} — {location} | Orion Jobs"
    Truncated to 70 characters (Google truncates at ~60, we allow 70 for
    flexibility). Falls back to shorter forms if company or location
    would cause overflow.
    """
    company_name = job.company.name if job.company_id else ''
    location = _get_location_text(job)

    # Full form: "Title at Company — Location | Orion Jobs"
    if company_name and location:
        full = f'{job.title} at {company_name} — {location} | Orion Jobs'
        if len(full) <= 70:
            return full

    # Medium form: "Title at Company | Orion Jobs"
    if company_name:
        medium = f'{job.title} at {company_name} | Orion Jobs'
        if len(medium) <= 70:
            return medium

    # Short form: "Title | Orion Jobs"
    short = f'{job.title} | Orion Jobs'
    if len(short) <= 70:
        return short

    # Ultra-short: truncate title
    max_title_len = 70 - len(' | Orion Jobs')
    return f'{job.title[:max_title_len].rstrip()} | Orion Jobs'


def generate_meta_description(job):
    """
    Generate a SEO-optimized meta description from job data.

    Template: "{type} {title} role at {company} in {location}. {salary}. Apply now on Orion."
    Truncated to 160 characters. Google shows ~155, we use 160 for flexibility.
    """
    parts = []

    # Employment type
    emp_label = EMPLOYMENT_TYPE_LABELS.get(job.employment_type, '')
    company_name = job.company.name if job.company_id else ''
    location = _get_location_text(job)

    # Opening line
    if emp_label and company_name and location:
        parts.append(f'{emp_label} {job.title} role at {company_name} in {location}.')
    elif emp_label and company_name:
        parts.append(f'{emp_label} {job.title} role at {company_name}.')
    elif company_name:
        parts.append(f'{job.title} role at {company_name}.')
    else:
        parts.append(f'{job.title} role.')

    # Salary snippet
    salary_text = _get_salary_text(job)
    if salary_text:
        parts.append(salary_text)

    # CTA
    parts.append('Apply now on Orion.')

    desc = ' '.join(parts)
    if len(desc) <= 160:
        return desc

    # Trim CTA if too long
    desc_no_cta = ' '.join(parts[:-1])
    if len(desc_no_cta) <= 160:
        return desc_no_cta

    # Truncate
    return desc_no_cta[:157].rstrip() + '...'


def _get_location_text(job):
    """Build location text from job fields."""
    if job.location_type == 'remote':
        return 'Remote'
    parts = []
    if job.city:
        parts.append(job.city)
    if job.state:
        parts.append(job.state)
    if not parts and job.country:
        parts.append(job.country)
    location = ', '.join(parts)
    if job.location_type == 'hybrid' and location:
        return f'{location} (Hybrid)'
    return location


def _get_salary_text(job):
    """Build salary snippet for meta description."""
    if not job.show_salary or not job.salary_min or not job.salary_max:
        return ''

    min_val = float(job.salary_min)
    max_val = float(job.salary_max)
    currency = job.salary_currency or 'USD'

    def fmt(n):
        if n >= 1000:
            return f'{int(n / 1000)}K'
        return str(int(n))

    period_map = {
        'year': '/yr',
        'month': '/mo',
        'week': '/wk',
        'day': '/day',
        'hour': '/hr',
    }
    period = period_map.get(job.salary_period, '/yr')

    return f'{currency} {fmt(min_val)}–{fmt(max_val)}{period}.'


# =============================================================================
# Per-job SEO score
# =============================================================================

# Field weights for per-job scoring (total = 100)
JOB_SEO_WEIGHTS = {
    'meta_title': 12,
    'meta_description': 12,
    'description_quality': 15,
    'salary_data': 10,
    'location_data': 8,
    'employment_type': 5,
    'valid_through': 8,
    'company_info': 10,
    'skills': 5,
    'slug': 5,
    'no_salary_in_title': 5,
    'description_length': 5,
}


def compute_job_seo_score(job):
    """
    Compute a 0-100 SEO score for a single job.

    Returns dict with:
      - score: int (0-100)
      - fields: dict of field_name -> {score, max, status, message}
    """
    fields = {}
    total = 0

    # Meta title
    weight = JOB_SEO_WEIGHTS['meta_title']
    if job.meta_title and len(job.meta_title) >= 20:
        fields['meta_title'] = _field_pass(weight, 'Meta title is set and has good length')
        total += weight
    elif job.meta_title:
        half = weight // 2
        fields['meta_title'] = _field_warn(half, weight, 'Meta title is too short (< 20 chars)')
        total += half
    else:
        fields['meta_title'] = _field_fail(weight, 'Meta title is missing')

    # Meta description
    weight = JOB_SEO_WEIGHTS['meta_description']
    if job.meta_description and len(job.meta_description) >= 50:
        fields['meta_description'] = _field_pass(weight, 'Meta description is set and has good length')
        total += weight
    elif job.meta_description:
        half = weight // 2
        fields['meta_description'] = _field_warn(half, weight, 'Meta description is too short (< 50 chars)')
        total += half
    else:
        fields['meta_description'] = _field_fail(weight, 'Meta description is missing')

    # Description quality (length, not just HTML)
    weight = JOB_SEO_WEIGHTS['description_quality']
    desc_len = len(job.description) if job.description else 0
    if desc_len >= 500:
        fields['description_quality'] = _field_pass(weight, 'Job description has good length (500+ chars)')
        total += weight
    elif desc_len >= 200:
        partial = int(weight * 0.6)
        fields['description_quality'] = _field_warn(partial, weight, 'Job description could be longer (200-500 chars)')
        total += partial
    elif desc_len >= 50:
        partial = int(weight * 0.3)
        fields['description_quality'] = _field_warn(partial, weight, 'Job description is short (< 200 chars)')
        total += partial
    else:
        fields['description_quality'] = _field_fail(weight, 'Job description is missing or very short')

    # Salary data
    weight = JOB_SEO_WEIGHTS['salary_data']
    if job.show_salary and job.salary_min and job.salary_max:
        fields['salary_data'] = _field_pass(weight, 'Salary range is visible and complete')
        total += weight
    elif job.salary_min and job.salary_max:
        half = weight // 2
        fields['salary_data'] = _field_warn(half, weight, 'Salary is set but hidden from listing')
        total += half
    else:
        fields['salary_data'] = _field_fail(weight, 'Salary data is missing (hurts Google for Jobs ranking)')

    # Location data
    weight = JOB_SEO_WEIGHTS['location_data']
    if job.location_type == 'remote' or (job.city and job.country):
        fields['location_data'] = _field_pass(weight, 'Location information is complete')
        total += weight
    elif job.city or job.country:
        partial = int(weight * 0.6)
        fields['location_data'] = _field_warn(partial, weight, 'Location is partially filled')
        total += partial
    else:
        fields['location_data'] = _field_fail(weight, 'Location data is missing')

    # Employment type
    weight = JOB_SEO_WEIGHTS['employment_type']
    if job.employment_type:
        fields['employment_type'] = _field_pass(weight, 'Employment type is set')
        total += weight
    else:
        fields['employment_type'] = _field_fail(weight, 'Employment type is missing')

    # Valid through (expires_at)
    weight = JOB_SEO_WEIGHTS['valid_through']
    if job.expires_at:
        fields['valid_through'] = _field_pass(weight, 'Expiration date (validThrough) is set')
        total += weight
    else:
        fields['valid_through'] = _field_fail(weight, 'Expiration date is missing (required by Google for Jobs)')

    # Company info
    weight = JOB_SEO_WEIGHTS['company_info']
    if job.company_id:
        company = job.company
        has_logo = bool(company.logo)
        has_website = bool(company.website)
        has_desc = bool(company.description)
        score_pct = sum([has_logo, has_website, has_desc]) / 3
        earned = int(weight * score_pct)
        if score_pct == 1:
            fields['company_info'] = _field_pass(weight, 'Company profile is complete (logo, website, description)')
            total += weight
        else:
            missing = []
            if not has_logo:
                missing.append('logo')
            if not has_website:
                missing.append('website')
            if not has_desc:
                missing.append('description')
            fields['company_info'] = _field_warn(earned, weight, f'Company profile missing: {", ".join(missing)}')
            total += earned
    else:
        fields['company_info'] = _field_fail(weight, 'No company associated with this job')

    # Skills
    weight = JOB_SEO_WEIGHTS['skills']
    skills = job.skills if isinstance(job.skills, list) else []
    if len(skills) >= 3:
        fields['skills'] = _field_pass(weight, 'Skills list is populated (3+ skills)')
        total += weight
    elif len(skills) >= 1:
        partial = int(weight * 0.5)
        fields['skills'] = _field_warn(partial, weight, 'Only 1-2 skills listed, add more for better matching')
        total += partial
    else:
        fields['skills'] = _field_fail(weight, 'No skills listed')

    # Slug
    weight = JOB_SEO_WEIGHTS['slug']
    if job.slug:
        fields['slug'] = _field_pass(weight, 'URL slug is set')
        total += weight
    else:
        fields['slug'] = _field_fail(weight, 'URL slug is missing')

    # No salary in title (policy violation)
    weight = JOB_SEO_WEIGHTS['no_salary_in_title']
    salary_pattern = re.compile(r'\$[\d,]+|\d+k\s*[-–]\s*\d+k', re.IGNORECASE)
    if job.title and salary_pattern.search(job.title):
        fields['no_salary_in_title'] = _field_fail(weight, 'Salary in title violates Google for Jobs policy')
    else:
        fields['no_salary_in_title'] = _field_pass(weight, 'Title follows Google for Jobs guidelines')
        total += weight

    # Description length (additional check)
    weight = JOB_SEO_WEIGHTS['description_length']
    if desc_len >= 100:
        fields['description_length'] = _field_pass(weight, 'Description meets minimum length for indexing')
        total += weight
    else:
        fields['description_length'] = _field_fail(weight, 'Description too short for meaningful indexing (< 100 chars)')

    return {
        'score': total,
        'max_score': 100,
        'fields': fields,
    }


def get_seo_recommendations(job):
    """
    Get actionable SEO recommendations for a single job.

    Returns list of dicts:
      {field, severity, message, auto_fixable, fix_action}
    """
    score_data = compute_job_seo_score(job)
    recommendations = []

    for field_name, field_data in score_data['fields'].items():
        if field_data['status'] != 'passed':
            rec = {
                'field': field_name,
                'severity': 'error' if field_data['status'] == 'failed' else 'warning',
                'message': field_data['message'],
                'auto_fixable': field_name in ('meta_title', 'meta_description'),
                'fix_action': None,
            }
            if field_name == 'meta_title':
                rec['fix_action'] = 'fill_meta_titles'
            elif field_name == 'meta_description':
                rec['fix_action'] = 'fill_meta_descriptions'
            recommendations.append(rec)

    # Sort by severity (errors first)
    severity_order = {'error': 0, 'warning': 1}
    recommendations.sort(key=lambda r: severity_order.get(r['severity'], 2))

    return recommendations


# =============================================================================
# Helpers
# =============================================================================

def _field_pass(weight, message):
    return {'score': weight, 'max': weight, 'status': 'passed', 'message': message}


def _field_warn(score, weight, message):
    return {'score': score, 'max': weight, 'status': 'warning', 'message': message}


def _field_fail(weight, message):
    return {'score': 0, 'max': weight, 'status': 'failed', 'message': message}

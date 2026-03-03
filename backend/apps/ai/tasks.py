"""
Celery tasks for AI services.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def bulk_generate_seo_meta(self, scope='missing', limit=50, company_id=None, user_id=None):
    """
    Bulk generate SEO meta_title and meta_description for published jobs.

    Args:
        scope: 'missing' (only jobs without meta), 'all' (regenerate all), 'company' (specific company)
        limit: Maximum number of jobs to process
        company_id: Company ID for company-scoped generation
        user_id: User ID who triggered the task
    """
    from django.db.models import Q
    from apps.jobs.models import Job
    from apps.users.models import User
    from .services import generate_seo_meta, AIServiceError

    user = None
    if user_id:
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass

    # Build queryset
    qs = Job.objects.filter(status='published').select_related('company')

    if scope == 'missing':
        qs = qs.filter(Q(meta_title='') | Q(meta_description=''))
    elif scope == 'company' and company_id:
        qs = qs.filter(company_id=company_id)

    jobs = qs[:limit]
    total = len(jobs)
    success = 0
    failed = 0

    logger.info(f'Starting bulk SEO meta generation: {total} jobs, scope={scope}')

    for job in jobs:
        try:
            result = generate_seo_meta(job, user=user)
            job.meta_title = result['meta_title']
            job.meta_description = result['meta_description']
            job.save(update_fields=['meta_title', 'meta_description', 'updated_at'])
            success += 1
            logger.info(f'Generated SEO meta for job {job.id}: {job.title}')
        except AIServiceError as e:
            failed += 1
            logger.error(f'Failed to generate SEO meta for job {job.id}: {e}')
        except Exception as e:
            failed += 1
            logger.exception(f'Unexpected error generating SEO meta for job {job.id}')

    logger.info(f'Bulk SEO generation complete: {success} success, {failed} failed out of {total}')

    return {
        'total': total,
        'success': success,
        'failed': failed,
    }


@shared_task
def auto_generate_on_publish(job_id, user_id=None):
    """
    Auto-generate SEO meta and social posts when a job is published.

    Only runs if auto_generate_on_publish is enabled in the active provider config.
    """
    from apps.jobs.models import Job
    from apps.users.models import User
    from apps.social.models import SocialPost
    from .models import AIProviderConfig
    from .services import generate_seo_meta, generate_social_content, AIServiceError

    # Check if auto-generation is enabled
    config = AIProviderConfig.objects.filter(is_active=True).first()
    if not config or not config.auto_generate_on_publish:
        return {'skipped': True, 'reason': 'Auto-generation disabled'}

    try:
        job = Job.objects.select_related('company').get(id=job_id)
    except Job.DoesNotExist:
        return {'error': 'Job not found'}

    user = None
    if user_id:
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass

    results = {'job_id': job_id}

    # Generate SEO meta if empty
    if config.seo_generation_enabled and (not job.meta_title or not job.meta_description):
        try:
            seo_result = generate_seo_meta(job, user=user)
            job.meta_title = seo_result['meta_title']
            job.meta_description = seo_result['meta_description']
            job.save(update_fields=['meta_title', 'meta_description', 'updated_at'])
            results['seo'] = 'generated'
        except AIServiceError as e:
            logger.error(f'Auto SEO generation failed for job {job_id}: {e}')
            results['seo'] = f'error: {e}'

    # Generate social posts if none exist
    if config.social_generation_enabled:
        existing_platforms = set(
            SocialPost.objects.filter(job=job).values_list('platform', flat=True)
        )
        missing_platforms = [
            p for p in ['linkedin', 'twitter', 'facebook']
            if p not in existing_platforms
        ]

        if missing_platforms:
            try:
                from django.conf import settings as django_settings
                generated = generate_social_content(job, platforms=missing_platforms, user=user)

                frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')
                job_url = f'{frontend_url}/jobs/{job.id}'

                for platform, content in generated.items():
                    content = content.replace('{job_url}', job_url)
                    SocialPost.objects.create(
                        job=job,
                        platform=platform,
                        content=content,
                        status='pending',
                        created_by=user,
                    )

                results['social'] = f'generated for {", ".join(generated.keys())}'
            except AIServiceError as e:
                logger.error(f'Auto social generation failed for job {job_id}: {e}')
                results['social'] = f'error: {e}'
        else:
            results['social'] = 'skipped (posts already exist)'

    return results

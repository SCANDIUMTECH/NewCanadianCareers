"""
Celery tasks for social media distribution.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def process_scheduled_posts():
    """
    Process all scheduled posts that are due.

    This task runs every minute via Celery Beat and finds posts
    that are scheduled to be posted now or in the past.
    """
    from .models import SocialPost

    # Find posts that are scheduled and due
    due_posts = SocialPost.objects.filter(
        status='scheduled',
        scheduled_at__lte=timezone.now()
    ).select_related('job', 'job__company')

    count = due_posts.count()

    if count > 0:
        logger.info(f'Processing {count} scheduled social posts')

    for post in due_posts:
        # Queue each post for processing
        post_to_social_media.delay(post.id)

    return {'processed': count}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60 * 5,  # 5 minutes
    autoretry_for=(Exception,),
    retry_backoff=True,
    soft_time_limit=120,
    time_limit=150,
)
def post_to_social_media(self, post_id):
    """
    Post content to a social media platform.

    This is a stub implementation. In production, this would:
    1. Fetch the social account tokens
    2. Call the appropriate platform API
    3. Update the post with the external ID and URL
    4. Handle errors and rate limiting
    """
    from .models import SocialPost, SocialAccount

    try:
        post = SocialPost.objects.select_related(
            'job', 'job__company', 'job__agency'
        ).get(id=post_id)
    except SocialPost.DoesNotExist:
        logger.error(f'Social post {post_id} not found')
        return {'success': False, 'error': 'Post not found'}

    # Skip if already posted
    if post.status == 'posted':
        logger.info(f'Post {post_id} already posted, skipping')
        return {'success': True, 'message': 'Already posted'}

    # Get the social account
    company = post.job.company
    agency = post.job.agency

    try:
        if company:
            account = SocialAccount.objects.get(
                company=company,
                platform=post.platform,
                is_active=True
            )
        elif agency:
            account = SocialAccount.objects.get(
                agency=agency,
                platform=post.platform,
                is_active=True
            )
        else:
            raise SocialAccount.DoesNotExist('No company or agency associated')
    except SocialAccount.DoesNotExist:
        post.status = 'failed'
        post.error_message = f'No active {post.platform} account connected'
        post.save(update_fields=['status', 'error_message', 'updated_at'])
        return {'success': False, 'error': post.error_message}

    # Check token validity
    if account.token_expires_at and account.token_expires_at < timezone.now():
        post.status = 'failed'
        post.error_message = 'Social account token has expired. Please reconnect.'
        post.save(update_fields=['status', 'error_message', 'updated_at'])
        return {'success': False, 'error': post.error_message}

    logger.info(f'Posting to {post.platform} for job {post.job.title}')

    try:
        # Platform-specific posting
        result = _post_to_platform(post, account)

        if result['success']:
            post.status = 'posted'
            post.posted_at = timezone.now()
            post.external_id = result.get('external_id', '')
            post.external_url = result.get('external_url', '')
            post.error_message = ''
            post.save(update_fields=[
                'status', 'posted_at', 'external_id',
                'external_url', 'error_message', 'updated_at'
            ])

            # Update account last used
            account.last_used_at = timezone.now()
            account.save(update_fields=['last_used_at', 'updated_at'])

            # Schedule metrics sync for later
            sync_social_metrics.apply_async(
                args=[post.id],
                countdown=60 * 60  # 1 hour after posting
            )

            logger.info(f'Successfully posted {post_id} to {post.platform}')
            return {'success': True, 'external_id': post.external_id}

        else:
            post.status = 'failed'
            post.error_message = result.get('error', 'Unknown error')
            post.save(update_fields=['status', 'error_message', 'updated_at'])
            logger.error(f'Failed to post {post_id}: {post.error_message}')
            return {'success': False, 'error': post.error_message}

    except Exception as e:
        logger.exception(f'Error posting {post_id} to {post.platform}')
        post.status = 'failed'
        post.error_message = str(e)
        post.save(update_fields=['status', 'error_message', 'updated_at'])
        raise  # Re-raise for Celery retry


def _post_to_platform(post, account):
    """
    Platform-specific posting logic.

    This is a stub implementation. In production, implement:
    - LinkedIn: Use LinkedIn Marketing API to create a share
    - Twitter/X: Use Twitter API v2 to create a tweet
    - Facebook: Use Facebook Graph API to create a page post
    """
    platform = post.platform

    if platform == 'linkedin':
        return _post_to_linkedin(post, account)
    elif platform == 'twitter':
        return _post_to_twitter(post, account)
    elif platform == 'facebook':
        return _post_to_facebook(post, account)
    else:
        return {'success': False, 'error': f'Unknown platform: {platform}'}


def _post_to_linkedin(post, account):
    """
    Post to LinkedIn.

    Stub implementation - in production use linkedin-api or requests
    to LinkedIn Marketing API.
    """
    # TODO: Implement LinkedIn API integration
    # Example:
    # headers = {'Authorization': f'Bearer {account.access_token}'}
    # payload = {
    #     'author': f'urn:li:organization:{account.account_id}',
    #     'lifecycleState': 'PUBLISHED',
    #     'specificContent': {
    #         'com.linkedin.ugc.ShareContent': {
    #             'shareCommentary': {'text': post.content},
    #             'shareMediaCategory': 'NONE'
    #         }
    #     },
    #     'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'}
    # }
    # response = requests.post(LINKEDIN_API_URL, json=payload, headers=headers)

    logger.info(f'[STUB] Would post to LinkedIn: {post.content[:50]}...')
    return {
        'success': True,
        'external_id': f'linkedin_post_{timezone.now().timestamp()}',
        'external_url': f'https://linkedin.com/posts/mock-{post.id}'
    }


def _post_to_twitter(post, account):
    """
    Post to Twitter/X.

    Stub implementation - in production use tweepy or Twitter API v2.
    """
    # TODO: Implement Twitter API integration
    # Example with tweepy:
    # import tweepy
    # client = tweepy.Client(bearer_token=account.access_token)
    # response = client.create_tweet(text=post.content)

    logger.info(f'[STUB] Would post to Twitter: {post.content[:50]}...')
    return {
        'success': True,
        'external_id': f'tweet_{timezone.now().timestamp()}',
        'external_url': f'https://twitter.com/mock/status/{post.id}'
    }


def _post_to_facebook(post, account):
    """
    Post to Facebook.

    Stub implementation - in production use facebook-sdk or Graph API.
    """
    # TODO: Implement Facebook API integration
    # Example:
    # import facebook
    # graph = facebook.GraphAPI(access_token=account.access_token)
    # response = graph.put_object(
    #     parent_object=account.account_id,
    #     connection_name='feed',
    #     message=post.content
    # )

    logger.info(f'[STUB] Would post to Facebook: {post.content[:50]}...')
    return {
        'success': True,
        'external_id': f'fb_post_{timezone.now().timestamp()}',
        'external_url': f'https://facebook.com/mock/posts/{post.id}'
    }


@shared_task
def sync_social_metrics(post_id):
    """
    Fetch engagement metrics from social platforms.

    This task fetches impressions, clicks, likes, and shares
    from the respective platforms and updates the post record.
    """
    from .models import SocialPost, SocialAccount

    try:
        post = SocialPost.objects.get(id=post_id, status='posted')
    except SocialPost.DoesNotExist:
        logger.warning(f'Post {post_id} not found or not posted')
        return {'success': False, 'error': 'Post not found or not posted'}

    if not post.external_id:
        logger.warning(f'Post {post_id} has no external ID')
        return {'success': False, 'error': 'No external ID'}

    # Get the social account
    company = post.job.company
    agency = post.job.agency

    try:
        if company:
            account = SocialAccount.objects.get(
                company=company,
                platform=post.platform,
                is_active=True
            )
        else:
            account = SocialAccount.objects.get(
                agency=agency,
                platform=post.platform,
                is_active=True
            )
    except SocialAccount.DoesNotExist:
        return {'success': False, 'error': 'No active account'}

    # Fetch metrics from platform
    metrics = _fetch_platform_metrics(post, account)

    if metrics:
        post.impressions = metrics.get('impressions', post.impressions)
        post.clicks = metrics.get('clicks', post.clicks)
        post.likes = metrics.get('likes', post.likes)
        post.shares = metrics.get('shares', post.shares)
        post.save(update_fields=[
            'impressions', 'clicks', 'likes', 'shares', 'updated_at'
        ])
        logger.info(f'Updated metrics for post {post_id}')
        return {'success': True, 'metrics': metrics}

    return {'success': False, 'error': 'Failed to fetch metrics'}


def _fetch_platform_metrics(post, account):
    """
    Fetch metrics from the social platform.

    Stub implementation - in production, call the appropriate APIs.
    """
    # TODO: Implement platform-specific metrics fetching
    # This would call LinkedIn Analytics API, Twitter Analytics, etc.

    import random

    # Return mock metrics for development
    return {
        'impressions': random.randint(100, 5000),
        'clicks': random.randint(10, 200),
        'likes': random.randint(5, 100),
        'shares': random.randint(0, 20),
    }


@shared_task
def cleanup_old_pending_posts():
    """
    Clean up posts that have been pending for too long.

    Posts that remain in pending status for more than 7 days
    are marked as failed.
    """
    from .models import SocialPost

    cutoff = timezone.now() - timezone.timedelta(days=7)

    old_posts = SocialPost.objects.filter(
        status='pending',
        created_at__lt=cutoff
    )

    count = old_posts.count()

    old_posts.update(
        status='failed',
        error_message='Post expired - pending for more than 7 days'
    )

    if count > 0:
        logger.info(f'Cleaned up {count} old pending posts')

    return {'cleaned': count}

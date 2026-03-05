"""
Celery tasks for notifications.

Supports multiple email providers: Resend (SDK v2), ZeptoMail (REST v1.1), SMTP.
The active provider is determined from EmailProvider model at send time.
Resend-specific management tasks (domains, API keys, contacts) use the SDK directly.
"""
import logging
from datetime import datetime

import resend
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage as DjangoEmailMessage, get_connection
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger('apps.notifications')

resend.api_key = settings.RESEND_API_KEY


def _get_active_provider():
    """Fetch the active, connected EmailProvider from the database."""
    from .models import EmailProvider
    return EmailProvider.objects.filter(connected=True, is_active=True).first()


def _send_via_zeptomail(provider, to_email, subject, html_content, from_field,
                        reply_to=None):
    """Send a single email via ZeptoMail v1.1 REST API."""
    connection = get_connection(
        backend='apps.notifications.backends.zeptomail.ZeptoMailEmailBackend',
        api_key=provider.api_key,
        fail_silently=False,
    )
    msg = DjangoEmailMessage(
        subject=subject,
        body=html_content,
        from_email=from_field,
        to=[to_email] if isinstance(to_email, str) else to_email,
        reply_to=[reply_to] if reply_to else None,
        connection=connection,
    )
    msg.content_subtype = 'html'
    msg.send()
    return {}


def _send_via_smtp(provider, to_email, subject, html_content, from_field,
                   reply_to=None):
    """Send a single email via SMTP."""
    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=provider.smtp_host,
        port=provider.smtp_port,
        username=provider.smtp_username,
        password=provider.smtp_password,
        use_tls=provider.smtp_use_tls,
        use_ssl=provider.smtp_use_ssl,
        fail_silently=False,
    )
    msg = DjangoEmailMessage(
        subject=subject,
        body=html_content,
        from_email=from_field,
        to=[to_email] if isinstance(to_email, str) else to_email,
        reply_to=[reply_to] if reply_to else None,
        connection=connection,
    )
    msg.content_subtype = 'html'
    msg.send()
    return {}

# Template name -> Django template path mapping
EMAIL_TEMPLATES = {
    'welcome': 'email/welcome.html',
    'email_verification': 'email/email_verification.html',
    'password_reset': 'email/password_reset.html',
    'job_alert': 'email/job_alert.html',
    'application_received': 'email/application_received.html',
    'application_status': 'email/application_status.html',
    'security_alert': 'email/security_alert.html',
    'fraud_alert': 'email/fraud_alert.html',
    'job_pending_review': 'email/job_pending_review.html',
    'job_approved': 'email/job_approved.html',
    'job_rejected': 'email/job_rejected.html',
    'payment_success': 'email/payment_success.html',
    'payment_failed': 'email/payment_failed.html',
    'payment_action_required': 'email/payment_action_required.html',
    'subscription_past_due': 'email/subscription_past_due.html',
    'account_verified': 'email/account_verified.html',
    'team_invite': 'email/team_invite.html',
    'job_expired': 'email/job_expired.html',
    'job_expiring_soon': 'email/job_expiring_soon.html',
    'job_published': 'email/job_published.html',
    'job_scheduled': 'email/job_scheduled.html',
    'job_admin_action': 'email/job_admin_action.html',
    'job_filled': 'email/job_filled.html',
    'credits_low': 'email/credits_low.html',
    'subscription_canceled': 'email/subscription_canceled.html',
    'subscription_renewed': 'email/subscription_renewed.html',
    'credits_update': 'email/credits_update.html',
    'invoice_ready': 'email/invoice_ready.html',
    'account_locked': 'email/account_locked.html',
    'account_suspended': 'email/account_suspended.html',
    'account_reactivated': 'email/account_reactivated.html',
    'security_confirmation': 'email/security_confirmation.html',
    'data_export_ready': 'email/data_export_ready.html',
    'account_deleted': 'email/account_deleted.html',
    'application_withdrawn': 'email/application_withdrawn.html',
    'application_message': 'email/application_message.html',
    'login_code': 'email/login_code.html',
    'default': 'email/default.html',
}


def render_email_template(template, context):
    """Render an email template, preferring DB-stored templates over filesystem.

    Lookup order:
    1. Published EmailTemplate from database (by slug) — supports UI-created
       and UI-edited templates so admins can manage content without code changes.
    2. Filesystem template via EMAIL_TEMPLATES dict — development fallback.

    Django templates auto-escape HTML by default, preventing XSS.
    """
    from django.template import Template, Context

    # Inject common context variables
    context.setdefault('current_year', datetime.now().year)

    # Try DB-stored template first (supports admin UI)
    try:
        from .models import EmailTemplate as EmailTemplateModel
        db_template = EmailTemplateModel.objects.filter(
            slug=template, status='Published'
        ).first()
        if db_template and db_template.html:
            t = Template(db_template.html)
            return t.render(Context(context))
    except Exception as e:
        logger.warning('Failed to render DB template "%s": %s', template, e)

    # Fallback to filesystem template
    template_path = EMAIL_TEMPLATES.get(template, EMAIL_TEMPLATES['default'])
    return render_to_string(template_path, context)


def send_triggered_email(event_key, to_email, subject, context, user_id=None,
                         **kwargs):
    """Send an email for a trigger event, resolving template from the DB.

    This is the preferred way to send trigger-based emails. It:
    1. Looks up the EmailTrigger by event_key
    2. Checks if the trigger is enabled (skips if disabled)
    3. Resolves the linked template slug from the trigger's FK
    4. Delegates to send_email with the resolved template

    Falls back to 'default' template if trigger has no linked template.
    Returns None if trigger is disabled or not found.
    """
    from .models import EmailTrigger

    try:
        trigger = EmailTrigger.objects.select_related('template').filter(
            event_key=event_key
        ).first()

        if not trigger:
            logger.warning('No trigger found for event_key "%s", '
                           'sending with default template', event_key)
            return send_email.delay(
                to_email=to_email, subject=subject, template='default',
                context=context, user_id=user_id, **kwargs,
            )

        if not trigger.status:
            logger.info('Trigger "%s" is disabled, skipping email', event_key)
            return None

        template_slug = trigger.template.slug if trigger.template else 'default'
    except Exception as e:
        logger.error('Error resolving trigger "%s": %s', event_key, e)
        template_slug = 'default'

    return send_email.delay(
        to_email=to_email, subject=subject, template=template_slug,
        context=context, user_id=user_id, **kwargs,
    )


def _build_send_params(to_email, subject, html_content, from_field,
                       reply_to=None, headers=None, tags=None,
                       scheduled_at=None):
    """Build Resend SDK v2 SendParams dict.

    Uses the Resend Python SDK v2+ typed parameter format.
    See: https://resend.com/docs/sdks
    """
    params: resend.Emails.SendParams = {
        'from': from_field,
        'to': [to_email] if isinstance(to_email, str) else to_email,
        'subject': subject,
        'html': html_content,
    }

    if reply_to:
        params['reply_to'] = [reply_to] if isinstance(reply_to, str) else reply_to

    if headers:
        params['headers'] = headers

    if tags:
        # Resend tags: list of {"name": "key", "value": "value"}
        params['tags'] = tags

    if scheduled_at:
        params['scheduled_at'] = scheduled_at

    return params


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_backoff_max=300,
    rate_limit='100/m',
)
def send_email(self, to_email, subject, template, context, user_id=None,
               campaign_id=None, journey_step_id=None, _log_id=None,
               tags=None, scheduled_at=None, idempotency_key=None):
    """Send an email via the active provider (Resend, ZeptoMail, or SMTP).

    Routes to the connected EmailProvider at send time. Falls back to Resend
    if no active provider is configured.

    Features:
    - Multi-provider: Resend SDK v2, ZeptoMail v1.1 REST API, SMTP
    - Retries up to 3 times with exponential backoff on transient failures
    - Checks suppression list before sending
    - Respects kill switch from EmailSettings
    - Uses admin-configurable sender info from EmailSettings
    - Rate-limited to 100/minute via Celery
    - Supports scheduled sending via scheduled_at (Resend only)
    - Supports tags for email categorization (Resend only)
    - Supports idempotency keys for deduplication (Resend only)
    """
    from .models import EmailLog, EmailSettings

    # Reuse existing log entry on retry to avoid duplicates
    if _log_id:
        try:
            log = EmailLog.objects.get(id=_log_id)
        except EmailLog.DoesNotExist:
            log = None
    else:
        log = None

    if not log:
        log = EmailLog.objects.create(
            user_id=user_id,
            to_email=to_email,
            subject=subject,
            template=template,
            context=context,
            status='pending',
            campaign_id=campaign_id,
            journey_step_id=journey_step_id,
        )

    # Check kill switch
    try:
        email_settings = EmailSettings.get_settings()
        if email_settings.kill_switch_enabled:
            log.status = 'failed'
            log.error_message = 'Kill switch enabled -- all emails paused'
            log.save(update_fields=['status', 'error_message'])
            return {'success': False, 'reason': 'kill_switch'}
    except Exception:
        email_settings = None

    # Check suppression list (bounced, complained, unsubscribed)
    try:
        from apps.marketing.models import SuppressionEntry
        if SuppressionEntry.objects.filter(email=to_email).exists():
            log.status = 'failed'
            log.error_message = 'Recipient is on suppression list'
            log.save(update_fields=['status', 'error_message'])
            return {'success': False, 'reason': 'suppressed'}
    except Exception:
        pass  # Marketing app may not be installed; continue

    try:
        # Render template using Django template engine (auto-escapes HTML)
        html_content = render_email_template(template, context)

        # Build sender info from EmailSettings or fall back to Django settings
        if email_settings:
            from_name = email_settings.default_from_name or 'Orion'
            from_email = email_settings.default_from_email or settings.DEFAULT_FROM_EMAIL
            from_field = f'{from_name} <{from_email}>'
            reply_to = email_settings.reply_to_address or None
        else:
            from_field = settings.DEFAULT_FROM_EMAIL
            reply_to = None

        # Determine active provider
        active_provider = _get_active_provider()
        provider_type = active_provider.provider_type if active_provider else 'resend'

        if provider_type in ('zeptomail', 'smtp'):
            # Append compliance footer for marketing emails
            if campaign_id or journey_step_id:
                try:
                    from apps.marketing.services.compliance_service import ComplianceService
                    from apps.users.models import User
                    if user_id:
                        user = User.objects.get(id=user_id)
                        token_obj = ComplianceService.generate_unsubscribe_token(
                            user=user,
                            campaign_id=campaign_id,
                            journey_step_id=journey_step_id,
                        )
                        footer_html = ComplianceService.get_compliance_footer_html(token_obj.token)
                        html_content = html_content + footer_html
                except Exception as exc:
                    logger.warning('Failed to generate unsubscribe footer: %s', exc)

            send_func = _send_via_zeptomail if provider_type == 'zeptomail' else _send_via_smtp
            send_func(
                provider=active_provider,
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                from_field=from_field,
                reply_to=reply_to,
            )

            log.status = 'sent'
            log.sent_at = timezone.now()
            log.save(update_fields=['status', 'sent_at'])

            return {'success': True, 'provider': provider_type}

        # --- Resend path (default) ---
        # Build email tags for Resend tracking
        email_tags = []
        if tags:
            email_tags = tags
        if template:
            email_tags.append({'name': 'template', 'value': template})
        if campaign_id:
            email_tags.append({'name': 'campaign_id', 'value': str(campaign_id)})
        if journey_step_id:
            email_tags.append({'name': 'journey_step_id', 'value': str(journey_step_id)})

        # Use provider's API key if available
        if active_provider and active_provider.api_key:
            resend.api_key = active_provider.api_key

        # Build Resend v2 SendParams
        params = _build_send_params(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_field=from_field,
            reply_to=reply_to,
            tags=email_tags if email_tags else None,
            scheduled_at=scheduled_at,
        )

        # Attach List-Unsubscribe headers for marketing emails
        if campaign_id or journey_step_id:
            try:
                from apps.marketing.services.compliance_service import ComplianceService
                from apps.users.models import User
                if user_id:
                    user = User.objects.get(id=user_id)
                    token_obj = ComplianceService.generate_unsubscribe_token(
                        user=user,
                        campaign_id=campaign_id,
                        journey_step_id=journey_step_id,
                    )
                    unsub_headers = ComplianceService.get_list_unsubscribe_headers(token_obj.token)
                    params['headers'] = unsub_headers
                    # Append compliance footer
                    footer_html = ComplianceService.get_compliance_footer_html(token_obj.token)
                    params['html'] = params['html'] + footer_html
            except Exception as exc:
                logger.warning('Failed to generate unsubscribe headers: %s', exc)

        # Set idempotency key if provided (Resend supports via headers)
        if idempotency_key:
            if 'headers' not in params:
                params['headers'] = {}
            params['headers']['Idempotency-Key'] = idempotency_key[:256]

        # Send via Resend SDK v2
        email = resend.Emails.send(params)

        log.status = 'sent'
        log.sent_at = timezone.now()
        # Resend v2 returns an object with 'id' attribute
        log.provider_id = email.get('id', '') if isinstance(email, dict) else getattr(email, 'id', '')
        log.save(update_fields=['status', 'sent_at', 'provider_id'])

        email_id = email.get('id', '') if isinstance(email, dict) else getattr(email, 'id', '')
        return {'success': True, 'id': email_id}

    except Exception as e:
        log.status = 'failed'
        log.error_message = str(e)
        log.save(update_fields=['status', 'error_message'])

        # Retry with backoff if attempts remain, passing log_id to avoid duplicates
        if self.request.retries < self.max_retries:
            raise self.retry(
                exc=e,
                kwargs={
                    'to_email': to_email,
                    'subject': subject,
                    'template': template,
                    'context': context,
                    'user_id': user_id,
                    'campaign_id': campaign_id,
                    'journey_step_id': journey_step_id,
                    '_log_id': log.id,
                    'tags': tags,
                    'scheduled_at': scheduled_at,
                    'idempotency_key': idempotency_key,
                },
            )

        return {'success': False, 'error': str(e)}


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    retry_backoff=True,
    rate_limit='10/m',
)
def send_batch_emails(self, email_list):
    """Send a batch of emails via the active provider.

    Resend: uses native Batch API (up to 100 per call).
    ZeptoMail/SMTP: sends individually in a loop.

    Args:
        email_list: List of dicts, each with keys:
            - to_email: str
            - subject: str
            - template: str
            - context: dict
            - user_id: int (optional)
            - campaign_id: int (optional)
            - tags: list (optional)
    """
    from .models import EmailLog, EmailSettings

    if not email_list:
        return {'success': True, 'sent': 0}

    # Cap at 100 per Resend batch limit
    batch = email_list[:100]

    # Check kill switch
    try:
        email_settings = EmailSettings.get_settings()
        if email_settings.kill_switch_enabled:
            return {'success': False, 'reason': 'kill_switch'}
    except Exception:
        email_settings = None

    # Build sender info
    if email_settings:
        from_name = email_settings.default_from_name or 'Orion'
        from_email = email_settings.default_from_email or settings.DEFAULT_FROM_EMAIL
        from_field = f'{from_name} <{from_email}>'
        reply_to = email_settings.reply_to_address or None
    else:
        from_field = settings.DEFAULT_FROM_EMAIL
        reply_to = None

    # Build batch params
    params_list = []
    log_entries = []

    for item in batch:
        to_email = item['to_email']
        subject = item['subject']
        template = item.get('template', 'default')
        context = item.get('context', {})

        # Check suppression
        try:
            from apps.marketing.models import SuppressionEntry
            if SuppressionEntry.objects.filter(email=to_email).exists():
                continue
        except Exception:
            pass

        html_content = render_email_template(template, context)

        email_tags = []
        if item.get('tags'):
            email_tags = item['tags']
        if template:
            email_tags.append({'name': 'template', 'value': template})
        if item.get('campaign_id'):
            email_tags.append({'name': 'campaign_id', 'value': str(item['campaign_id'])})

        params = _build_send_params(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_field=from_field,
            reply_to=reply_to,
            tags=email_tags if email_tags else None,
        )
        params_list.append(params)

        # Create log entry
        log = EmailLog.objects.create(
            user_id=item.get('user_id'),
            to_email=to_email,
            subject=subject,
            template=template,
            context=context,
            status='pending',
            campaign_id=item.get('campaign_id'),
        )
        log_entries.append(log)

    if not params_list:
        return {'success': True, 'sent': 0, 'reason': 'all_suppressed'}

    # Determine active provider
    active_provider = _get_active_provider()
    provider_type = active_provider.provider_type if active_provider else 'resend'

    try:
        now = timezone.now()

        if provider_type in ('zeptomail', 'smtp'):
            # ZeptoMail/SMTP: send individually (no native batch API)
            send_func = _send_via_zeptomail if provider_type == 'zeptomail' else _send_via_smtp
            for i, (params, log) in enumerate(zip(params_list, log_entries)):
                try:
                    send_func(
                        provider=active_provider,
                        to_email=params['to'],
                        subject=params['subject'],
                        html_content=params['html'],
                        from_field=params['from'],
                        reply_to=params.get('reply_to'),
                    )
                    log.status = 'sent'
                    log.sent_at = now
                    log.save(update_fields=['status', 'sent_at'])
                except Exception as e:
                    logger.error('Batch item %d failed via %s: %s', i, provider_type, e)
                    log.status = 'failed'
                    log.error_message = str(e)
                    log.save(update_fields=['status', 'error_message'])

            sent_count = sum(1 for l in log_entries if l.status == 'sent')
            return {'success': True, 'sent': sent_count, 'provider': provider_type}

        # --- Resend batch path (default) ---
        if active_provider and active_provider.api_key:
            resend.api_key = active_provider.api_key

        response = resend.Batch.send(params_list)

        response_data = response if isinstance(response, list) else getattr(response, 'data', [])
        for i, log in enumerate(log_entries):
            log.status = 'sent'
            log.sent_at = now
            if i < len(response_data):
                item = response_data[i]
                log.provider_id = item.get('id', '') if isinstance(item, dict) else getattr(item, 'id', '')
            log.save(update_fields=['status', 'sent_at', 'provider_id'])

        return {'success': True, 'sent': len(params_list)}

    except Exception as e:
        logger.error('Batch email send failed: %s', e)
        for log in log_entries:
            if log.status != 'sent':  # Don't overwrite already-sent items
                log.status = 'failed'
                log.error_message = str(e)
                log.save(update_fields=['status', 'error_message'])

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)

        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Resend SDK v2 — Email Management Tasks
# ---------------------------------------------------------------------------

@shared_task
def get_email_status(resend_email_id):
    """Retrieve the status of a sent email from Resend.

    Uses resend.Emails.get() to fetch delivery status, events, etc.
    Updates the corresponding EmailLog entry.
    """
    from .models import EmailLog

    try:
        email = resend.Emails.get(resend_email_id)

        # Update the local log
        try:
            log = EmailLog.objects.get(provider_id=resend_email_id)
            # Resend returns last_event which indicates current status
            last_event = None
            if isinstance(email, dict):
                last_event = email.get('last_event')
            else:
                last_event = getattr(email, 'last_event', None)

            if last_event == 'delivered':
                log.status = 'sent'
            elif last_event == 'bounced':
                log.status = 'bounced'
            elif last_event in ('failed', 'complained'):
                log.status = 'failed'

            log.save(update_fields=['status'])
        except EmailLog.DoesNotExist:
            pass

        return email if isinstance(email, dict) else email.__dict__

    except Exception as e:
        logger.error('Failed to get email status for %s: %s', resend_email_id, e)
        return {'error': str(e)}


@shared_task
def cancel_scheduled_email(resend_email_id):
    """Cancel a scheduled email that hasn't been sent yet.

    Uses resend.Emails.cancel() — only works for emails with scheduled_at
    that haven't been sent yet.
    """
    from .models import EmailLog

    try:
        result = resend.Emails.cancel(resend_email_id)

        # Update local log
        try:
            log = EmailLog.objects.get(provider_id=resend_email_id)
            log.status = 'failed'
            log.error_message = 'Cancelled by admin'
            log.save(update_fields=['status', 'error_message'])
        except EmailLog.DoesNotExist:
            pass

        return {'success': True, 'id': resend_email_id}

    except Exception as e:
        logger.error('Failed to cancel scheduled email %s: %s', resend_email_id, e)
        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Resend SDK v2 — Domain Management Tasks
# ---------------------------------------------------------------------------

@shared_task
def create_resend_domain(domain_name, region='us-east-1'):
    """Create a sending domain in Resend.

    Returns DNS records needed for verification (SPF, DKIM, MX).
    """
    try:
        params: resend.Domains.CreateParams = {
            'name': domain_name,
            'region': region,
        }
        domain = resend.Domains.create(params)
        result = domain if isinstance(domain, dict) else domain.__dict__

        logger.info('Created Resend domain: %s (region=%s)', domain_name, region)
        return {'success': True, 'domain': result}

    except Exception as e:
        logger.error('Failed to create Resend domain %s: %s', domain_name, e)
        return {'success': False, 'error': str(e)}


@shared_task
def verify_resend_domain(domain_id):
    """Trigger DNS verification for a Resend domain."""
    try:
        result = resend.Domains.verify(domain_id)
        return {'success': True, 'result': result if isinstance(result, dict) else str(result)}
    except Exception as e:
        logger.error('Failed to verify Resend domain %s: %s', domain_id, e)
        return {'success': False, 'error': str(e)}


@shared_task
def get_resend_domain(domain_id):
    """Get details and DNS records for a Resend domain."""
    try:
        domain = resend.Domains.get(domain_id)
        return domain if isinstance(domain, dict) else domain.__dict__
    except Exception as e:
        logger.error('Failed to get Resend domain %s: %s', domain_id, e)
        return {'error': str(e)}


@shared_task
def list_resend_domains():
    """List all domains in the Resend account."""
    try:
        domains = resend.Domains.list()
        if isinstance(domains, dict):
            return domains
        if hasattr(domains, 'data'):
            return {'data': [d if isinstance(d, dict) else d.__dict__ for d in domains.data]}
        return {'data': []}
    except Exception as e:
        logger.error('Failed to list Resend domains: %s', e)
        return {'error': str(e)}


@shared_task
def update_resend_domain(domain_id, open_tracking=None, click_tracking=None, tls=None):
    """Update tracking and TLS settings for a Resend domain."""
    try:
        params: resend.Domains.UpdateParams = {'id': domain_id}
        if open_tracking is not None:
            params['open_tracking'] = open_tracking
        if click_tracking is not None:
            params['click_tracking'] = click_tracking
        if tls is not None:
            params['tls'] = tls  # 'enforced' or 'opportunistic'

        result = resend.Domains.update(params)
        return {'success': True, 'result': result if isinstance(result, dict) else str(result)}
    except Exception as e:
        logger.error('Failed to update Resend domain %s: %s', domain_id, e)
        return {'success': False, 'error': str(e)}


@shared_task
def delete_resend_domain(domain_id):
    """Remove a sending domain from Resend."""
    try:
        resend.Domains.remove(domain_id)
        return {'success': True}
    except Exception as e:
        logger.error('Failed to delete Resend domain %s: %s', domain_id, e)
        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Resend SDK v2 — API Key Management Tasks
# ---------------------------------------------------------------------------

@shared_task
def list_resend_api_keys():
    """List all API keys in the Resend account."""
    try:
        keys = resend.ApiKeys.list()
        if isinstance(keys, dict):
            return keys
        if hasattr(keys, 'data'):
            return {'data': [k if isinstance(k, dict) else k.__dict__ for k in keys.data]}
        return {'data': []}
    except Exception as e:
        logger.error('Failed to list Resend API keys: %s', e)
        return {'error': str(e)}


@shared_task
def create_resend_api_key(name, permission='full_access', domain_id=None):
    """Create a new API key in Resend.

    Args:
        name: Display name for the key
        permission: 'full_access' or 'sending_access'
        domain_id: Optional domain restriction
    """
    try:
        params: resend.ApiKeys.CreateParams = {
            'name': name,
            'permission': permission,
        }
        if domain_id:
            params['domain_id'] = domain_id

        key = resend.ApiKeys.create(params)
        result = key if isinstance(key, dict) else key.__dict__
        return {'success': True, 'key': result}
    except Exception as e:
        logger.error('Failed to create Resend API key: %s', e)
        return {'success': False, 'error': str(e)}


@shared_task
def delete_resend_api_key(key_id):
    """Delete an API key from Resend."""
    try:
        resend.ApiKeys.remove(key_id)
        return {'success': True}
    except Exception as e:
        logger.error('Failed to delete Resend API key %s: %s', key_id, e)
        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Resend SDK v2 — Contact & Audience Management Tasks
# ---------------------------------------------------------------------------

@shared_task
def create_resend_audience(name):
    """Create a new audience (contact list) in Resend."""
    try:
        params: resend.Audiences.CreateParams = {'name': name}
        audience = resend.Audiences.create(params)
        result = audience if isinstance(audience, dict) else audience.__dict__
        return {'success': True, 'audience': result}
    except Exception as e:
        logger.error('Failed to create Resend audience: %s', e)
        return {'success': False, 'error': str(e)}


@shared_task
def list_resend_audiences():
    """List all audiences in Resend."""
    try:
        audiences = resend.Audiences.list()
        if isinstance(audiences, dict):
            return audiences
        if hasattr(audiences, 'data'):
            return {'data': [a if isinstance(a, dict) else a.__dict__ for a in audiences.data]}
        return {'data': []}
    except Exception as e:
        logger.error('Failed to list Resend audiences: %s', e)
        return {'error': str(e)}


@shared_task
def delete_resend_audience(audience_id):
    """Delete an audience from Resend."""
    try:
        resend.Audiences.remove(audience_id)
        return {'success': True}
    except Exception as e:
        logger.error('Failed to delete Resend audience %s: %s', audience_id, e)
        return {'success': False, 'error': str(e)}


@shared_task
def create_resend_contact(audience_id, email, first_name=None, last_name=None, unsubscribed=False):
    """Add a contact to a Resend audience."""
    try:
        params: resend.Contacts.CreateParams = {
            'audience_id': audience_id,
            'email': email,
            'unsubscribed': unsubscribed,
        }
        if first_name:
            params['first_name'] = first_name
        if last_name:
            params['last_name'] = last_name

        contact = resend.Contacts.create(params)
        result = contact if isinstance(contact, dict) else contact.__dict__
        return {'success': True, 'contact': result}
    except Exception as e:
        logger.error('Failed to create Resend contact: %s', e)
        return {'success': False, 'error': str(e)}


@shared_task
def list_resend_contacts(audience_id):
    """List all contacts in a Resend audience."""
    try:
        params: resend.Contacts.ListParams = {'audience_id': audience_id}
        contacts = resend.Contacts.list(params)
        if isinstance(contacts, dict):
            return contacts
        if hasattr(contacts, 'data'):
            return {'data': [c if isinstance(c, dict) else c.__dict__ for c in contacts.data]}
        return {'data': []}
    except Exception as e:
        logger.error('Failed to list Resend contacts for audience %s: %s', audience_id, e)
        return {'error': str(e)}


@shared_task
def remove_resend_contact(audience_id, contact_id):
    """Remove a contact from a Resend audience."""
    try:
        params: resend.Contacts.RemoveParams = {
            'audience_id': audience_id,
            'id': contact_id,
        }
        resend.Contacts.remove(params)
        return {'success': True}
    except Exception as e:
        logger.error('Failed to remove Resend contact %s: %s', contact_id, e)
        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Existing notification tasks (unchanged)
# ---------------------------------------------------------------------------

@shared_task
def send_job_alert_email(candidate_id, search_id, job_ids):
    """Send job alert email to candidate."""
    from apps.users.models import User
    from apps.applications.models import SavedSearch
    from apps.jobs.models import Job
    from .models import NotificationPreference

    candidate = User.objects.get(id=candidate_id)
    search = SavedSearch.objects.get(id=search_id)
    jobs = Job.objects.filter(id__in=job_ids)

    # Check preferences
    prefs, _ = NotificationPreference.objects.get_or_create(user=candidate)
    if not prefs.email_job_alerts:
        return

    context = {
        'name': candidate.first_name or 'there',
        'search_name': search.name,
        'job_count': len(jobs),
        'jobs': [{'title': j.title, 'company': j.company.name} for j in jobs],
    }

    send_email.delay(
        to_email=candidate.email,
        subject=f'New jobs matching "{search.name}"',
        template='job_alert',
        context=context,
        user_id=candidate_id
    )


@shared_task
def send_application_notification(application_id, notification_type):
    """Send notification about application."""
    from apps.applications.models import Application
    from .models import Notification, NotificationPreference

    application = Application.objects.select_related(
        'job', 'job__company', 'candidate'
    ).get(id=application_id)

    if notification_type == 'received':
        # Notify employer
        employer_users = application.job.company.users.filter(role='employer')

        for user in employer_users:
            # Create in-app notification
            Notification.objects.create(
                user=user,
                notification_type='application_received',
                title='New Application Received',
                message=f'{application.candidate.get_full_name()} applied to {application.job.title}',
                link=f'/company/applications/{application.id}',
                data={'application_id': application.id}
            )

            # Send email if enabled
            prefs, _ = NotificationPreference.objects.get_or_create(user=user)
            if prefs.email_application_received:
                send_email.delay(
                    to_email=user.email,
                    subject=f'New application for {application.job.title}',
                    template='application_received',
                    context={'job_title': application.job.title},
                    user_id=user.id
                )

    elif notification_type == 'status_change':
        # Notify candidate
        candidate = application.candidate

        Notification.objects.create(
            user=candidate,
            notification_type='application_status',
            title='Application Status Updated',
            message=f'Your application for {application.job.title} is now {application.status}',
            link=f'/candidate/applications/{application.id}',
            data={'application_id': application.id, 'status': application.status}
        )

        prefs, _ = NotificationPreference.objects.get_or_create(user=candidate)
        if prefs.email_application_status:
            send_email.delay(
                to_email=candidate.email,
                subject=f'Application update: {application.job.title}',
                template='application_status',
                context={
                    'name': candidate.first_name,
                    'job_title': application.job.title,
                    'company_name': application.job.company.name,
                    'status': application.status,
                },
                user_id=candidate.id
            )


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_slack_notification(self, channel, title, message, severity='info',
                            fields=None, action_url=None, mention=None):
    """
    Async Celery task to send Slack webhook notifications.
    Retries up to 3 times with exponential backoff on failure.
    """
    from .slack import slack_notify, SlackChannel

    try:
        ch = SlackChannel(channel)
    except ValueError:
        logger.error('Invalid Slack channel: %s', channel)
        return {'success': False, 'error': f'Invalid channel: {channel}'}

    success = slack_notify(
        channel=ch,
        title=title,
        message=message,
        severity=severity,
        fields=fields,
        action_url=action_url,
        mention=mention,
    )

    return {'success': success, 'channel': channel, 'title': title}


# ---------------------------------------------------------------------------
# Job lifecycle notifications
# ---------------------------------------------------------------------------

@shared_task
def notify_job_pending_review(job_id):
    """Notify all admin users that a job has been submitted for review."""
    from apps.jobs.models import Job
    from apps.users.models import User
    from .models import Notification, NotificationPreference

    try:
        job = Job.all_objects.select_related('company', 'posted_by').get(id=job_id)
    except Job.DoesNotExist:
        logger.error('notify_job_pending_review: Job %s not found', job_id)
        return

    company_name = job.company.name if job.company else 'Unknown'
    location = job.city or (job.get_location_type_display() if hasattr(job, 'get_location_type_display') else (job.location_type or ''))

    # Get all active admin users
    admin_users = User.objects.filter(role='admin', status='active')

    for admin_user in admin_users:
        Notification.objects.create(
            user=admin_user,
            notification_type='job_pending_review',
            title='Job Submitted for Review',
            message=f'{company_name} submitted "{job.title}" for review.',
            link='/admin/jobs?status=pending',
            data={
                'job_id': job.id,
                'job_title': job.title,
                'company_name': company_name,
                'company_id': job.company_id,
            },
        )

        # Send email to admins (respect their preference)
        prefs, _ = NotificationPreference.objects.get_or_create(user=admin_user)
        if prefs.email_job_status:
            send_email.delay(
                to_email=admin_user.email,
                subject=f'Job pending review: {job.title}',
                template='job_pending_review',
                context={
                    'name': admin_user.first_name or 'Admin',
                    'job_title': job.title,
                    'company_name': company_name,
                    'location': location,
                    'time': timezone.now().strftime('%Y-%m-%d %H:%M UTC'),
                    'review_url': '/admin/jobs?status=pending',
                },
                user_id=admin_user.id,
            )


@shared_task
def notify_job_approved(job_id):
    """Notify the employer that their job has been approved."""
    from apps.jobs.models import Job
    from .models import Notification, NotificationPreference

    try:
        job = Job.objects.select_related('company', 'posted_by').get(id=job_id)
    except Job.DoesNotExist:
        logger.error('notify_job_approved: Job %s not found', job_id)
        return

    # Notify the user who posted the job
    user = job.posted_by
    if not user:
        return

    Notification.objects.create(
        user=user,
        notification_type='job_approved',
        title='Job Approved',
        message=f'Your job "{job.title}" has been approved and is now live.',
        link=f'/company/jobs/{job.id}',
        data={
            'job_id': job.id,
            'job_title': job.title,
        },
    )

    # Send email if user has email_job_status enabled
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    if prefs.email_job_status:
        send_email.delay(
            to_email=user.email,
            subject=f'Your job "{job.title}" is now live!',
            template='job_approved',
            context={
                'name': user.first_name or 'there',
                'job_title': job.title,
                'job_url': f'/company/jobs/{job.id}',
            },
            user_id=user.id,
        )


@shared_task
def notify_job_rejected(job_id, reason=''):
    """Notify the employer that their job has been rejected."""
    from apps.jobs.models import Job
    from .models import Notification, NotificationPreference

    try:
        job = Job.all_objects.select_related('company', 'posted_by').get(id=job_id)
    except Job.DoesNotExist:
        logger.error('notify_job_rejected: Job %s not found', job_id)
        return

    user = job.posted_by
    if not user:
        return

    reason_text = reason or 'The job did not meet our posting guidelines.'

    Notification.objects.create(
        user=user,
        notification_type='job_rejected',
        title='Job Not Approved',
        message=f'Your job "{job.title}" was not approved. Reason: {reason_text}',
        link=f'/company/jobs/{job.id}',
        data={
            'job_id': job.id,
            'job_title': job.title,
            'reason': reason_text,
        },
    )

    # Send email if user has email_job_status enabled
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    if prefs.email_job_status:
        send_email.delay(
            to_email=user.email,
            subject=f'Job posting update: {job.title}',
            template='job_rejected',
            context={
                'name': user.first_name or 'there',
                'job_title': job.title,
                'reason': reason_text,
                'job_url': f'/company/jobs/{job.id}/edit',
            },
            user_id=user.id,
        )


# ---------------------------------------------------------------------------
# Billing notifications
# ---------------------------------------------------------------------------

@shared_task
def notify_payment_success(invoice_id):
    """Notify user of successful payment."""
    from apps.billing.models import Invoice
    from .models import Notification, NotificationPreference

    try:
        invoice = Invoice.objects.select_related('company', 'agency').get(id=invoice_id)
    except Invoice.DoesNotExist:
        logger.error('notify_payment_success: Invoice %s not found', invoice_id)
        return

    # Find the users to notify (company owner or agency owner)
    from apps.users.models import User
    users = []
    if invoice.company:
        users = list(User.objects.filter(company=invoice.company, role='employer'))
    elif invoice.agency:
        users = list(User.objects.filter(agency=invoice.agency, role='agency'))

    for user in users:
        Notification.objects.create(
            user=user,
            notification_type='payment_success',
            title='Payment Successful',
            message=f'Your payment of ${invoice.amount} {invoice.currency} has been processed successfully.',
            link='/company/billing' if invoice.company else '/agency/billing',
            data={
                'invoice_id': invoice.id,
                'amount': str(invoice.amount),
                'currency': invoice.currency,
            },
        )

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        if prefs.email_billing:
            send_email.delay(
                to_email=user.email,
                subject='Payment confirmation',
                template='payment_success',
                context={
                    'name': user.first_name or 'there',
                    'amount': str(invoice.amount),
                    'currency': invoice.currency,
                    'content': f'Your payment of ${invoice.amount} {invoice.currency} has been processed successfully.',
                },
                user_id=user.id,
            )


@shared_task
def notify_payment_failed(company_id=None, agency_id=None, invoice_id=None,
                          error_message=''):
    """Notify user their payment was declined."""
    from .models import Notification, NotificationPreference
    from apps.users.models import User

    users = []
    link = '/company/billing'
    if company_id:
        users = list(User.objects.filter(company_id=company_id, role='employer'))
        link = '/company/billing'
    elif agency_id:
        users = list(User.objects.filter(agency_id=agency_id, role='agency'))
        link = '/agency/billing'

    if not users:
        logger.warning('notify_payment_failed: No users found for company=%s agency=%s',
                       company_id, agency_id)
        return

    for user in users:
        Notification.objects.create(
            user=user,
            notification_type='payment_failed',
            title='Payment Failed',
            message='Your payment could not be processed. Please update your payment method to avoid service interruption.',
            link=link,
            data={
                'invoice_id': invoice_id,
                'error': error_message,
            },
        )

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        if prefs.email_billing:
            send_email.delay(
                to_email=user.email,
                subject='Payment failed -- action required',
                template='payment_failed',
                context={
                    'name': user.first_name or 'there',
                    'content': 'Your payment could not be processed. Please update your payment method.',
                    'billing_url': f'{settings.FRONTEND_URL}{link}',
                },
                user_id=user.id,
            )


@shared_task
def notify_payment_action_required(company_id=None, agency_id=None,
                                   hosted_url=''):
    """Notify user that payment authentication is required (SCA/3DS)."""
    from .models import Notification, NotificationPreference
    from apps.users.models import User

    users = []
    link = '/company/billing'
    if company_id:
        users = list(User.objects.filter(company_id=company_id, role='employer'))
        link = '/company/billing'
    elif agency_id:
        users = list(User.objects.filter(agency_id=agency_id, role='agency'))
        link = '/agency/billing'

    if not users:
        return

    for user in users:
        Notification.objects.create(
            user=user,
            notification_type='payment_action_required',
            title='Payment Authentication Required',
            message='Your payment requires additional authentication. Please complete the verification to avoid service interruption.',
            link=link,
            data={
                'hosted_url': hosted_url,
            },
        )

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        if prefs.email_billing:
            send_email.delay(
                to_email=user.email,
                subject='Payment authentication required',
                template='payment_action_required',
                context={
                    'name': user.first_name or 'there',
                    'hosted_url': hosted_url,
                    'content': 'Your payment requires additional authentication. Please click the link to complete verification.',
                },
                user_id=user.id,
            )


@shared_task
def notify_subscription_past_due(company_id=None, agency_id=None,
                                 invoice_id=None):
    """Notify user their subscription payment failed."""
    from .models import Notification, NotificationPreference
    from apps.users.models import User

    users = []
    link = '/company/billing'
    if company_id:
        users = list(User.objects.filter(company_id=company_id, role='employer'))
        link = '/company/billing'
    elif agency_id:
        users = list(User.objects.filter(agency_id=agency_id, role='agency'))
        link = '/agency/billing'

    if not users:
        return

    for user in users:
        Notification.objects.create(
            user=user,
            notification_type='subscription_past_due',
            title='Subscription Payment Failed',
            message='Your subscription payment has failed. Please update your payment method to maintain your subscription.',
            link=link,
            data={
                'invoice_id': invoice_id,
            },
        )

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        if prefs.email_billing:
            send_email.delay(
                to_email=user.email,
                subject='Subscription payment failed -- update payment method',
                template='subscription_past_due',
                context={
                    'name': user.first_name or 'there',
                    'content': 'Your subscription payment has failed. Please update your payment method to maintain your subscription.',
                    'billing_url': f'{settings.FRONTEND_URL}{link}',
                },
                user_id=user.id,
            )


@shared_task
def cleanup_old_email_logs():
    """Daily cleanup of old email logs with two-tier retention (GDPR + CAN-SPAM).

    Tier 1: sent/pending logs — deleted after log_retention_days (default 90)
    Tier 2: bounced/failed logs — deleted after compliance_retention_days (default 1095 / 3 years)

    Setting either to 0 = keep forever. Batch deletes in chunks of 5,000.
    Creates an AuditLog entry for accountability (GDPR Article 5(2)).
    """
    from datetime import timedelta
    from .models import EmailLog, EmailSettings

    email_settings = EmailSettings.get_settings()
    general_days = email_settings.log_retention_days
    compliance_days = email_settings.compliance_retention_days
    now = timezone.now()
    total_deleted = 0

    # Tier 1: sent/pending logs
    if general_days > 0:
        cutoff = now - timedelta(days=general_days)
        qs = EmailLog.objects.filter(
            status__in=['sent', 'pending'],
            created_at__lt=cutoff,
        )
        while True:
            batch_ids = list(qs.values_list('id', flat=True)[:5000])
            if not batch_ids:
                break
            deleted, _ = EmailLog.objects.filter(id__in=batch_ids).delete()
            total_deleted += deleted

    # Tier 2: bounced/failed logs
    if compliance_days > 0:
        cutoff = now - timedelta(days=compliance_days)
        qs = EmailLog.objects.filter(
            status__in=['bounced', 'failed'],
            created_at__lt=cutoff,
        )
        while True:
            batch_ids = list(qs.values_list('id', flat=True)[:5000])
            if not batch_ids:
                break
            deleted, _ = EmailLog.objects.filter(id__in=batch_ids).delete()
            total_deleted += deleted

    # Update settings with cleanup info
    email_settings.last_cleanup_at = now
    email_settings.last_cleanup_count = total_deleted
    email_settings.save(update_fields=['last_cleanup_at', 'last_cleanup_count'])

    # Create audit log entry (no PII — just counts and config)
    try:
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            actor=None,
            action='delete',
            target_type='emaillog',
            target_id='bulk',
            target_repr=f'Automated cleanup: {total_deleted} records deleted',
            changes={
                'deleted_count': total_deleted,
                'general_retention_days': general_days,
                'compliance_retention_days': compliance_days,
            },
            reason='Scheduled email log retention cleanup (GDPR + CAN-SPAM)',
        )
    except Exception:
        logger.warning('Failed to create audit log for email cleanup', exc_info=True)

    return {
        'deleted': total_deleted,
        'general_retention_days': general_days,
        'compliance_retention_days': compliance_days,
    }

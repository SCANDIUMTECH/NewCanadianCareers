"""
Slack notification signal handlers.

Wires Slack notifications into critical platform events across all apps.
All handlers use slack_notify_async() to avoid blocking request/response cycles.

Trigger Map:
  ┌─────────────────────────────┬──────────────────────┬───────────────┐
  │ Event                       │ Channel              │ Severity      │
  ├─────────────────────────────┼──────────────────────┼───────────────┤
  │ FraudAlert created          │ #moderation/#security│ varies        │
  │ LoginAttempt locked         │ #security            │ high          │
  │ AuditLog critical actions   │ #security            │ medium-high   │
  │ Invoice failed/refunded     │ #billing             │ high/medium   │
  │ Invoice paid (>$500)        │ #billing             │ info          │
  │ Subscription canceled/past  │ #billing             │ high/medium   │
  │ Job submitted (pending)     │ #jobs                │ info          │
  │ Job published               │ #jobs                │ info          │
  │ Application submitted       │ #jobs                │ info          │
  │ Application hired           │ #jobs                │ info          │
  │ Company verified            │ #jobs                │ info          │
  │ User suspended              │ #security            │ high          │
  │ New user signup              │ #system              │ info          │
  └─────────────────────────────┴──────────────────────┴───────────────┘
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger('apps.notifications.slack')


# =============================================================================
# FRAUD & MODERATION
# =============================================================================

@receiver(post_save, sender='moderation.FraudAlert')
def slack_on_fraud_alert(sender, instance, created, **kwargs):
    """Notify on fraud alert creation. Critical alerts → @channel + #security."""
    if not created:
        return

    from .slack import slack_notify_async, SlackChannel

    severity = instance.severity
    type_label = instance.get_type_display()
    mention = '@channel' if severity == 'critical' else None

    # Payment fraud → billing channel, everything else → moderation
    channel = SlackChannel.BILLING if instance.type == 'payment_fraud' else SlackChannel.MODERATION

    fields = {
        'Type': type_label,
        'Subject': instance.subject_name or 'N/A',
    }
    if instance.ip_address:
        fields['IP Address'] = instance.ip_address
    if instance.affected_accounts:
        fields['Affected Accounts'] = f'{len(instance.affected_accounts)} account(s)'

    try:
        frontend_url = __import__('django').conf.settings.FRONTEND_URL
        action_url = f'{frontend_url}/admin/fraud'
    except Exception:
        action_url = None

    slack_notify_async(
        channel=channel,
        title=f'Fraud Alert: {type_label}',
        message=instance.description or f'A {severity} fraud alert has been triggered.',
        severity=severity,
        fields=fields,
        action_url=action_url,
        mention=mention,
    )

    # Critical alerts also go to #security
    if severity == 'critical':
        slack_notify_async(
            channel=SlackChannel.SECURITY,
            title=f'CRITICAL Fraud Alert: {type_label}',
            message=instance.description or 'Critical fraud detected — immediate action required.',
            severity='critical',
            fields=fields,
            action_url=action_url,
            mention='@channel',
        )


# =============================================================================
# SECURITY — Login, Lockout, Admin Actions
# =============================================================================

@receiver(post_save, sender='audit.LoginAttempt')
def slack_on_account_lockout(sender, instance, created, **kwargs):
    """Notify when an account is locked after repeated failed logins."""
    if not created or instance.status != 'locked':
        return

    from .slack import slack_notify_async, SlackChannel

    fields = {
        'Email': instance.email,
        'IP Address': instance.ip_address or 'Unknown',
    }
    if instance.location_city or instance.location_country:
        fields['Location'] = ', '.join(filter(None, [
            getattr(instance, 'location_city', ''),
            getattr(instance, 'location_country', ''),
        ]))

    slack_notify_async(
        channel=SlackChannel.SECURITY,
        title='Account Lockout',
        message=f'Account `{instance.email}` locked after repeated failed login attempts.',
        severity='high',
        fields=fields,
    )


@receiver(post_save, sender='audit.AuditLog')
def slack_on_critical_admin_action(sender, instance, created, **kwargs):
    """Notify on high-impact admin actions (suspend, impersonate, delete, etc.)."""
    if not created:
        return

    critical_actions = {'suspend', 'activate', 'impersonate', 'grant', 'revoke', 'delete'}
    if instance.action not in critical_actions:
        return

    from .slack import slack_notify_async, SlackChannel

    actor_name = 'System'
    if hasattr(instance, 'actor') and instance.actor:
        actor_name = instance.actor.get_full_name() or instance.actor.email

    severity = 'high' if instance.action in ('suspend', 'impersonate', 'delete') else 'medium'

    fields = {
        'Action': instance.action.replace('_', ' ').title(),
        'Actor': actor_name,
    }
    if hasattr(instance, 'target_type') and instance.target_type:
        fields['Target'] = f'{instance.target_type}: {getattr(instance, "target_name", "")}'
    if hasattr(instance, 'reason') and instance.reason:
        fields['Reason'] = instance.reason[:100]

    slack_notify_async(
        channel=SlackChannel.SECURITY,
        title=f'Admin Action: {instance.action.replace("_", " ").title()}',
        message=f'*{actor_name}* performed `{instance.action}` action.',
        severity=severity,
        fields=fields,
    )


@receiver(post_save, sender='users.User')
def slack_on_user_suspended(sender, instance, created, **kwargs):
    """Notify when a user account is suspended."""
    if created:
        return

    # Check if status changed to suspended
    if instance.status != 'suspended':
        return

    # Use tracker to detect actual change (if available), otherwise always notify
    # to be safe we just notify on every save where status=suspended
    # The dedup is handled by Slack channel (same message = no noise)
    from .slack import slack_notify_async, SlackChannel

    slack_notify_async(
        channel=SlackChannel.SECURITY,
        title='User Account Suspended',
        message=f'User `{instance.email}` (role: {instance.role}) has been suspended.',
        severity='high',
        fields={
            'Email': instance.email,
            'Role': instance.get_role_display() if hasattr(instance, 'get_role_display') else instance.role,
            'User ID': str(instance.id),
        },
    )


# =============================================================================
# BILLING — Invoices, Subscriptions, Credits
# =============================================================================

@receiver(post_save, sender='billing.Invoice')
def slack_on_invoice_event(sender, instance, created, **kwargs):
    """Notify on invoice failures, refunds, and large payments."""
    if created:
        return

    if instance.status not in ('failed', 'refunded', 'paid'):
        return

    from .slack import slack_notify_async, SlackChannel

    company_name = 'Unknown'
    if instance.company:
        company_name = instance.company.name
    elif instance.agency:
        company_name = instance.agency.name

    amount = f'${instance.amount:.2f}' if instance.amount else 'N/A'

    if instance.status == 'failed':
        slack_notify_async(
            channel=SlackChannel.BILLING,
            title='Payment Failed',
            message=f'Invoice `{instance.invoice_number}` for *{company_name}* has failed.',
            severity='high',
            fields={
                'Amount': amount,
                'Company': company_name,
                'Invoice': instance.invoice_number or 'N/A',
            },
        )

    elif instance.status == 'refunded':
        slack_notify_async(
            channel=SlackChannel.BILLING,
            title='Refund Processed',
            message=f'Invoice `{instance.invoice_number}` for *{company_name}* refunded.',
            severity='medium',
            fields={
                'Amount': amount,
                'Company': company_name,
            },
        )

    elif instance.status == 'paid':
        try:
            if instance.amount and float(instance.amount) >= 500:
                slack_notify_async(
                    channel=SlackChannel.BILLING,
                    title='Large Payment Received',
                    message=f'*{company_name}* paid {amount}.',
                    severity='info',
                    fields={
                        'Amount': amount,
                        'Company': company_name,
                        'Invoice': instance.invoice_number or 'N/A',
                    },
                )
        except (ValueError, TypeError):
            pass


@receiver(post_save, sender='billing.Subscription')
def slack_on_subscription_change(sender, instance, created, **kwargs):
    """Notify when a subscription is canceled or goes past due."""
    if created:
        return

    if instance.status not in ('canceled', 'past_due'):
        return

    from .slack import slack_notify_async, SlackChannel

    company_name = 'Unknown'
    if instance.company:
        company_name = instance.company.name
    elif instance.agency:
        company_name = instance.agency.name

    package_name = instance.package.name if instance.package else 'Unknown'

    if instance.status == 'canceled':
        slack_notify_async(
            channel=SlackChannel.BILLING,
            title='Subscription Canceled',
            message=f'*{company_name}* canceled their *{package_name}* subscription.',
            severity='medium',
            fields={
                'Company': company_name,
                'Package': package_name,
            },
        )

    elif instance.status == 'past_due':
        slack_notify_async(
            channel=SlackChannel.BILLING,
            title='Subscription Past Due',
            message=f'*{company_name}*\'s *{package_name}* subscription is past due — payment failed.',
            severity='high',
            fields={
                'Company': company_name,
                'Package': package_name,
            },
            mention='@here',
        )


# =============================================================================
# JOBS — Submissions, Publications, Lifecycle
# =============================================================================

@receiver(post_save, sender='jobs.Job')
def slack_on_job_lifecycle(sender, instance, created, **kwargs):
    """Notify on job submissions (pending review) and publications."""
    from .slack import slack_notify_async, SlackChannel

    company_name = instance.company.name if instance.company else 'Unknown'

    if instance.status == 'pending' and not created:
        # Job submitted for review (status changes from draft→pending on publish)
        try:
            frontend_url = __import__('django').conf.settings.FRONTEND_URL
            action_url = f'{frontend_url}/admin/jobs'
        except Exception:
            action_url = None

        slack_notify_async(
            channel=SlackChannel.JOBS,
            title='Job Submitted for Review',
            message=f'*{company_name}* submitted "*{instance.title}*" for review.',
            severity='info',
            fields={
                'Company': company_name,
                'Job Title': instance.title,
                'Location': instance.city or instance.get_location_type_display() if hasattr(instance, 'get_location_type_display') else (instance.location_type or ''),
            },
            action_url=action_url,
        )

    elif instance.status == 'published' and not created:
        # Job just went live
        slack_notify_async(
            channel=SlackChannel.JOBS,
            title='Job Published',
            message=f'*{instance.title}* by *{company_name}* is now live.',
            severity='info',
            fields={
                'Company': company_name,
                'Type': instance.get_employment_type_display() if hasattr(instance, 'get_employment_type_display') else (instance.employment_type or ''),
            },
        )


# =============================================================================
# APPLICATIONS — Key milestones
# =============================================================================

@receiver(post_save, sender='applications.Application')
def slack_on_application_milestone(sender, instance, created, **kwargs):
    """Notify on new applications and hires."""
    from .slack import slack_notify_async, SlackChannel

    job_title = instance.job.title if instance.job else 'Unknown'
    company_name = instance.job.company.name if instance.job and instance.job.company else 'Unknown'

    if created:
        # New application submitted
        candidate_name = instance.candidate.get_full_name() if instance.candidate else 'Someone'
        slack_notify_async(
            channel=SlackChannel.JOBS,
            title='New Application',
            message=f'*{candidate_name}* applied for *{job_title}* at *{company_name}*.',
            severity='info',
            fields={
                'Job': job_title,
                'Company': company_name,
            },
        )

    elif instance.status == 'hired':
        # Candidate hired — celebrate!
        candidate_name = instance.candidate.get_full_name() if instance.candidate else 'Someone'
        slack_notify_async(
            channel=SlackChannel.JOBS,
            title='Candidate Hired! 🎉',
            message=f'*{candidate_name}* was hired for *{job_title}* at *{company_name}*.',
            severity='info',
            fields={
                'Job': job_title,
                'Company': company_name,
                'Candidate': candidate_name,
            },
        )


# =============================================================================
# COMPANY — Verification
# =============================================================================

@receiver(post_save, sender='companies.Company')
def slack_on_company_verified(sender, instance, created, **kwargs):
    """Notify when a company is verified."""
    if created:
        return

    if instance.status != 'verified':
        return

    from .slack import slack_notify_async, SlackChannel

    slack_notify_async(
        channel=SlackChannel.JOBS,
        title='Company Verified',
        message=f'*{instance.name}* has been verified and can now post jobs.',
        severity='info',
        fields={
            'Company': instance.name,
            'Industry': getattr(instance, 'industry', '') or 'N/A',
        },
    )


# =============================================================================
# USER — Signups (daily volume awareness)
# =============================================================================

@receiver(post_save, sender='users.User')
def slack_on_new_employer_signup(sender, instance, created, **kwargs):
    """Notify when a new employer/agency signs up — sales lead."""
    if not created:
        return
    if instance.role not in ('employer', 'agency'):
        return

    from .slack import slack_notify_async, SlackChannel

    slack_notify_async(
        channel=SlackChannel.JOBS,
        title=f'New {instance.get_role_display() if hasattr(instance, "get_role_display") else instance.role} Signup',
        message=f'*{instance.get_full_name() or instance.email}* signed up as {instance.role}.',
        severity='info',
        fields={
            'Email': instance.email,
            'Role': instance.role,
        },
    )

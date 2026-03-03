"""Seed email templates into the database from Django filesystem templates."""

from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from datetime import datetime

from apps.notifications.models import EmailTemplate
from apps.notifications.tasks import EMAIL_TEMPLATES


# Template metadata: slug -> (name, type, subject, preheader, variables)
TEMPLATE_META = {
    'welcome': {
        'name': 'Welcome Email',
        'type': 'Transactional',
        'subject': 'Welcome to Orion, {{ name }}',
        'preheader': 'Your account is ready. Start exploring opportunities on Orion.',
        'variables': ['name', 'current_year'],
    },
    'email_verification': {
        'name': 'Email Verification',
        'type': 'Transactional',
        'subject': 'Verify your email address',
        'preheader': 'Verify your email to activate your Orion account.',
        'variables': ['name', 'verify_url', 'current_year'],
    },
    'password_reset': {
        'name': 'Password Reset',
        'type': 'Transactional',
        'subject': 'Reset your password',
        'preheader': 'Reset your Orion password. This link expires in 1 hour.',
        'variables': ['name', 'reset_url', 'current_year'],
    },
    'security_alert': {
        'name': 'Security Alert',
        'type': 'System',
        'subject': 'Security alert on your Orion account',
        'preheader': 'Multiple failed login attempts detected on your Orion account.',
        'variables': ['name', 'ip_address', 'location', 'time', 'reset_url', 'current_year'],
    },
    'fraud_alert': {
        'name': 'Fraud Alert',
        'type': 'System',
        'subject': 'Fraud Alert: {{ severity }}',
        'preheader': '{{ severity }} fraud alert triggered on Orion.',
        'variables': [
            'name', 'severity', 'alert_type', 'subject_name', 'description',
            'ip_address', 'indicators', 'rule_name', 'time', 'alert_url', 'current_year',
        ],
    },
    'job_pending_review': {
        'name': 'Job Pending Review',
        'type': 'Transactional',
        'subject': 'Job submitted for review: {{ job_title }}',
        'preheader': '{{ company_name }} submitted "{{ job_title }}" for review.',
        'variables': ['name', 'job_title', 'company_name', 'location', 'time', 'review_url', 'current_year'],
    },
    'job_approved': {
        'name': 'Job Approved',
        'type': 'Transactional',
        'subject': 'Your job is live: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" is now live on Orion.',
        'variables': ['name', 'job_title', 'job_url', 'current_year'],
    },
    'job_rejected': {
        'name': 'Job Rejected',
        'type': 'Transactional',
        'subject': 'Job not approved: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" was not approved.',
        'variables': ['name', 'job_title', 'reason', 'job_url', 'current_year'],
    },
    'application_received': {
        'name': 'Application Received',
        'type': 'Transactional',
        'subject': 'New application for {{ job_title }}',
        'preheader': 'A candidate has applied for {{ job_title }}.',
        'variables': ['job_title', 'current_year'],
    },
    'application_status': {
        'name': 'Application Status Update',
        'type': 'Transactional',
        'subject': 'Application update: {{ job_title }}',
        'preheader': 'Your application for {{ job_title }} has been updated.',
        'variables': ['name', 'job_title', 'company_name', 'status', 'current_year'],
    },
    'job_alert': {
        'name': 'Job Alert',
        'type': 'Marketing',
        'subject': '{{ job_count }} new jobs matching "{{ search_name }}"',
        'preheader': '{{ job_count }} new jobs match your "{{ search_name }}" alert.',
        'variables': ['name', 'job_count', 'search_name', 'jobs', 'current_year'],
    },
    'payment_success': {
        'name': 'Payment Successful',
        'type': 'Transactional',
        'subject': 'Payment confirmed',
        'preheader': 'Your payment has been confirmed. Thank you for your purchase.',
        'variables': ['name', 'content', 'current_year'],
    },
    'payment_failed': {
        'name': 'Payment Failed',
        'type': 'Transactional',
        'subject': 'Payment failed',
        'preheader': 'Your payment could not be processed.',
        'variables': ['name', 'content', 'billing_url', 'current_year'],
    },
    'payment_action_required': {
        'name': 'Payment Action Required',
        'type': 'Transactional',
        'subject': 'Payment authentication required',
        'preheader': 'Your payment requires additional authentication to complete.',
        'variables': ['name', 'content', 'hosted_url', 'current_year'],
    },
    'subscription_past_due': {
        'name': 'Subscription Past Due',
        'type': 'Transactional',
        'subject': 'Subscription payment failed',
        'preheader': 'Your subscription payment failed. Update your payment method.',
        'variables': ['name', 'content', 'billing_url', 'current_year'],
    },
    'account_verified': {
        'name': 'Account Verified',
        'type': 'Transactional',
        'subject': 'Your {{ entity_type }} is verified',
        'preheader': 'Your {{ entity_type }} has been verified on Orion.',
        'variables': ['name', 'entity_type', 'dashboard_url', 'current_year'],
    },
    'team_invite': {
        'name': 'Team Invitation',
        'type': 'Transactional',
        'subject': 'Join {{ company_name }} on Orion',
        'preheader': '{{ inviter_name }} invited you to join {{ company_name }} on Orion.',
        'variables': ['name', 'inviter_name', 'company_name', 'role', 'invite_url', 'current_year'],
    },
    'job_expired': {
        'name': 'Job Expired',
        'type': 'Transactional',
        'subject': 'Job expired: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" has expired.',
        'variables': ['name', 'job_title', 'expired_date', 'repost_url', 'current_year'],
    },
    'job_expiring_soon': {
        'name': 'Job Expiring Soon',
        'type': 'Transactional',
        'subject': 'Job expiring soon: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" expires in {{ days_remaining }} days.',
        'variables': ['name', 'job_title', 'expires_date', 'days_remaining', 'job_url', 'current_year'],
    },
    'job_published': {
        'name': 'Job Published',
        'type': 'Transactional',
        'subject': 'Job is live: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" is now live on Orion.',
        'variables': ['name', 'job_title', 'job_url', 'current_year'],
    },
    'job_scheduled': {
        'name': 'Job Scheduled',
        'type': 'Transactional',
        'subject': 'Job scheduled: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" is scheduled to go live on {{ scheduled_date }}.',
        'variables': ['name', 'job_title', 'scheduled_date', 'job_url', 'current_year'],
    },
    'job_admin_action': {
        'name': 'Job Admin Action',
        'type': 'Transactional',
        'subject': 'Action on your job: {{ job_title }}',
        'preheader': 'Your job posting "{{ job_title }}" requires attention.',
        'variables': ['name', 'job_title', 'action', 'reason', 'job_url', 'current_year'],
    },
    'job_filled': {
        'name': 'Job Filled',
        'type': 'Transactional',
        'subject': 'Job filled: {{ job_title }}',
        'preheader': 'Congratulations! Your job posting "{{ job_title }}" has been marked as filled.',
        'variables': ['name', 'job_title', 'applications_count', 'current_year'],
    },
    'credits_low': {
        'name': 'Credits Running Low',
        'type': 'Transactional',
        'subject': 'Credits running low',
        'preheader': 'You have {{ credits_remaining }} job posting credits remaining.',
        'variables': ['name', 'credits_remaining', 'billing_url', 'current_year'],
    },
    'subscription_canceled': {
        'name': 'Subscription Canceled',
        'type': 'Transactional',
        'subject': 'Subscription canceled',
        'preheader': 'Your {{ plan_name }} subscription has been canceled.',
        'variables': ['name', 'plan_name', 'end_date', 'resubscribe_url', 'current_year'],
    },
    'subscription_renewed': {
        'name': 'Subscription Renewed',
        'type': 'Transactional',
        'subject': 'Subscription renewed',
        'preheader': 'Your {{ plan_name }} subscription has been renewed.',
        'variables': ['name', 'plan_name', 'next_billing_date', 'billing_url', 'current_year'],
    },
    'credits_update': {
        'name': 'Credits Update',
        'type': 'Transactional',
        'subject': 'Credits update',
        'preheader': 'Your job posting credits have been updated.',
        'variables': ['name', 'content', 'credits_amount', 'credits_remaining', 'billing_url', 'current_year'],
    },
    'invoice_ready': {
        'name': 'Invoice Ready',
        'type': 'Transactional',
        'subject': 'Invoice #{{ invoice_number }} ready',
        'preheader': 'Your invoice #{{ invoice_number }} for {{ amount }} is ready.',
        'variables': ['name', 'invoice_number', 'amount', 'invoice_url', 'current_year'],
    },
    'account_locked': {
        'name': 'Account Locked',
        'type': 'System',
        'subject': 'Your account has been locked',
        'preheader': 'Your Orion account has been temporarily locked due to multiple failed login attempts.',
        'variables': ['name', 'unlock_time', 'reset_url', 'current_year'],
    },
    'account_suspended': {
        'name': 'Account Suspended',
        'type': 'System',
        'subject': 'Your account has been suspended',
        'preheader': 'Your Orion account has been suspended.',
        'variables': ['name', 'reason', 'support_url', 'current_year'],
    },
    'account_reactivated': {
        'name': 'Account Reactivated',
        'type': 'System',
        'subject': 'Your account has been reactivated',
        'preheader': 'Your Orion account has been reactivated.',
        'variables': ['name', 'dashboard_url', 'current_year'],
    },
    'security_confirmation': {
        'name': 'Security Confirmation',
        'type': 'Transactional',
        'subject': 'Security confirmation: {{ change_type }}',
        'preheader': 'Your {{ change_type }} was successfully changed on Orion.',
        'variables': ['name', 'change_type', 'time', 'ip_address', 'reset_url', 'current_year'],
    },
    'data_export_ready': {
        'name': 'Data Export Ready',
        'type': 'Transactional',
        'subject': 'Your data export is ready',
        'preheader': 'Your data export is ready for download.',
        'variables': ['name', 'download_url', 'expiry_hours', 'current_year'],
    },
    'account_deleted': {
        'name': 'Account Deleted',
        'type': 'System',
        'subject': 'Your account has been deleted',
        'preheader': 'Your Orion account has been permanently deleted.',
        'variables': ['name', 'current_year'],
    },
    'application_withdrawn': {
        'name': 'Application Withdrawn',
        'type': 'Transactional',
        'subject': 'Application withdrawn: {{ job_title }}',
        'preheader': '{{ candidate_name }} has withdrawn their application for {{ job_title }}.',
        'variables': ['name', 'candidate_name', 'job_title', 'job_url', 'current_year'],
    },
    'application_message': {
        'name': 'Application Message',
        'type': 'Transactional',
        'subject': 'New message about {{ job_title }}',
        'preheader': '{{ sender_name }} sent you a message about {{ job_title }}.',
        'variables': ['name', 'sender_name', 'job_title', 'message_preview', 'message_url', 'current_year'],
    },
    'default': {
        'name': 'Default Template',
        'type': 'System',
        'subject': 'Notification from Orion',
        'preheader': '',
        'variables': ['content', 'current_year'],
    },
}


class Command(BaseCommand):
    help = 'Seed email templates into the database from Django filesystem templates.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing templates (by slug)',
        )

    def handle(self, *args, **options):
        force = options['force']
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for slug, template_path in EMAIL_TEMPLATES.items():
            meta = TEMPLATE_META.get(slug)
            if not meta:
                self.stderr.write(self.style.WARNING(f'No metadata for template "{slug}", skipping'))
                skipped_count += 1
                continue

            # Render the template, preserving {{ variable }} placeholders so
            # the DB-stored HTML can be re-rendered with real context at send time.
            # Each variable maps to its own Django template tag literal.
            dummy_context = {'current_year': datetime.now().year}
            for var in meta.get('variables', []):
                if var != 'current_year':
                    dummy_context[var] = '{{ ' + var + ' }}'
            try:
                html = render_to_string(template_path, dummy_context)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed to render "{slug}": {e}'))
                skipped_count += 1
                continue

            existing = EmailTemplate.objects.filter(slug=slug).first()

            if existing and not force:
                self.stdout.write(f'  Template "{slug}" already exists, skipping (use --force to overwrite)')
                skipped_count += 1
                continue

            if existing and force:
                existing.name = meta['name']
                existing.type = meta['type']
                existing.subject = meta['subject']
                existing.preheader = meta['preheader']
                existing.html = html
                existing.variables = meta['variables']
                existing.status = 'Published'
                existing.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Updated "{slug}"'))
            else:
                EmailTemplate.objects.create(
                    name=meta['name'],
                    slug=slug,
                    type=meta['type'],
                    status='Published',
                    subject=meta['subject'],
                    preheader=meta['preheader'],
                    html=html,
                    variables=meta['variables'],
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created "{slug}"'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done: {created_count} created, {updated_count} updated, {skipped_count} skipped'
        ))

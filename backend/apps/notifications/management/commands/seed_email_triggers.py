"""Seed email triggers into the database."""

from django.core.management.base import BaseCommand

from apps.notifications.models import EmailTrigger, EmailTemplate


# (name, event_key, category, audience, template_slug or None, enabled)
TRIGGER_DEFINITIONS = [
    # ── Onboarding ──
    ('Welcome Email', 'user.welcome', 'Onboarding', 'All Users', 'welcome', True),
    ('Email Verification', 'user.email_verification', 'Onboarding', 'All Users', 'email_verification', True),
    ('Company Verified', 'company.verified', 'Onboarding', 'Company', 'account_verified', True),
    ('Agency Verified', 'agency.verified', 'Onboarding', 'Agency', 'account_verified', True),

    # ── Activation ──
    ('Complete Your Profile', 'user.complete_profile', 'Activation', 'All Users', 'default', False),
    ('Post Your First Job', 'company.first_job_nudge', 'Activation', 'Company', 'default', False),
    ('Team Member Invited', 'team.member_invited', 'Activation', 'All Users', 'team_invite', True),
    ('Team Invite Resent', 'team.invite_resent', 'Activation', 'All Users', 'team_invite', True),

    # ── Jobs ──
    ('Job Pending Review', 'job.pending_review', 'Jobs', 'Admin', 'job_pending_review', True),
    ('Job Approved', 'job.approved', 'Jobs', 'Company', 'job_approved', True),
    ('Job Rejected', 'job.rejected', 'Jobs', 'Company', 'job_rejected', True),
    ('Job Expired', 'job.expired', 'Jobs', 'Company', 'job_expired', True),
    ('Job Reposted', 'job.reposted', 'Jobs', 'Admin', 'default', False),
    ('Job Expiring Soon', 'job.expiring_soon', 'Jobs', 'Company', 'job_expiring_soon', True),
    ('Job Published', 'job.published', 'Jobs', 'Company', 'job_published', True),
    ('Job Paused by Admin', 'job.paused_by_admin', 'Jobs', 'Company', 'job_admin_action', True),
    ('Job Hidden by Admin', 'job.hidden', 'Jobs', 'Company', 'job_admin_action', True),
    ('Job Unhidden by Admin', 'job.unhidden', 'Jobs', 'Company', 'job_admin_action', True),
    ('Job Scheduled', 'job.scheduled', 'Jobs', 'Company', 'job_scheduled', True),
    ('Scheduled Job Went Live', 'job.scheduled_published', 'Jobs', 'Company', 'job_published', True),
    ('Job Marked as Filled', 'job.filled', 'Jobs', 'Company', 'job_filled', False),
    ('Job Held for Review (Auto)', 'job.held_for_spam', 'Jobs', 'Company', 'job_admin_action', True),

    # ── Billing ──
    ('Payment Successful', 'billing.payment_success', 'Billing', 'Company', 'payment_success', True),
    ('Payment Failed', 'billing.payment_failed', 'Billing', 'Company', 'payment_failed', True),
    ('Payment Action Required', 'billing.action_required', 'Billing', 'Company', 'payment_action_required', True),
    ('Subscription Past Due', 'billing.subscription_past_due', 'Billing', 'Company', 'subscription_past_due', True),
    ('Credits Running Low', 'billing.credits_low', 'Billing', 'Company', 'credits_low', True),
    ('Subscription Canceled', 'billing.subscription_canceled', 'Billing', 'Company', 'subscription_canceled', True),
    ('Subscription Renewed', 'billing.subscription_renewed', 'Billing', 'Company', 'subscription_renewed', True),
    ('Credits Granted by Admin', 'billing.credits_granted', 'Billing', 'Company', 'credits_update', True),
    ('Credits Expiring Soon', 'billing.credits_expiring', 'Billing', 'Company', 'credits_update', True),
    ('Invoice Ready', 'billing.invoice_ready', 'Billing', 'Company', 'invoice_ready', True),

    # ── Trust & Safety ──
    ('Password Reset', 'user.password_reset', 'Trust & Safety', 'All Users', 'password_reset', True),
    ('Security Alert', 'user.security_alert', 'Trust & Safety', 'All Users', 'security_alert', True),
    ('Fraud Alert', 'admin.fraud_alert', 'Trust & Safety', 'Admin', 'fraud_alert', True),
    ('Account Locked', 'user.account_locked', 'Trust & Safety', 'All Users', 'account_locked', True),
    ('Account Suspended', 'user.account_suspended', 'Trust & Safety', 'All Users', 'account_suspended', True),
    ('Account Reactivated', 'user.account_reactivated', 'Trust & Safety', 'All Users', 'account_reactivated', True),
    ('Email Address Changed', 'user.email_changed', 'Trust & Safety', 'All Users', 'security_confirmation', True),
    ('Password Changed', 'user.password_changed', 'Trust & Safety', 'All Users', 'security_confirmation', True),
    ('Company Suspended', 'company.suspended', 'Trust & Safety', 'Company', 'account_suspended', True),
    ('Agency Suspended', 'agency.suspended', 'Trust & Safety', 'Agency', 'account_suspended', True),

    # ── Support ──
    ('Admin Password Reset', 'admin.reset_user_password', 'Support', 'All Users', 'password_reset', True),
    ('Admin Resend Verification', 'admin.resend_verification', 'Support', 'All Users', 'email_verification', True),
    ('Data Export Ready', 'user.data_export_ready', 'Support', 'All Users', 'data_export_ready', True),
    ('Account Deleted', 'user.account_deleted', 'Support', 'All Users', 'account_deleted', True),

    # ── Notifications ──
    ('Application Received', 'application.received', 'Notifications', 'Company', 'application_received', True),
    ('Application Status Update', 'application.status_changed', 'Notifications', 'Candidate', 'application_status', True),
    ('Job Alert', 'candidate.job_alert', 'Notifications', 'Candidate', 'job_alert', True),
    ('Application Withdrawn', 'application.withdrawn', 'Notifications', 'Company', 'application_withdrawn', True),
    ('Application Message', 'application.message_received', 'Notifications', 'All Users', 'application_message', True),
    ('New Company Signup', 'admin.new_company_signup', 'Notifications', 'Admin', 'default', False),
    ('New Agency Signup', 'admin.new_agency_signup', 'Notifications', 'Admin', 'default', False),
    ('Job Report Threshold', 'admin.job_report_spike', 'Notifications', 'Admin', 'default', False),

    # ── Marketing ──
    ('Weekly Digest', 'candidate.weekly_digest', 'Marketing', 'Candidate', 'default', False),
    ('Campaign Email', 'marketing.campaign_send', 'Marketing', 'All Users', 'default', True),
    ('Journey Step Email', 'marketing.journey_step', 'Marketing', 'All Users', 'default', True),

    # ── System ──
    ('System Notification', 'system.notification', 'System', 'All Users', 'default', True),
    ('Maintenance Alert', 'system.maintenance', 'System', 'All Users', 'default', False),
    ('Social Post Failed', 'admin.social_post_failed', 'System', 'Admin', 'default', False),
    ('Stripe Webhook Failed', 'admin.stripe_webhook_failed', 'System', 'Admin', 'default', False),
    ('Email Deliverability Alert', 'admin.email_deliverability', 'System', 'Admin', 'default', False),
]


class Command(BaseCommand):
    help = 'Seed email triggers into the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing triggers (matched by event_key)',
        )

    def handle(self, *args, **options):
        force = options['force']
        created_count = 0
        updated_count = 0
        skipped_count = 0

        # Pre-fetch all templates by slug for efficient lookup
        templates = {t.slug: t for t in EmailTemplate.objects.all()}

        for name, event_key, category, audience, template_slug, enabled in TRIGGER_DEFINITIONS:
            template = templates.get(template_slug) if template_slug else None

            if template_slug and not template:
                self.stderr.write(self.style.WARNING(
                    f'  Template "{template_slug}" not found for trigger "{event_key}", linking as None'
                ))

            existing = EmailTrigger.objects.filter(event_key=event_key).first()

            if existing and not force:
                self.stdout.write(
                    f'  Trigger "{event_key}" already exists, skipping (use --force to overwrite)'
                )
                skipped_count += 1
                continue

            if existing and force:
                existing.name = name
                existing.category = category
                existing.audience = audience
                existing.template = template
                existing.status = enabled
                existing.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Updated "{event_key}"'))
            else:
                EmailTrigger.objects.create(
                    name=name,
                    event_key=event_key,
                    category=category,
                    audience=audience,
                    template=template,
                    status=enabled,
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created "{event_key}"'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done: {created_count} created, {updated_count} updated, {skipped_count} skipped'
        ))

"""
Fraud detection services for Orion.
Evaluates fraud rules against user/system activity and creates alerts.
"""
import logging
from datetime import timedelta

from django.db import models
from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """Service for evaluating fraud detection rules and creating alerts."""

    @classmethod
    def evaluate_all_rules(cls):
        """Evaluate all enabled fraud rules. Called by Celery beat task."""
        from .models import FraudRule

        rules = FraudRule.objects.filter(enabled=True)
        total_alerts = 0

        for rule in rules:
            try:
                alerts_created = cls.evaluate_rule(rule)
                total_alerts += alerts_created
            except Exception as e:
                logger.error(f"Error evaluating fraud rule '{rule.name}' (id={rule.id}): {e}")

        logger.info(f"Fraud scan complete: evaluated {rules.count()} rules, created {total_alerts} alerts")
        return total_alerts

    @classmethod
    def evaluate_rule(cls, rule):
        """Evaluate a single fraud rule based on its conditions."""
        from .models import FraudRule

        conditions = rule.conditions or {}
        check_type = conditions.get('check_type')

        if not check_type:
            return 0

        evaluator = cls._get_evaluator(check_type)
        if not evaluator:
            logger.warning(f"No evaluator for check_type '{check_type}' in rule '{rule.name}'")
            return 0

        return evaluator(rule, conditions)

    @classmethod
    def _get_evaluator(cls, check_type):
        """Return the evaluator function for a given check type."""
        evaluators = {
            'multiple_accounts': cls._check_multiple_accounts,
            'suspicious_activity': cls._check_suspicious_activity,
            'payment_fraud': cls._check_payment_fraud,
            'credential_stuffing': cls._check_credential_stuffing,
            'fake_listings': cls._check_fake_listings,
            'fake_job': cls._check_fake_job,
            'spam': cls._check_spam,
            'identity_fraud': cls._check_identity_fraud,
            'disposable_email': cls._check_disposable_email,
        }
        return evaluators.get(check_type)

    # =========================================================================
    # Individual Rule Evaluators
    # =========================================================================

    @classmethod
    def _check_multiple_accounts(cls, rule, conditions):
        """Detect multiple accounts from the same IP address."""
        from apps.users.models import User
        from apps.audit.models import LoginAttempt

        max_accounts = conditions.get('max_accounts_per_ip', 3)
        time_window = timedelta(hours=conditions.get('time_window_hours', 24))
        cutoff = timezone.now() - time_window

        # Find IPs with too many distinct users
        ip_groups = (
            LoginAttempt.objects
            .filter(created_at__gte=cutoff, status='success')
            .values('ip_address')
            .annotate(user_count=Count('user', distinct=True))
            .filter(user_count__gt=max_accounts)
        )

        alerts_created = 0
        for group in ip_groups:
            ip = group['ip_address']
            if not ip:
                continue

            # Skip if we already have an open alert for this IP
            if cls._has_open_alert(rule, 'multiple_accounts', ip_address=ip):
                continue

            # Get the affected user emails
            affected_users = list(
                LoginAttempt.objects
                .filter(created_at__gte=cutoff, ip_address=ip, status='success')
                .values_list('email', flat=True)
                .distinct()
            )

            cls._create_alert(
                rule=rule,
                alert_type='multiple_accounts',
                severity=rule.severity,
                subject_type='user',
                subject_id=0,
                subject_name=f'IP: {ip}',
                description=f"{group['user_count']} accounts logged in from IP {ip} within {conditions.get('time_window_hours', 24)} hours (threshold: {max_accounts}).",
                indicators=[f"{group['user_count']} distinct users from same IP"],
                ip_address=ip,
                affected_accounts=affected_users[:20],
            )
            alerts_created += 1

        return alerts_created

    @classmethod
    def _check_suspicious_activity(cls, rule, conditions):
        """Detect suspicious login patterns (brute force)."""
        from apps.audit.models import LoginAttempt

        max_failures = conditions.get('failed_login_attempts', 5)
        time_window = timedelta(minutes=conditions.get('time_window_minutes', 30))
        cutoff = timezone.now() - time_window

        # Find IPs with excessive failures
        ip_groups = (
            LoginAttempt.objects
            .filter(created_at__gte=cutoff, status='failed')
            .values('ip_address')
            .annotate(fail_count=Count('id'))
            .filter(fail_count__gt=max_failures)
        )

        alerts_created = 0
        for group in ip_groups:
            ip = group['ip_address']
            if not ip:
                continue

            if cls._has_open_alert(rule, 'suspicious_activity', ip_address=ip):
                continue

            targeted_emails = list(
                LoginAttempt.objects
                .filter(created_at__gte=cutoff, ip_address=ip, status='failed')
                .values_list('email', flat=True)
                .distinct()[:20]
            )

            cls._create_alert(
                rule=rule,
                alert_type='suspicious_activity',
                severity=rule.severity,
                subject_type='user',
                subject_id=0,
                subject_name=f'IP: {ip}',
                description=f"{group['fail_count']} failed login attempts from IP {ip} within {conditions.get('time_window_minutes', 30)} minutes (threshold: {max_failures}).",
                indicators=[
                    f"{group['fail_count']} failed attempts",
                    f"{len(targeted_emails)} targeted accounts",
                ],
                ip_address=ip,
                affected_accounts=targeted_emails,
            )
            alerts_created += 1

        return alerts_created

    @classmethod
    def _check_credential_stuffing(cls, rule, conditions):
        """Detect credential stuffing (many failed logins for many different accounts from one IP)."""
        from apps.audit.models import LoginAttempt

        max_failures = conditions.get('failed_login_attempts', 10)
        time_window = timedelta(minutes=conditions.get('time_window_minutes', 15))
        cutoff = timezone.now() - time_window

        # Credential stuffing = many distinct emails targeted from one IP
        ip_groups = (
            LoginAttempt.objects
            .filter(created_at__gte=cutoff, status='failed')
            .values('ip_address')
            .annotate(
                fail_count=Count('id'),
                distinct_emails=Count('email', distinct=True),
            )
            .filter(fail_count__gt=max_failures, distinct_emails__gt=3)
        )

        alerts_created = 0
        for group in ip_groups:
            ip = group['ip_address']
            if not ip:
                continue

            if cls._has_open_alert(rule, 'credential_stuffing', ip_address=ip):
                continue

            targeted_emails = list(
                LoginAttempt.objects
                .filter(created_at__gte=cutoff, ip_address=ip, status='failed')
                .values_list('email', flat=True)
                .distinct()[:20]
            )

            cls._create_alert(
                rule=rule,
                alert_type='credential_stuffing',
                severity=rule.severity,
                subject_type='user',
                subject_id=0,
                subject_name=f'IP: {ip}',
                description=f"Credential stuffing detected: {group['fail_count']} failed attempts targeting {group['distinct_emails']} accounts from IP {ip}.",
                indicators=[
                    f"{group['fail_count']} failed attempts",
                    f"{group['distinct_emails']} distinct accounts targeted",
                ],
                ip_address=ip,
                affected_accounts=targeted_emails,
            )
            alerts_created += 1

        return alerts_created

    @classmethod
    def _check_payment_fraud(cls, rule, conditions):
        """Detect suspicious payment patterns."""
        from apps.billing.models import Transaction

        velocity_threshold = conditions.get('velocity_threshold', 10)
        amount_threshold = conditions.get('amount_threshold', 1000)
        cutoff = timezone.now() - timedelta(hours=1)

        # Check for velocity (too many transactions in an hour)
        alerts_created = 0

        company_groups = (
            Transaction.objects
            .filter(created_at__gte=cutoff, status='completed')
            .values('company_id', 'company__name')
            .annotate(tx_count=Count('id'))
            .filter(tx_count__gt=velocity_threshold)
        )

        for group in company_groups:
            company_id = group['company_id']
            if not company_id:
                continue

            if cls._has_open_alert(rule, 'payment_fraud', subject_type='company', subject_id=company_id):
                continue

            cls._create_alert(
                rule=rule,
                alert_type='payment_fraud',
                severity=rule.severity,
                subject_type='company',
                subject_id=company_id,
                subject_name=group['company__name'] or f'Company #{company_id}',
                description=f"{group['tx_count']} transactions in the last hour from company '{group['company__name']}' (threshold: {velocity_threshold}).",
                indicators=[f"{group['tx_count']} transactions in 1 hour"],
                ip_address=None,
                affected_accounts=[],
            )
            alerts_created += 1

        # Check for high-value transactions
        high_value_txs = (
            Transaction.objects
            .filter(
                created_at__gte=cutoff,
                status='completed',
                amount__gt=amount_threshold,
            )
            .select_related('company')
        )

        for tx in high_value_txs:
            company_id = tx.company_id
            if not company_id:
                continue

            if cls._has_open_alert(rule, 'payment_fraud', subject_type='company', subject_id=company_id):
                continue

            cls._create_alert(
                rule=rule,
                alert_type='payment_fraud',
                severity=rule.severity,
                subject_type='company',
                subject_id=company_id,
                subject_name=tx.company.name if tx.company else f'Company #{company_id}',
                description=f"High-value transaction of ${tx.amount} from '{tx.company.name if tx.company else 'unknown'}' (threshold: ${amount_threshold}).",
                indicators=[f"Transaction amount: ${tx.amount}"],
                ip_address=None,
                affected_accounts=[],
            )
            alerts_created += 1

        return alerts_created

    @classmethod
    def _check_fake_listings(cls, rule, conditions):
        """Detect fake job listings using keyword matching."""
        return cls._check_job_keywords(rule, conditions, alert_type='fake_listings')

    @classmethod
    def _check_fake_job(cls, rule, conditions):
        """Detect fake jobs using keyword matching."""
        return cls._check_job_keywords(rule, conditions, alert_type='fake_job')

    @classmethod
    def _check_spam(cls, rule, conditions):
        """Detect spam job postings using keyword matching."""
        return cls._check_job_keywords(rule, conditions, alert_type='spam')

    @classmethod
    def _check_job_keywords(cls, rule, conditions, alert_type):
        """Shared keyword-matching logic for fake_listings, fake_job, and spam rules."""
        from apps.jobs.models import Job

        blocked_keywords = conditions.get('blocked_keywords', [])
        match_threshold = conditions.get('match_threshold', 2)

        if not blocked_keywords:
            return 0

        # Check recently published jobs (last 24 hours)
        cutoff = timezone.now() - timedelta(hours=24)
        recent_jobs = Job.objects.filter(
            created_at__gte=cutoff,
            status__in=['published', 'pending'],
        ).select_related('company')

        alerts_created = 0
        for job in recent_jobs:
            searchable = f"{job.title} {job.description}".lower()
            matches = [kw for kw in blocked_keywords if kw.lower() in searchable]

            if len(matches) >= match_threshold:
                if cls._has_open_alert(rule, alert_type, subject_type='job', subject_id=job.id):
                    continue

                company_name = job.company.name if job.company else 'Unknown'
                cls._create_alert(
                    rule=rule,
                    alert_type=alert_type,
                    severity=rule.severity,
                    subject_type='job',
                    subject_id=job.id,
                    subject_name=f'{job.title} ({company_name})',
                    description=f"Job '{job.title}' matches {len(matches)} blocked keywords: {', '.join(matches)} (threshold: {match_threshold}).",
                    indicators=[f"Matched keyword: {kw}" for kw in matches],
                    ip_address=None,
                    affected_accounts=[company_name],
                )
                alerts_created += 1

        return alerts_created

    @classmethod
    def _check_identity_fraud(cls, rule, conditions):
        """Detect potential identity fraud (duplicate registrations with similar names)."""
        from apps.users.models import User

        threshold = conditions.get('threshold', 85)
        time_window = timedelta(hours=conditions.get('time_window_hours', 48))
        cutoff = timezone.now() - time_window

        # Find users with same first+last name created recently
        recent_users = User.objects.filter(date_joined__gte=cutoff).values(
            'first_name', 'last_name'
        ).annotate(
            user_count=Count('id')
        ).filter(
            user_count__gt=1,
        ).exclude(
            Q(first_name='') | Q(last_name='')
        )

        alerts_created = 0
        for group in recent_users:
            first = group['first_name']
            last = group['last_name']
            name = f"{first} {last}"

            if cls._has_open_alert(rule, 'identity_fraud', subject_name_contains=name):
                continue

            duplicate_users = list(
                User.objects
                .filter(first_name=first, last_name=last, date_joined__gte=cutoff)
                .values_list('email', flat=True)
            )

            cls._create_alert(
                rule=rule,
                alert_type='identity_fraud',
                severity=rule.severity,
                subject_type='user',
                subject_id=0,
                subject_name=name,
                description=f"{group['user_count']} accounts registered with the name '{name}' within {conditions.get('time_window_hours', 48)} hours.",
                indicators=[f"{group['user_count']} accounts with identical name"],
                ip_address=None,
                affected_accounts=duplicate_users[:20],
            )
            alerts_created += 1

        return alerts_created

    @classmethod
    def _check_disposable_email(cls, rule, conditions):
        """Detect users registering with disposable/temporary email providers."""
        from apps.users.models import User

        # Default list of known disposable email providers
        default_disposable_domains = [
            'mailinator.com', 'tempmail.com', 'guerrillamail.com', 'throwaway.email',
            'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
            'dispostable.com', 'trashmail.com', 'tempail.com', 'temp-mail.org',
            'fakeinbox.com', 'mailnesia.com', 'maildrop.cc', 'discard.email',
            'mailcatch.com', 'mintemail.com', 'tempinbox.com', 'mohmal.com',
            'getnada.com', 'emailondeck.com', 'tempr.email', 'burnermail.io',
            '10minutemail.com', 'guerrillamail.info', 'guerrillamail.net',
            'guerrillamail.org', 'guerrillamail.de', 'trashmail.net',
            'trashmail.me', 'harakirimail.com', 'mailexpire.com', 'throwam.com',
            'tempomail.fr', 'jetable.org', 'trash-mail.com', 'mytemp.email',
            'tmpmail.net', 'tmpmail.org', 'binkmail.com', 'safetymail.info',
            'filzmail.com', 'tmail.ws', 'mailnull.com', 'spamgourmet.com',
        ]

        # Merge with custom blocked domains from rule conditions
        custom_domains = conditions.get('blocked_domains', [])
        all_blocked = set(d.lower().strip() for d in (default_disposable_domains + custom_domains) if d)

        if not all_blocked:
            return 0

        time_window = timedelta(hours=conditions.get('time_window_hours', 24))
        cutoff = timezone.now() - time_window

        # Check recently registered users
        recent_users = User.objects.filter(date_joined__gte=cutoff)

        alerts_created = 0
        for user in recent_users:
            if not user.email:
                continue

            domain = user.email.rsplit('@', 1)[-1].lower() if '@' in user.email else ''
            if domain not in all_blocked:
                continue

            if cls._has_open_alert(rule, 'disposable_email', subject_type='user', subject_id=user.id):
                continue

            cls._create_alert(
                rule=rule,
                alert_type='disposable_email',
                severity=rule.severity,
                subject_type='user',
                subject_id=user.id,
                subject_name=user.email,
                description=f"User registered with disposable email provider: {domain} (email: {user.email}).",
                indicators=[f"Disposable domain: {domain}"],
                ip_address=None,
                affected_accounts=[user.email],
            )
            alerts_created += 1

        return alerts_created

    # =========================================================================
    # Helpers
    # =========================================================================

    @classmethod
    def _has_open_alert(cls, rule, alert_type, ip_address=None, subject_type=None, subject_id=None, subject_name_contains=None):
        """Check if there's already an open/investigating alert for this scenario to avoid duplicates."""
        from .models import FraudAlert

        qs = FraudAlert.objects.filter(
            type=alert_type,
            status__in=['open', 'investigating'],
        )

        if ip_address:
            qs = qs.filter(ip_address=ip_address)
        if subject_type and subject_id:
            qs = qs.filter(subject_type=subject_type, subject_id=subject_id)
        if subject_name_contains:
            qs = qs.filter(subject_name__icontains=subject_name_contains)

        return qs.exists()

    @classmethod
    def create_realtime_alert(cls, alert_type, severity, subject_type, subject_id, subject_name, description, indicators, ip_address=None, affected_accounts=None):
        """Create a fraud alert from a real-time event (not triggered by a scheduled rule scan).

        Use this for immediate security events detected in views (e.g., lockout bypass
        attempts, login code flooding). The alert appears in the admin fraud dashboard
        and triggers admin notifications.
        """
        from .models import FraudAlert

        # Deduplicate: skip if an open alert already exists for this scenario
        if cls._has_open_alert(rule=None, alert_type=alert_type, ip_address=ip_address,
                               subject_type=subject_type, subject_id=subject_id):
            return None

        alert = FraudAlert.objects.create(
            type=alert_type,
            severity=severity,
            status='open',
            subject_type=subject_type,
            subject_id=subject_id,
            subject_name=subject_name,
            description=description,
            indicators=indicators or [],
            ip_address=ip_address,
            affected_accounts=affected_accounts or [],
        )

        # Trigger notification asynchronously (rule_id=None for realtime alerts)
        from .tasks import notify_fraud_alert
        try:
            notify_fraud_alert.delay(alert.id, None)
        except Exception as e:
            logger.error(f"Failed to queue fraud notification for alert {alert.id}: {e}")

        # Auto-mitigate for critical severity
        if severity == 'critical':
            from .tasks import auto_mitigate_fraud
            try:
                auto_mitigate_fraud.delay(alert.id)
            except Exception as e:
                logger.error(f"Failed to queue auto-mitigation for alert {alert.id}: {e}")

        logger.info(f"Realtime fraud alert created: [{severity}] {alert_type} - {subject_name}")
        return alert

    @classmethod
    def _create_alert(cls, rule, alert_type, severity, subject_type, subject_id, subject_name, description, indicators, ip_address, affected_accounts):
        """Create a FraudAlert, increment rule counter, and trigger notifications."""
        from .models import FraudAlert, FraudRule

        alert = FraudAlert.objects.create(
            type=alert_type,
            severity=severity,
            status='open',
            subject_type=subject_type,
            subject_id=subject_id,
            subject_name=subject_name,
            description=description,
            indicators=indicators,
            ip_address=ip_address,
            affected_accounts=affected_accounts,
        )

        # Increment rule triggers count
        FraudRule.objects.filter(id=rule.id).update(
            triggers_count=models.F('triggers_count') + 1
        )

        # Trigger notification asynchronously
        from .tasks import notify_fraud_alert
        try:
            notify_fraud_alert.delay(alert.id, rule.id)
        except Exception as e:
            logger.error(f"Failed to queue fraud notification for alert {alert.id}: {e}")

        # Auto-mitigate for critical severity
        if severity == 'critical':
            from .tasks import auto_mitigate_fraud
            try:
                auto_mitigate_fraud.delay(alert.id)
            except Exception as e:
                logger.error(f"Failed to queue auto-mitigation for alert {alert.id}: {e}")

        logger.info(f"Fraud alert created: [{severity}] {alert_type} - {subject_name} (rule: {rule.name})")
        return alert

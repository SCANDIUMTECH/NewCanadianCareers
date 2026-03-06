"""
Journey automation service.
Handles enrollment, step execution, goal checking, and trigger processing.
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.text import slugify

logger = logging.getLogger(__name__)


class JourneyService:
    """Service layer for automation journeys."""

    # ─── Journey Lifecycle ─────────────────────────────────────────

    @staticmethod
    def create_journey(data, created_by):
        from ..models import Journey

        name = data.get('name', '')
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while Journey.all_objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        return Journey.objects.create(
            **data,
            slug=slug,
            created_by=created_by,
        )

    @staticmethod
    def activate_journey(journey):
        if journey.status not in ('draft', 'paused'):
            raise ValueError(f'Cannot activate journey in {journey.status} status.')
        if not journey.steps.exists():
            raise ValueError('Journey must have at least one step before activation.')
        journey.status = 'active'
        journey.save(update_fields=['status', 'updated_at'])
        return journey

    @staticmethod
    def pause_journey(journey):
        if journey.status != 'active':
            raise ValueError(f'Cannot pause journey in {journey.status} status.')
        journey.status = 'paused'
        journey.save(update_fields=['status', 'updated_at'])
        return journey

    @staticmethod
    def archive_journey(journey):
        from ..models import JourneyEnrollment

        if journey.status not in ('draft', 'paused'):
            raise ValueError(f'Cannot archive journey in {journey.status} status.')
        # Exit all active enrollments
        JourneyEnrollment.objects.filter(
            journey=journey, status='active'
        ).update(status='exited_manual', completed_at=timezone.now())
        journey.status = 'archived'
        journey.save(update_fields=['status', 'updated_at'])
        return journey

    @staticmethod
    def duplicate_journey(journey, created_by):
        from ..models import Journey, JourneyStep

        new_journey = Journey.objects.create(
            name=f'{journey.name} (Copy)',
            slug=f'{slugify(journey.name)}-copy-{timezone.now().strftime("%Y%m%d%H%M%S")}',
            status='draft',
            description=journey.description,
            trigger_type=journey.trigger_type,
            trigger_config=journey.trigger_config,
            max_entries_per_user=journey.max_entries_per_user,
            cooldown_hours=journey.cooldown_hours,
            goal_type=journey.goal_type,
            goal_config=journey.goal_config,
            created_by=created_by,
        )

        # Duplicate steps — first pass: create steps without branch FKs
        old_to_new = {}
        for step in journey.steps.order_by('sort_order'):
            old_id = step.id
            new_step = JourneyStep.objects.create(
                journey=new_journey,
                step_type=step.step_type,
                name=step.name,
                sort_order=step.sort_order,
                config=step.config,
            )
            old_to_new[old_id] = new_step

        # Second pass: wire up branch FKs
        for old_step in journey.steps.all():
            new_step = old_to_new[old_step.id]
            changed = False
            if old_step.next_step_id and old_step.next_step_id in old_to_new:
                new_step.next_step = old_to_new[old_step.next_step_id]
                changed = True
            if old_step.true_branch_id and old_step.true_branch_id in old_to_new:
                new_step.true_branch = old_to_new[old_step.true_branch_id]
                changed = True
            if old_step.false_branch_id and old_step.false_branch_id in old_to_new:
                new_step.false_branch = old_to_new[old_step.false_branch_id]
                changed = True
            if changed:
                new_step.save(update_fields=['next_step', 'true_branch', 'false_branch'])

        return new_journey

    # ─── Enrollment ────────────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def enroll_user(journey, user):
        """Enroll a user in a journey. Returns the enrollment or None if ineligible."""
        from ..models import JourneyEnrollment

        if journey.status != 'active':
            return None

        # Check max entries
        existing_count = JourneyEnrollment.objects.filter(
            journey=journey, user=user
        ).count()
        if existing_count >= journey.max_entries_per_user:
            return None

        # Check cooldown
        if journey.cooldown_hours > 0:
            cooldown_cutoff = timezone.now() - timedelta(hours=journey.cooldown_hours)
            recent = JourneyEnrollment.objects.filter(
                journey=journey, user=user, entered_at__gte=cooldown_cutoff
            ).exists()
            if recent:
                return None

        first_step = journey.first_step
        enrollment = JourneyEnrollment.objects.create(
            journey=journey,
            user=user,
            status='active',
            current_step=first_step,
            next_action_at=timezone.now(),  # Execute first step immediately
        )

        # Update denormalized counts
        journey.total_enrollments_count = F('total_enrollments_count') + 1
        journey.active_enrollments_count = F('active_enrollments_count') + 1
        journey.save(update_fields=[
            'total_enrollments_count', 'active_enrollments_count', 'updated_at'
        ])

        return enrollment

    @staticmethod
    @transaction.atomic
    def exit_enrollment(enrollment, status='exited_manual'):
        """Exit an enrollment from the journey."""
        from ..models import Journey

        if enrollment.status != 'active':
            return enrollment

        enrollment.status = status
        enrollment.completed_at = timezone.now()
        enrollment.next_action_at = None
        enrollment.save(update_fields=['status', 'completed_at', 'next_action_at', 'updated_at'])

        # Update denormalized counts
        journey = enrollment.journey
        journey.active_enrollments_count = F('active_enrollments_count') - 1
        if status == 'completed' or status == 'exited_goal':
            journey.completed_enrollments_count = F('completed_enrollments_count') + 1
        journey.save(update_fields=[
            'active_enrollments_count', 'completed_enrollments_count', 'updated_at'
        ])

        return enrollment

    # ─── Step Execution ────────────────────────────────────────────

    @classmethod
    def execute_step(cls, enrollment):
        """Execute the current step for an enrollment. Advances to next step."""
        from ..models import JourneyStepLog

        step = enrollment.current_step
        if not step:
            cls.exit_enrollment(enrollment, status='completed')
            return

        result = {}
        status = 'success'

        try:
            handler = cls._get_step_handler(step.step_type)
            result = handler(enrollment, step)
        except Exception as exc:
            logger.error(f'Journey step execution failed: enrollment={enrollment.id}, step={step.id}: {exc}')
            status = 'failed'
            result = {'error': str(exc)}

        # Log the step execution
        JourneyStepLog.objects.create(
            enrollment=enrollment,
            step=step,
            status=status,
            result=result,
        )

        if status == 'failed':
            cls.exit_enrollment(enrollment, status='failed')
            return

        # Advance to next step
        condition_result = result.get('condition_result')
        next_step = step.get_next_step(condition_result=condition_result)

        if next_step:
            enrollment.current_step = next_step
            # For wait steps, next_action_at was already set by the handler
            if next_step.step_type != 'wait':
                enrollment.next_action_at = timezone.now()
            enrollment.save(update_fields=['current_step', 'next_action_at', 'updated_at'])
        else:
            # No more steps — journey complete
            cls.exit_enrollment(enrollment, status='completed')

    @classmethod
    def _get_step_handler(cls, step_type):
        handlers = {
            'send_email': cls._handle_send_email,
            'wait': cls._handle_wait,
            'condition': cls._handle_condition,
            'issue_coupon': cls._handle_issue_coupon,
            'add_tag': cls._handle_add_tag,
            'remove_tag': cls._handle_remove_tag,
            'update_attribute': cls._handle_update_attribute,
            'add_to_segment': cls._handle_add_to_segment,
            'webhook': cls._handle_webhook,
        }
        handler = handlers.get(step_type)
        if not handler:
            raise ValueError(f'Unknown step type: {step_type}')
        return handler

    @staticmethod
    def _handle_send_email(enrollment, step):
        """Send an email via the notifications module."""
        from apps.notifications.tasks import send_email

        config = step.config
        template_id = config.get('template_id')
        subject = config.get('subject', '')
        user = enrollment.user

        send_email.delay(
            to_email=user.email,
            subject=subject,
            template=str(template_id) if template_id else 'default',
            context={
                'name': user.first_name or user.email,
                'email': user.email,
            },
            user_id=user.id,
            journey_step_id=step.id,
        )

        return {'email_sent_to': user.email, 'template_id': template_id}

    @staticmethod
    def _handle_wait(enrollment, step):
        """Set next_action_at for a wait period."""
        config = step.config
        duration_seconds = config.get('duration_seconds', 0)

        if duration_seconds > 0:
            enrollment.next_action_at = timezone.now() + timedelta(seconds=duration_seconds)
        else:
            # Default: 1 hour wait
            enrollment.next_action_at = timezone.now() + timedelta(hours=1)

        enrollment.save(update_fields=['next_action_at', 'updated_at'])
        return {'wait_until': str(enrollment.next_action_at)}

    @staticmethod
    def _handle_condition(enrollment, step):
        """Evaluate a condition and return the boolean result."""
        from .audience_service import AudienceService

        config = step.config
        rules = config.get('rules', [])
        operator = config.get('operator', 'and')

        if not rules:
            return {'condition_result': True}

        user = enrollment.user
        results = []

        for rule in rules:
            field = rule.get('field', '')
            op = rule.get('op', 'eq')
            value = rule.get('value')

            actual = AudienceService.get_user_field_value(user, field)
            match = AudienceService.evaluate_rule(actual, op, value)
            results.append(match)

        if operator == 'and':
            condition_result = all(results)
        else:
            condition_result = any(results)

        return {'condition_result': condition_result, 'rules_evaluated': len(rules)}

    @staticmethod
    def _handle_issue_coupon(enrollment, step):
        """Issue a coupon to the user via the coupon service."""
        from .coupon_service import CouponService
        from ..models import Coupon

        config = step.config
        coupon_id = config.get('coupon_id')

        if not coupon_id:
            raise ValueError('issue_coupon step requires coupon_id in config')

        try:
            coupon = Coupon.objects.get(id=coupon_id)
        except Coupon.DoesNotExist:
            raise ValueError(f'Coupon {coupon_id} not found')

        CouponService.redeem_coupon(
            coupon=coupon,
            user=enrollment.user,
        )

        return {'coupon_id': coupon_id, 'coupon_code': coupon.code}

    @staticmethod
    def _handle_add_tag(enrollment, step):
        """Add a contact attribute tag to the user."""
        from ..models import ContactAttribute

        config = step.config
        tag = config.get('tag', '')

        if tag:
            ContactAttribute.objects.update_or_create(
                user=enrollment.user,
                key='tag',
                defaults={'value': tag},
            )

        return {'tag_added': tag}

    @staticmethod
    def _handle_remove_tag(enrollment, step):
        """Remove a contact attribute tag from the user."""
        from ..models import ContactAttribute

        config = step.config
        tag = config.get('tag', '')

        if tag:
            ContactAttribute.objects.filter(
                user=enrollment.user,
                key='tag',
                value=tag,
            ).delete()

        return {'tag_removed': tag}

    @staticmethod
    def _handle_update_attribute(enrollment, step):
        """Update a custom contact attribute."""
        from ..models import ContactAttribute

        config = step.config
        key = config.get('key', '')
        value = config.get('value', '')

        if key:
            ContactAttribute.objects.update_or_create(
                user=enrollment.user,
                key=key,
                defaults={'value': value},
            )

        return {'attribute_updated': key, 'value': value}

    @staticmethod
    def _handle_add_to_segment(enrollment, step):
        """Add the user to a static segment."""
        from ..models import Segment

        config = step.config
        segment_id = config.get('segment_id')

        if not segment_id:
            raise ValueError('add_to_segment step requires segment_id in config')

        try:
            segment = Segment.objects.get(id=segment_id)
        except Segment.DoesNotExist:
            raise ValueError(f'Segment {segment_id} not found')

        if segment.segment_type != 'static':
            raise ValueError('Can only add users to static segments')

        segment.members.add(enrollment.user)
        return {'segment_id': segment_id, 'segment_name': segment.name}

    @staticmethod
    def _validate_webhook_url(url):
        """Reject internal/private URLs to prevent SSRF."""
        from urllib.parse import urlparse
        import ipaddress

        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            raise ValueError(f'Unsupported URL scheme: {parsed.scheme}')
        hostname = parsed.hostname
        if not hostname:
            raise ValueError('URL must have a hostname')
        # Block direct IP access to private ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError(f'URL resolves to blocked IP range: {ip}')
        except ValueError as exc:
            if 'blocked IP' in str(exc):
                raise
            # hostname is a DNS name — check for known internal Docker service names
            blocked = {
                'localhost', 'redis', 'db', 'rabbitmq', 'kafka', 'zookeeper',
                'clickhouse', 'minio', 'grafana', 'otel-collector', 'traefik',
                'web', 'celery', 'celery-beat', 'static', 'nginx',
            }
            if hostname.lower() in blocked:
                raise ValueError(f'URL hostname is blocked: {hostname}')
        return url

    @staticmethod
    def _handle_webhook(enrollment, step):
        """Fire a webhook (best-effort, non-blocking)."""
        import requests

        config = step.config
        url = config.get('url', '')
        method = config.get('method', 'POST').upper()
        body_template = config.get('body_template', '{}')

        if not url:
            raise ValueError('webhook step requires url in config')

        # Validate URL to prevent SSRF against internal services
        JourneyService._validate_webhook_url(url)

        user = enrollment.user
        context = {
            'user_id': user.id,
            'user_email': user.email,
            'user_name': user.get_full_name(),
            'journey_id': enrollment.journey_id,
            'enrollment_id': enrollment.id,
        }

        # Simple template replacement
        body = body_template
        for key, val in context.items():
            body = body.replace(f'{{{{{key}}}}}', str(val))

        try:
            resp = requests.request(
                method=method,
                url=url,
                headers={'Content-Type': 'application/json'},
                data=body,
                timeout=10,
            )
            return {'status_code': resp.status_code, 'url': url}
        except requests.RequestException as exc:
            return {'error': str(exc), 'url': url}

    # ─── Goal Checking ─────────────────────────────────────────────

    @staticmethod
    def check_goal(enrollment):
        """Check if an enrollment has met its journey's goal."""
        journey = enrollment.journey

        if not journey.goal_type:
            return False

        # Goal checking is event-based in production.
        # This method handles periodic sweep for goals like "has_purchased_package".
        user = enrollment.user
        goal_config = journey.goal_config or {}

        if journey.goal_type == 'package_purchase':
            from apps.billing.models import Entitlement
            package_ids = goal_config.get('package_ids', [])
            if package_ids:
                has_purchase = Entitlement.objects.filter(
                    company__users=user,
                    package_id__in=package_ids,
                    created_at__gte=enrollment.entered_at,
                ).exists()
            else:
                has_purchase = Entitlement.objects.filter(
                    company__users=user,
                    created_at__gte=enrollment.entered_at,
                ).exists()
            return has_purchase

        if journey.goal_type == 'job_published':
            from apps.jobs.models import Job
            return Job.objects.filter(
                company__users=user,
                status='published',
                published_at__gte=enrollment.entered_at,
            ).exists()

        return False

    # ─── Stats ─────────────────────────────────────────────────────

    @staticmethod
    def get_journey_stats(journey):
        """Get aggregated stats for a journey."""
        from ..models import JourneyEnrollment, JourneyStepLog

        enrollments = JourneyEnrollment.objects.filter(journey=journey)

        stats = {
            'total_enrollments': enrollments.count(),
            'active_enrollments': enrollments.filter(status='active').count(),
            'completed_enrollments': enrollments.filter(status='completed').count(),
            'exited_goal': enrollments.filter(status='exited_goal').count(),
            'exited_manual': enrollments.filter(status='exited_manual').count(),
            'failed_enrollments': enrollments.filter(status='failed').count(),
            'emails_sent': JourneyStepLog.objects.filter(
                enrollment__journey=journey,
                step__step_type='send_email',
                status='success',
            ).count(),
            'coupons_issued': JourneyStepLog.objects.filter(
                enrollment__journey=journey,
                step__step_type='issue_coupon',
                status='success',
            ).count(),
        }

        return stats

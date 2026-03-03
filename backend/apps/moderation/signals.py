"""
Signal handlers for real-time fraud detection.
Triggers fraud checks on user registration and job publishing.

Uses transaction.on_commit() to ensure tasks are dispatched only after
the triggering transaction commits — prevents task failures from
poisoning the parent transaction (e.g. user creation rollback).
"""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='users.User')
def check_fraud_on_user_creation(sender, instance, created, **kwargs):
    """Trigger fraud checks when a new user is created."""
    if not created:
        return

    # Capture values before the closure — avoids accessing the instance
    # after the transaction commits when it might have changed.
    user_id = instance.id
    user_email = instance.email

    def _dispatch():
        from .tasks import run_fraud_check_for_event
        try:
            run_fraud_check_for_event.delay('user_created', {
                'user_id': user_id,
                'email': user_email,
            })
        except Exception as e:
            logger.error("Failed to queue fraud check for new user %s: %s", user_id, e)

    transaction.on_commit(_dispatch)


@receiver(post_save, sender='jobs.Job')
def check_fraud_on_job_save(sender, instance, created, **kwargs):
    """Trigger keyword-based fraud checks when a job is published."""
    if instance.status not in ('published', 'pending'):
        return

    job_id = instance.id

    def _dispatch():
        from .tasks import run_fraud_check_for_event
        try:
            run_fraud_check_for_event.delay('job_published', {
                'job_id': job_id,
            })
        except Exception as e:
            logger.error("Failed to queue fraud check for job %s: %s", job_id, e)

    transaction.on_commit(_dispatch)

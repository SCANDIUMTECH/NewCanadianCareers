"""
Django system checks for Orion configuration.
These run at server startup (not during collectstatic or migrate).
"""
import os

from django.conf import settings
from django.core.checks import Error, Warning, register, Tags


@register(Tags.security, deploy=True)
def check_celery_broker_url(app_configs, **kwargs):
    """Ensure CELERY_BROKER_URL is set and not using guest credentials."""
    errors = []
    broker_url = getattr(settings, 'CELERY_BROKER_URL', '')

    if not os.environ.get('CELERY_BROKER_URL'):
        errors.append(
            Error(
                'CELERY_BROKER_URL environment variable is not set.',
                hint='Set CELERY_BROKER_URL in .env. Example: amqp://user:pass@rabbitmq:5672/vhost',
                id='orion.E001',
            )
        )

    if 'guest:guest' in broker_url:
        errors.append(
            Error(
                'CELERY_BROKER_URL uses default guest credentials.',
                hint='Replace guest:guest with a strong username and password.',
                id='orion.E002',
            )
        )

    if not settings.DEBUG and broker_url and not broker_url.startswith('amqps://'):
        errors.append(
            Warning(
                'CELERY_BROKER_URL does not use TLS (amqps://).',
                hint='Use amqps:// with TLS certificates in production for encrypted broker connections.',
                id='orion.W001',
            )
        )

    return errors

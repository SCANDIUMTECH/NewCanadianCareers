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
            Error(
                'CELERY_BROKER_URL does not use TLS (amqps://).',
                hint='Use amqps:// with TLS certificates in production for encrypted broker connections.',
                id='orion.E003',
            )
        )

    return errors


@register(Tags.security, deploy=True)
def check_production_origins(app_configs, **kwargs):
    """Ensure CORS and CSRF origins don't contain localhost in production."""
    errors = []
    if settings.DEBUG:
        return errors

    localhost_patterns = ('localhost', '127.0.0.1', '0.0.0.0')

    for origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', []):
        if any(p in origin for p in localhost_patterns):
            errors.append(
                Error(
                    f'CORS_ALLOWED_ORIGINS contains localhost origin: {origin}',
                    hint='Set the CORS_ALLOWED_ORIGINS env var to production domains only.',
                    id='orion.E010',
                )
            )
            break

    for origin in getattr(settings, 'CSRF_TRUSTED_ORIGINS', []):
        if any(p in origin for p in localhost_patterns):
            errors.append(
                Error(
                    f'CSRF_TRUSTED_ORIGINS contains localhost origin: {origin}',
                    hint='Set the CSRF_TRUSTED_ORIGINS env var to production domains only.',
                    id='orion.E011',
                )
            )
            break

    for host in getattr(settings, 'ALLOWED_HOSTS', []):
        if host in localhost_patterns:
            errors.append(
                Error(
                    f'ALLOWED_HOSTS contains localhost entry: {host}',
                    hint='Remove localhost from ALLOWED_HOSTS in production.',
                    id='orion.E012',
                )
            )
            break

    return errors


@register(Tags.security, deploy=True)
def check_production_secrets(app_configs, **kwargs):
    """Ensure critical secrets are set in production."""
    errors = []
    if settings.DEBUG:
        return errors

    required_secrets = {
        'STRIPE_SECRET_KEY': 'Stripe payments will not work.',
        'STRIPE_WEBHOOK_SECRET': 'Stripe webhooks cannot be verified.',
        'RESEND_API_KEY': 'Transactional emails will not be sent.',
    }

    for env_var, consequence in required_secrets.items():
        if not os.environ.get(env_var):
            errors.append(
                Warning(
                    f'{env_var} environment variable is not set.',
                    hint=f'{consequence} Set {env_var} in your production environment.',
                    id=f'orion.W0{list(required_secrets.keys()).index(env_var) + 20}',
                )
            )

    return errors

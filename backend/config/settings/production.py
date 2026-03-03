"""
Production settings for Orion backend.
"""
import os
import dj_database_url
from .base import *

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'orion.jobs,api.orion.jobs').split(',')

# Database - PostgreSQL
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Cache - Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://redis:6379/0'),
    }
}

# Security
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# CSRF
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'https://orion.jobs').split(',')

# Session
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN', '.orion.jobs')

# Storage — MinIO (S3-compatible).
# Django 5.x requires STORAGES dict (DEFAULT_FILE_STORAGE is deprecated).
STORAGES = {
    'default': {
        'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
    },
}
AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ACCESS_KEY')
AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_SECRET_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'orion-media')
AWS_S3_ENDPOINT_URL = f"http://{os.environ.get('MINIO_ENDPOINT', 'minio:9000')}"
AWS_S3_USE_SSL = os.environ.get('MINIO_USE_SSL', 'False').lower() == 'true'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_REGION_NAME = 'us-east-1'

# Public media URL — Traefik (or CDN) proxies /media/* to MinIO/S3.
# Bucket has public-read policy. Override MEDIA_DOMAIN for CDN (e.g. cdn.orion.jobs/media).
AWS_S3_CUSTOM_DOMAIN = os.environ.get('MEDIA_DOMAIN', 'orion.jobs/media')
AWS_S3_URL_PROTOCOL = 'https:'
AWS_QUERYSTRING_AUTH = False

# Logging
LOGGING['handlers']['file'] = {
    'class': 'logging.FileHandler',
    'filename': '/var/log/orion/django.log',
    'formatter': 'verbose',
}
LOGGING['root']['handlers'] = ['console', 'file']

# Celery — production hardening
# Validate broker URL at runtime (not build time) via Django system check.
# See config/checks.py for CELERY_BROKER_URL validation.

# Override broker transport for TLS when available
_broker_url = os.environ.get('CELERY_BROKER_URL', '')
if _broker_url.startswith('amqps://'):
    CELERY_BROKER_USE_SSL = {
        'cert_reqs': __import__('ssl').CERT_REQUIRED,
    }

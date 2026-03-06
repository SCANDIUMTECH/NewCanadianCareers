"""
Production settings for New Canadian Careers backend.
"""
import os
import dj_database_url
from .base import *

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'newcanadian.careers,api.newcanadian.careers').split(',')

# Database - PostgreSQL (production hardened)
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=True,
    )
}
# Connection-level hardening: timeouts and keepalives prevent hung connections.
DATABASES['default'].setdefault('OPTIONS', {}).update({
    'connect_timeout': 5,                # Fail fast if DB unreachable (seconds)
    'options': '-c statement_timeout=30000 -c lock_timeout=10000',  # 30s query / 10s lock (ms)
    'keepalives': 1,
    'keepalives_idle': 30,               # Send keepalive after 30s idle
    'keepalives_interval': 10,           # Retry keepalive every 10s
    'keepalives_count': 5,               # Give up after 5 failed keepalives
})

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

# CSRF
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'https://newcanadian.careers').split(',')

# Session
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN', '.newcanadian.careers')

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
AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'ncc-media')
_minio_use_ssl = os.environ.get('MINIO_USE_SSL', 'False').lower() == 'true'
_minio_scheme = 'https' if _minio_use_ssl else 'http'
AWS_S3_ENDPOINT_URL = f"{_minio_scheme}://{os.environ.get('MINIO_ENDPOINT', 'minio:9000')}"
AWS_S3_USE_SSL = _minio_use_ssl
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_REGION_NAME = 'us-east-1'

# Public media URL — Traefik (or CDN) proxies /media/* to MinIO/S3.
# Bucket has public-read policy. Override MEDIA_DOMAIN for CDN (e.g. cdn.newcanadian.careers/media).
AWS_S3_CUSTOM_DOMAIN = os.environ.get('MEDIA_DOMAIN', 'newcanadian.careers/media')
AWS_S3_URL_PROTOCOL = 'https:'
AWS_QUERYSTRING_AUTH = False

# Logging
LOGGING['handlers']['file'] = {
    'class': 'logging.FileHandler',
    'filename': '/var/log/ncc/django.log',
    'formatter': 'verbose',
}
LOGGING['handlers']['security_file'] = {
    'class': 'logging.FileHandler',
    'filename': '/var/log/ncc/security.log',
    'formatter': 'verbose',
}
LOGGING['root']['handlers'] = ['console', 'file']
LOGGING['loggers']['django.security'] = {
    'handlers': ['console', 'security_file'],
    'level': 'WARNING',
    'propagate': False,
}

# Celery — production hardening
# Validate broker URL at runtime (not build time) via Django system check.
# See config/checks.py for CELERY_BROKER_URL validation.

# Override broker transport for TLS when available
_broker_url = os.environ.get('CELERY_BROKER_URL', '')
if _broker_url.startswith('amqps://'):
    CELERY_BROKER_USE_SSL = {
        'cert_reqs': __import__('ssl').CERT_REQUIRED,
    }

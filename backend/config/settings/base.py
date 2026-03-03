"""
Base Django settings for Orion backend.
"""
import os
from pathlib import Path
from datetime import timedelta
from celery.schedules import crontab

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
# The fallback is for local development only. Production settings must set SECRET_KEY.
_DEBUG_RAW = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-do-not-use-in-production')
if not os.environ.get('SECRET_KEY') and not _DEBUG_RAW:
    raise ValueError('SECRET_KEY environment variable must be set in production')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'storages',

    # Local apps
    'apps.users',
    'apps.companies',
    'apps.jobs',
    'apps.applications',
    'apps.billing',
    'apps.notifications',
    'apps.moderation',
    'apps.social',
    'apps.search',
    'apps.audit',
    'apps.articles',
    'apps.marketing',
    'apps.ai',
    'apps.rum',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'core.middleware.ApiCsrfExemptMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.ClearStaleAuthCookiesMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'uploads': '30/hour',
        'marketing_bulk': '10/hour',
        'coupon_redemption': '20/hour',
        'resend_verification': '3/hour',
        'rum_ingest': '1000/min',
        'banner_tracking': '500/hour',
        'affiliate_tracking': '500/hour',
    },
}

# ── File upload limits (defense against storage exhaustion) ─────────
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024    # 10 MB — stream to disk above this
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024    # 10 MB — reject request body above this
DATA_UPLOAD_MAX_NUMBER_FILES = 5                   # Max files per request

# JWT Settings
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'orion_access',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SECURE': not DEBUG,  # False in dev for http://localhost
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

# CORS
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,https://localhost:3000').split(',')

# CSRF
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'http://localhost,https://localhost,http://localhost:3000,https://localhost:3000').split(',')

# Session
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF cookie — not HttpOnly so frontend can read it if needed
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'

# Celery Configuration — RabbitMQ broker, Redis result backend
# CELERY_BROKER_URL must be set in environment. No guest:guest fallback.
# Production settings will raise if this is not set; dev uses ALWAYS_EAGER so broker is unused.
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/1')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Celery broker connection resilience
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
CELERY_BROKER_HEARTBEAT = 10  # seconds — detect dead connections
CELERY_BROKER_POOL_LIMIT = 10  # max broker connections per worker
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'confirm_publish': True,  # publisher confirms — guarantees message delivery
    'max_retries': 3,
}

# Celery worker safety — prevent task loss on crashes
CELERY_TASK_ACKS_LATE = True  # ACK only after task completes (not on receive)
CELERY_TASK_REJECT_ON_WORKER_LOST = True  # requeue if worker crashes mid-task
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # fair task distribution across workers

# Celery task time limits — prevent runaway tasks
CELERY_TASK_SOFT_TIME_LIMIT = 300  # 5 minutes soft limit (raises SoftTimeLimitExceeded)
CELERY_TASK_TIME_LIMIT = 360  # 6 minutes hard kill

# Celery task retry defaults
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # 1 minute between retries
CELERY_TASK_MAX_RETRIES = 3

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'expire-jobs': {
        'task': 'apps.jobs.tasks.expire_jobs',
        'schedule': 60 * 60 * 24,  # Daily
    },
    'publish-scheduled-jobs': {
        'task': 'apps.jobs.tasks.publish_due_scheduled_jobs',
        'schedule': 60 * 5,  # Every 5 minutes (safety net for missed eta tasks)
    },
    'daily-job-alerts': {
        'task': 'apps.jobs.tasks.send_job_alerts',
        'schedule': 60 * 60 * 24,  # Daily at 8 AM
        'kwargs': {'frequency': 'daily'},
    },
    'weekly-job-alerts': {
        'task': 'apps.jobs.tasks.send_job_alerts',
        'schedule': 60 * 60 * 24 * 7,  # Weekly
        'kwargs': {'frequency': 'weekly'},
    },
    'cleanup-login-attempts': {
        'task': 'apps.audit.tasks.cleanup_old_login_attempts',
        'schedule': 60 * 60 * 24,  # Daily - GDPR compliance cleanup
    },
    'cleanup-email-logs': {
        'task': 'apps.notifications.tasks.cleanup_old_email_logs',
        'schedule': 60 * 60 * 24,  # Daily - two-tier retention (GDPR + CAN-SPAM)
    },
    'purge-trashed-jobs': {
        'task': 'apps.jobs.tasks.purge_trashed_jobs',
        'schedule': 60 * 60 * 24,  # Daily
    },
    'archive-expired-jobs': {
        'task': 'apps.jobs.tasks.archive_expired_jobs',
        'schedule': 60 * 60 * 24,  # Daily
    },
    'cleanup-old-job-views': {
        'task': 'apps.jobs.tasks.cleanup_old_job_views',
        'schedule': 60 * 60 * 24 * 7,  # Weekly
    },
    'fraud-scan': {
        'task': 'apps.moderation.tasks.run_fraud_scan',
        'schedule': 60 * 15,  # Every 15 minutes
    },
    'refresh-segments': {
        'task': 'apps.marketing.tasks.refresh_segment_counts',
        'schedule': 60 * 30,  # Every 30 minutes
    },
    'check-scheduled-campaigns': {
        'task': 'apps.marketing.tasks.check_scheduled_campaigns',
        'schedule': 60,  # Every 1 minute
    },
    'process-journey-triggers': {
        'task': 'apps.marketing.tasks.process_journey_triggers',
        'schedule': 60,  # Every 1 minute
    },
    'advance-journey-enrollments': {
        'task': 'apps.marketing.tasks.advance_journey_enrollments',
        'schedule': 60,  # Every 1 minute
    },
    'check-journey-goals': {
        'task': 'apps.marketing.tasks.check_journey_goals',
        'schedule': 60 * 5,  # Every 5 minutes
    },
    'daily-marketing-metrics': {
        'task': 'apps.marketing.tasks.calculate_daily_marketing_metrics',
        'schedule': 60 * 60 * 24,  # Daily
    },
    'flush-rum-buffer': {
        'task': 'apps.rum.tasks.flush_rum_buffer',
        'schedule': 30,  # Every 30 seconds (fallback flush for Celery-routed vitals)
    },
    'process-scheduled-posts': {
        'task': 'apps.social.tasks.process_scheduled_posts',
        'schedule': 60,  # Every 1 minute
    },
    # ── Slack proactive alerts ──────────────────────────────────
    'slack-check-low-credits': {
        'task': 'apps.notifications.slack_tasks.check_low_credits',
        'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
    },
    'slack-check-expiring-jobs': {
        'task': 'apps.notifications.slack_tasks.check_expiring_jobs',
        'schedule': crontab(minute=0, hour=8),  # Daily at 8 AM
    },
    'slack-check-expiring-entitlements': {
        'task': 'apps.notifications.slack_tasks.check_expiring_entitlements',
        'schedule': crontab(minute=0, hour=9),  # Daily at 9 AM
    },
    'slack-check-stale-pending-jobs': {
        'task': 'apps.notifications.slack_tasks.check_stale_pending_jobs',
        'schedule': crontab(minute=0, hour='*/4'),  # Every 4 hours
    },
    'slack-daily-platform-digest': {
        'task': 'apps.notifications.slack_tasks.daily_platform_digest',
        'schedule': crontab(minute=0, hour=9),  # Daily at 9 AM
    },
    'publish-scheduled-articles': {
        'task': 'apps.articles.tasks.publish_due_scheduled_articles',
        'schedule': 60 * 5,  # Every 5 minutes
    },
    'purge-old-tracking-records': {
        'task': 'apps.moderation.tasks.purge_old_tracking_records',
        'schedule': crontab(minute=0, hour=3),  # Daily at 3 AM
    },
}

# Stripe
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')

# Email (Resend)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
RESEND_WEBHOOK_SECRET = os.environ.get('RESEND_WEBHOOK_SECRET', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@orion.jobs')

# Frontend URL
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# API Base URL — used for generating webhook URLs and external-facing links.
# In production, set to your HTTPS domain (e.g. https://api.orion.jobs).
# Defaults to empty string; when unset, webhook URL is built from request.
API_BASE_URL = os.environ.get('API_BASE_URL', '')

# Platform Settings Defaults
PLATFORM_SETTINGS_DEFAULTS = {
    'job_default_duration_days': 30,
    'job_max_per_company': 25,
    'job_salary_required': False,
    'job_approval_required_new_company': True,
    'job_approval_required_unverified': True,
    'job_prohibited_keywords': ['crypto', 'mlm', 'pyramid'],
    'feature_direct_apply': True,
    'feature_social_distribution': True,
    'feature_sponsored_banners': True,
    'social_mode': 'user_controlled',
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': os.environ.get('APPS_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

# RUM Pipeline Settings
RUM_ENABLED = os.environ.get('RUM_ENABLED', 'True').lower() in ('true', '1', 'yes')
RUM_HMAC_SECRET = os.environ.get('RUM_HMAC_SECRET', 'change-me-in-production')
if RUM_HMAC_SECRET == 'change-me-in-production' and not os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes'):
    raise ValueError('RUM_HMAC_SECRET environment variable must be set in production')
RUM_ALLOWED_ORIGINS = os.environ.get('RUM_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
RUM_SAMPLE_RATE = int(os.environ.get('RUM_SAMPLE_RATE', '10'))  # percent
RUM_RATE_LIMIT = os.environ.get('RUM_RATE_LIMIT', '1000/min')
RUM_KAFKA_BOOTSTRAP = os.environ.get('RUM_KAFKA_BOOTSTRAP', 'kafka:9092')
RUM_KAFKA_TOPIC = os.environ.get('RUM_KAFKA_TOPIC', 'rum.webvitals.v1')
RUM_CLICKHOUSE_URL = os.environ.get('RUM_CLICKHOUSE_URL', 'http://clickhouse:8123')
RUM_CLICKHOUSE_DB = os.environ.get('RUM_CLICKHOUSE_DB', 'default')
RUM_CLICKHOUSE_USER = os.environ.get('RUM_CLICKHOUSE_USER', 'orion')
RUM_CLICKHOUSE_PASSWORD = os.environ.get('RUM_CLICKHOUSE_PASSWORD', '')

# OpenTelemetry Settings
OTEL_ENABLED = os.environ.get('OTEL_ENABLED', 'True').lower() in ('true', '1', 'yes')
OTEL_EXPORTER_ENDPOINT = os.environ.get('OTEL_EXPORTER_ENDPOINT', 'http://otel-collector:4317')
OTEL_SERVICE_NAME = os.environ.get('OTEL_SERVICE_NAME', 'orion-api')

# Slack Integration
# OAuth App (preferred): Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET from api.slack.com.
# Legacy webhooks: Set SLACK_ENABLED=True and provide at least SLACK_WEBHOOK_DEFAULT.
SLACK_CLIENT_ID = os.environ.get('SLACK_CLIENT_ID', '')
SLACK_CLIENT_SECRET = os.environ.get('SLACK_CLIENT_SECRET', '')
SLACK_REDIRECT_URI = os.environ.get(
    'SLACK_REDIRECT_URI',
    'http://localhost:3000/admin/settings?tab=integrations&slack_callback=1',
)

# Legacy webhook fallback (deprecated — use OAuth App instead)
SLACK_ENABLED = os.environ.get('SLACK_ENABLED', 'False').lower() in ('true', '1', 'yes')
SLACK_WEBHOOKS = {
    'default': os.environ.get('SLACK_WEBHOOK_DEFAULT', ''),
    'security': os.environ.get('SLACK_WEBHOOK_SECURITY', ''),
    'moderation': os.environ.get('SLACK_WEBHOOK_MODERATION', ''),
    'billing': os.environ.get('SLACK_WEBHOOK_BILLING', ''),
    'jobs': os.environ.get('SLACK_WEBHOOK_JOBS', ''),
    'system': os.environ.get('SLACK_WEBHOOK_SYSTEM', ''),
}

# Login Security Settings (SOC2, GDPR, NIST 800-53 aligned)
LOGIN_SECURITY = {
    'ALERT_THRESHOLD': 3,           # Email after 3 failed attempts
    'LOCKOUT_THRESHOLD': 5,         # Lock after 5 failed attempts
    'LOCKOUT_DURATION': 15,         # 15 minutes lockout
    'TRACKING_WINDOW': 15,          # Reset counter after 15 min of no attempts
    'RETENTION_DAYS': 90,           # GDPR compliance - retain for 90 days
}

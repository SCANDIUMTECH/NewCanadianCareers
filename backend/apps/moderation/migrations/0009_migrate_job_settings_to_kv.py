"""
Data migration: Move job_* fields from PlatformSettings singleton
to the job_policy KV store (PlatformSetting), then remove the columns.

This consolidates all job posting policy settings into a single source
of truth (the job_policy KV record) instead of splitting them between
PlatformSettings and PlatformSetting.
"""
from django.db import migrations


def migrate_job_settings_to_kv(apps, schema_editor):
    """Copy current job_* values from PlatformSettings into the job_policy KV record."""
    PlatformSettings = apps.get_model('moderation', 'PlatformSettings')
    PlatformSetting = apps.get_model('moderation', 'PlatformSetting')

    try:
        ps = PlatformSettings.objects.get(pk=1)
    except PlatformSettings.DoesNotExist:
        return  # No settings to migrate

    # Map PlatformSettings field names → job_policy KV keys
    field_mapping = {
        'job_default_duration_days': 'default_post_duration',
        'job_max_duration_days': 'max_duration_days',
        'job_max_per_company': 'max_active_jobs_per_company',
        'job_salary_required': 'salary_required',
        'job_auto_approve_verified': 'auto_approve_verified',
        'job_enable_refresh': 'job_enable_refresh',
        'job_enable_spam_detection': 'job_enable_spam_detection',
        'job_block_duplicates': 'job_block_duplicates',
        'job_blocked_keywords': 'blocked_keywords',
    }

    # Get or create the KV record
    setting, created = PlatformSetting.objects.get_or_create(
        key='job_policy',
        defaults={'value': {}, 'description': 'Job posting policy settings'},
    )

    kv = setting.value if isinstance(setting.value, dict) else {}

    # Only set values that aren't already in the KV store (KV takes precedence)
    for model_field, kv_key in field_mapping.items():
        if kv_key not in kv:
            kv[kv_key] = getattr(ps, model_field)

    setting.value = kv
    setting.save()


def reverse_migration(apps, schema_editor):
    """Reverse: copy KV values back to PlatformSettings fields."""
    PlatformSettings = apps.get_model('moderation', 'PlatformSettings')
    PlatformSetting = apps.get_model('moderation', 'PlatformSetting')

    try:
        setting = PlatformSetting.objects.get(key='job_policy')
    except PlatformSetting.DoesNotExist:
        return

    kv = setting.value if isinstance(setting.value, dict) else {}

    ps, _ = PlatformSettings.objects.get_or_create(pk=1)
    reverse_mapping = {
        'default_post_duration': ('job_default_duration_days', 30),
        'max_duration_days': ('job_max_duration_days', 90),
        'max_active_jobs_per_company': ('job_max_per_company', 25),
        'salary_required': ('job_salary_required', False),
        'auto_approve_verified': ('job_auto_approve_verified', True),
        'job_enable_refresh': ('job_enable_refresh', True),
        'job_enable_spam_detection': ('job_enable_spam_detection', True),
        'job_block_duplicates': ('job_block_duplicates', True),
        'blocked_keywords': ('job_blocked_keywords', 'scam\nget rich quick\nno experience needed\nmake money fast'),
    }

    for kv_key, (model_field, default) in reverse_mapping.items():
        setattr(ps, model_field, kv.get(kv_key, default))

    ps.save()


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0008_seed_missing_categories'),
    ]

    operations = [
        # Step 1: Migrate data from PlatformSettings → KV store
        migrations.RunPython(
            migrate_job_settings_to_kv,
            reverse_code=reverse_migration,
        ),

        # Step 2: Remove the job_* columns from PlatformSettings
        migrations.RemoveField(model_name='platformsettings', name='job_default_duration_days'),
        migrations.RemoveField(model_name='platformsettings', name='job_max_duration_days'),
        migrations.RemoveField(model_name='platformsettings', name='job_max_per_company'),
        migrations.RemoveField(model_name='platformsettings', name='job_salary_required'),
        migrations.RemoveField(model_name='platformsettings', name='job_auto_approve_verified'),
        migrations.RemoveField(model_name='platformsettings', name='job_enable_refresh'),
        migrations.RemoveField(model_name='platformsettings', name='job_enable_spam_detection'),
        migrations.RemoveField(model_name='platformsettings', name='job_block_duplicates'),
        migrations.RemoveField(model_name='platformsettings', name='job_blocked_keywords'),
    ]

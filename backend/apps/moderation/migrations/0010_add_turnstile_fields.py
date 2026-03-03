"""Add Cloudflare Turnstile fields to PlatformSettings."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0009_migrate_job_settings_to_kv'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_site_key',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_secret_key',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_protect_auth',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_protect_jobs',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='turnstile_protect_applications',
            field=models.BooleanField(default=True),
        ),
    ]

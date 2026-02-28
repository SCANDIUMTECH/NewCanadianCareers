"""Add Slack webhook configuration fields to PlatformSettings."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0010_add_turnstile_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformsettings',
            name='slack_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_default',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_security',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_moderation',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_billing',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_jobs',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='slack_webhook_system',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]

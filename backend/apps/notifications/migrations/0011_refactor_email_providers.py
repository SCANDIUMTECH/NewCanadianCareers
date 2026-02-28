"""
Refactor email providers: Resend + ZeptoMail + SMTP.

1. Add SMTP fields and per-provider webhook fields to EmailProvider.
2. Migrate webhook_secret/webhook_url from EmailSettings → Resend EmailProvider.
3. Delete stale provider rows (sendgrid, postmark, mailgun).
4. Narrow provider_type choices.
5. Remove webhook fields from EmailSettings.
"""
from django.db import migrations, models
import core.encryption


def migrate_webhook_data(apps, schema_editor):
    """Copy webhook data from EmailSettings to the Resend provider, then delete stale providers."""
    EmailSettings = apps.get_model('notifications', 'EmailSettings')
    EmailProvider = apps.get_model('notifications', 'EmailProvider')

    # Copy webhook_secret / webhook_url from EmailSettings → Resend provider
    try:
        es = EmailSettings.objects.get(pk=1)
        resend_provider = EmailProvider.objects.filter(provider_type='resend').first()
        if resend_provider:
            if es.webhook_secret and not resend_provider.webhook_secret:
                resend_provider.webhook_secret = es.webhook_secret
            if es.webhook_url and not resend_provider.webhook_url:
                resend_provider.webhook_url = es.webhook_url
            resend_provider.save(update_fields=['webhook_secret', 'webhook_url'])
    except EmailSettings.DoesNotExist:
        pass

    # Delete stale providers (EmailTrigger.provider FK has on_delete=SET_NULL)
    EmailProvider.objects.filter(
        provider_type__in=['sendgrid', 'postmark', 'mailgun']
    ).delete()


def reverse_migrate_webhook_data(apps, schema_editor):
    """Reverse: copy webhook data back from Resend provider to EmailSettings."""
    EmailSettings = apps.get_model('notifications', 'EmailSettings')
    EmailProvider = apps.get_model('notifications', 'EmailProvider')

    resend_provider = EmailProvider.objects.filter(provider_type='resend').first()
    if resend_provider:
        es, _ = EmailSettings.objects.get_or_create(pk=1)
        es.webhook_secret = resend_provider.webhook_secret or ''
        es.webhook_url = resend_provider.webhook_url or ''
        es.save(update_fields=['webhook_secret', 'webhook_url'])


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0010_add_webhook_fields_to_email_settings'),
    ]

    operations = [
        # 1. Add new fields to EmailProvider
        migrations.AddField(
            model_name='emailprovider',
            name='webhook_secret',
            field=core.encryption.EncryptedTextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='webhook_url',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_host',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_port',
            field=models.PositiveIntegerField(default=587),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_username',
            field=core.encryption.EncryptedTextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_password',
            field=core.encryption.EncryptedTextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_use_tls',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='emailprovider',
            name='smtp_use_ssl',
            field=models.BooleanField(default=False),
        ),

        # 2. Data migration: copy webhook data, delete stale providers
        migrations.RunPython(migrate_webhook_data, reverse_migrate_webhook_data),

        # 3. Narrow provider_type choices
        migrations.AlterField(
            model_name='emailprovider',
            name='provider_type',
            field=models.CharField(
                choices=[('resend', 'Resend'), ('zeptomail', 'ZeptoMail'), ('smtp', 'SMTP')],
                max_length=20,
                unique=True,
            ),
        ),

        # 4. Remove webhook fields from EmailSettings
        migrations.RemoveField(
            model_name='emailsettings',
            name='webhook_secret',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='webhook_url',
        ),
    ]

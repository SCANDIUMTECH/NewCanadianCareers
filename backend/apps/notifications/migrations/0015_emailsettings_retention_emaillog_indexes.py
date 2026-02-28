"""Add log retention fields to EmailSettings and indexes to EmailLog."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0014_expand_trigger_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailsettings',
            name='log_retention_days',
            field=models.PositiveIntegerField(
                default=90,
                help_text='Days to retain sent/pending email logs. 0 = keep forever.',
            ),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='compliance_retention_days',
            field=models.PositiveIntegerField(
                default=1095,
                help_text='Days to retain bounced/failed email logs (CAN-SPAM: 3 years). 0 = keep forever.',
            ),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='last_cleanup_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='last_cleanup_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddIndex(
            model_name='emaillog',
            index=models.Index(fields=['created_at'], name='idx_email_log_created_at'),
        ),
        migrations.AddIndex(
            model_name='emaillog',
            index=models.Index(fields=['status', 'created_at'], name='idx_email_log_status_date'),
        ),
    ]

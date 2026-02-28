# Generated manually for SlackInstallation model

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_emaillog_campaign_emaillog_journey_step_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SlackInstallation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team_id', models.CharField(blank=True, default='', max_length=50)),
                ('team_name', models.CharField(blank=True, default='', max_length=255)),
                ('bot_user_id', models.CharField(blank=True, default='', max_length=50)),
                ('bot_token', models.TextField(blank=True, default='')),
                ('installed_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=False)),
                ('channel_default', models.CharField(blank=True, default='', max_length=50)),
                ('channel_security', models.CharField(blank=True, default='', max_length=50)),
                ('channel_moderation', models.CharField(blank=True, default='', max_length=50)),
                ('channel_billing', models.CharField(blank=True, default='', max_length=50)),
                ('channel_jobs', models.CharField(blank=True, default='', max_length=50)),
                ('channel_system', models.CharField(blank=True, default='', max_length=50)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('installed_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='slack_installations',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Slack Installation',
                'db_table': 'slack_installation',
            },
        ),
    ]

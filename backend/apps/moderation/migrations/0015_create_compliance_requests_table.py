"""
Create the compliance_requests table.

Migration 0004 used SeparateDatabaseAndState assuming the table already
existed, but it was never actually created. This migration creates the
physical table while being a no-op in Django's state tracking.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0014_add_tracking_models'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.CreateModel(
                    name='ComplianceRequest',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('type', models.CharField(choices=[('gdpr_access', 'GDPR Data Access'), ('gdpr_delete', 'GDPR Data Deletion'), ('gdpr_portability', 'GDPR Data Portability'), ('ccpa_access', 'CCPA Data Access'), ('ccpa_delete', 'CCPA Data Deletion'), ('ccpa_opt_out', 'CCPA Opt-Out')], max_length=30)),
                        ('status', models.CharField(choices=[('pending', 'Pending'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                        ('reason', models.TextField(blank=True)),
                        ('notes', models.TextField(blank=True)),
                        ('submitted_at', models.DateTimeField(auto_now_add=True)),
                        ('due_at', models.DateTimeField()),
                        ('completed_at', models.DateTimeField(blank=True, null=True)),
                        ('verification_code', models.CharField(blank=True, max_length=64)),
                        ('verified_at', models.DateTimeField(blank=True, null=True)),
                        ('export_file', models.FileField(blank=True, null=True, upload_to='compliance_exports/')),
                        ('processed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_compliance_requests', to=settings.AUTH_USER_MODEL)),
                        ('requester', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_requests', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'db_table': 'compliance_requests',
                        'ordering': ['-submitted_at'],
                    },
                ),
            ],
        ),
    ]

"""
Migration: Add StripeWebhookEvent model for idempotent webhook processing.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0006_invoice_payment_method'),
    ]

    operations = [
        migrations.CreateModel(
            name='StripeWebhookEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_event_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('event_type', models.CharField(max_length=100)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('processing', 'Processing'),
                        ('completed', 'Completed'),
                        ('failed', 'Failed'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('error_message', models.TextField(blank=True)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'stripe_webhook_events',
                'indexes': [
                    models.Index(fields=['status', 'created_at'], name='billing_str_status_idx'),
                ],
            },
        ),
    ]

"""Fix job_id callable default and sync migration state for fields
that exist in the DB but are missing from the migration chain.

Uses SeparateDatabaseAndState to fix state, then alters job_id to
remove the callable default.
"""
from django.db import migrations, models
import core.utils


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0007_job_pre_trash_status'),
    ]

    operations = [
        # Step 1: Fix migration state for fields already in DB
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='job',
                    name='deleted_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='job',
                    name='last_refreshed_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='job',
                    name='spam_score',
                    field=models.IntegerField(default=0),
                ),
                migrations.AddIndex(
                    model_name='job',
                    index=models.Index(fields=['deleted_at'], name='jobs_deleted_9b67dd_idx'),
                ),
                migrations.AddIndex(
                    model_name='job',
                    index=models.Index(fields=['spam_score', 'status'], name='jobs_spam_sc_403ca2_idx'),
                ),
                migrations.AlterField(
                    model_name='job',
                    name='status',
                    field=models.CharField(
                        choices=[
                            ('draft', 'Draft'),
                            ('pending', 'Pending Review'),
                            ('pending_payment', 'Pending Payment'),
                            ('scheduled', 'Scheduled'),
                            ('published', 'Published'),
                            ('paused', 'Paused'),
                            ('expired', 'Expired'),
                            ('filled', 'Filled'),
                            ('hidden', 'Hidden'),
                        ],
                        db_index=True,
                        default='draft',
                        max_length=20,
                    ),
                ),
            ],
            database_operations=[],
        ),
        # Step 2: Alter job_id to remove callable default
        migrations.AlterField(
            model_name='job',
            name='job_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                help_text='Unique 8-character alphanumeric identifier (generated on save)',
                max_length=10,
                unique=True,
            ),
        ),
    ]

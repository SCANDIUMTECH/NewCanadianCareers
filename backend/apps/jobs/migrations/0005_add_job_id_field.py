"""
Add unique 6-character job_id field to Job model.

Three-step migration:
1. Add job_id as nullable (no unique constraint yet)
2. Populate existing rows with unique random IDs
3. Make the field non-nullable and add unique constraint + index
"""
import secrets
import string

from django.db import migrations, models


def generate_job_id(length=6):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def populate_job_ids(apps, schema_editor):
    Job = apps.get_model('jobs', 'Job')
    used_ids = set()
    for job in Job.objects.all():
        while True:
            candidate = generate_job_id()
            if candidate not in used_ids:
                break
        used_ids.add(candidate)
        job.job_id = candidate
        job.save(update_fields=['job_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0004_job_scheduled_publish_at_alter_job_status_and_more'),
    ]

    operations = [
        # Step 1: Add as nullable without unique constraint
        migrations.AddField(
            model_name='job',
            name='job_id',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=8,
                editable=False,
                help_text='Unique 6-character alphanumeric identifier',
            ),
        ),
        # Step 2: Populate existing rows
        migrations.RunPython(populate_job_ids, migrations.RunPython.noop),
        # Step 3: Make non-nullable, add unique + index
        migrations.AlterField(
            model_name='job',
            name='job_id',
            field=models.CharField(
                max_length=8,
                unique=True,
                editable=False,
                db_index=True,
                default=None,  # Will be set by model.save()
                help_text='Unique 6-character alphanumeric identifier',
            ),
            preserve_default=False,
        ),
    ]

"""Add entity_id and editing_locked_after_publish fields, then fix entity_id defaults.

Adds entity_id to Company and Agency, editing_locked_after_publish to Company,
then alters entity_id to remove callable default (replaced by save() override logic).
"""
from django.db import migrations, models
import core.utils


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0011_remove_industry_choices'),
    ]

    operations = [
        # Step 1: Add entity_id to Agency
        migrations.AddField(
            model_name='agency',
            name='entity_id',
            field=models.CharField(
                db_index=True,
                default=core.utils.generate_entity_id,
                editable=False,
                help_text='Unique 8-character alphanumeric identifier',
                max_length=10,
                unique=True,
            ),
            preserve_default=False,
        ),
        # Step 2: Add entity_id to Company
        migrations.AddField(
            model_name='company',
            name='entity_id',
            field=models.CharField(
                db_index=True,
                default=core.utils.generate_entity_id,
                editable=False,
                help_text='Unique 8-character alphanumeric identifier',
                max_length=10,
                unique=True,
            ),
            preserve_default=False,
        ),
        # Step 3: Add editing_locked_after_publish to Company
        migrations.AddField(
            model_name='company',
            name='editing_locked_after_publish',
            field=models.BooleanField(default=False),
        ),
        # Step 4: Alter entity_id to remove callable default
        migrations.AlterField(
            model_name='agency',
            name='entity_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                help_text='Unique 8-character alphanumeric identifier (generated on save)',
                max_length=10,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name='company',
            name='entity_id',
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

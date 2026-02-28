"""Fix entity_id callable default warning and sync migration state.

The entity_id and editing_locked_after_publish columns already exist in the DB
but were missing from migration state. This migration uses SeparateDatabaseAndState
to fix the state without attempting to re-add existing columns, then alters entity_id
to remove the callable default (replaced by save() override logic).
"""
from django.db import migrations, models
import core.utils


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0011_remove_industry_choices'),
    ]

    operations = [
        # Step 1: Fix migration state — tell Django these fields exist
        # (no DB operations since columns are already there)
        migrations.SeparateDatabaseAndState(
            state_operations=[
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
                migrations.AddField(
                    model_name='company',
                    name='editing_locked_after_publish',
                    field=models.BooleanField(default=False),
                ),
            ],
            database_operations=[],
        ),
        # Step 2: Alter entity_id to remove callable default (actual DB-safe operation)
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

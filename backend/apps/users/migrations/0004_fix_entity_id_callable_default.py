"""Add entity_id field and fix callable default.

Adds entity_id to User model, then alters to remove callable default
(replaced by save() override logic).
"""
from django.db import migrations, models
import core.utils


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_allow_recruiter_contact_user_is_marketing_admin_and_more'),
    ]

    operations = [
        # Step 1: Add entity_id field
        migrations.AddField(
            model_name='user',
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
        # Step 2: Alter to remove callable default
        migrations.AlterField(
            model_name='user',
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

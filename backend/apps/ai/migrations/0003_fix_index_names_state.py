from django.db import migrations, models


class Migration(migrations.Migration):
    """Fix AI index names: migration state says custom names but DB has auto-generated names."""

    dependencies = [
        ('ai', '0002_add_connection_test_feature'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterModelOptions(
                    name='aiusagelog',
                    options={'db_table': 'ai_usage_logs', 'ordering': ['-created_at']},
                ),
                # Rename indexes from custom names (in migration state) to auto-generated names (in DB)
                migrations.RenameIndex(
                    model_name='aiusagelog',
                    new_name='ai_usage_lo_feature_ccd6e0_idx',
                    old_name='ai_usage_lo_feature_idx',
                ),
                migrations.RenameIndex(
                    model_name='aiusagelog',
                    new_name='ai_usage_lo_user_id_3f9263_idx',
                    old_name='ai_usage_lo_user_idx',
                ),
                migrations.RenameIndex(
                    model_name='aiusagelog',
                    new_name='ai_usage_lo_company_148b49_idx',
                    old_name='ai_usage_lo_company_idx',
                ),
                migrations.RenameIndex(
                    model_name='aiusagelog',
                    new_name='ai_usage_lo_status_501e3b_idx',
                    old_name='ai_usage_lo_status_idx',
                ),
            ],
            database_operations=[],
        ),
    ]

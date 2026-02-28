# Remove hardcoded choices from Job.category field.
# Categories are now managed dynamically via the Category table in moderation app.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0005_add_job_id_field'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='category',
            field=models.CharField(default='other', max_length=50),
        ),
    ]

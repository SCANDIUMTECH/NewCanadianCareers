from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0009_alter_job_job_id_alter_job_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='address',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='job',
            name='postal_code',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]

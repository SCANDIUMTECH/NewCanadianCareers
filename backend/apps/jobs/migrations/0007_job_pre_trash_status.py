from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0006_remove_category_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='pre_trash_status',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]

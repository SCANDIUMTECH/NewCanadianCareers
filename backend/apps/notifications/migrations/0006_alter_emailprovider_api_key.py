# Widen EmailProvider.api_key from CharField(255) to TextField for encrypted values

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0005_slackinstallation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='emailprovider',
            name='api_key',
            field=models.TextField(blank=True, default=''),
        ),
    ]

# Add Slack App client_id and client_secret to SlackInstallation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0006_alter_emailprovider_api_key'),
    ]

    operations = [
        migrations.AddField(
            model_name='slackinstallation',
            name='client_id',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='slackinstallation',
            name='client_secret',
            field=models.TextField(blank=True, default=''),
        ),
    ]

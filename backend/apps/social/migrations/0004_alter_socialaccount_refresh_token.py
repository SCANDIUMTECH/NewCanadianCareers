# Add default='' to SocialAccount.refresh_token

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0003_socialtemplate_alter_socialaccount_platform_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='socialaccount',
            name='refresh_token',
            field=models.TextField(blank=True, default=''),
        ),
    ]

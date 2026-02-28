# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aiusagelog',
            name='feature',
            field=models.CharField(
                choices=[
                    ('seo_meta', 'SEO Meta Generation'),
                    ('seo_meta_bulk', 'SEO Meta Bulk Generation'),
                    ('social_content', 'Social Content Generation'),
                    ('connection_test', 'Connection Test'),
                ],
                max_length=30,
            ),
        ),
    ]

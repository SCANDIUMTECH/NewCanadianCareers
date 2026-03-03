# Remove hardcoded choices from Company.industry field.
# Industries are now managed dynamically via the Industry table in moderation app.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0010_agency_allow_backdate_posting'),
    ]

    operations = [
        migrations.AlterField(
            model_name='company',
            name='industry',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]

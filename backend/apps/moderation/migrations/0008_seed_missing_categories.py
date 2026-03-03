# Seed additional categories that were added to Job.CATEGORY_CHOICES
# but not included in the original 0007 seed migration.

from django.db import migrations
from django.utils.text import slugify


def seed_missing_categories(apps, schema_editor):
    """Add categories that exist in Job.CATEGORY_CHOICES but were not seeded."""
    Category = apps.get_model('moderation', 'Category')

    # These are the categories added after the original 12
    additional_categories = [
        ('quality-assurance', 'Quality Assurance'),
        ('agriculture', 'Agriculture'),
        ('compliance', 'Compliance'),
        ('cultural', 'Cultural'),
        ('cybersecurity', 'Cybersecurity'),
        ('diplomatic', 'Diplomatic'),
        ('education', 'Education'),
        ('gaming', 'Gaming'),
        ('healthcare', 'Healthcare'),
        ('logistics', 'Logistics'),
        ('media', 'Media'),
        ('nonprofit', 'Nonprofit'),
        ('planning', 'Planning'),
        ('research', 'Research'),
        ('security', 'Security'),
    ]

    # Start sort_order after existing items
    max_order = Category.objects.order_by('-sort_order').values_list('sort_order', flat=True).first() or 11
    start_order = max_order + 1

    for idx, (slug, name) in enumerate(additional_categories):
        Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'is_active': True,
                'sort_order': start_order + idx,
            }
        )


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0007_seed_categories_industries'),
    ]

    operations = [
        migrations.RunPython(seed_missing_categories, migrations.RunPython.noop),
    ]

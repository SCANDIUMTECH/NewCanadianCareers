# Data migration to seed initial categories and industries

from django.db import migrations
from django.utils.text import slugify


def seed_categories(apps, schema_editor):
    """Seed job categories from Job.CATEGORY_CHOICES."""
    Category = apps.get_model('moderation', 'Category')

    categories = [
        ('engineering', 'Engineering'),
        ('design', 'Design'),
        ('marketing', 'Marketing'),
        ('sales', 'Sales'),
        ('customer_support', 'Customer Support'),
        ('finance', 'Finance'),
        ('hr', 'Human Resources'),
        ('operations', 'Operations'),
        ('product', 'Product'),
        ('data', 'Data & Analytics'),
        ('legal', 'Legal'),
        ('other', 'Other'),
    ]

    for idx, (slug, name) in enumerate(categories):
        Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'is_active': True,
                'sort_order': idx,
            }
        )


def seed_industries(apps, schema_editor):
    """Seed company industries from Company.INDUSTRY_CHOICES."""
    Industry = apps.get_model('moderation', 'Industry')

    industries = [
        'Technology',
        'Finance & Banking',
        'Healthcare',
        'Retail',
        'Sales',
        'Manufacturing',
        'Education',
        'Energy & Utilities',
        'Media & Entertainment',
        'Real Estate',
        'Transportation & Logistics',
        'Construction',
        'Hospitality & Tourism',
        'Legal Services',
        'Nonprofit',
        'Government',
        'Agriculture',
        'Telecommunications',
        'Professional Services',
        'Consumer Goods',
        'Automotive',
        'Aerospace & Defense',
        'Pharmaceuticals',
        'Insurance',
        'Food & Beverage',
        'Fashion & Apparel',
        'E-commerce',
        'Consulting',
        'Marketing & Advertising',
        'Human Resources',
        'Mining & Metals',
        'Environmental Services',
        'Sports & Recreation',
        'Arts & Design',
        'Security & Investigations',
        'Venture Capital & Private Equity',
        'Staffing & Recruiting',
        'Biotechnology',
        'Logistics & Supply Chain',
        'Information Services',
        'Other',
    ]

    for idx, name in enumerate(industries):
        Industry.objects.get_or_create(
            name=name,
            defaults={
                'slug': slugify(name),
                'is_active': True,
                'sort_order': idx,
            }
        )


def reverse_seed(apps, schema_editor):
    """Remove seeded data."""
    Category = apps.get_model('moderation', 'Category')
    Industry = apps.get_model('moderation', 'Industry')

    Category.objects.all().delete()
    Industry.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0006_category_industry'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_seed),
        migrations.RunPython(seed_industries, migrations.RunPython.noop),
    ]

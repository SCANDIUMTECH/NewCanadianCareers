"""
Seed retention rules and legal documents with initial data matching
the static demo data that was previously hardcoded in the frontend.
"""
from django.db import migrations


def seed_data(apps, schema_editor):
    RetentionRule = apps.get_model('moderation', 'RetentionRule')
    LegalDocument = apps.get_model('moderation', 'LegalDocument')

    # Seed retention rules (matching the static frontend data)
    retention_rules = [
        {
            'category': 'Candidate Profiles',
            'description': 'Retained for 3 years after last activity, then anonymized',
            'retention_days': 1095,
            'is_deletable': True,
            'is_active': True,
            'enforcement': 'automated',
            'legal_basis': 'GDPR Article 5(1)(e)',
            'sort_order': 1,
        },
        {
            'category': 'Job Postings',
            'description': 'Retained for 2 years after expiry, then archived',
            'retention_days': 730,
            'is_deletable': False,
            'is_active': True,
            'enforcement': 'automated',
            'legal_basis': 'Legitimate Interest',
            'sort_order': 2,
        },
        {
            'category': 'Application Data',
            'description': 'Retained for 1 year after position filled, then deleted',
            'retention_days': 365,
            'is_deletable': True,
            'is_active': True,
            'enforcement': 'automated',
            'legal_basis': 'GDPR Article 6(1)(b)',
            'sort_order': 3,
        },
        {
            'category': 'Payment Records',
            'description': 'Retained for 7 years per financial regulations',
            'retention_days': 2555,
            'is_deletable': False,
            'is_active': True,
            'enforcement': 'legal_hold',
            'legal_basis': 'Legal Obligation - Tax Law',
            'sort_order': 4,
        },
        {
            'category': 'Audit Logs',
            'description': 'Retained for 5 years for compliance tracking',
            'retention_days': 1825,
            'is_deletable': False,
            'is_active': True,
            'enforcement': 'legal_hold',
            'legal_basis': 'GDPR Article 5(2) - Accountability',
            'sort_order': 5,
        },
        {
            'category': 'Marketing Consent Records',
            'description': 'Retained for duration of consent plus 1 year',
            'retention_days': 365,
            'is_deletable': True,
            'is_active': True,
            'enforcement': 'manual',
            'legal_basis': 'GDPR Article 7',
            'sort_order': 6,
        },
    ]

    for rule_data in retention_rules:
        RetentionRule.objects.create(**rule_data)

    # Seed legal documents (matching the frontend policy cards)
    legal_documents = [
        {
            'title': 'Privacy Policy',
            'slug': 'privacy-policy',
            'document_type': 'privacy_policy',
            'content': '<h1>Privacy Policy</h1><p>This privacy policy describes how we collect, use, and protect your personal data.</p>',
            'status': 'published',
            'version': '2.1',
            'public_url': '',
        },
        {
            'title': 'Terms of Service',
            'slug': 'terms-of-service',
            'document_type': 'terms_of_service',
            'content': '<h1>Terms of Service</h1><p>These terms govern your use of the platform.</p>',
            'status': 'published',
            'version': '1.8',
            'public_url': '',
        },
        {
            'title': 'Cookie Policy',
            'slug': 'cookie-policy',
            'document_type': 'cookie_policy',
            'content': '<h1>Cookie Policy</h1><p>This policy explains how we use cookies and similar technologies.</p>',
            'status': 'published',
            'version': '1.2',
            'public_url': '',
        },
        {
            'title': 'Data Processing Agreement',
            'slug': 'data-processing-agreement',
            'document_type': 'dpa',
            'content': '<h1>Data Processing Agreement</h1><p>This DPA outlines data processing arrangements between controllers and processors.</p>',
            'status': 'draft',
            'version': '1.0',
            'public_url': '',
        },
    ]

    for doc_data in legal_documents:
        LegalDocument.objects.create(**doc_data)


def reverse_seed(apps, schema_editor):
    RetentionRule = apps.get_model('moderation', 'RetentionRule')
    LegalDocument = apps.get_model('moderation', 'LegalDocument')
    RetentionRule.objects.all().delete()
    LegalDocument.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0016_add_retention_rules_and_legal_documents'),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_seed),
    ]

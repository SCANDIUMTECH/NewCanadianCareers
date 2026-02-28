"""
Add invoice_number field and rename invoice_pdf_url to invoice_pdf_key.
"""
from django.db import migrations, models
from django.utils import timezone


def backfill_invoice_numbers(apps, schema_editor):
    """Generate invoice numbers for existing invoices."""
    Invoice = apps.get_model('billing', 'Invoice')
    for idx, invoice in enumerate(Invoice.objects.order_by('created_at'), start=1):
        dt = invoice.created_at or timezone.now()
        number = f'INV-{dt.strftime("%Y%m")}-{idx:05d}'
        invoice.invoice_number = number
        invoice.save(update_fields=['invoice_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0003_initial'),
    ]

    operations = [
        # Step 1: Add invoice_number without unique constraint
        migrations.AddField(
            model_name='invoice',
            name='invoice_number',
            field=models.CharField(blank=True, default='', max_length=50),
            preserve_default=False,
        ),

        # Step 2: Backfill existing invoices
        migrations.RunPython(backfill_invoice_numbers, migrations.RunPython.noop),

        # Step 3: Add unique + index constraint
        migrations.AlterField(
            model_name='invoice',
            name='invoice_number',
            field=models.CharField(blank=True, null=True, db_index=True, max_length=50, unique=True),
        ),

        # Step 4: Remove old invoice_pdf_url, add invoice_pdf_key
        migrations.RemoveField(
            model_name='invoice',
            name='invoice_pdf_url',
        ),
        migrations.AddField(
            model_name='invoice',
            name='invoice_pdf_key',
            field=models.CharField(blank=True, default='', max_length=500),
            preserve_default=False,
        ),
    ]

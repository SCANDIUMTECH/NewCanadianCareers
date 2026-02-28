"""
Invoice service for PDF generation and MinIO storage.
"""
import logging
from io import BytesIO
from decimal import Decimal

import weasyprint
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from .models import Invoice, InvoiceItem

logger = logging.getLogger(__name__)

CURRENCY_SYMBOLS = {
    'USD': '$',
    'CAD': 'C$',
    'EUR': '\u20ac',
    'GBP': '\u00a3',
    'AUD': 'A$',
}


class InvoiceService:
    """Handles invoice number generation, PDF rendering, and MinIO storage."""

    @classmethod
    def generate_invoice_number(cls):
        """Generate sequential invoice number: INV-YYYYMM-XXXXX."""
        now = timezone.now()
        prefix = f'INV-{now.strftime("%Y%m")}-'

        with transaction.atomic():
            last_invoice = (
                Invoice.objects
                .select_for_update()
                .filter(invoice_number__startswith=prefix)
                .order_by('-invoice_number')
                .values_list('invoice_number', flat=True)
                .first()
            )

            if last_invoice:
                last_seq = int(last_invoice.split('-')[-1])
                next_seq = last_seq + 1
            else:
                next_seq = 1

        return f'{prefix}{next_seq:05d}'

    @classmethod
    def generate_invoice_pdf(cls, invoice):
        """Render HTML template to PDF bytes using WeasyPrint."""
        items = invoice.items.all()
        subtotal = sum(item.total for item in items) if items.exists() else invoice.amount
        total = invoice.amount
        currency_symbol = CURRENCY_SYMBOLS.get(invoice.currency, '$')

        # Determine bill-to info
        if invoice.company:
            bill_to_name = invoice.company.name
            bill_to_email = getattr(invoice.company, 'contact_email', '') or ''
        elif invoice.agency:
            bill_to_name = invoice.agency.name
            bill_to_email = getattr(invoice.agency, 'contact_email', '') or ''
        else:
            bill_to_name = 'Customer'
            bill_to_email = ''

        context = {
            'invoice': invoice,
            'items': items,
            'bill_to_name': bill_to_name,
            'bill_to_email': bill_to_email,
            'invoice_date': invoice.created_at.strftime('%B %d, %Y'),
            'payment_date': invoice.paid_at.strftime('%B %d, %Y') if invoice.paid_at else 'N/A',
            'currency_symbol': currency_symbol,
            'subtotal': subtotal,
            'total': total,
        }

        html_string = render_to_string('billing/invoice_pdf.html', context)
        pdf_bytes = weasyprint.HTML(string=html_string).write_pdf()
        return pdf_bytes

    @classmethod
    def upload_pdf_to_storage(cls, invoice, pdf_bytes):
        """Upload PDF to MinIO via default_storage and update invoice_pdf_key."""
        dt = invoice.created_at or timezone.now()
        key = f'invoices/{dt.strftime("%Y/%m")}/{invoice.invoice_number}.pdf'

        default_storage.save(key, ContentFile(pdf_bytes))
        invoice.invoice_pdf_key = key
        invoice.save(update_fields=['invoice_pdf_key'])

        logger.info('Uploaded invoice PDF: %s', key)
        return key

    @classmethod
    def get_download_url(cls, invoice):
        """Generate a signed URL for downloading the invoice PDF."""
        if not invoice.invoice_pdf_key:
            return None
        return default_storage.url(invoice.invoice_pdf_key)

    @classmethod
    def generate_and_store_pdf(cls, invoice_id):
        """Full pipeline: generate PDF and upload to MinIO."""
        invoice = (
            Invoice.objects
            .select_related('company', 'agency')
            .prefetch_related('items')
            .get(id=invoice_id)
        )

        if not invoice.invoice_number:
            invoice.invoice_number = cls.generate_invoice_number()
            invoice.save(update_fields=['invoice_number'])

        pdf_bytes = cls.generate_invoice_pdf(invoice)
        cls.upload_pdf_to_storage(invoice, pdf_bytes)

        logger.info('Generated and stored PDF for invoice %s', invoice.invoice_number)

    @classmethod
    def _create_invoice_atomic(cls, invoice_kwargs, items):
        """Create an Invoice + InvoiceItems with the invoice number generated
        inside the same atomic block to prevent TOCTOU race conditions."""
        with transaction.atomic():
            now = timezone.now()
            prefix = f'INV-{now.strftime("%Y%m")}-'

            last_invoice = (
                Invoice.objects
                .select_for_update()
                .filter(invoice_number__startswith=prefix)
                .order_by('-invoice_number')
                .values_list('invoice_number', flat=True)
                .first()
            )

            if last_invoice:
                last_seq = int(last_invoice.split('-')[-1])
                next_seq = last_seq + 1
            else:
                next_seq = 1

            invoice_number = f'{prefix}{next_seq:05d}'

            invoice = Invoice.objects.create(
                invoice_number=invoice_number,
                **invoice_kwargs,
            )

            for item_kwargs in items:
                InvoiceItem.objects.create(invoice=invoice, **item_kwargs)

        return invoice

    @classmethod
    def create_admin_credit_invoice(cls, company=None, credits=0, credit_type='job', admin_user=None, reason='', agency=None, currency='CAD', payment_method='complimentary'):
        """Create an Invoice + InvoiceItem for admin credit grants ($0 complimentary)."""
        credit_label = {'job': 'Job Posting', 'featured': 'Featured', 'social': 'Social Media'}
        description = f'Complimentary {credit_label.get(credit_type, "Job Posting")} Credits'

        invoice_kwargs = {
            'amount': Decimal('0.00'),
            'currency': currency,
            'description': description,
            'status': 'paid',
            'paid_at': timezone.now(),
            'payment_method': payment_method or 'complimentary',
        }
        if company:
            invoice_kwargs['company'] = company
        if agency:
            invoice_kwargs['agency'] = agency

        return cls._create_invoice_atomic(
            invoice_kwargs=invoice_kwargs,
            items=[{
                'description': f'{credits} {credit_label.get(credit_type, "Job Posting")} Credits (Admin Grant)',
                'quantity': credits,
                'unit_price': Decimal('0.00'),
                'total': Decimal('0.00'),
            }],
        )

    @classmethod
    def create_admin_package_invoice(cls, package, credit_type='job', payment_method='stored_card',
                                     invoice_status='paid', company=None, agency=None,
                                     coupon_code=None, discount_amount=None, currency='CAD'):
        """Create an Invoice + InvoiceItems for admin package-based credit grants.

        Handles real pricing, coupon discounts, and proper invoice status.
        """
        credit_label = {'job': 'Job Posting', 'featured': 'Featured', 'social': 'Social Media'}
        label = credit_label.get(credit_type, 'Job Posting')

        final_amount = package.price
        if discount_amount and discount_amount > 0:
            final_amount = max(package.price - discount_amount, Decimal('0.00'))

        invoice_kwargs = {
            'amount': final_amount,
            'currency': currency,
            'description': f'{package.name} - {label} Credits',
            'status': invoice_status,
            'payment_method': payment_method,
        }
        if invoice_status == 'paid':
            invoice_kwargs['paid_at'] = timezone.now()
        if company:
            invoice_kwargs['company'] = company
        if agency:
            invoice_kwargs['agency'] = agency

        items = [{
            'package': package,
            'description': package.name,
            'quantity': 1,
            'unit_price': package.price,
            'total': package.price,
        }]

        if discount_amount and discount_amount > 0:
            items.append({
                'description': f'Discount: {coupon_code or "Admin Discount"}',
                'quantity': 1,
                'unit_price': -discount_amount,
                'total': -discount_amount,
            })

        return cls._create_invoice_atomic(
            invoice_kwargs=invoice_kwargs,
            items=items,
        )

    @classmethod
    def create_plan_change_invoice(cls, company, package, admin_user, notes='', payment_method='stripe_card'):
        """Create an Invoice + InvoiceItem for admin plan changes."""
        return cls._create_invoice_atomic(
            invoice_kwargs={
                'company': company,
                'amount': package.price,
                'currency': package.currency,
                'description': f'Plan Change - {package.name}',
                'status': 'paid',
                'paid_at': timezone.now(),
                'payment_method': payment_method or 'stripe_card',
            },
            items=[{
                'package': package,
                'description': f'{package.name} Plan',
                'quantity': 1,
                'unit_price': package.price,
                'total': package.price,
            }],
        )

"""
Management command to fix orphaned companies and agencies (those without owners).
Assigns them to the first admin user found.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.companies.models import Company, CompanyUser, Agency, AgencyUser
from apps.users.models import User


class Command(BaseCommand):
    help = 'Assign an owner to any company or agency that does not have one.'

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role='admin', status='active').first()
        if not admin_user:
            self.stderr.write(self.style.ERROR('No active admin user found. Cannot fix orphaned orgs.'))
            return

        self.stdout.write(f'Using admin user: {admin_user.email} (id={admin_user.id})')

        # Fix orphaned companies
        orphaned_companies = Company.objects.exclude(
            id__in=CompanyUser.objects.filter(role='owner').values_list('company_id', flat=True)
        )
        count = orphaned_companies.count()
        if count:
            self.stdout.write(f'Found {count} orphaned companies:')
            for company in orphaned_companies:
                with transaction.atomic():
                    CompanyUser.objects.update_or_create(
                        company=company,
                        user=admin_user,
                        defaults={'role': 'owner'},
                    )
                    self.stdout.write(f'  -> Assigned {admin_user.email} as owner of "{company.name}"')
        else:
            self.stdout.write('No orphaned companies found.')

        # Fix orphaned agencies
        orphaned_agencies = Agency.objects.exclude(
            id__in=AgencyUser.objects.filter(role='owner').values_list('agency_id', flat=True)
        )
        count = orphaned_agencies.count()
        if count:
            self.stdout.write(f'Found {count} orphaned agencies:')
            for agency in orphaned_agencies:
                with transaction.atomic():
                    AgencyUser.objects.update_or_create(
                        agency=agency,
                        user=admin_user,
                        defaults={'role': 'owner'},
                    )
                    self.stdout.write(f'  -> Assigned {admin_user.email} as owner of "{agency.name}"')
        else:
            self.stdout.write('No orphaned agencies found.')

        self.stdout.write(self.style.SUCCESS('Done. All companies and agencies now have owners.'))

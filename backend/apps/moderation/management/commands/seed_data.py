"""
Management command to seed sample data for development and testing.
"""
import os
import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed sample data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            self._clear_data()

        self.stdout.write('Seeding data...')

        # Create admin user if doesn't exist
        admin = self._create_admin_user()

        # Create sample companies
        companies = self._create_companies()

        # Create sample agencies
        agencies = self._create_agencies()

        # Create sample candidates
        candidates = self._create_candidates()

        # Create sample jobs
        jobs = self._create_jobs(companies, agencies)

        # Create sample applications
        self._create_applications(jobs, candidates)

        # Create sample invoices
        self._create_invoices(companies)

        # Create sample job reports
        self._create_job_reports(jobs)

        # Create sample admin activities
        self._create_admin_activities(companies, jobs)

        # Create sample system alerts
        self._create_system_alerts()

        self.stdout.write(self.style.SUCCESS('Sample data seeded successfully!'))

    def _clear_data(self):
        from apps.moderation.models import SystemAlert, AdminActivity
        from apps.jobs.models import Job, JobReport
        from apps.applications.models import Application
        from apps.companies.models import Company, Agency
        from apps.billing.models import Invoice

        SystemAlert.objects.all().delete()
        AdminActivity.objects.all().delete()
        JobReport.objects.all().delete()
        Application.objects.all().delete()
        Job.objects.all().delete()
        Invoice.objects.all().delete()
        Company.objects.all().delete()
        Agency.objects.all().delete()
        User.objects.filter(role__in=['candidate', 'employer', 'agency']).delete()

    def _create_admin_user(self):
        import os
        admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        if not admin_password:
            raise ValueError(
                'DJANGO_SUPERUSER_PASSWORD environment variable must be set for seed_data command'
            )

        admin, created = User.objects.get_or_create(
            email='admin@orion.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'admin',
                'status': 'active',
                'email_verified': True,
            }
        )
        if created:
            admin.set_password(admin_password)
            admin.save()
            self.stdout.write(f'  Created admin user: admin@orion.com')
        return admin

    def _create_companies(self):
        from apps.companies.models import Company

        company_data = [
            {'name': 'TechCorp Inc.', 'domain': 'techcorp.com', 'industry': 'Technology', 'size': '500-1000'},
            {'name': 'Digital Solutions', 'domain': 'digitalsolutions.io', 'industry': 'Technology', 'size': '50-200'},
            {'name': 'Global Finance', 'domain': 'globalfinance.com', 'industry': 'Finance', 'size': '1000+'},
            {'name': 'HealthPlus', 'domain': 'healthplus.org', 'industry': 'Healthcare', 'size': '200-500'},
            {'name': 'StartupX', 'domain': 'startupx.co', 'industry': 'Technology', 'size': '10-50'},
            {'name': 'Marketing Pro', 'domain': 'marketingpro.com', 'industry': 'Marketing', 'size': '50-200'},
            {'name': 'EcoEnergy', 'domain': 'ecoenergy.net', 'industry': 'Energy', 'size': '200-500'},
            {'name': 'RetailMax', 'domain': 'retailmax.com', 'industry': 'Retail', 'size': '1000+'},
        ]

        companies = []
        for data in company_data:
            company, created = Company.objects.get_or_create(
                domain=data['domain'],
                defaults={
                    'name': data['name'],
                    'industry': data['industry'],
                    'size': data['size'],
                    'status': random.choice(['verified', 'verified', 'verified', 'pending']),
                }
            )
            if created:
                # Create employer user for company
                user = User.objects.create(
                    email=f'employer@{data["domain"]}',
                    first_name='Employer',
                    last_name=data['name'].split()[0],
                    role='employer',
                    status='active',
                    company=company,
                    email_verified=True,
                )
                user.set_password(os.environ.get('SEED_USER_PASSWORD', 'SeedDev2026!!'))
                user.save()
            companies.append(company)

        self.stdout.write(f'  Created {len(companies)} companies')
        return companies

    def _create_agencies(self):
        from apps.companies.models import Agency

        agency_data = [
            {'name': 'Elite Staffing', 'industry': 'General'},
            {'name': 'Tech Recruiters', 'industry': 'Technology'},
            {'name': 'Executive Search', 'industry': 'Executive'},
        ]

        agencies = []
        for data in agency_data:
            agency, created = Agency.objects.get_or_create(
                name=data['name'],
                defaults={
                    'industry': data['industry'],
                    'status': 'verified',
                }
            )
            if created:
                user = User.objects.create(
                    email=f'agency@{data["name"].lower().replace(" ", "")}.com',
                    first_name='Agency',
                    last_name='Manager',
                    role='agency',
                    status='active',
                    agency=agency,
                    email_verified=True,
                )
                user.set_password(os.environ.get('SEED_USER_PASSWORD', 'SeedDev2026!!'))
                user.save()
            agencies.append(agency)

        self.stdout.write(f'  Created {len(agencies)} agencies')
        return agencies

    def _create_candidates(self):
        candidate_data = [
            {'first_name': 'John', 'last_name': 'Doe', 'email': 'john.doe@email.com'},
            {'first_name': 'Jane', 'last_name': 'Smith', 'email': 'jane.smith@email.com'},
            {'first_name': 'Mike', 'last_name': 'Johnson', 'email': 'mike.j@email.com'},
            {'first_name': 'Sarah', 'last_name': 'Wilson', 'email': 'sarah.w@email.com'},
            {'first_name': 'David', 'last_name': 'Brown', 'email': 'david.b@email.com'},
            {'first_name': 'Emily', 'last_name': 'Davis', 'email': 'emily.d@email.com'},
            {'first_name': 'Chris', 'last_name': 'Miller', 'email': 'chris.m@email.com'},
            {'first_name': 'Lisa', 'last_name': 'Taylor', 'email': 'lisa.t@email.com'},
        ]

        candidates = []
        for data in candidate_data:
            candidate, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'candidate',
                    'status': 'active',
                    'email_verified': True,
                }
            )
            if created:
                candidate.set_password(os.environ.get('SEED_USER_PASSWORD', 'SeedDev2026!!'))
                candidate.save()
            candidates.append(candidate)

        self.stdout.write(f'  Created {len(candidates)} candidates')
        return candidates

    def _create_jobs(self, companies, agencies):
        from apps.jobs.models import Job

        job_titles = [
            'Senior Software Engineer',
            'Product Manager',
            'Data Scientist',
            'UX Designer',
            'DevOps Engineer',
            'Marketing Manager',
            'Sales Representative',
            'Financial Analyst',
            'Full Stack Developer',
            'Project Manager',
            'Frontend Developer',
            'Backend Developer',
            'Machine Learning Engineer',
            'Business Analyst',
            'QA Engineer',
        ]

        locations = [
            {'city': 'New York', 'state': 'NY', 'country': 'USA'},
            {'city': 'San Francisco', 'state': 'CA', 'country': 'USA'},
            {'city': 'Austin', 'state': 'TX', 'country': 'USA'},
            {'city': 'Seattle', 'state': 'WA', 'country': 'USA'},
            {'city': 'Chicago', 'state': 'IL', 'country': 'USA'},
            {'city': 'Remote', 'state': '', 'country': 'USA'},
        ]
        employment_types = ['full_time', 'part_time', 'contract']
        experience_levels = ['entry', 'mid', 'senior', 'lead']

        jobs = []
        now = timezone.now()

        for i, title in enumerate(job_titles):
            company = random.choice(companies)
            agency = random.choice(agencies + [None, None])  # 2/3 chance of no agency
            location = random.choice(locations)

            # Vary creation dates over the past 30 days
            created_at = now - timedelta(days=random.randint(0, 30))

            job = Job.objects.create(
                title=title,
                company=company,
                agency=agency,
                description=f'We are looking for an experienced {title} to join our team.',
                city=location['city'],
                state=location['state'],
                country=location['country'],
                location_type=random.choice(['remote', 'onsite', 'hybrid']),
                employment_type=random.choice(employment_types),
                experience_level=random.choice(experience_levels),
                salary_min=random.randint(50, 100) * 1000,
                salary_max=random.randint(100, 200) * 1000,
                salary_currency='CAD',
                status=random.choice(['published', 'published', 'published', 'pending', 'draft']),
                expires_at=now + timedelta(days=random.randint(7, 60)),
            )
            # Update created_at after creation
            Job.objects.filter(id=job.id).update(created_at=created_at)
            jobs.append(job)

        self.stdout.write(f'  Created {len(jobs)} jobs')
        return jobs

    def _create_applications(self, jobs, candidates):
        from apps.applications.models import Application

        statuses = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'rejected']
        applications = []
        now = timezone.now()

        # Each candidate applies to 2-4 jobs
        for candidate in candidates:
            applied_jobs = random.sample(jobs, min(random.randint(2, 4), len(jobs)))
            for job in applied_jobs:
                created_at = now - timedelta(days=random.randint(0, 14))
                app = Application.objects.create(
                    job=job,
                    candidate=candidate,
                    status=random.choice(statuses),
                    cover_letter='I am excited to apply for this position...',
                    resume='resumes/sample_resume.pdf',  # Placeholder path
                )
                Application.objects.filter(id=app.id).update(created_at=created_at)
                applications.append(app)

        self.stdout.write(f'  Created {len(applications)} applications')
        return applications

    def _create_invoices(self, companies):
        from apps.billing.models import Invoice

        invoices = []
        now = timezone.now()

        for company in companies:
            # Create 1-3 invoices per company
            for _ in range(random.randint(1, 3)):
                amount = Decimal(str(random.randint(99, 999)))
                invoice_status = random.choice(['paid', 'paid', 'paid', 'pending', 'failed'])
                created_at = now - timedelta(days=random.randint(0, 60))
                paid_at = created_at + timedelta(days=random.randint(1, 7)) if invoice_status == 'paid' else None

                invoice = Invoice.objects.create(
                    company=company,
                    amount=amount,
                    status=invoice_status,
                    description=f'Job posting package - {company.name}',
                    paid_at=paid_at,
                )
                Invoice.objects.filter(id=invoice.id).update(created_at=created_at)
                invoices.append(invoice)

        self.stdout.write(f'  Created {len(invoices)} invoices')
        return invoices

    def _create_job_reports(self, jobs):
        from apps.jobs.models import JobReport

        reasons = [
            ('misleading', 'The job description contains misleading information about the role.'),
            ('spam', 'This appears to be a scam job posting.'),
            ('inappropriate', 'The job posting contains inappropriate content.'),
            ('duplicate', 'This is a duplicate of another job posting.'),
            ('other', 'The listed position appears to already be filled.'),
        ]

        reports = []
        # Create reports for ~20% of jobs
        reported_jobs = random.sample(jobs, max(1, len(jobs) // 5))

        for job in reported_jobs:
            reason_code, details = random.choice(reasons)
            report = JobReport.objects.create(
                job=job,
                reason=reason_code,
                details=details,
                status=random.choice(['pending', 'pending', 'dismissed', 'action_taken']),
                reporter_email='reporter@example.com',
            )
            reports.append(report)

        self.stdout.write(f'  Created {len(reports)} job reports')
        return reports

    def _create_admin_activities(self, companies, jobs):
        from apps.moderation.models import AdminActivity

        activity_templates = [
            ('job', 'New job posted', 'Senior Developer'),
            ('job', 'Job approved', 'Marketing Manager'),
            ('job', 'Job flagged for review', 'Sales Rep'),
            ('user', 'New user registered', 'John Smith'),
            ('user', 'User verified', 'Jane Doe'),
            ('moderation', 'Report resolved', 'Job #123'),
            ('moderation', 'Content flagged', 'Company Profile'),
            ('payment', 'Invoice paid', '$499.00'),
            ('payment', 'Package purchased', 'Premium Plan'),
        ]

        activities = []
        now = timezone.now()

        for i in range(15):
            activity_type, action, entity = random.choice(activity_templates)
            created_at = now - timedelta(hours=random.randint(1, 72))
            company = random.choice(companies + [None])

            activity = AdminActivity.objects.create(
                activity_type=activity_type,
                action=action,
                entity_name=entity,
                company=company,
            )
            AdminActivity.objects.filter(id=activity.id).update(created_at=created_at)
            activities.append(activity)

        self.stdout.write(f'  Created {len(activities)} admin activities')
        return activities

    def _create_system_alerts(self):
        from apps.moderation.models import SystemAlert

        alert_templates = [
            ('error', 'Payment processing service experiencing delays'),
            ('warning', '5 jobs flagged for manual review'),
            ('info', 'Scheduled maintenance tonight at 2 AM UTC'),
            ('warning', 'High volume of new user registrations detected'),
            ('error', 'Email delivery service returning errors'),
        ]

        alerts = []
        now = timezone.now()

        for severity, message in alert_templates:
            created_at = now - timedelta(hours=random.randint(1, 48))
            alert = SystemAlert.objects.create(
                severity=severity,
                message=message,
                is_dismissed=random.choice([False, False, False, True]),  # 25% dismissed
            )
            SystemAlert.objects.filter(id=alert.id).update(created_at=created_at)
            alerts.append(alert)

        self.stdout.write(f'  Created {len(alerts)} system alerts')
        return alerts

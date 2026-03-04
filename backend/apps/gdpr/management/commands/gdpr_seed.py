from django.core.management.base import BaseCommand
from apps.gdpr.models import GDPRSettings, Service, ServiceCategory


class Command(BaseCommand):
    help = "Seed default GDPR service categories and example services"

    def handle(self, *args, **options):
        # Create default categories
        categories_data = [
            {"name": "Necessary", "slug": "necessary", "description": "Essential cookies required for the website to function.", "order": 1},
            {"name": "Preferences", "slug": "preferences", "description": "Cookies that remember your settings and preferences.", "order": 2},
            {"name": "Analytics", "slug": "analytics", "description": "Cookies that help us understand how visitors use the website.", "order": 3},
            {"name": "Marketing", "slug": "marketing", "description": "Cookies used for advertising and tracking.", "order": 4},
            {"name": "Unclassified", "slug": "unclassified", "description": "Cookies that have not yet been categorized.", "order": 5},
        ]

        categories = {}
        for cat_data in categories_data:
            cat, created = ServiceCategory.objects.get_or_create(
                slug=cat_data["slug"],
                defaults=cat_data,
            )
            categories[cat.slug] = cat
            status = "Created" if created else "Already exists"
            self.stdout.write(f"  {status}: {cat.name}")

        # Create example services
        services_data = [
            {
                "name": "Cloudflare",
                "slug": "cloudflare",
                "description": "CDN and security service.",
                "category": categories["necessary"],
                "is_deactivatable": False,
                "default_enabled": True,
                "cookies": "__cfduid, __cf_bm",
            },
            {
                "name": "Google Analytics",
                "slug": "google-analytics",
                "description": "Web analytics service by Google.",
                "category": categories["analytics"],
                "is_deactivatable": True,
                "default_enabled": False,
                "is_analytics": True,
                "cookies": "_ga, _gid, _gat",
                "head_script": "<!-- Replace with your GA tracking code -->",
            },
            {
                "name": "Google Tag Manager",
                "slug": "google-tag-manager",
                "description": "Tag management system by Google.",
                "category": categories["analytics"],
                "is_deactivatable": True,
                "default_enabled": False,
                "is_analytics": True,
                "cookies": "_gcl_au",
            },
            {
                "name": "Facebook Pixel",
                "slug": "facebook-pixel",
                "description": "Conversion tracking and remarketing by Meta.",
                "category": categories["marketing"],
                "is_deactivatable": True,
                "default_enabled": False,
                "is_advertising": True,
                "cookies": "_fbp, fr",
                "head_script": "<!-- Replace with your Facebook Pixel code -->",
            },
            {
                "name": "HotJar",
                "slug": "hotjar",
                "description": "Behavior analytics and user feedback service.",
                "category": categories["analytics"],
                "is_deactivatable": True,
                "default_enabled": False,
                "is_analytics": True,
                "cookies": "_hj*",
                "head_script": "<!-- Replace with your HotJar tracking code -->",
            },
        ]

        for svc_data in services_data:
            svc, created = Service.objects.get_or_create(
                slug=svc_data["slug"],
                defaults=svc_data,
            )
            status = "Created" if created else "Already exists"
            self.stdout.write(f"  {status}: {svc.name}")

        # Ensure settings singleton exists
        GDPRSettings.load()
        self.stdout.write(self.style.SUCCESS("\nGDPR seed data loaded successfully."))

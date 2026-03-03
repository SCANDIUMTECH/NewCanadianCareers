"""
Search views for Orion API.
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.jobs.models import Job
from apps.jobs.serializers import JobListSerializer
from apps.companies.models import Company
from apps.companies.serializers import CompanySerializer


class JobSearchView(generics.ListAPIView):
    """Advanced job search."""

    serializer_class = JobListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Job.objects.filter(
            status='published',
            expires_at__gt=timezone.now()
        ).select_related('company')

        params = self.request.query_params

        # Keywords search
        q = params.get('q')
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(company__name__icontains=q) |
                Q(skills__icontains=q)
            )

        # Location
        location = params.get('location')
        if location:
            queryset = queryset.filter(
                Q(city__icontains=location) |
                Q(state__icontains=location) |
                Q(country__icontains=location)
            )

        # Remote filter
        remote = params.get('remote')
        if remote == 'true':
            queryset = queryset.filter(location_type='remote')
        elif remote == 'false':
            queryset = queryset.exclude(location_type='remote')

        # Location type
        location_type = params.get('location_type')
        if location_type:
            queryset = queryset.filter(location_type=location_type)

        # Employment type
        employment_type = params.getlist('employment_type')
        if employment_type:
            queryset = queryset.filter(employment_type__in=employment_type)

        # Experience level
        experience = params.getlist('experience')
        if experience:
            queryset = queryset.filter(experience_level__in=experience)

        # Category
        category = params.getlist('category')
        if category:
            queryset = queryset.filter(category__in=category)

        # Salary range (validated as Decimal to prevent 500 on invalid input)
        from decimal import Decimal, InvalidOperation
        salary_min_raw = params.get('salary_min')
        if salary_min_raw:
            try:
                salary_min = Decimal(salary_min_raw)
                if Decimal('0') < salary_min < Decimal('999999999.99'):
                    queryset = queryset.filter(
                        Q(salary_max__gte=salary_min) | Q(salary_max__isnull=True)
                    )
            except (InvalidOperation, ValueError, TypeError):
                pass

        salary_max_raw = params.get('salary_max')
        if salary_max_raw:
            try:
                salary_max = Decimal(salary_max_raw)
                if Decimal('0') < salary_max < Decimal('999999999.99'):
                    queryset = queryset.filter(
                        Q(salary_min__lte=salary_max) | Q(salary_min__isnull=True)
                    )
            except (InvalidOperation, ValueError, TypeError):
                pass

        # Company
        company = params.get('company')
        if company:
            queryset = queryset.filter(company_id=company)

        # Posted within
        posted_within = params.get('posted_within')
        if posted_within:
            try:
                days = max(1, min(365, int(posted_within)))
            except (ValueError, TypeError):
                days = None
            if days is not None:
                cutoff = timezone.now() - timezone.timedelta(days=days)
                queryset = queryset.filter(posted_at__gte=cutoff)

        # Sorting
        sort = params.get('sort', '-posted_at')
        valid_sorts = ['posted_at', '-posted_at', 'salary_min', '-salary_min', 'title', '-title']
        if sort in valid_sorts:
            queryset = queryset.order_by('-featured', sort)
        else:
            queryset = queryset.order_by('-featured', '-posted_at')

        return queryset


class CompanySearchView(generics.ListAPIView):
    """Company search."""

    serializer_class = CompanySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Company.objects.filter(status='verified')

        params = self.request.query_params

        # Keywords search
        q = params.get('q')
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(industry__icontains=q)
            )

        # Industry filter
        industry = params.get('industry')
        if industry:
            queryset = queryset.filter(industry=industry)

        # Size filter
        size = params.get('size')
        if size:
            queryset = queryset.filter(size=size)

        # Location
        location = params.get('location')
        if location:
            queryset = queryset.filter(
                Q(headquarters_city__icontains=location) |
                Q(headquarters_country__icontains=location)
            )

        return queryset.order_by('name')


class SearchSuggestionsView(APIView):
    """Get search suggestions based on query."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])

        suggestions = []

        # Job title suggestions
        job_titles = Job.objects.filter(
            status='published',
            title__icontains=q
        ).values_list('title', flat=True).distinct()[:5]

        for title in job_titles:
            suggestions.append({'type': 'job', 'text': title})

        # Company name suggestions
        company_names = Company.objects.filter(
            status='verified',
            name__icontains=q
        ).values_list('name', flat=True)[:5]

        for name in company_names:
            suggestions.append({'type': 'company', 'text': name})

        # Skill suggestions (from job skills)
        # This is simplified - in production you'd have a skills table

        return Response(suggestions[:10])


class SearchFiltersView(APIView):
    """Get available search filters with counts."""

    permission_classes = [AllowAny]

    def get(self, request):
        base_queryset = Job.objects.filter(
            status='published',
            expires_at__gt=timezone.now()
        )

        from django.db.models import Count

        # Employment types with counts
        employment_types = list(
            base_queryset.values('employment_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Experience levels with counts
        experience_levels = list(
            base_queryset.values('experience_level')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Categories with counts
        categories = list(
            base_queryset.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Location types with counts
        location_types = list(
            base_queryset.values('location_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Top locations
        locations = list(
            base_queryset.values('country')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        return Response({
            'employment_types': employment_types,
            'experience_levels': experience_levels,
            'categories': categories,
            'location_types': location_types,
            'top_locations': locations,
        })


class SitemapDataView(APIView):
    """
    Public endpoint providing data for the Next.js dynamic sitemap.

    GET /api/search/sitemap-data/
    No authentication required — only returns public IDs and timestamps.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Published, non-expired jobs
        jobs = list(
            Job.objects.filter(
                status='published',
                expires_at__gt=timezone.now(),
            ).values('job_id', 'updated_at').order_by('-updated_at')
        )

        # Verified companies
        companies = list(
            Company.objects.filter(
                status='verified',
            ).values('entity_id', 'updated_at').order_by('-updated_at')
        )

        # Active job categories (from published jobs)
        categories = list(
            Job.objects.filter(
                status='published',
                expires_at__gt=timezone.now(),
            ).values_list('category', flat=True).distinct()
        )

        return Response({
            'jobs': [
                {'job_id': j['job_id'], 'updated_at': j['updated_at'].isoformat() if j['updated_at'] else None}
                for j in jobs
            ],
            'companies': [
                {'entity_id': c['entity_id'], 'updated_at': c['updated_at'].isoformat() if c['updated_at'] else None}
                for c in companies
            ],
            'categories': [{'slug': cat} for cat in categories if cat],
        })

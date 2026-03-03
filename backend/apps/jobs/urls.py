"""
Job URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.PublicJobViewSet, basename='jobs')

company_router = DefaultRouter()
company_router.register(r'', views.CompanyJobViewSet, basename='company-jobs')

agency_router = DefaultRouter()
agency_router.register(r'', views.AgencyJobViewSet, basename='agency-jobs')

# Nested router for agency job applicants
# This handles: /api/jobs/agency/{job_id}/applicants/
from apps.applications.views import AgencyJobApplicantsViewSet
agency_applicants_router = DefaultRouter()
agency_applicants_router.register(
    r'applicants',
    AgencyJobApplicantsViewSet,
    basename='agency-job-applicants'
)

urlpatterns = [
    # Company and agency routes before public routes
    path('company/', include(company_router.urls)),
    path('agency/', include(agency_router.urls)),

    # Nested agency applicants routes
    path('agency/<str:job_id>/', include(agency_applicants_router.urls)),

    # Job categories
    path('categories/', views.JobCategoriesView.as_view(), name='job-categories'),

    # Report a job (uses <int:>, no conflict)
    path('<int:job_id>/report/', views.JobReportView.as_view(), name='job-report'),

    # Public job listing (lookup by job_id, e.g. /api/jobs/K939V3/)
    path('', include(router.urls)),
]

# Job social posts URL is registered separately via apps.social.views.JobSocialPostsView
# in the jobs URL namespace as: /api/jobs/<job_id>/social-posts/

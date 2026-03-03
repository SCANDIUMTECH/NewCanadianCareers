"""
Application URL patterns.

NOTE: Explicit path() patterns for company/* must come BEFORE the router include,
otherwise the DRF router's company/<pk>/ pattern intercepts paths like
company/stats/, company/export/, etc.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'my', views.CandidateApplicationViewSet, basename='my-applications')
router.register(r'saved-jobs', views.SavedJobViewSet, basename='saved-jobs')
router.register(r'alerts', views.SavedSearchViewSet, basename='job-alerts')
router.register(r'company', views.CompanyApplicationViewSet, basename='company-applications')
router.register(r'agency', views.AgencyAllApplicationsViewSet, basename='agency-applications')

urlpatterns = [
    # Apply to a job
    path('apply/', views.ApplyToJobView.as_view(), name='apply-job'),

    # Application messages (generic — not scoped under company/)
    path('<int:application_id>/messages/', views.ApplicationMessagesView.as_view(), name='application-messages'),
    path('<int:application_id>/messages/read/', views.MarkMessagesReadView.as_view(), name='mark-messages-read'),

    # Company application standalone views (must come before router)
    path('company/bulk-status/', views.CompanyBulkApplicationStatusView.as_view(), name='company-bulk-application-status'),
    path('company/export/', views.CompanyExportApplicationsView.as_view(), name='company-export-applications'),
    path('company/stats/', views.CompanyApplicationStatsView.as_view(), name='company-application-stats'),

    # Router URLs last (its company/<pk>/ would otherwise catch the above)
    path('', include(router.urls)),
]

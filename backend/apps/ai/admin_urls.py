"""
Admin AI service URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Admin router for provider config CRUD
router = DefaultRouter()
router.register(r'providers', views.AIProviderConfigViewSet, basename='ai-providers')

urlpatterns = [
    path('', include(router.urls)),
    path('defaults/', views.AIProviderDefaultsView.as_view(), name='ai-provider-defaults'),
    path('usage/', views.AIUsageLogListView.as_view(), name='ai-usage-list'),
    path('stats/', views.AIUsageStatsView.as_view(), name='ai-usage-stats'),
    path('seo/bulk/', views.GenerateSEOMetaBulkView.as_view(), name='ai-seo-bulk'),
]

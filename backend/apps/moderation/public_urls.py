"""
Public (unauthenticated) URL patterns for banners and affiliate links.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PublicBannerViewSet, PublicAffiliateLinkViewSet

router = DefaultRouter()
router.register(r'banners', PublicBannerViewSet, basename='public-banners')
router.register(r'affiliate-links', PublicAffiliateLinkViewSet, basename='public-affiliate-links')

urlpatterns = [
    path('', include(router.urls)),
]

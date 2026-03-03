"""
Social media distribution URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main router for social endpoints
router = DefaultRouter()
router.register(r'accounts', views.SocialAccountViewSet, basename='social-accounts')
router.register(r'posts', views.SocialPostViewSet, basename='social-posts')

# Admin routers
admin_router = DefaultRouter()
admin_router.register(r'posts', views.AdminSocialPostViewSet, basename='admin-social-posts')
admin_router.register(r'accounts', views.AdminSocialAccountViewSet, basename='admin-social-accounts')

urlpatterns = [
    # Main social endpoints
    path('', include(router.urls)),

    # Admin social endpoints
    path('admin/', include(admin_router.urls)),
]

# Additional URL patterns for job-specific social posts
# These are added to jobs URLs, not here
job_social_urls = [
    path('<int:job_id>/social-posts/', views.JobSocialPostsView.as_view(), name='job-social-posts'),
]

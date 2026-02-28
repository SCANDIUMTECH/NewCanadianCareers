"""
Candidate URL patterns.
"""
from django.urls import path
from apps.users import views

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', views.CandidateDashboardStatsView.as_view(), name='candidate-dashboard-stats'),
    path('profile/completion/', views.ProfileCompletionView.as_view(), name='profile-completion'),
]

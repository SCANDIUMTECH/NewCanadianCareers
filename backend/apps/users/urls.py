"""
User URL patterns.
"""
from django.urls import path

from . import views

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', views.CookieTokenRefreshView.as_view(), name='token-refresh'),

    # Profile
    path('me/', views.MeView.as_view(), name='me'),
    path('me/resume/', views.ResumeUploadView.as_view(), name='resume-upload'),
    path('me/resume/delete/', views.ResumeDeleteView.as_view(), name='resume-delete'),
    path('me/avatar/', views.AvatarUploadView.as_view(), name='avatar-upload'),
    path('me/privacy/', views.PrivacySettingsView.as_view(), name='privacy-settings'),
    path('onboarding/complete/', views.CompleteOnboardingView.as_view(), name='complete-onboarding'),

    # Password management
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password/change/', views.PasswordChangeView.as_view(), name='password-change'),

    # Email verification
    path('email/verify/', views.EmailVerifyView.as_view(), name='email-verify'),
    path('email/verify/resend/', views.ResendVerificationEmailView.as_view(), name='resend-verification'),

    # GDPR
    path('export-data/', views.ExportDataView.as_view(), name='export-data'),
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete-account'),

    # Sessions
    path('sessions/', views.UserSessionsView.as_view(), name='sessions'),
    path('sessions/revoke-all/', views.RevokeAllSessionsView.as_view(), name='revoke-all-sessions'),
    path('sessions/<int:session_id>/revoke/', views.RevokeSessionView.as_view(), name='revoke-session'),

    # Note: Admin user management routes are in apps/moderation/urls.py
    # They are accessible at /api/admin/users/
]

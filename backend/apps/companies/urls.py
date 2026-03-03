"""
Company URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.PublicCompanyViewSet, basename='companies')

urlpatterns = [
    # Industry choices
    path('industries/', views.IndustryListView.as_view(), name='industry-list'),

    # Company profile (for authenticated employer) — must be before router
    path('profile/', views.CompanyProfileView.as_view(), name='company-profile'),
    path('profile/logo/', views.CompanyLogoUploadView.as_view(), name='company-logo-upload'),
    path('profile/banner/', views.CompanyBannerUploadView.as_view(), name='company-banner-upload'),
    path('members/', views.CompanyMembersView.as_view(), name='company-members'),
    path('members/<int:pk>/', views.CompanyMemberDetailView.as_view(), name='company-member-detail'),
    path('members/invite/', views.InviteCompanyMemberView.as_view(), name='company-member-invite'),
    path('members/invites/', views.CompanyPendingInvitesView.as_view(), name='company-pending-invites'),
    path('members/invites/<int:invite_id>/resend/', views.ResendCompanyInviteView.as_view(), name='company-resend-invite'),
    path('members/invites/<int:invite_id>/', views.CancelCompanyInviteView.as_view(), name='company-cancel-invite'),
    path('members/<int:member_id>/transfer-ownership/', views.TransferCompanyOwnershipView.as_view(), name='company-transfer-ownership'),

    # Company settings
    path('settings/', views.CompanySettingsView.as_view(), name='company-settings'),
    path('settings/job-defaults/', views.CompanyJobDefaultsView.as_view(), name='company-job-defaults'),
    path('settings/notifications/', views.CompanyNotificationsView.as_view(), name='company-notifications'),

    # Company social platform connection/disconnection
    path('settings/social/<str:platform>/connect/', views.CompanySocialConnectView.as_view(), name='company-social-connect'),
    path('settings/social/<str:platform>/disconnect/', views.CompanySocialDisconnectView.as_view(), name='company-social-disconnect'),
    path('settings/social/<str:platform>/', views.CompanySocialDefaultView.as_view(), name='company-social-default'),

    # Agency routes
    path('agency/profile/', views.AgencyProfileView.as_view(), name='agency-profile'),
    path('agency/profile/logo/', views.AgencyLogoUploadView.as_view(), name='agency-logo-upload'),
    path('agency/members/', views.AgencyMembersView.as_view(), name='agency-members'),
    path('agency/members/invite/', views.InviteAgencyMemberView.as_view(), name='agency-member-invite'),
    path('agency/members/<int:member_id>/resend/', views.ResendAgencyInviteView.as_view(), name='agency-resend-invite'),
    path('agency/clients/', views.AgencyClientsView.as_view(), name='agency-clients'),
    path('agency/clients/<int:pk>/', views.AgencyClientDetailView.as_view(), name='agency-client-detail'),
    path('agency/clients/<int:client_id>/jobs/', views.AgencyClientJobsView.as_view(), name='agency-client-jobs'),

    # Agency analytics
    path('agency/analytics/', views.AgencyAnalyticsView.as_view(), name='agency-analytics'),
    path('agency/analytics/recruiter/<int:recruiter_id>/', views.AgencyRecruiterPerformanceView.as_view(), name='agency-recruiter-performance'),
    path('agency/analytics/export/', views.AgencyAnalyticsExportView.as_view(), name='agency-analytics-export'),

    # Agency dashboard
    path('agency/dashboard/counts/', views.AgencyDashboardCountsView.as_view(), name='agency-dashboard-counts'),
    path('agency/dashboard/activity/', views.AgencyRecentActivityView.as_view(), name='agency-dashboard-activity'),

    # Public company listing (lookup by entity_id, e.g. /api/companies/K9W3R2M4/)
    path('', include(router.urls)),
]

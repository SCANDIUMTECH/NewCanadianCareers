"""
Billing URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'entitlements', views.EntitlementViewSet, basename='entitlements')
router.register(r'payment-methods', views.PaymentMethodViewSet, basename='payment-methods')
router.register(r'invoices', views.InvoiceViewSet, basename='invoices')

# Agency billing router
agency_router = DefaultRouter()
agency_router.register(r'packages', views.AgencyPackageViewSet, basename='agency-packages')
agency_router.register(r'invoices', views.AgencyInvoiceViewSet, basename='agency-invoices')

urlpatterns = [
    # Packages
    path('packages/', views.PackageListView.as_view(), name='packages'),

    # Entitlements — explicit paths before router to avoid router's slug pattern catching them
    path('entitlements/summary/', views.EntitlementSummaryView.as_view(), name='entitlement-summary'),
    path('entitlements/history/', views.EntitlementLedgerView.as_view(), name='entitlement-history'),

    # Checkout
    path('checkout/session/', views.CreateCheckoutSessionView.as_view(), name='create-checkout'),
    path('promo-code/validate/', views.ValidatePromoCodeView.as_view(), name='validate-promo'),

    # Subscription
    path('subscription/', views.SubscriptionView.as_view(), name='subscription'),
    path('subscription/cancel/', views.CancelSubscriptionView.as_view(), name='cancel-subscription'),
    path('subscription/reactivate/', views.ReactivateSubscriptionView.as_view(), name='reactivate-subscription'),
    path('subscription/change-plan/', views.ChangeSubscriptionPlanView.as_view(), name='change-subscription-plan'),

    # Checkout session result
    path('checkout/session/<str:session_id>/', views.CheckoutSessionResultView.as_view(), name='checkout-session-result'),

    # Stripe webhook
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),

    # Agency billing
    path('agency/entitlements/', views.AgencyEntitlementView.as_view(), name='agency-entitlements'),
    path('agency/credit-packs/', views.AgencyCreditPackView.as_view(), name='agency-credit-packs'),
    path('agency/', include(agency_router.urls)),

    # Router-based views last
    path('', include(router.urls)),
]

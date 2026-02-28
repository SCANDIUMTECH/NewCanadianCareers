Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Stripe Billing Production Hardening Plan

 Context

 The Orion billing system is ~70% production-ready. The backend has a solid foundation (Stripe SDK v14+, encrypted key storage, webhook idempotency,
 atomic invoice creation) but has critical security gaps, a broken coupon/checkout integration, and missing webhook handlers. This plan closes every gap
 for a production-grade enterprise SaaS — no shortcuts, no deferrals.

 Scope decisions:
 - Disputes and refunds are handled via Stripe Dashboard + email — NOT in the app
 - The existing marketing Coupon system (apps/marketing) must be fully integrated into the Stripe checkout + webhook flow
 - Admin package management must auto-sync to Stripe (Product + Price creation) — no manual ID pasting

 ---
 Phase 1: Critical Security Fixes

 1.1 Fix Race Condition in Credit Consumption

 Files:
 - backend/apps/jobs/services.py — get_active_entitlement() (line 86) + consume_credit() (line 113)
 - backend/apps/billing/models.py — Entitlement.use_credit() (line 92)

 Problem: consume_credit() reads entitlement, increments in Python, saves — no DB lock. Two concurrent requests can double-spend the last credit.

 Fix:
 - get_active_entitlement(): Add lock=False param; when True, chain .select_for_update() on the queryset
 - consume_credit(): Wrap in @transaction.atomic, call with lock=True, use F() expression for increment:
 Entitlement.objects.filter(id=entitlement.id).update(credits_used=F('credits_used') + 1), then entitlement.refresh_from_db()
 - Entitlement.use_credit(): Same pattern — select_for_update + F() inside transaction.atomic()

 Existing pattern to match: companies/views.py lines 622, 1242 already use select_for_update().

 1.2 Sanitize Stripe Error Messages

 File: backend/apps/billing/views.py

 Problem: 9 locations return {'error': str(e)} for stripe.StripeError, leaking internal Stripe details.

 Fix: Add _sanitize_stripe_error(exc) helper at top of file:
 - CardError → exc.user_message or generic "card declined"
 - InvalidRequestError → "payment request was invalid"
 - AuthenticationError → "payment service configuration error, contact support"
 - RateLimitError → "too many requests, try again"
 - APIConnectionError → "unable to connect to payment service"
 - Default → "a payment error occurred"

 Replace all 9 occurrences (lines ~246, 425, 599, 650, 724, 749, 963). Log original at WARNING before returning sanitized.

 1.3 Fix cardholder_name Missing Field

 File: backend/apps/billing/models.py

 Problem: PaymentMethodViewSet.confirm() (line 418) writes cardholder_name=pm.billing_details.name but PaymentMethod model has no such field → TypeError
 on every card save.

 Fix: Add cardholder_name = models.CharField(max_length=255, blank=True, default='') to PaymentMethod. Add to serializer fields.

 ---
 Phase 2: Model Changes (Migration)

 File: backend/apps/billing/models.py

 Single migration 0008_billing_production_hardening.py:

 ┌───────────────┬─────────────────┬────────────────────────────────────────────────────────────────────────────────┬───────────────────────┐
 │     Model     │      Field      │                                      Type                                      │        Purpose        │
 ├───────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤
 │ PaymentMethod │ cardholder_name │ CharField(255, blank, default='')                                              │ Phase 1.3 fix         │
 ├───────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤
 │ Subscription  │ STATUS_CHOICES  │ Add ('incomplete', 'Incomplete'), ('incomplete_expired', 'Incomplete Expired') │ Full Stripe lifecycle │
 └───────────────┴─────────────────┴────────────────────────────────────────────────────────────────────────────────┴───────────────────────┘

 File: backend/apps/marketing/models.py

 ┌────────┬──────────────────┬───────────────────────┬─────────────────────────────────────┐
 │ Model  │      Field       │         Type          │               Purpose               │
 ├────────┼──────────────────┼───────────────────────┼─────────────────────────────────────┤
 │ Coupon │ stripe_coupon_id │ CharField(100, blank) │ Cache Stripe coupon ID for checkout │
 └────────┴──────────────────┴───────────────────────┴─────────────────────────────────────┘

 File: backend/apps/audit/models.py

 Add to ACTION_CHOICES:
 ('payment', 'Payment'),
 ('coupon_checkout', 'Coupon Applied at Checkout'),

 File: backend/apps/notifications/models.py

 Add to Notification.TYPE_CHOICES:
 ('payment_success', 'Payment Successful'),
 ('payment_failed', 'Payment Failed'),
 ('payment_action_required', 'Payment Action Required'),
 ('subscription_past_due', 'Subscription Past Due'),

 Expand notification_type max_length from 30 to 40.

 ---
 Phase 3: Package → Stripe Auto-Sync

 Currently, admins must manually create Stripe Products/Prices in the Stripe Dashboard and paste IDs into Orion. If stripe_price_id is empty, checkout
 breaks with a Stripe API error. This must be automated.

 3.1 Add Stripe Sync Function

 File: backend/apps/billing/stripe_service.py

 Add sync_package_to_stripe(package, client=None):
 1. If package.stripe_product_id is empty or invalid on Stripe:
   - Call client.products.create(params={name, description, metadata: {package_id, payment_type}})
   - Save returned product.id to package.stripe_product_id
 2. If package.stripe_price_id is empty or price on Stripe doesn't match:
   - For one_time/bundle: client.prices.create(params={product, unit_amount=price_in_cents, currency, metadata})
   - For subscription with monthly: client.prices.create(params={product, unit_amount, currency, recurring: {interval: 'month'}})
   - For subscription with yearly: create a second price for yearly billing
   - Save returned price.id to package.stripe_price_id
 3. If package is deactivated (is_active=False), archive the Stripe Product: client.products.update(product_id, params={active: False})
 4. Return the updated package

 Note: Stripe Prices are immutable — if an admin changes the price, we must create a new Stripe Price (and archive the old one). The function should
 detect price changes by comparing package.price vs the Stripe Price's unit_amount.

 3.2 Auto-Sync on Package Create/Update

 File: backend/apps/moderation/views.py — AdminPackageViewSet

 Override perform_create() and perform_update():
 def perform_create(self, serializer):
     package = serializer.save()
     sync_package_to_stripe(package)

 def perform_update(self, serializer):
     package = serializer.save()
     sync_package_to_stripe(package)

 Also update toggle_status action to archive/unarchive the Stripe Product.

 Also update duplicate action to auto-create new Stripe Product/Price for the duplicate (instead of leaving IDs blank).

 3.3 Validate Package Has Stripe IDs Before Checkout

 File: backend/apps/billing/views.py — CreateCheckoutSessionView.post()

 Before building line items, validate each package:
 for item in items:
     package = packages[item['package_id']]
     if not package.stripe_price_id:
         return Response({'error': f'Package "{package.name}" is not configured for payment.'}, status=400)

 3.4 Admin Endpoint: Manual Stripe Sync

 File: backend/apps/moderation/views.py

 Add custom action to AdminPackageViewSet:
 @action(detail=True, methods=['post'])
 def sync_stripe(self, request, pk=None):
     """POST /api/admin/job-packages/{id}/sync-stripe/ — Force sync to Stripe."""
     package = self.get_object()
     sync_package_to_stripe(package)
     return Response(self.get_serializer(package).data)

 3.5 Frontend: Show Stripe Sync Status

 File: app/admin/packages/page.tsx

 - Show green checkmark when stripe_product_id and stripe_price_id are populated
 - Show amber warning when either is missing
 - Add "Sync to Stripe" button that calls the sync endpoint
 - Make stripe_product_id and stripe_price_id read-only display fields (auto-managed, not manually entered)

 ---
 Phase 4: Full Coupon → Checkout → Webhook Integration

 The marketing Coupon system (apps/marketing) is fully built (validation, discount calculation, redemption tracking, store credits) but is completely
 disconnected from the Stripe checkout flow.

 Current broken flow:

 1. Frontend validates promo code → works (calls CouponService.validate_coupon())
 2. Checkout session creation → BROKEN: only tries legacy PromoCode, passes raw string to Stripe
 3. User pays full price on Stripe (discount never applied)
 4. Webhook creates full entitlements, never redeems coupon

 4.1 Sync Orion Coupon → Stripe Coupon

 File: backend/apps/billing/stripe_service.py

 Add function get_or_create_stripe_coupon(coupon, client):
 - If coupon.stripe_coupon_id is set and valid on Stripe, return it
 - Else, create Stripe coupon via API:
   - percentage type → stripe.coupons.create(percent_off=value, duration='once')
   - fixed type → stripe.coupons.create(amount_off=value_in_cents, currency='cad', duration='once')
   - credits type → no Stripe coupon needed (bonus credits applied post-payment)
   - free_trial type → no Stripe coupon needed (not applicable to one-time purchases)
 - Save returned coupon_id to coupon.stripe_coupon_id
 - Return the Stripe coupon ID

 This follows the existing pattern — JobPackage has stripe_price_id for the same sync purpose.

 4.2 Fix Checkout Session Creation

 File: backend/apps/billing/views.py — CreateCheckoutSessionView.post() (lines 225-234)

 Replace the entire promo code block (lines 225-234) with:

 1. Try marketing Coupon via CouponService.validate_coupon() (same validation as the validate endpoint)
 2. If valid and type is percentage or fixed:
   - Call get_or_create_stripe_coupon(coupon, client) to get/create Stripe coupon
   - Add discounts: [{'coupon': stripe_coupon_id}] to session params
   - Store coupon_id and coupon_code in session metadata
 3. If valid and type is credits:
   - No Stripe discount (customer pays full price)
   - Store coupon_id, coupon_code, bonus_credits=coupon.discount_value in session metadata
 4. If no marketing coupon found, try legacy PromoCode with same logic
 5. Store validated promo info in metadata for webhook handler to redeem

 Key: The customer now sees the actual discounted price on the Stripe checkout page.

 4.3 Redeem Coupon in Webhook Handler

 File: backend/apps/billing/tasks.py — _handle_checkout_completed()

 After creating Invoice + Entitlements (existing code), add:

 1. Read coupon_id and coupon_code from session.metadata
 2. If present:
   - Load the Coupon object
   - Call CouponService.redeem_coupon(coupon, user, invoice=invoice, ip_address=...) to:
       - Atomically increment uses_count
     - Set status to 'exhausted' if limit reached
     - Create CouponRedemption record
   - If coupon type is credits:
       - Grant bonus credits by creating an additional Entitlement with source='promotion'
   - Create discount InvoiceItem with negative amount for audit trail
 3. Audit log the coupon application

 Reuse: CouponService.redeem_coupon() at backend/apps/marketing/services/coupon_service.py:85 — already handles everything (atomic increment, redemption
 record, status transition). CouponService.calculate_discount() at line 73 for discount calculation.

 4.4 Handle max_discount_amount Cap

 When creating the Stripe coupon for percentage type with max_discount_amount:
 - Stripe API doesn't support max_discount_amount on percentage coupons directly
 - Solution: Calculate the capped discount server-side, create a fixed Stripe coupon with the capped amount instead
 - This requires knowing the cart total at checkout time — available from the line items

 ---
 Phase 5: Webhook Expansion

 File: backend/apps/billing/tasks.py — expand process_stripe_webhook_event() routing

 New event handlers:

 a) payment_intent.payment_failed
 - Retrieve PaymentIntent from Stripe
 - Find Invoice by stripe_payment_intent_id
 - Update invoice status to 'failed'
 - Create notification (type: payment_failed) for company/agency owner
 - Email via send_email.delay() respecting email_billing preference
 - Audit log (actor=None, action='payment')

 b) invoice.payment_failed (subscription dunning)
 - Retrieve Stripe invoice → get subscription field
 - Find local Subscription by stripe_subscription_id
 - Update subscription status to 'past_due'
 - Find/create local Invoice with status 'failed'
 - Create notification (type: subscription_past_due)
 - Email with "update payment method" CTA
 - Audit log

 c) invoice.payment_action_required (SCA / 3D Secure)
 - Find subscription/customer from Stripe invoice
 - Create notification (type: payment_action_required) with hosted_invoice_url
 - Email user with "complete payment authentication" CTA

 d) payment_method.automatically_updated (card network updates)
 - Retrieve updated PaymentMethod from Stripe
 - Find local PaymentMethod by stripe_payment_method_id
 - Update card_exp_month, card_exp_year, card_last4 if changed
 - Log at info level

 Webhook registration (Stripe Dashboard or CLI):

 checkout.session.completed
 invoice.paid
 invoice.payment_failed
 invoice.payment_action_required
 customer.subscription.updated
 customer.subscription.deleted
 payment_intent.payment_failed
 payment_method.automatically_updated

 ---
 Phase 6: Audit Logging for All Billing Operations

 File: backend/apps/billing/views.py

 Add from apps.audit.models import create_audit_log and log:

 ┌──────────────────────────┬──────────┬───────────────┐
 │        Operation         │  Action  │    Target     │
 ├──────────────────────────┼──────────┼───────────────┤
 │ Payment method added     │ 'create' │ PaymentMethod │
 ├──────────────────────────┼──────────┼───────────────┤
 │ Payment method deleted   │ 'delete' │ PaymentMethod │
 ├──────────────────────────┼──────────┼───────────────┤
 │ Subscription canceled    │ 'update' │ Subscription  │
 ├──────────────────────────┼──────────┼───────────────┤
 │ Subscription reactivated │ 'update' │ Subscription  │
 ├──────────────────────────┼──────────┼───────────────┤
 │ Plan changed             │ 'update' │ Subscription  │
 └──────────────────────────┴──────────┴───────────────┘

 File: backend/apps/billing/tasks.py

 For webhook-triggered changes, use actor=None (system), reason=f'stripe:{event_type}':
 - _handle_checkout_completed → action='payment'
 - _handle_invoice_paid → action='payment'
 - _handle_subscription_updated → action='update'
 - _handle_subscription_deleted → action='update'
 - All new Phase 5 handlers
 - Coupon application → action='coupon_checkout'

 File: backend/apps/billing/admin_credits.py

 Add audit logging after both _handle_complimentary() and _handle_package():
 create_audit_log(actor=request.user, action='grant', target=entitlement, changes={...}, reason=reason, request=request)

 Reuse: create_audit_log() at backend/apps/audit/models.py:82 — accepts actor, action, target, changes, reason, request.

 ---
 Phase 7: Billing Notifications

 File: backend/apps/notifications/tasks.py

 Add new tasks following the established notify_job_approved pattern (line 358):

 @shared_task
 def notify_payment_success(invoice_id):
     """Notify user of successful payment."""
     # Create Notification(type='payment_success', ...)
     # Check NotificationPreference.email_billing
     # If enabled, call send_email.delay(...)

 @shared_task
 def notify_payment_failed(invoice_id, error_message=''):
     """Notify user their payment was declined."""

 @shared_task
 def notify_subscription_past_due(subscription_id):
     """Notify user their subscription payment failed."""

 Wire into webhook handlers via transaction.on_commit(lambda: notify_*.delay(...)).

 Reuse: Pattern from notify_job_approved() at line 358 — creates Notification, checks NotificationPreference.email_billing, dispatches email.

 ---
 Phase 8: Frontend Updates

 8.1 Payment Failed Banner on Billing Dashboard

 File: app/company/billing/page.tsx

 Add warning alert when subscription is past_due:
 {subscription?.status === 'past_due' && (
   <Alert variant="destructive">
     <AlertCircle className="h-4 w-4" />
     <AlertTitle>Payment Failed</AlertTitle>
     <AlertDescription>
       Your subscription payment failed. Please update your payment method to avoid service interruption.
     </AlertDescription>
   </Alert>
 )}

 ---
 Implementation Order (Dependency-aware)

 1. Phase 2 — Model changes + migrations (all other phases depend on new fields)
 2. Phase 1.1 — Race condition fix (critical security, independent)
 3. Phase 1.2 — Stripe error sanitization (independent)
 4. Phase 1.3 — cardholder_name fix (included in Phase 2 migration)
 5. Phase 3 — Package → Stripe auto-sync (independent, enables end-to-end checkout)
 6. Phase 4 — Coupon → Checkout → Webhook integration (depends on Phase 2 + Phase 3)
 7. Phase 5 — Webhook expansion (depends on Phase 2 models)
 8. Phase 6 — Audit logging (depends on Phase 2 audit choices + Phase 4/5 handlers)
 9. Phase 7 — Notifications (depends on Phase 2 notification types + Phase 5 handlers)
 10. Phase 8 — Frontend updates (depends on backend changes)

 Files Modified

 Backend (modify)

 ┌────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                  File                  │                                               Changes                                               │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/billing/models.py         │ PaymentMethod.cardholder_name, Subscription new statuses                                            │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/billing/views.py          │ Error sanitizer, coupon checkout integration, package validation, audit logging                     │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/billing/tasks.py          │ 4 new webhook handlers, coupon redemption in checkout handler, audit logging, notification dispatch │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/billing/stripe_service.py │ sync_package_to_stripe(), get_or_create_stripe_coupon()                                             │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/billing/admin_credits.py  │ Audit logging                                                                                       │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/jobs/services.py          │ select_for_update() + F() in consume_credit() and get_active_entitlement()                          │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/moderation/views.py       │ AdminPackageViewSet — auto-sync on create/update/toggle/duplicate, manual sync action               │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/marketing/models.py       │ Coupon.stripe_coupon_id field                                                                       │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/audit/models.py           │ New ACTION_CHOICES: payment, coupon_checkout                                                        │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/notifications/models.py   │ New TYPE_CHOICES for billing, bump max_length                                                       │
 ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/apps/notifications/tasks.py    │ 3 new billing notification tasks                                                                    │
 └────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Backend (new)

 ┌──────────────────────────────────────────────────────────────────────┬─────────────────────────┐
 │                                 File                                 │         Purpose         │
 ├──────────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/billing/migrations/0008_billing_production_hardening.py │ Billing model changes   │
 ├──────────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/marketing/migrations/NNNN_coupon_stripe_id.py           │ Coupon.stripe_coupon_id │
 └──────────────────────────────────────────────────────────────────────┴─────────────────────────┘

 Frontend (modify)

 ┌──────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
 │             File             │                                 Changes                                 │
 ├──────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
 │ app/admin/packages/page.tsx  │ Stripe sync status indicators, sync button, read-only Stripe ID display │
 ├──────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
 │ app/company/billing/page.tsx │ Past-due subscription warning banner                                    │
 └──────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

 Verification

 1. Race condition: Two concurrent requests consuming last credit → exactly one succeeds
 2. Error sanitization: Trigger each Stripe error type → no raw messages in API response
 3. Package sync: Create package via admin → verify Stripe Product + Price created automatically; edit price → verify new Stripe Price created;
 deactivate → verify Stripe Product archived
 4. Coupon end-to-end:
   - Create a marketing Coupon (percentage or fixed) via admin
   - Validate on frontend → see discount preview
   - Checkout → Stripe page shows discounted price
   - Complete payment → webhook creates entitlements + redeems coupon
   - Coupon uses_count incremented, CouponRedemption record created
   - Invoice amount reflects discounted total
 5. Credit coupon: Create credits-type coupon → checkout at full price → bonus Entitlement created with source='promotion'
 6. Webhooks (Stripe CLI):
 stripe listen --forward-to localhost:80/api/billing/webhook/
 stripe trigger payment_intent.payment_failed
 stripe trigger invoice.payment_failed
 7. Audit trail: Check /api/admin/audit/ for entries after each billing operation
 8. Notifications: Check notification center after payment failure webhook
 9. Build: npm run build for frontend changes
 10. Migration: docker-compose exec web python manage.py migrate
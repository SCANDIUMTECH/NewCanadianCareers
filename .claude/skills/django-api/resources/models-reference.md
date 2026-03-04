# Orion Backend Models Reference

## apps/users

### User (AbstractUser)
- `email` (EmailField, unique) — USERNAME_FIELD, no username
- `role` — admin/employer/agency/candidate (default: candidate)
- `status` — active/suspended/pending (default: pending)
- `phone`, `avatar`, `bio`
- `company` (FK → Company, null), `agency` (FK → Agency, null)
- `failed_login_attempts`, `locked_until` (lockout)
- `email_verified`, `email_verified_at`
- `mfa_enabled`, `mfa_secret`
- Methods: `get_full_name()`, `verify_email()`

### UserSession
- `user` (FK), `session_key`, `ip_address`, `device_type`, `is_active`, `expires_at`

### PasswordResetToken / EmailVerificationToken
- `user` (FK), `token` (unique), `expires_at`, `used_at`
- Method: `is_valid()` — not used and not expired

---

## apps/companies

### Company
- `name`, `slug` (unique, auto-generated), `domain`, `logo`, `banner`
- `industry`, `size`, `founded_year`, `headquarters_city/state/country`
- `status` — verified/pending/unverified (default: pending)
- `billing_status` — active/suspended/trial (default: trial)
- `risk_level` — low/medium/high (default: low)
- `stripe_customer_id`
- `represented_by_agency` (FK → Agency, null)

### CompanyUser (junction)
- `company` (FK), `user` (FK), `role` — owner/admin/recruiter/viewer
- unique_together: company, user

### Agency
- `name`, `slug` (unique, auto-generated), `logo`, `specializations` (JSONField)
- `status` — verified/pending/unverified
- `billing_status` — active/suspended/trial
- `billing_model` — agency_pays/company_pays (default: agency_pays)
- `stripe_customer_id`

### AgencyUser (junction)
- `agency` (FK), `user` (FK), `role` — owner/admin/recruiter/viewer

### AgencyClient (junction)
- `agency` (FK), `company` (FK), `is_active`, `notes`

---

## apps/jobs

### Job
- `company` (FK, CASCADE), `agency` (FK, null), `posted_by` (FK → User, null)
- `title`, `slug`, `department`, `category`
- `employment_type` — full_time/part_time/contract/temporary/internship/freelance
- `experience_level` — entry/mid/senior/lead/executive
- `description`, `responsibilities`, `requirements`, `nice_to_have`, `skills`, `benefits` (JSON)
- `city/state/country`, `location_type` — remote/onsite/hybrid
- `salary_min/max`, `salary_currency`, `salary_period` — hour/day/week/month/year
- `apply_method` — internal/email/external, `apply_email`, `apply_url`
- `status` — draft/pending/published/paused/expired/hidden (default: draft)
- `featured`, `urgent`
- `views`, `unique_views`, `applications_count`, `report_count`
- Methods: `publish()`, `pause()`, `expire()`, `extend(days=30)`
- Properties: `is_active`, `location_display`, `salary_display`

### JobReport
- `job` (FK), `reporter` (FK, null), `reporter_email`
- `reason` — spam/discriminatory/misleading/illegal/inappropriate/duplicate/other
- `status` — pending/reviewed/dismissed/action_taken
- `reviewed_by` (FK, null), `review_notes`

### JobView
- `job` (FK), `visitor_id`, `user` (FK, null), `ip_address`, `referrer`

### JobBookmark
- `job` (FK), `candidate` (FK → User), unique_together: job, candidate

---

## apps/applications

### Application
- `job` (FK), `candidate` (FK → User)
- `resume` (FileField), `cover_letter`, `portfolio_url`, `linkedin_url`
- `custom_answers` (JSONField)
- `status` — submitted/reviewing/shortlisted/interviewing/offered/hired/rejected/withdrawn
- `rating` (1-5, null), `notes`
- Method: `update_status(new_status, changed_by)`
- unique_together: job, candidate

### ApplicationTimeline
- `application` (FK), `event` — status_change/note_added/message_sent/interview_scheduled/document_uploaded

### SavedJob
- `candidate` (FK → User), `job` (FK), unique_together: candidate, job

### SavedSearch
- `candidate` (FK → User), `name`, `query` (JSONField)
- `frequency` — daily/weekly/off, `enabled`

### ApplicationMessage
- `application` (FK), `sender` (FK → User, null), `content`, `is_read`

---

## apps/billing

### Package
- `name`, `slug`, `stripe_product_id`, `stripe_price_id`
- `package_type` — one_time/bundle/subscription
- `price`, `currency`, `credits`, `post_duration_days`
- `featured_credits`, `social_credits`, `priority_support`
- `billing_period` — month/year (subscriptions)
- `is_active`, `is_popular`, `sort_order`

### Entitlement
- `company` (FK, null), `agency` (FK, null), `package` (FK, null)
- `credits_total/used`, `featured_credits_total/used`, `social_credits_total/used`
- `post_duration_days`, `expires_at`
- `source` — package_purchase/admin_grant/subscription/promotion/refund
- Method: `use_credit(job, admin)` — decrements, creates ledger
- Properties: `credits_remaining`, `is_valid`

### EntitlementLedger
- `entitlement` (FK), `change` (+/-), `reason`, `job` (FK, null), `admin` (FK, null)

### PaymentMethod
- `company/agency` (FK, null), `stripe_payment_method_id`
- `card_brand`, `card_last4`, `card_exp_month/year`, `is_default`

### Invoice
- `company/agency` (FK, null), `invoice_number` (unique)
- `stripe_invoice_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`
- `amount`, `currency`, `status` — draft/pending/paid/failed/refunded/void
- `invoice_pdf_key` (MinIO path)

### PromoCode
- `code` (unique), `discount_type` — percentage/fixed/credits
- `discount_value`, `max_uses`, `uses_count`, `applicable_packages` (M2M)

### Subscription
- `company/agency` (FK, null), `package` (FK, null)
- `stripe_subscription_id`, `status` — active/past_due/canceled/paused

---

## apps/notifications

### Notification
- `user` (FK), `notification_type` — application_received/application_status/job_alert/message/job_expired/credits_low/system
- `title`, `message`, `data` (JSONField), `link`
- `is_read`, `email_sent`
- Method: `mark_as_read()`

### NotificationPreference (OneToOne → User)
- `email_application_received/status/job_alerts/messages/job_expired/credits_low/marketing` (booleans)

### EmailLog
- `user` (FK, null), `to_email`, `subject`, `template`, `status` — pending/sent/failed/bounced, `provider_id`

---

## apps/moderation

### PlatformSetting
- `key` (unique), `value` (JSONField), `description`, `updated_by` (FK)

### Banner
- `title`, `image`, `link`, `position` — homepage_top/homepage_sidebar/job_listing/job_detail
- `target_role`, `is_active`, `impressions`, `clicks`

### Announcement
- `title`, `content`, `announcement_type` — info/warning/maintenance
- `target_role`, `is_active`, `starts_at`, `ends_at`

### Affiliate
- `name`, `code` (unique), `user` (OneToOne, null), `commission_rate`
- `total_referrals/conversions/revenue/commission`

### FraudAlert
- `type` — suspicious_activity/payment_fraud/fake_job/spam/identity_fraud/etc.
- `severity` — low/medium/high/critical
- `status` — open/investigating/resolved/false_positive/blocked
- `subject_type` — user/company/agency/job, `subject_id`, `indicators` (JSON)

---

## apps/social

### SocialPost
- `job` (FK), `platform` — linkedin/twitter/facebook
- `content`, `image`, `scheduled_at`, `posted_at`
- `status` — pending/scheduled/posted/failed
- `impressions`, `clicks`, `likes`, `shares`

### SocialAccount
- `company/agency` (FK, null), `platform`, `account_name`
- `access_token`, `refresh_token`, `token_expires_at`, `is_active`

---

## apps/audit

### AuditLog
- `actor` (FK, null), `action` — create/update/delete/suspend/activate/verify/approve/reject/grant/revoke/login/logout/impersonate
- `target_type`, `target_id`, `target_repr`, `changes` (JSON), `reason`
- Helper: `create_audit_log(actor, action, target, changes, reason, request)`

### LoginAttempt
- `user` (FK, null), `email`, `status` — success/failed/locked
- `failure_reason`, `ip_address`, `location_city/country`

---

## core/permissions.py

| Class | Check |
|-------|-------|
| IsAdmin | role == 'admin' |
| IsSuperAdmin | role == 'admin' AND is_superuser |
| IsEmployer | role == 'employer' |
| IsAgency | role == 'agency' |
| IsCandidate | role == 'candidate' |
| IsCompanyMember | user.company_id == obj.company_id |
| IsAgencyMember | user.agency_id == obj.agency_id |
| IsCompanyOwnerOrAdmin | CompanyUser role in [owner, admin] |
| IsCompanyRecruiter | CompanyUser role in [owner, admin, recruiter] |
| IsOwner | obj.user_id/owner_id/candidate_id == user.id |
| ReadOnly | GET/HEAD/OPTIONS only |

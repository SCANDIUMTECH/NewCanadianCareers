# Platform Admin Workflows & Settings (Django Admin)

> **User Type Name (Final): _Platform Admin_**  
> Platform Admins manage governance, trust, configuration, monetization, and operations for the entire job board.

This document is **authoritative**. It defines every admin workflow and setting required to operate the platform end-to-end **without gaps**.

---

## 1. Role Definition: Platform Admin

Platform Admins can:
- Manage all users (Candidates, Employer Users, Agency Users)
- Manage companies and agencies
- Configure job posting rules and moderation
- Configure monetization (packages, banners, affiliates)
- Configure social distribution policies
- Configure email sending, templates, triggers, and deliverability
- View and audit all activity
- Handle compliance requests (export/delete)

Platform Admins cannot:
- Bypass immutable audit logging

---

## 2. Admin Access Model

### 2.1 Admin Roles (Recommended)

- **Super Admin**
  - Full control, including security, billing, and configuration
- **Ops Admin**
  - User + company support, moderation, refunds (policy-based)
- **Moderation Admin**
  - Job content review, reports, enforcement actions
- **Billing Admin**
  - Packages, Stripe mappings, invoices, entitlements
- **Content Admin**
  - Banners, affiliate placements, announcements

> Implement as Django Groups + Permissions.

### 2.2 Admin Authentication
- Django auth, staff-only access
- Enforce MFA (recommended)
- IP allowlist (optional)
- Session hardening (short idle timeout)

---

## 3. Admin Navigation (Modules)

1. **Dashboard**
2. **Users**
3. **Companies**
4. **Agencies**
5. **Jobs**
6. **Moderation**
7. **Monetization**
8. **Social Distribution**
9. **Email & Notifications**
10. **Search & SEO**
11. **System Settings**
12. **Audit Logs**
13. **Support Tools**
14. **Compliance**

---

## 4. Dashboard (Operational)

### 4.1 Key Metrics
- New jobs posted (24h/7d)
- Jobs pending review
- Reported jobs volume
- Active companies / agencies
- Revenue (MTD)
- Package purchases
- Social posting success/failure rate
- Email delivery health (bounces/complaints)

### 4.2 Alerts
- Spike in failed social posts
- Spike in spam reports
- Stripe webhook failures
- Email provider errors / high bounce rate
- Search indexing lag

---

## 5. User Management (All Types)

### 5.1 User Directory

Search & filter by:
- Email
- Role (Candidate / Employer / Agency / Admin)
- Status (active/suspended/deleted)
- Company / Agency association
- Created date

Actions:
- View profile
- Reset password (policy)
- Force logout / revoke sessions
- Change role
- Suspend / unsuspend
- Delete (soft-delete + compliance)

### 5.2 Candidate Management
- View candidate profile
- Resume access policy:
  - Only visible via direct apply records
- Handle data export & deletion requests

### 5.3 Employer User Management
- View employer role (Owner/Admin/Recruiter/Viewer)
- Transfer company ownership
- Remove user from company

### 5.4 Agency User Management
- Same as employer, scoped to agency

---

## 6. Company Management

### 6.1 Company Directory
Search & filter by:
- Name
- Domain
- Verification status
- Billing status
- Risk level (manual flag)

Actions:
- Verify / unverify
- Suspend / unsuspend
- Lock profile fields
- Grant/revoke entitlements
- View company jobs
- View payment history

### 6.2 Company Verification Settings
Admin-configurable rules:
- Require domain verification before posting
- Require manual approval for new companies
- Auto-approve trusted domains list

---

## 7. Agency Management

### 7.1 Agency Directory
Search & filter by:
- Name
- Verification status
- Billing model (agency pays / company pays)
- Risk level

Actions:
- Verify / unverify
- Suspend / unsuspend
- Set billing model
- Grant/revoke entitlements
- View client companies
- View job volume

### 7.2 Agency → Company Controls
- Allow max companies per agency
- Require admin approval to add a company
- Restrict which fields agency can edit

---

## 8. Job Management & Moderation

### 8.1 Job Directory
Search & filter by:
- Status (draft/pending/published/paused/expired/hidden)
- Company / agency
- Location type
- Date posted
- Report count

Actions:
- Approve
- Hide (soft removal)
- Expire
- Pause
- Edit (policy)
- Delete (rare)

### 8.2 Moderation Queue
Sources:
- New jobs (if approval required)
- Flagged jobs (reports)
- Automated spam detection

Moderation actions:
- Approve
- Request changes
- Hide job
- Suspend employer
- Ban domain

**Rules**
- Every action requires a **reason**
- All actions are written to immutable audit logs

### 8.3 Job Policy Settings (Global)
Admin-configurable:
- Default post duration
- Max active jobs per company
- Salary required? (on/off)
- Prohibited keywords list
- Allowed job categories (optional)
- Default apply mode allowed (external/direct)
- External apply URL validation rules

---

## 9. Monetization Administration

### 9.1 Job Packages (Products)
Admin can create and configure packages:
- name
- type (one_time / bundle / subscription)
- price display
- post duration
- included posts
- included featured credits
- included social credits
- eligibility rules (verified only?)
- active/inactive

### 9.2 Stripe Configuration
Admin-managed mappings:
- Stripe Product ID
- Stripe Price ID
- Package ↔ price mapping

Admin tools:
- Re-sync Stripe catalog
- Validate webhook health
- Manual reconcile entitlements

### 9.3 Entitlements Management
Admin actions:
- Grant entitlements
- Revoke entitlements
- Adjust credits
- Set expiry

Rules:
- All adjustments require a reason
- Adjustment creates an immutable ledger record

### 9.4 Sponsored Banners
Admin can manage:
- placements inventory
- active slots
- schedule start/end
- click tracking
- sponsor company association

Rules:
- Always labeled Sponsored
- Frequency caps

### 9.5 Affiliate Placements
Admin can:
- enable/disable placements
- set label and target
- enforce disclosure text

---

## 10. Social Distribution Administration

### 10.1 Social Policy (Global)
Admin config modes:
- **User-controlled**
- **Admin-approved**
- **Admin-only**

Admin per-company overrides:
- allowed channels
- max posts/day
- require verification

### 10.2 Provider Connections
Supported providers:
- Facebook
- Instagram
- LinkedIn
- X

Connection modes:
- Platform-managed accounts (recommended for v1)
- Employer/Agency-managed accounts (optional)

Admin controls:
- connect/disconnect
- token expiry monitoring
- scopes monitoring

### 10.3 Social Post Templates
Admin can configure per provider:
- title format
- include salary? (on/off)
- hashtags list
- UTM parameters

### 10.4 Social Queue Operations
Admin views:
- queued posts
- failed posts
- retries

Admin actions:
- retry now
- cancel
- override content (policy)

---

## 11. Email & Notifications Administration (No Gaps)

### 11.1 Email Provider Configuration
Admin can configure:
- provider (SES / ZeptoMail / Resend)
- sending domain
- from name
- from email
- reply-to
- DKIM/SPF status (stored as checklist)

### 11.2 Email Templates
Template types:
- transactional
- marketing (optional)

Template management:
- versioning
- preview render
- test send
- localization (future)

### 11.3 Email Triggers (Events)
Admin can enable/disable triggers:

**Candidate triggers**
- saved search alert (daily/weekly)
- account verification
- password reset

**Company/Agency triggers**
- job published
- job expiring soon
- low credits warning
- payment success
- payment failure

**Admin triggers**
- new company signup
- job flagged spike
- social posting failures
- webhook failures

### 11.4 Alert Frequency & Rate Limits
- global email rate limits
- per-user caps
- bounce/complaint auto-suppression

### 11.5 Deliverability Monitoring
Admin dashboards:
- delivery rate
- bounce rate
- complaint rate
- suppression list

Admin actions:
- remove from suppression (policy)
- block domain

---

## 12. Search & SEO Administration

### 12.1 Search Index Health
Admin can view:
- last indexing time
- indexing lag
- failed indexing jobs

Actions:
- reindex all
- reindex by company
- reindex single job

### 12.2 SEO Settings
- sitemap generation frequency
- robots rules (environment-based)
- canonical URL settings

### 12.3 Google for Jobs Compliance Checks
Admin tools:
- validate required JobPosting fields
- detect expired jobs still indexed

---

## 13. System Settings

### 13.1 Platform Defaults
- site name
- brand/logo
- terms/privacy URLs
- support email

### 13.2 Feature Flags
Admin can toggle:
- direct apply
- social distribution
- sponsored banners
- affiliate placements
- approval required for jobs

### 13.3 Rate Limits
- login attempts
- job posting
- search abuse
- apply abuse

---

## 14. Audit Logs (Immutable)

### 14.1 What is logged
- all admin actions
- package changes
- entitlement adjustments
- job moderation actions
- social queue overrides
- email template changes
- security changes

### 14.2 Required fields
- actor_id
- actor_role
- target_type
- target_id
- action
- before/after snapshot (where safe)
- timestamp
- reason (required for sensitive actions)

---

## 15. Support Tools

- Impersonation (optional; heavily logged)
- View user timeline
- View company timeline
- Export CSV reports

---

## 16. Compliance (Privacy)

Admin workflows:
- Data export request
- Data deletion request
- Retention rules

Rules:
- Hard deletes only when required
- Always preserve audit logs (with anonymization if needed)

---

## 17. Final Principle

Platform Admin controls must be:
- **Auditable**
- **Least-privilege**
- **Safe by default**

If a setting can break trust (payments, moderation, social posting, email), it must:
- require permission
- require logging
- support rollback


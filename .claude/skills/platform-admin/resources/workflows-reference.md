# Platform Admin Workflows Reference

Condensed feature checklist for each admin module. Use this when building new features to ensure completeness.

---

## 1. Dashboard

**Key Metrics:**
- [ ] New jobs posted (24h/7d)
- [ ] Jobs pending review
- [ ] Reported jobs volume
- [ ] Active companies / agencies
- [ ] Revenue (MTD)
- [ ] Package purchases
- [ ] Social posting success/failure rate
- [ ] Email delivery health

**Alerts:**
- [ ] Failed social posts spike
- [ ] Spam reports spike
- [ ] Stripe webhook failures
- [ ] Email provider errors
- [ ] Search indexing lag

---

## 2. User Management

**Directory Filters:**
- [ ] Email
- [ ] Role (Candidate/Employer/Agency/Admin)
- [ ] Status (active/suspended/deleted)
- [ ] Company/Agency association
- [ ] Created date

**Actions:**
- [ ] View profile
- [ ] Reset password
- [ ] Force logout / revoke sessions
- [ ] Change role
- [ ] Suspend / unsuspend
- [ ] Delete (soft-delete)

**Per User Type:**
- Candidates: profile view, data export/deletion
- Employers: role management, ownership transfer
- Agencies: same as employers, scoped to agency

---

## 3. Company Management

**Directory Filters:**
- [ ] Name
- [ ] Domain
- [ ] Verification status
- [ ] Billing status
- [ ] Risk level

**Actions:**
- [ ] Verify / unverify
- [ ] Suspend / unsuspend
- [ ] Lock profile fields
- [ ] Grant/revoke entitlements
- [ ] View company jobs
- [ ] View payment history

**Settings:**
- [ ] Require domain verification before posting
- [ ] Require manual approval for new companies
- [ ] Auto-approve trusted domains list

---

## 4. Agency Management

**Directory Filters:**
- [ ] Name
- [ ] Verification status
- [ ] Billing model (agency pays / company pays)
- [ ] Risk level

**Actions:**
- [ ] Verify / unverify
- [ ] Suspend / unsuspend
- [ ] Set billing model
- [ ] Grant/revoke entitlements
- [ ] View client companies
- [ ] View job volume

**Controls:**
- [ ] Max companies per agency
- [ ] Require admin approval to add company
- [ ] Restrict editable fields

---

## 5. Job Management

**Directory Filters:**
- [ ] Status (draft/pending/published/paused/expired/hidden)
- [ ] Company / agency
- [ ] Location type
- [ ] Date posted
- [ ] Report count

**Actions:**
- [ ] Approve
- [ ] Hide (soft removal)
- [ ] Expire
- [ ] Pause
- [ ] Edit (policy)
- [ ] Delete (rare)

**Policy Settings:**
- [ ] Default post duration
- [ ] Max active jobs per company
- [ ] Salary required toggle
- [ ] Prohibited keywords list
- [ ] Allowed job categories
- [ ] Default apply mode
- [ ] External apply URL validation

---

## 6. Moderation

**Queue Sources:**
- [ ] New jobs (if approval required)
- [ ] Flagged jobs (reports)
- [ ] Automated spam detection

**Actions:**
- [ ] Approve
- [ ] Request changes
- [ ] Hide job
- [ ] Suspend employer
- [ ] Ban domain

**Requirements:**
- [ ] Every action requires a reason
- [ ] All actions logged to audit

---

## 7. Monetization

**Job Packages:**
- [ ] Name, type (one_time/bundle/subscription)
- [ ] Price display
- [ ] Post duration
- [ ] Included posts
- [ ] Featured credits
- [ ] Social credits
- [ ] Eligibility rules
- [ ] Active/inactive toggle

**Stripe Configuration:**
- [ ] Product ID mapping
- [ ] Price ID mapping
- [ ] Re-sync catalog
- [ ] Webhook health validation
- [ ] Manual entitlement reconciliation

**Entitlements:**
- [ ] Grant entitlements
- [ ] Revoke entitlements
- [ ] Adjust credits
- [ ] Set expiry
- [ ] Reason required for adjustments
- [ ] Immutable ledger record

**Sponsored Banners:**
- [ ] Placements inventory
- [ ] Active slots
- [ ] Schedule start/end
- [ ] Click tracking
- [ ] Sponsor company association
- [ ] "Sponsored" label enforcement
- [ ] Frequency caps

**Affiliate Placements:**
- [ ] Enable/disable
- [ ] Label and target
- [ ] Disclosure text

---

## 8. Social Distribution

**Policy Modes:**
- [ ] User-controlled
- [ ] Admin-approved
- [ ] Admin-only

**Per-Company Overrides:**
- [ ] Allowed channels
- [ ] Max posts/day
- [ ] Require verification

**Provider Connections:**
- [ ] Facebook, Instagram, LinkedIn, X
- [ ] Connect/disconnect
- [ ] Token expiry monitoring
- [ ] Scopes monitoring

**Post Templates (per provider):**
- [ ] Title format
- [ ] Include salary toggle
- [ ] Hashtags list
- [ ] UTM parameters

**Queue Operations:**
- [ ] View queued posts
- [ ] View failed posts
- [ ] Retry now
- [ ] Cancel
- [ ] Override content

---

## 9. Email & Notifications

**Provider Configuration:**
- [ ] Provider (SES/ZeptoMail/Resend)
- [ ] Sending domain
- [ ] From name, email, reply-to
- [ ] DKIM/SPF status

**Templates:**
- [ ] Transactional / marketing types
- [ ] Versioning
- [ ] Preview render
- [ ] Test send

**Triggers (Candidate):**
- [ ] Saved search alert (daily/weekly)
- [ ] Account verification
- [ ] Password reset

**Triggers (Company/Agency):**
- [ ] Job published
- [ ] Job expiring soon
- [ ] Low credits warning
- [ ] Payment success/failure

**Triggers (Admin):**
- [ ] New company signup
- [ ] Job flagged spike
- [ ] Social posting failures
- [ ] Webhook failures

**Deliverability:**
- [ ] Delivery rate
- [ ] Bounce rate
- [ ] Complaint rate
- [ ] Suppression list management
- [ ] Remove from suppression
- [ ] Block domain

---

## 10. Search & SEO

**Index Health:**
- [ ] Last indexing time
- [ ] Indexing lag
- [ ] Failed indexing jobs
- [ ] Reindex all / by company / single job

**SEO Settings:**
- [ ] Sitemap generation frequency
- [ ] Robots rules
- [ ] Canonical URL settings

**Google for Jobs:**
- [ ] Validate JobPosting fields
- [ ] Detect expired jobs still indexed

---

## 11. System Settings

**Platform Defaults:**
- [ ] Site name
- [ ] Brand/logo
- [ ] Terms/privacy URLs
- [ ] Support email

**Feature Flags:**
- [ ] Direct apply
- [ ] Social distribution
- [ ] Sponsored banners
- [ ] Affiliate placements
- [ ] Approval required for jobs

**Rate Limits:**
- [ ] Login attempts
- [ ] Job posting
- [ ] Search abuse
- [ ] Apply abuse

---

## 12. Audit Logs

**What is Logged:**
- [ ] All admin actions
- [ ] Package changes
- [ ] Entitlement adjustments
- [ ] Job moderation actions
- [ ] Social queue overrides
- [ ] Email template changes
- [ ] Security changes

**Required Fields:**
- [ ] actor_id
- [ ] actor_role
- [ ] target_type
- [ ] target_id
- [ ] action
- [ ] before/after snapshot
- [ ] timestamp
- [ ] reason (for sensitive actions)

---

## 13. Support Tools

- [ ] Impersonation (heavily logged)
- [ ] View user timeline
- [ ] View company timeline
- [ ] Export CSV reports

---

## 14. Compliance (Privacy)

**Workflows:**
- [ ] Data export request
- [ ] Data deletion request
- [ ] Retention rules

**Rules:**
- [ ] Hard deletes only when required
- [ ] Preserve audit logs (anonymize if needed)

---

## Admin Roles (Django Groups)

| Role | Access |
|------|--------|
| **Super Admin** | Full control including security, billing, config |
| **Ops Admin** | User + company support, moderation, refunds |
| **Moderation Admin** | Job content review, reports, enforcement |
| **Billing Admin** | Packages, Stripe, invoices, entitlements |
| **Content Admin** | Banners, affiliate placements, announcements |

---

## Principles

Every admin action must be:
- **Auditable** - logged with actor, target, action, reason
- **Least-privilege** - role-based access
- **Safe by default** - require confirmation for destructive actions
- **Reversible** - support rollback where possible

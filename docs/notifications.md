All done. Here's a summary of everything that was implemented:

---

## Summary of Changes

### Bug Fixes

**1. Slack signal `created` flag bug** (`backend/apps/notifications/slack_signals.py`)
- Changed `if instance.status == 'pending' and created:` → `and not created:`
- The job is created as `draft` first, then *updated* to `pending` on the publish call. The old `created=True` check meant the Slack notification **never fired**.

### New Notification System for Job Lifecycle

**2. Notification types** (`backend/apps/notifications/models.py`)
- Added 3 new `TYPE_CHOICES`: `job_pending_review`, `job_approved`, `job_rejected`

**3. Email templates** (`backend/apps/notifications/tasks.py`)
- `job_pending_review` — sent to admins with job title, company, location, review link
- `job_approved` — sent to employer with job title, link to view posting
- `job_rejected` — sent to employer with job title, rejection reason, link to edit

**4. Three new Celery tasks** (`backend/apps/notifications/tasks.py`)

| Task | Trigger | Recipients | Actions |
|---|---|---|---|
| `notify_job_pending_review(job_id)` | Job enters `pending` status | All active admins | In-app notification + email |
| `notify_job_approved(job_id)` | Admin approves job | Job poster (employer) | In-app notification + email |
| `notify_job_rejected(job_id, reason)` | Admin rejects job | Job poster (employer) | In-app notification + email |

**5. Wired into all job status transition points** (`backend/apps/jobs/views.py`)

| Trigger Point | Task Dispatched |
|---|---|
| `CompanyJobViewSet.publish()` → requires approval | `notify_job_pending_review` |
| `AgencyJobViewSet.publish()` → requires approval | `notify_job_pending_review` |
| `CompanyJobViewSet.perform_create()` → spam threshold exceeded | `notify_job_pending_review` |
| `AgencyJobViewSet.perform_create()` → spam threshold exceeded | `notify_job_pending_review` |
| `AdminJobViewSet.approve()` | `notify_job_approved` |
| `AdminJobViewSet.reject()` | `notify_job_rejected` |
| `AdminJobViewSet.bulk_action('approve')` | `notify_job_approved` (per job) |
| `AdminJobViewSet.bulk_action('reject')` | `notify_job_rejected` (per job) |

### Files Modified

| File | Changes |
|---|---|
| `backend/apps/notifications/slack_signals.py` | Fixed `created` → `not created` for pending jobs |
| `backend/apps/notifications/models.py` | Added 3 notification type choices |
| `backend/apps/notifications/tasks.py` | Added 3 email templates + 3 Celery tasks |
| `backend/apps/jobs/views.py` | Wired notification dispatches into 8 code paths |

### How Auto-Approval Works (unchanged, verified correct)
- **Verified companies** (`auto_approve_verified=True`, default): Jobs publish immediately — no notifications
- **Pending/unverified companies**: Jobs go to `pending` → admins now get notified
- **Spam score ≥ 70**: Jobs forced to `pending` → admins now get notified
- Admin configures all this via the **Job Policies** dialog

You'll need to restart Docker to pick up the Python changes.



All done. Here's the comprehensive summary:

---

## Full Notification Preferences Overhaul — Summary

### Confirmation: Slack = Platform Admin Only ✅
Slack notifications fire only for internal operations (fraud, billing, security, job submissions). No end user ever sees Slack messages. This is correct and unchanged.

### What Was Fixed

#### 1. Backend — `NotificationPreference` Model (`backend/apps/notifications/models.py`)
**Added 3 new fields:**
- `email_job_status` (default=True) — covers approved/rejected/pending review emails
- `email_billing` (default=True) — payment confirmations and invoices
- `email_weekly_digest` (default=False) — opt-in weekly performance digest

#### 2. Backend — Serializer (`backend/apps/notifications/serializers.py`)
Updated to expose all 11 fields including the 3 new ones.

#### 3. Backend — Task Preference Checks (`backend/apps/notifications/tasks.py`)
| Task | Before | After |
|---|---|---|
| `notify_job_pending_review` | No preference check (always sent) | Checks `prefs.email_job_status` per admin |
| `notify_job_approved` | Checked `prefs.push_enabled` (wrong) | Checks `prefs.email_job_status` |
| `notify_job_rejected` | Checked `prefs.push_enabled` (wrong) | Checks `prefs.email_job_status` |

#### 4. Frontend — Company Settings Page (`app/company/settings/page.tsx`)
**Switched from disconnected `CompanySettings.notification_preferences` JSONField to shared `/api/notifications/preferences/` endpoint** — same one used by candidate and agency portals.

**Updated toggles:**
| Old (dead) | New (working) |
|---|---|
| `email_new_applications` | `email_application_received` |
| `email_job_published` | `email_job_status` (approved/rejected/pending) |
| `email_job_expiring` | `email_job_expired` |
| `email_low_credits` | `email_credits_low` |
| `email_billing` | `email_billing` |
| `email_weekly_digest` | `email_weekly_digest` |
| *(missing)* | `email_marketing` |
| *(missing)* | `push_enabled` (new In-App Notifications card) |

#### 5. Frontend — API Module (`lib/api/companies.ts`)
- Updated `CompanyNotificationPreferences` type to match real backend fields
- Added `getCompanyNotificationPreferences()` function pointing to shared endpoint
- Changed `updateCompanyNotifications()` to point to shared endpoint

#### 6. Frontend — Types Alignment
| Type File | Changes |
|---|---|
| `lib/company/types.ts` `NotificationPreferences` | Updated all fields to match backend (was completely stale) |
| `lib/agency/types.ts` `AgencyNotificationPreferences` | Added `email_job_status`, `email_billing`, `email_weekly_digest` |
| `lib/candidate/types.ts` | No changes needed (candidates don't post jobs) |

#### 7. Frontend — Agency Settings Page (`app/agency/settings/notifications/page.tsx`)
- Updated default preferences to include new fields
- Added "Job Status Updates" toggle in the Email Notifications section

### All Files Modified

| File | What Changed |
|---|---|
| `backend/apps/notifications/models.py` | +3 model fields, +3 notification types |
| `backend/apps/notifications/serializers.py` | +3 fields in serializer |
| `backend/apps/notifications/tasks.py` | Fixed preference checks in 3 tasks + 3 email templates + 3 Celery tasks |
| `backend/apps/notifications/slack_signals.py` | Fixed `created` → `not created` bug |
| `backend/apps/jobs/views.py` | Wired notifications into 8 code paths |
| `app/company/settings/page.tsx` | Switched to shared endpoint, updated all toggles |
| `app/agency/settings/notifications/page.tsx` | Added job status toggle + new defaults |
| `lib/api/companies.ts` | Updated type + switched API endpoint |
| `lib/company/types.ts` | Fixed stale `NotificationPreferences` type |
| `lib/agency/types.ts` | Added 3 new fields to type |
| `lib/admin/types.ts` | Added `include_trashed` to filters (from earlier fix) |
| `lib/api/admin-jobs.ts` | `include_trashed` param support (from earlier fix) |
| `app/admin/jobs/page.tsx` | All Jobs includes trashed (from earlier fix) |

### After Restart
You'll need to:
1. Restart Docker to pick up all Python changes
2. Run `python manage.py makemigrations notifications` to generate the migration for the 3 new fields
3. Run `python manage.py migrate` to apply
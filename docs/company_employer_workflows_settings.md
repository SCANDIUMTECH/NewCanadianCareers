# Company (Employer) Workflows & Settings

> **User Type Name (Final): _Company (Employer)_**  
> Internal terminology: **Company** (entity) + **Employer Users** (people acting on behalf of the company).

---

## 1. Role Definition: Company / Employer

A **Company** represents an organization hiring talent.  
**Employer Users** are individuals authorized to act on behalf of a Company.

Companies can:
- Create and manage job postings
- Purchase job posting packages
- Distribute jobs to social platforms
- View performance analytics

Companies **cannot**:
- Moderate other companies
- Access platform-wide admin settings

---

## 2. Company Account Lifecycle

### 2.1 Company Creation

**Entry Points**
- Employer signup flow
- Admin-created company (manual onboarding)

**Workflow**
1. Employer user signs up
2. Creates company profile
3. Verifies email domain (recommended)
4. Company enters **Active (Unverified)** state

---

### 2.2 Company Verification (Trust)

**Verification Methods**
- Email domain verification
- Manual admin approval

**Verification States**
- Unverified
- Verified
- Suspended

**Effects**
- Verified badge on job posts
- Eligibility for social distribution & sponsored placements (policy-based)

---

## 3. Employer User Management (Within a Company)

### 3.1 Employer Roles

- **Owner** – full control, billing, users
- **Admin** – manage jobs, users, analytics
- **Recruiter** – manage jobs only
- **Viewer** – read-only access

---

### 3.2 Invite & Manage Users

**Workflow**
1. Owner/Admin invites user via email
2. User accepts invite
3. Role assigned
4. Access granted immediately

**Rules**
- Role-based permissions enforced at API level
- Owners cannot be removed (only transferred)

---

## 4. Core Company Workflows (Firm)

### 4.1 Purchase Job Posting Packages

**Workflow**
1. Navigate to Billing
2. Select package (one-time / bundle / subscription)
3. Checkout via Stripe
4. Entitlements credited to company

**Rules**
- No job can be published without available entitlements
- Admin may grant/revoke entitlements manually

---

### 4.2 Create & Publish Job

**Workflow**
1. Start new job post
2. Complete job posting wizard:
   - Basics
   - Role details
   - Location & remote rules
   - Compensation
   - Apply method
   - Distribution (social + boosts)
   - Preview
3. Publish job

**States**
- Draft
- Pending approval (policy-based)
- Published
- Paused
- Expired

---

### 4.3 Social Distribution (Optional, Controlled)

**Supported Platforms**
- Facebook
- Instagram
- LinkedIn
- X

**Modes**
- Employer-controlled (auto-post)
- Admin-approved
- Admin-only

**Workflow**
1. Employer selects platforms
2. System validates eligibility & credits
3. Job enters social queue
4. Background worker posts content
5. Status tracked per platform

---

### 4.4 Sponsored Visibility & Banners

**Options**
- Featured job placement
- Highlighted job cards
- Sponsored banners (if eligible)

**Rules**
- Sponsored content is always labeled
- Admin controls placement limits

---

### 4.5 Manage Jobs

**Dashboard Capabilities**
- View all jobs
- Filter by status
- Edit / pause / duplicate
- Extend duration (if credits available)

---

### 4.6 Review Performance

**Analytics Available**
- Job views
- Apply clicks
- Conversion rate
- Social distribution results

---

## 5. Company Profile Management

### 5.1 Public Company Profile

**Editable Fields**
- Company name
- Logo
- Description
- Website
- Industry
- Size (optional)

**Visibility Rules**
- Publicly visible
- Admin may lock certain fields

---

### 5.2 Internal Company Settings

- Verification status (read-only)
- Default apply method
- Default social distribution preference

---

## 6. Billing & Payments

### 6.1 Billing Dashboard

- Active packages
- Remaining entitlements
- Subscription status
- Invoices & receipts

### 6.2 Stripe Integration Rules

- One Stripe Customer per Company
- Webhook-driven state updates
- Billing actions audited

---

## 7. Company-Level Settings

### 7.1 Job Defaults

- Default job duration
- Default visibility options
- Default social platforms

---

### 7.2 Notifications

- Job published / expired
- Low entitlements warning
- Billing events

---

## 8. Permissions & Constraints

**Companies Can**
- Manage their own users
- Post and manage jobs
- Purchase packages
- View their analytics

**Companies Cannot**
- View other companies’ data
- Change platform rules
- Bypass moderation or billing constraints

---

## 9. Anti-Abuse & Compliance

- Posting rate limits
- Duplicate job detection
- Content moderation
- Payment fraud protection

---

## 10. Final Principle

Company workflows must:
- Be predictable
- Be auditable
- Never bypass platform trust rules

If a workflow compromises **trust**, **fairness**, or **search quality**, it is not allowed.


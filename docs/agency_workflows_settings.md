# Agency Workflows & Settings

> **User Type Name (Final): _Agency_**  
> An **Agency** represents a third-party hiring organization (recruitment agency, staffing firm, consultancy) that manages hiring on behalf of **multiple Companies**.

---

## 1. Role Definition: Agency

An **Agency** is a specialized employer-type user that:
- Manages **multiple client Companies**
- Posts and manages jobs on behalf of those Companies
- Uses the **same job posting, billing, and distribution features** as Companies

Key distinction:
- A Company posts jobs **for itself**
- An Agency posts jobs **for client Companies** it controls or is authorized to represent

---

## 2. Core Concept: Agency ↔ Company Relationship

### 2.1 Relationship Model

- One **Agency** → many **Client Companies**
- One **Company** → zero or one **Agency** (v1 constraint, simplifies trust & billing)

Each Company has:
- `represented_by_agency` (nullable)
- Clear ownership & audit trail

---

### 2.2 Authorization Rules

- Agency users act **on behalf of a selected Company context**
- Every job, payment, and action is explicitly tied to a Company
- No cross-company data leakage

---

## 3. Agency Account Lifecycle

### 3.1 Agency Creation

**Entry Points**
- Agency signup flow
- Admin-created agency

**Workflow**
1. User signs up as Agency
2. Creates agency profile
3. Agency enters **Active (Unverified)** state

---

### 3.2 Agency Verification

**Verification Methods**
- Manual admin approval
- Business documentation (optional)

**Verification States**
- Unverified
- Verified
- Suspended

**Effects**
- Ability to add client companies
- Eligibility for social distribution & sponsored placements (policy-based)

---

## 4. Agency User Management

### 4.1 Agency Roles

- **Agency Owner** – full control, billing, companies, users
- **Agency Admin** – manage companies & jobs
- **Agency Recruiter** – manage jobs only
- **Agency Viewer** – read-only

---

### 4.2 Invite & Manage Agency Users

**Workflow**
1. Owner/Admin invites user
2. Role assigned
3. Access granted immediately

---

## 5. Client Company Management (Agency-Specific)

### 5.1 Add Client Company

**Workflow**
1. Agency selects “Add Company”
2. Enter company details
3. Assign internal agency owner
4. Company created in **Agency-Managed** state

**Rules**
- Company profile is editable by Agency
- Admin may require company verification before publishing jobs

---

### 5.2 Company Context Switching

- Agency dashboard includes **Company Switcher**
- All actions occur within selected Company context
- Clear UI indicator of active Company

---

## 6. Job Posting & Management (Inherited from Company)

> **Important:** Agencies inherit **all Company workflows and features**.

### Included Capabilities
- Purchase job posting packages
- Create, publish, pause, and expire jobs
- Social distribution (FB / IG / LinkedIn / X)
- Sponsored placements & banners
- Analytics & reporting

### Key Rule
- Jobs are always published **under the client Company’s brand**
- Agency branding is not visible on job posts (unless explicitly enabled later)

---

## 7. Billing & Monetization (Agency Mode)

### 7.1 Billing Models (Admin-Configurable)

- **Agency Pays** (default)
  - Agency owns Stripe customer
  - Packages shared across client companies

- **Company Pays** (optional)
  - Each company has its own billing
  - Agency only manages postings

> Billing mode is locked per Agency by admin.

---

### 7.2 Entitlements & Credits

- Entitlements can be:
  - Agency-level (shared pool)
  - Company-level (isolated)

- Decrement rules enforced at publish time

---

## 8. Social Distribution (Agency-Controlled)

- Agency may:
  - Use platform-managed social accounts
  - Use agency-managed social accounts

**Posting Rules**
- Social posts reference the client Company
- Platform policy still applies (user-controlled / admin-approved / admin-only)

---

## 9. Analytics & Reporting

### Agency Dashboard

- Jobs by company
- Performance by company
- Social distribution success rates
- Spend & credit usage

---

## 10. Permissions & Constraints

**Agencies Can**
- Manage multiple companies
- Post jobs on behalf of companies
- Manage agency users
- Purchase packages (if agency-paid)

**Agencies Cannot**
- Modify platform rules
- Access other agencies’ data
- Bypass moderation or verification

---

## 11. Anti-Abuse & Trust Rules

- Strict company-level isolation
- Rate limits across agency activity
- Enhanced moderation for high-volume posting

---

## 12. Final Principle

Agency workflows must:
- Preserve company identity
- Maintain auditability
- Prevent misuse at scale

If an agency workflow reduces **trust**, **clarity**, or **company ownership**, it is not allowed.


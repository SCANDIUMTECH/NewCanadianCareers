# Modern Job Board (2026)
## Product Features, UX Workflows, and Architecture

> **Goal**: Build a robust, minimalist, ultra‑modern job board with *only high‑value core features*, no bloat, and enterprise‑grade foundations. Optimized for speed, trust, SEO, and long‑term scalability. Built using **Claude Code** (backend + logic), **v0** (frontend generation), and ChatGPT (product & system architecture).

---

## 1. Product Philosophy (Non‑Negotiables)

1. **Search-first product** – search + filters are the product.
2. **Trust over noise** – accurate data, transparent listings, no dark patterns.
3. **Minimal UI, deep UX** – fewer features, better defaults.
4. **Distribution-native** – Google for Jobs, SEO, shareable links are mandatory.
5. **AI as assist, not replacement** – AI enhances discovery, never hides control.
6. **Open-source first** – modern, actively maintained, replaceable components.

---

## 2. Core User Types

### Job Seekers
- Discover relevant jobs quickly
- Evaluate credibility fast
- Apply with minimal friction

### Employers
- Publish high-quality job posts easily
- Reach candidates through search + SEO
- Manage postings without complexity

### Admin / Platform
- Maintain quality and trust
- Prevent spam and abuse
- Enforce platform rules transparently

---

## 3. MVP Feature Set (No Bloat)

### 3.1 Job Seeker Features

#### A. Job Search
- Keyword search (title, company, skills)
- Faceted filters:
  - Location (city, region, country)
  - Remote / Hybrid / On‑site
  - Employment type (FT, PT, Contract)
  - Experience level
  - Salary range
  - Date posted
- Sorting:
  - Most relevant (default)
  - Most recent

#### B. Job Results UX
- Instant updates (no full page reloads)
- Clear result cards:
  - Title
  - Company
  - Location / Remote tag
  - Salary (if provided)
  - Post age

#### C. Job Details Page
- Clean reading layout
- Sections:
  - Job summary
  - Responsibilities
  - Requirements
  - Compensation
  - Benefits
  - About company
- Single primary CTA: **Apply**

#### D. Apply Flow
- **External Apply (MVP default)**
  - Redirect to ATS or company site
  - Track outbound clicks
- **Direct Apply (optional phase 2)**
  - Resume upload
  - Minimal form

#### E. Engagement
- Save job
- Save search
- Email alerts (daily / weekly)

---

### 3.2 Employer Features

#### A. Job Posting Wizard
- Step-by-step guided flow:
  1. Basics
  2. Role details
  3. Location & remote rules
  4. Compensation
  5. Apply method
  6. **Distribution (Social + Boosts)**
  7. Preview
  8. Publish

- Inline validation
- Preview matches live job page exactly

#### B. Job Management Dashboard
- Job states:
  - Draft
  - Pending approval (optional policy)
  - Published
  - Paused
  - Expired
- Actions:
  - Edit
  - Pause / resume
  - Duplicate
  - Expire

#### C. Analytics (Lightweight)
- Views
- Outbound apply clicks
- Apply conversion (if direct apply)
- Social distribution status (queued / posted / failed)

#### D. Payments & Packages
- Purchase job posting packages via Stripe
- Company entitlements (“wallet”):
  - remaining posts
  - remaining featured credits
  - remaining social credits
- Invoice history and receipts

#### E. Social Distribution (User vs Admin Controlled)
- When posting a job, employer can toggle:
  - Post to Facebook
  - Post to Instagram
  - Post to LinkedIn
  - Post to X
- Platform policy modes:
  - **User-controlled** (auto-post if employer enabled)
  - **Admin-approved** (employer requests; admin approves)
  - **Admin-only** (only platform posts)

### 3.3 Admin & Trust Features (Django Admin–First)

- Django Admin as the **primary platform control panel**
- Admin-managed models:
  - Users & roles
  - Companies & verification status
  - Job postings (all states)
  - Reports & abuse flags
  - Moderation actions

#### Admin Capabilities
- Advanced filtering & search
- Bulk actions (approve, hide, expire, ban)
- Inline editing for rapid moderation
- Read-only views for sensitive audit data

#### Audit & Governance
- Every admin action logged:
  - who
  - what
  - when
  - why (required reason field)
- Immutable audit records

---

## 4. Critical UX Workflows

### 4.1 Job Seeker Flow
1. Land on `/jobs`
2. Default filters applied (e.g. recent + remote toggle)
3. Search + refine with facets
4. Open job detail
5. Apply
6. Post-apply suggestions + save search

### 4.2 Employer Flow (Post + Pay + Distribute)
1. Sign up / sign in
2. Create / claim company profile
3. **Select package** (or use existing credits)
4. Post job via wizard
5. Choose distribution:
   - none
   - user-controlled social posting
   - request admin approval for social posting
6. Preview → publish
7. Track performance:
   - views
   - clicks
   - social distribution status
8. Pause / update / duplicate as needed

### 4.3 Admin Flow (Moderation + Packages + Sponsorship)
1. Review flagged jobs & new employers
2. Take moderation action (approve/hide/ban)
3. Configure monetization:
   - job posting packages
   - banner inventory
   - affiliate placements
   - social distribution rules
4. View audit logs and financial reporting

---

## 5. Information Architecture & Routes

### Public
- `/jobs` – search & results
- `/jobs/[slug]` – job detail
- `/companies/[slug]` – company profile

### Employer
- `/employer/billing` – packages, invoices, receipts
- `/employer/jobs`
- `/employer/jobs/new`
- `/employer/jobs/[id]/edit`

### Admin (Django Admin)
- Django Admin is the primary admin UI.
- Optional thin Next.js admin views can exist later, but are not required for v1.

### Social (System)
- Provider OAuth callbacks (platform/system)
- Distribution status viewer (employer/admin)

---

## 6. UI / UX Design System

### Principles
- Calm, confident, neutral
- Strong typography hierarchy
- High contrast, accessible
- No visual noise

### Stack
- **Next.js Latest Stable (App Router)**
- **TypeScript**
- **Tailwind CSS** (design tokens via CSS variables)
- **shadcn/ui** (primitives only)
- **v0** for layout & component generation

### Layout Patterns
- Desktop: two‑column search (filters left, results right)
- Mobile: filters in bottom sheet
- Job details: single column, reading‑optimized

---

## 7. Search Architecture (Core System)

### Engine Options
- **Meilisearch** (recommended)
- **Typesense** (alternative)

### Rules
- Search index = read model
- PostgreSQL = source of truth
- Real‑time sync via events / queues

### Indexed Fields
- title
- company_name
- description
- skills
- location
- salary
- remote_type
- employment_type
- published_at

---

## 8. Backend Architecture (Chosen Option: Django)

### Core Stack (Authoritative)
- **Backend Framework:** Django
- **API Layer:** Django REST Framework (DRF)
- **Authentication:** Django Auth (single source of truth)
- **Admin Panel:** Django Admin (primary platform control)
- **Database:** PostgreSQL
- **Search Engine:** Meilisearch (recommended) or Typesense
- **Background Jobs:** Celery + Redis (or Django-Q / RQ)
- **Payments:** Stripe
- **Social Distribution:** Provider APIs (Facebook/Instagram, LinkedIn, X)

### Architectural Principles
- Django is the **system of record** for users, companies, jobs, packages, payments, permissions, and moderation.
- Next.js is a **pure frontend** consuming DRF APIs.
- Search engine is a **read-optimized index**, never the source of truth.
- Admin and platform governance live **entirely in Django Admin**.
- Social posting executes via **background jobs** with retries and full auditability.

### API Responsibilities (DRF)
- Job search API (proxying search engine)
- Job CRUD (employer-scoped)
- Saved jobs & saved searches
- Apply tracking (external apply clicks)
- Billing (packages, entitlements, invoices)
- Admin moderation endpoints
- Social distribution requests & status

### Background Tasks
- Search indexing & re-indexing
- Job expiration & cleanup
- Saved search email alerts
- Sitemap regeneration
- Stripe webhook processing (idempotent)
- Social post queue + retries + failure alerts
- Abuse detection & throttling

---

## 9. Authentication & Security (Django Auth)

### Authentication Model
- **Single auth system:** Django authentication
- User types handled via roles / groups:
  - Job Seeker
  - Employer
  - Admin / Staff

### Session Strategy
- Django session-based auth (HTTP-only cookies)
- CSRF protection enabled for all state-changing requests
- Token-based auth (optional) only for:
  - background services
  - internal system integrations

### Authorization
- Role-based access control using:
  - Django Groups
  - Django Permissions
- Employer scoping enforced at query level
- Admin permissions enforced centrally

### Security Controls
- Rate limiting (login, job posting, search abuse)
- Email + domain verification for employers
- File upload validation (resumes)
- Full audit logging for admin and employer actions

---

## 10. SEO & Google for Jobs (Mandatory)

- Each job has unique, indexable URL
- JSON-LD `JobPosting` structured data
- Accurate:
  - title
  - description
  - datePosted
  - validThrough
  - hiringOrganization
  - jobLocation / applicantLocationRequirements
  - salary (strongly recommended)
- XML sitemap with job URLs
- Automatic removal on expiration

### Social Sharing Metadata
- OpenGraph + Twitter/X meta tags on job pages
- Large preview cards with:
  - title
  - company
  - location/remote
  - salary (if present)
  - canonical URL

---

## 11. Data Model (Minimum, Scalable + Monetization + Social)

### Company
- id
- name
- website
- logo
- verified
- stripe_customer_id

### User
- id
- role (seeker | employer | admin)
- company_id (nullable)

### JobPosting
- id
- title
- description_html
- employment_type
- experience_level
- location_type
- locations[]
- salary_min / salary_max / currency / period
- apply_type (external | direct)
- apply_url
- status
- published_at
- valid_through
- package_entitlement_id (nullable)
- social_requested (bool)
- social_policy_applied (enum: user_controlled | admin_approved | admin_only)

### JobPackage
- id
- name
- type (one_time | bundle | subscription)
- post_duration_days
- included_posts
- included_featured_credits
- included_social_credits
- price_display
- stripe_price_id
- is_active

### CompanyEntitlement
- id
- company_id
- package_id
- remaining_posts
- remaining_featured
- remaining_social
- valid_from
- valid_to
- source (purchase | subscription)

### PaymentRecord
- id
- company_id
- stripe_event_id
- stripe_checkout_session_id
- stripe_invoice_id
- amount
- currency
- status
- created_at

### SponsoredBanner
- id
- sponsor_company_id (nullable)
- placement (home_hero | jobs_search | company_spotlight)
- image_url
- target_url
- start_at
- end_at
- is_active

### AffiliatePlacement
- id
- placement_key
- label
- target_url
- is_active

### SocialProviderConnection
- id
- provider (facebook | instagram | linkedin | x)
- mode (platform | employer)
- company_id (nullable)
- access_token_ref
- refresh_token_ref
- expires_at
- scopes

### SocialPostJob
- id
- job_id
- provider
- status (queued | posted | failed)
- external_post_id
- error_message
- created_at
- posted_at

### SavedJob
- user_id
- job_id

### SavedSearch
- user_id
- query + filters

### ModerationAction
- admin_id
- target_id
- action
- reason
- timestamp

---

## 12. Analytics (Lean + Monetization)

- Search usage
- Filter usage
- Job CTR
- Apply conversion
- Employer posting success rate
- Package conversion (view → purchase)
- Banner impressions + clicks
- Affiliate clicks
- Social distribution success rate (queued/posted/failed)

---

## 13. Monetization (Included)

> Monetization must **never** degrade search relevance or user trust.

### 13.1 Employer Job Posting Packages (Stripe)

#### Package Types
- **One-time job post** (single listing, fixed duration)
- **Bundle** (e.g., 5 posts / 10 posts)
- **Subscription** (monthly quota; rollover optional)

#### Package Attributes
- Post duration (days)
- Number of active listings allowed
- Featured placement (optional)
- Highlight styling (optional)
- Social distribution credits (optional)
- Banner sponsorship eligibility (optional)

#### Stripe Integration
- Stripe Checkout (v1 recommended)
- Stripe Customer tied to Company
- Webhooks (idempotent processing):
  - `checkout.session.completed`
  - `invoice.paid` (subscriptions)
  - `customer.subscription.updated`
  - `charge.refunded`
- Store Stripe IDs in DB:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `stripe_price_id`
  - `stripe_checkout_session_id`

#### Entitlements Rules
- Purchasing a package creates/extends **CompanyEntitlement**
- Job publishing decrements entitlements
- Featured/social boosts decrement their respective credits
- Admin can grant/revoke entitlements (with audit log)

### 13.2 Sponsored Banners

#### Banner Inventory
- Homepage hero banner (limited slots)
- Jobs search page banner (limited slots)
- Company profile spotlight (optional)

#### Banner Rules
- Clearly labeled as **Sponsored**
- Frequency caps (avoid clutter)
- No deceptive placement

### 13.3 Affiliate Monetization
- Affiliate links must be labeled
- Track clicks and conversions (where possible)
- Admin controls for affiliate placements and rules

---

## 14. Social Media Job Distribution (Direct Posting)

Job distribution to social platforms is integrated directly into the job posting workflow.

### 14.1 Supported Platforms
- Facebook
- Instagram
- LinkedIn
- X (Twitter)

### 14.2 Posting Control Modes

#### Employer-Controlled
- Employer toggles social distribution during job posting
- Select platforms per job
- Preview post copy

#### Admin-Controlled
- Platform admin can:
  - enable/disable social posting per package
  - override employer settings
  - schedule posts

---

### 14.3 Posting Workflow

1. Employer publishes job
2. System checks:
   - active package
   - platform permissions
3. Job content adapted per platform
4. Posts scheduled or published
5. Links back to canonical job URL

---

### 14.4 Automation & Safety

- Platform-specific rate limits respected
- Failure retries via background jobs
- Full audit log of all social posts

---

## 15. Admin Configuration & Platform Control

Django Admin is the **central command center** for monetization and distribution.

### Admin-Managed Areas
- Job packages & pricing
- Payment records & refunds
- Banner campaigns
- Affiliate feeds
- Social media credentials & posting rules
- Feature flags (e.g. enable social posting)

---

## 16. Analytics & Reporting (Extended)

- Revenue by package
- Conversion rate per package
- Banner CTR
- Social post performance
- Employer lifetime value

---

## 17. Monetization Principles

- Monetization must **never break trust**
- Paid visibility is transparent
- Organic relevance always wins

---

## 18. Phased Roadmap

### Phase 1 – MVP + Revenue Ready
- Search + filters
- Job pages
- External apply
- Employer posting
- Job posting packages
- Stripe payments
- Google for Jobs compliance

### Phase 2 – Distribution & Growth
- Social media job posting
- Sponsored banners
- Affiliate job feeds

### Phase 3 – Optimization
- AI-assisted search
- Smart recommendations
- Pricing optimization

---

## 19. Build Execution Plan (Django-First)

1. Finalize data models in Django
2. Configure Django Admin for all core entities
3. Implement DRF APIs for frontend consumption
4. Integrate search engine indexing pipeline
5. Implement Next.js frontend (read + write flows)
6. Add saved searches & email alerts
7. Harden moderation & audit logging
8. Instrument analytics & monitoring

---

## Final Architecture Decision (Locked)

- **Backend:** Django + Django REST Framework
- **Authentication:** Django Auth (single source of truth)
- **Admin Panel:** Django Admin
- **Frontend:** Next.js (App Router) + shadcn/ui + v0
- **Search:** Meilisearch / Typesense

This choice optimizes for:
- minimal engineering waste
- fastest path to a production-grade admin platform
- long-term maintainability
- enterprise trust & governance


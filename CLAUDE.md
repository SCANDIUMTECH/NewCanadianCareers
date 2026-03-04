# CLAUDE.md

## What is New Canadian Careers

New Canadian Careers (NCC) is a job board platform focused on helping newcomers to Canada find meaningful employment. 4 user types: **Candidates**, **Companies**, **Agencies**, **Platform Admin**. Philosophy: search-first, trust over noise, minimal UI with deep UX, SEO-native (Google for Jobs), AI-assist not replacement.

Monetization: job posting packages (one-time/bundle/subscription), sponsored banners, affiliate placements, featured jobs — all via Stripe.

## Architecture — READ THIS FIRST

```
Browser → Next.js Frontend (localhost:3000)
              ↓ API calls with JWT Bearer token
         Traefik Reverse Proxy (localhost:80)
              ↓
         Django + DRF Backend (port 8000, internal)
              ↓
         PostgreSQL 15 | Redis 7 | MinIO (S3) | Celery Workers
              ↓
         Stripe | Resend (email) | Social APIs (FB, IG, LinkedIn, X)
```

### Backend — Django on Docker (port 80 via Traefik)

- **Framework**: Django 5.0+ with Django REST Framework
- **Runs via**: `cd backend && docker-compose up`
- **Reverse proxy**: Traefik on **port 80** (HTTP) + port 8080 (dashboard)
- **Django internal**: port 8000 behind Traefik — never hit directly
- **Database**: PostgreSQL 15
- **Cache/Broker**: Redis 7
- **Task queue**: Celery + Celery Beat (job expiry, alerts, cleanup)
- **File storage**: MinIO (S3-compatible), port 9000 (API) / 9001 (console)
- **Static files**: Nginx container serves /static and /media paths
- **Auth**: JWT (SimpleJWT) — 60min access, 7-day refresh with rotation
- **Email**: Resend
- **Payments**: Stripe (checkout, subscriptions, webhooks)
- **Production**: Cloudflare Tunnel (profile-gated in docker-compose)

### Frontend — Next.js on Vercel (dev: localhost:3000)

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS variables
- **Components**: shadcn/ui (new-york style), Radix UI primitives
- **Animation**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Rich text**: TipTap editor
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployed**: Vercel, synced with v0.app

### How Frontend Connects to Backend

- API base URL: `NEXT_PUBLIC_API_URL` env var, defaults to `http://localhost:8000` in `/lib/api/client.ts`
- All API calls go through the typed client in `/lib/api/client.ts`
- JWT stored in localStorage + cookie flag (`ncc_access_token`) for middleware route protection
- Auto token refresh on 401, session expired event on refresh failure
- Route protection middleware in `/proxy.ts` — checks cookie presence, redirects unauthenticated users

## Commands

```bash
# Frontend
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build (TypeScript check)
npm run lint         # ESLint

# Backend
cd backend && docker-compose up       # Start ALL backend services
cd backend && docker-compose down      # Stop everything
cd backend && docker-compose logs web  # Django logs
cd backend && docker-compose exec web python manage.py migrate
cd backend && docker-compose exec web python manage.py createsuperuser
```

### Access URLs (local dev)

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost (Traefik → Django) |
| Django Admin | http://localhost/admin |
| Traefik Dashboard | http://localhost:8080 |
| MinIO Console | http://localhost:9001 |

## API Endpoints

```
/health/                          - Health check
/admin/                           - Django Admin
/api/auth/                        - Login, register, password reset, email verify
/api/companies/                   - Company CRUD
/api/jobs/                        - Job CRUD, publish, pause, duplicate, stats
/api/applications/                - Application tracking
/api/billing/                     - Stripe checkout, packages, entitlements
/api/notifications/               - Notification system
/api/search/                      - Search
/api/social/                      - Social media integration
/api/jobs/<id>/social-posts/      - Job-specific social posts
/api/admin/                       - Admin moderation APIs
```

## Data Models (Backend)

**User**: Email-based auth (no username). Roles: admin, employer, agency, candidate. Status: active, suspended, pending. MFA-ready, failed login tracking, account lockout after 5 attempts.

**Company**: Status: verified/pending/unverified. Has Stripe customer ID, billing status, risk level. Team roles: owner/admin/recruiter/viewer via CompanyUser.

**Agency**: Like Company but for recruitment firms. One agency → many client companies. Billing models: agency_pays or company_pays. Team roles via AgencyUser.

**Job**: Status: draft/pending/published/paused/expired/hidden. Employment types, location types, experience levels, salary range, skills/benefits/requirements (JSON fields). Metrics: views, unique_views, applications_count. Featured/urgent flags.

**Application**: Tracks candidate applications with status workflow.

**Billing**: Stripe-integrated packages and entitlements for job posts, featured listings, social credits.

## Directory Structure

```
/app                              # Next.js pages
  /admin                          # Platform admin (15+ pages)
  /agency                         # Agency dashboard
  /candidate                      # Candidate dashboard
  /company                        # Employer dashboard
  /companies                      # Public company directory + profiles
  /jobs                           # Public job search + detail
  /login, /signup                 # Auth pages
  /forgot-password, /reset-password, /verify-email
/components
  /ui                             # shadcn/ui primitives (30+ components)
  /admin                          # Admin-specific components
  /jobs                           # Job card, empty state
  /quick-job-post[-v2, -v3]       # Quick job posting flows
  /seo                            # SEO components
/lib
  /api                            # Typed API client + all endpoint modules
    client.ts                     # Base API client (auth, refresh, errors)
    auth.ts, jobs.ts, companies.ts, billing.ts, social.ts, etc.
    admin-*.ts                    # Admin API modules
  /auth/types.ts                  # User, roles, auth state types
  /company/types.ts               # Company, jobs, billing types
  /candidate/types.ts             # Candidate types
  /agency/types.ts                # Agency types
  /admin/types.ts                 # Admin types
  /constants/industries.ts        # Industry dropdown options
  utils.ts                        # cn() utility
  quick-job-schema.ts             # Quick job Zod schema
  seo-types.ts                    # SEO metadata types
/hooks
  use-auth.ts                     # Auth context
  use-company.ts, use-candidate.ts, use-agency.ts  # Role state
  use-quick-job-post.ts           # Quick job form state
  use-mobile.ts                   # Mobile detection
/backend                          # Django project (separate codebase)
  /config/settings/base.py        # Django settings
  /config/urls.py                 # URL routing
  /apps/users, companies, jobs, applications, billing, notifications, moderation, social, search, audit
  docker-compose.yml              # All services
  /traefik                        # Reverse proxy config
  requirements.txt                # Python dependencies
  Dockerfile, .env.example
/docs                             # Product specs (read these for requirements)
  modern_job_board_product_ux_and_architecture_report-2.md  # Master product doc
  platform_admin_workflows_settings_django_admin.md         # Admin workflows
  company_employer_workflows_settings.md                    # Employer workflows
  employee_candidate_workflows_settings.md                  # Candidate workflows
  agency_workflows_settings.md                              # Agency workflows
```

## Auth Flow

1. User POSTs credentials to `/api/auth/login/`
2. Django returns user object + JWT tokens (access + refresh)
3. Frontend stores tokens in localStorage, sets `ncc_access_token` cookie for middleware
4. `/proxy.ts` middleware checks cookie → redirects unauthenticated users from protected routes
5. `/lib/api/client.ts` injects `Authorization: Bearer <token>` on all API calls
6. On 401 → auto-refresh token → on failure → session expired event → redirect to login

## Code Conventions

- **Imports**: Use `@/` aliases — `@/components`, `@/lib/utils`, `@/hooks`
- **Styling**: `cn()` for conditional Tailwind classes. Glassmorphism: `bg-white/80 backdrop-blur-xl`. Brand: Crimson Carrot #FF4500, Jet Black #1F2833, Fresh Sky #00A2DF, White Smoke #F2F2F2, Hot Fuchsia #FF0056. Primary: #FF4500. Rounded: `rounded-xl`/`rounded-2xl`.
- **Components**: UI primitives in `/components/ui`. Feature components in `/components`. Use existing shadcn/ui before creating new ones.
- **Layouts**: Admin = collapsible sidebar. Company/Candidate/Agency = floating glassmorphism header. Auth = split screen.
- **Animation**: Framer Motion staggered reveals. `initial` → `animate` → `transition` with `staggerChildren`.

## Backend Environment Variables

```
SECRET_KEY, DEBUG, ALLOWED_HOSTS
DATABASE_URL, DB_NAME, DB_USER, DB_PASSWORD
REDIS_URL
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_ENDPOINT, MINIO_BUCKET
RESEND_API_KEY
FRONTEND_URL, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS
SESSION_COOKIE_DOMAIN
CLOUDFLARE_TUNNEL_TOKEN
```

Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)

## Security

- JWT + session (Redis-backed, HTTP-only cookies)
- Rate limiting: 100/hr anon, 1000/hr authenticated
- Traefik middlewares: security headers, XSS filter, frame deny, rate limiting
- Account lockout: 5 failed attempts → 15min lockout, email alert at 3 attempts
- GDPR: 90-day login attempt retention, data export/deletion endpoints
- Audit: all admin actions logged with actor, target, action, timestamp, reason, before/after snapshots

## Behavioral Rules for Claude

1. **Just do the task.** Read the relevant files, make the edits, run `npm run build` to verify. Don't ask unnecessary clarifying questions when the intent is clear.
2. **The backend exists and is running.** Django + DRF on Docker, Traefik on port 80. Never say "backend is planned" or "will be implemented."
3. **Read before editing.** Always read a file before modifying it. Understand existing patterns.
4. **Match existing code exactly.** Look at neighboring code for style, imports, patterns. Don't introduce new conventions.
5. **Keep changes surgical.** Only modify what's needed. No drive-by refactors, no unsolicited improvements.
6. **Verify with `npm run build`.** After frontend changes, always run build to catch errors.
7. **Use the docs.** `/docs` has 1,900+ lines of product specs. Read them when you need requirements context.
8. **API client exists.** All API calls go through `/lib/api/client.ts`. Don't create new fetch wrappers. Add endpoint functions to the appropriate `/lib/api/*.ts` module.
9. **Types exist.** Check `/lib/auth/types.ts`, `/lib/company/types.ts`, `/lib/agency/types.ts`, `/lib/candidate/types.ts`, `/lib/admin/types.ts` before defining new types.
10. **Radix + Portal gotcha.** Portaled dropdowns (Combobox, etc.) break inside Radix Dialog modals. Fix: pass a `container` ref that lives inside the Dialog. See MEMORY.md for details.

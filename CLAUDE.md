# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is New Canadian Careers

New Canadian Careers (NCC) is a job board platform helping newcomers to Canada find employment. 4 user types: **Candidates**, **Companies**, **Agencies**, **Platform Admin**. Philosophy: search-first, trust over noise, minimal UI with deep UX, SEO-native (Google for Jobs), AI-assist not replacement.

Monetization: job posting packages (one-time/bundle/subscription), sponsored banners, affiliate placements, featured jobs — all via Stripe.

## Architecture — READ THIS FIRST

```
Browser → Traefik Reverse Proxy (https://localhost)
              ├─ /api/*, /health, /django-admin/* → Django + DRF (port 8000)
              ├─ /static/* → Nginx static server
              ├─ /media/* → MinIO (S3-compatible)
              └─ everything else → Next.js Frontend (port 3000)
              ↓
         PostgreSQL 15 | Redis 7 | RabbitMQ 4 | MinIO | Kafka | ClickHouse
              ↓
         Celery Workers + Beat | OpenTelemetry | Grafana
              ↓
         Stripe | Resend (email) | Slack | Social APIs (FB, IG, LinkedIn, X)
```

### Frontend — Next.js (HTTPS via Traefik)

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS variables
- **Components**: shadcn/ui (new-york style), Radix UI primitives
- **Animation**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Rich text**: TipTap editor
- **Charts**: Recharts
- **Icons**: Lucide React
- **Dev server**: `npm run dev` runs `node server.js` — custom HTTPS server using self-signed certs in `certs/`
- **Deployed**: Vercel, synced with v0.app

### Backend — Django on Docker (behind Traefik)

- **Framework**: Django 5.0+ with Django REST Framework
- **Runs via**: `cd backend && docker-compose up`
- **Reverse proxy**: Traefik on **port 443** (HTTPS) + port 80 (HTTP) + port 8080 (dashboard)
- **Django internal**: port 8000 behind Traefik — never hit directly
- **Database**: PostgreSQL 15
- **Cache**: Redis 7 (session backend, result backend)
- **Broker**: RabbitMQ 4.2 (Celery task broker)
- **Task queue**: Celery + Celery Beat (job expiry, alerts, cleanup, fraud scan, marketing automation)
- **File storage**: MinIO (S3-compatible), port 9000 (API) / 9001 (console)
- **Static files**: Nginx container serves /static and /media paths
- **Analytics**: Kafka → ClickHouse pipeline for RUM (Real User Monitoring)
- **Observability**: OpenTelemetry Collector + Grafana (port 3001)
- **Auth**: Cookie-based JWT (SimpleJWT) — HTTP-only cookies, 60min access, 7-day refresh with rotation
- **Email**: Resend
- **Payments**: Stripe (checkout, subscriptions, webhooks)
- **Production**: Cloudflare Tunnel (profile-gated in docker-compose)

### How Frontend Connects to Backend

- Browser-side: `NEXT_PUBLIC_API_URL` env var (defaults to empty string = same origin via Traefik)
- SSR-side: `INTERNAL_API_URL` env var (reaches Django directly inside Docker network)
- All API calls go through the typed client in `/lib/api/client.ts`
- **Auth is cookie-based**: HTTP-only cookies (`ncc_access`, `ncc_refresh`) set by backend. A JS-readable `ncc_has_session` presence flag cookie is used for middleware route checks.
- `credentials: 'include'` on all fetch calls — browser sends cookies automatically
- On 401 → auto-refresh via `/api/auth/token/refresh/` → on failure → session expired event → redirect to login
- Route protection in `/proxy.ts` — checks `ncc_has_session` cookie, redirects unauthenticated users from protected routes

### Docker Network Segmentation

Three-tier isolation — services only join networks they need:
- **frontend_net**: Traefik ↔ Django, Nginx, Next.js, Grafana, Cloudflared (public-facing)
- **backend_net**: Django ↔ Redis, RabbitMQ, Kafka, ZooKeeper, OTel, MinIO (internal, no outbound internet)
- **data_net**: Django ↔ PostgreSQL, ClickHouse (internal, no outbound internet)

## Commands

```bash
# Frontend (run from project root)
npm run dev          # HTTPS dev server via server.js (port 3000, certs in certs/)
npm run build        # Production build (TypeScript check) — USE THIS TO VERIFY CHANGES
npm run lint         # ESLint

# Backend (run from backend/)
cd backend && docker-compose up       # Start ALL backend services (15+ containers)
cd backend && docker-compose down      # Stop everything
cd backend && docker-compose logs web  # Django logs
cd backend && docker-compose exec web python manage.py migrate
cd backend && docker-compose exec web python manage.py createsuperuser
cd backend && docker-compose exec web python manage.py shell  # Django shell
```

### Access URLs (local dev)

| Service | URL |
|---|---|
| Frontend | https://localhost (Traefik → Next.js) |
| Backend API | https://localhost/api/ (Traefik → Django) |
| Django Admin | https://localhost/django-admin/ |
| Traefik Dashboard | http://localhost:8080 |
| MinIO Console | http://localhost:9001 |
| RabbitMQ Management | http://localhost:15672 |
| Grafana | http://localhost:3001 |

**Important**: Frontend is accessed at `https://localhost` (through Traefik), NOT at `localhost:3000` (that's the raw Next.js dev server). Self-signed certs cause browser warnings — accept them.

## API Endpoints

```
/health/                          - Health check
/django-admin/                    - Django Admin (NOT /admin/ — that's Next.js)
/api/auth/                        - Login, register, password reset, email verify, token refresh
/api/companies/                   - Company CRUD
/api/jobs/                        - Job CRUD, publish, pause, duplicate, stats
/api/candidates/                  - Candidate profiles
/api/applications/                - Application tracking
/api/billing/                     - Stripe checkout, packages, entitlements
/api/notifications/               - Notification system
/api/search/                      - Search
/api/social/                      - Social media integration
/api/jobs/<id>/social-posts/      - Job-specific social posts
/api/articles/                    - News/blog articles
/api/ai/                          - AI services (SEO, social generation)
/api/marketing/                   - Marketing automation (public: unsubscribe, preferences)
/api/gdpr/                        - GDPR compliance (consent, DSAR)
/api/admin/                       - Admin moderation APIs
/api/admin/ai/                    - Admin AI config and usage
/api/settings/public/             - Public settings (Turnstile key, feature toggles)
/rum/v1/                          - Real User Monitoring ingest (HMAC-secured)
```

## Data Models (Backend)

**User**: Email-based auth (no username). Roles: admin, employer, agency, candidate. Status: active, suspended, pending. MFA-ready, failed login tracking, account lockout after 5 attempts. Custom model: `apps.users.User`.

**Company**: Status: verified/pending/unverified. Has Stripe customer ID, billing status, risk level. Team roles: owner/admin/recruiter/viewer via CompanyUser.

**Agency**: Like Company but for recruitment firms. One agency → many client companies. Billing models: agency_pays or company_pays. Team roles via AgencyUser.

**Job**: Status: draft/pending/published/paused/expired/hidden. Employment types, location types, experience levels, salary range, skills/benefits/requirements (JSON fields). Metrics: views, unique_views, applications_count. Featured/urgent flags.

**Application**: Tracks candidate applications with status workflow.

**Billing**: Stripe-integrated packages and entitlements for job posts, featured listings, social credits.

## Directory Structure

```
/app                              # Next.js pages (App Router)
  /admin                          # Platform admin (15+ pages)
  /agency                         # Agency dashboard
  /candidate                      # Candidate dashboard
  /company                        # Employer dashboard
  /companies                      # Public company directory + profiles
  /jobs                           # Public job search + detail
  /news                           # News/blog index + articles
  /login, /signup                 # Auth pages
  /forgot-password, /reset-password, /verify-email
  /terms, /privacy                # Legal pages
/components
  /ui                             # shadcn/ui primitives (30+ components)
  /admin                          # Admin-specific components
  /jobs                           # Job card, empty state
  /seo                            # SEO components
  header.tsx, hero-section.tsx    # Shared layout components
  public-page-shell.tsx           # Wrapper for all public pages (Header + Footer)
/lib
  /api                            # Typed API client + all endpoint modules
    client.ts                     # Base API client (cookie auth, refresh, errors)
    auth.ts, jobs.ts, companies.ts, billing.ts, social.ts, etc.
    admin-*.ts                    # Admin API modules
  /auth/types.ts                  # User, roles, auth state types
  /company/types.ts               # Company, jobs, billing types
  /candidate/types.ts             # Candidate types
  /agency/types.ts                # Agency types
  /admin/types.ts                 # Admin types
  /constants/industries.ts        # Industry dropdown options
  utils.ts                        # cn() utility
/hooks
  use-auth.ts                     # Auth context
  use-company.ts, use-candidate.ts, use-agency.ts  # Role state
  use-mobile.ts                   # Mobile detection
/backend                          # Django project
  /config/settings/base.py        # Django settings
  /config/urls.py                 # URL routing
  /apps/users, companies, jobs, applications, billing, notifications,
        moderation, social, search, audit, articles, marketing, ai, rum, gdpr, candidates
  docker-compose.yml              # All services (15+ containers)
  /traefik                        # Reverse proxy config + certs
  requirements.txt                # Python dependencies
/certs                            # Self-signed HTTPS certs for local dev
/docs                             # Product specs (1,900+ lines)
server.js                         # Custom HTTPS dev server (loads certs, runs Next.js)
proxy.ts                          # Route protection middleware (cookie check)
Dockerfile                        # Multi-stage: frontend-deps, frontend-runtime, backend-deps, backend-runtime
```

## Auth Flow (Cookie-Based)

1. User POSTs credentials to `/api/auth/login/`
2. Django validates, returns user object, **sets HTTP-only cookies**: `ncc_access` (JWT) + `ncc_refresh` + `ncc_has_session` (JS-readable presence flag)
3. `/proxy.ts` middleware checks `ncc_has_session` cookie → redirects unauthenticated users from protected routes (`/admin`, `/company`, `/candidate`, `/agency`)
4. `/lib/api/client.ts` uses `credentials: 'include'` — browser sends cookies automatically on all API calls
5. On 401 → auto-refresh via `/api/auth/token/refresh/` (sends `ncc_refresh` cookie) → on failure → clear `ncc_has_session`, emit session expired event → redirect to login
6. Authenticated users on auth pages (`/login`, `/signup`) are redirected to `/` unless `session_expired` param is set

## Code Conventions

- **Imports**: Use `@/` aliases — `@/components`, `@/lib/utils`, `@/hooks`
- **Styling**: `cn()` for conditional Tailwind classes. Glassmorphism: `bg-white/80 backdrop-blur-xl`. Brand colors: Crimson Carrot #FF4500 (primary), Jet Black #1F2833, Fresh Sky #00A2DF, White Smoke #F2F2F2, Hot Fuchsia #FF0056. Rounded: `rounded-xl`/`rounded-2xl`.
- **Components**: UI primitives in `/components/ui`. Feature components in `/components`. Use existing shadcn/ui before creating new ones.
- **Public pages**: Use `PublicPageShell` wrapper (provides shared Header + Footer). For async server components (job detail, news article), import Header + Footer directly.
- **Layouts**: Admin = collapsible sidebar. Company/Candidate/Agency = floating glassmorphism header. Auth = split screen.
- **Animation**: Framer Motion staggered reveals. `initial` → `animate` → `transition` with `staggerChildren`.
- **Z-index**: Header z-50, sub-bars z-40, page content z-30.

## Behavioral Rules for Claude

1. **Just do the task.** Read the relevant files, make the edits, run `npm run build` to verify. Don't ask unnecessary clarifying questions when the intent is clear.
2. **The backend exists and is running.** Django + DRF on Docker, Traefik on port 443. Never say "backend is planned" or "will be implemented."
3. **Read before editing.** Always read a file before modifying it. Understand existing patterns.
4. **Match existing code exactly.** Look at neighboring code for style, imports, patterns. Don't introduce new conventions.
5. **Keep changes surgical.** Only modify what's needed. No drive-by refactors, no unsolicited improvements.
6. **Verify with `npm run build`.** After frontend changes, always run build to catch errors.
7. **Use the docs.** `/docs` has 1,900+ lines of product specs. Read them when you need requirements context.
8. **API client exists.** All API calls go through `/lib/api/client.ts` with `credentials: 'include'`. Don't create new fetch wrappers. Add endpoint functions to the appropriate `/lib/api/*.ts` module.
9. **Types exist.** Check `/lib/auth/types.ts`, `/lib/company/types.ts`, `/lib/agency/types.ts`, `/lib/candidate/types.ts`, `/lib/admin/types.ts` before defining new types.
10. **Radix + Portal gotcha.** Portaled dropdowns (Combobox, etc.) break inside Radix Dialog modals. Fix: pass a `container` ref that lives inside the Dialog.
11. **Django admin is at `/django-admin/`**, not `/admin/` — Next.js owns the `/admin` route for the platform admin UI.
12. **Auth is cookie-based.** Never use localStorage for tokens. The backend sets HTTP-only cookies; the frontend uses `credentials: 'include'`.

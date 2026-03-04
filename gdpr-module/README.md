# GDPR Compliance Module

A Next.js + Django + PostgreSQL GDPR compliance module built to enterprise-grade security and compliance standards. Implements GDPR Articles 6, 7, 12-22, 25, 30, 32-35, ePrivacy Directive, CNIL guidelines, and EDPB guidance.

## Features

### Consent Management
- **Cookie Consent Banner** - Configurable popup (full-width, small, overlay) with agree/decline/preferences
- **Privacy Settings Modal** - Per-service and per-category consent toggles grouped by category
- **Consent Versioning** - Server-side version tracking; automatically prompts re-consent when services change (EDPB guidance)
- **Consent Expiry** - Configurable expiry period (default: 395 days / CNIL 13-month rule)
- **Immutable Consent Audit Trail** - Append-only `ConsentHistory` records for Art. 7(1) proof of consent
- **Google Consent Mode v2** - Automatic gtag consent updates for analytics/advertising storage
- **Cookie Cleanup on Revocation** - Immediately deletes cookies when consent is withdrawn
- **ePrivacy Enforcement** - Model-level validation prevents `default_enabled` on non-essential services
- **Legal Basis Tracking** - Per-service legal basis (consent, legitimate_interest, contract, legal_obligation, vital_interest, public_task) per Art. 6(1)

### Data Subject Rights (DSAR)
- **Right to Erasure (Art. 17)** - Account anonymization and data cleanup
- **Right of Access (Art. 15)** - JSON export of user data including consent history, emailable as attachment
- **Right to Rectification (Art. 16)** - Data correction requests
- **Right to Contact DPO** - Direct messaging to Data Protection Officer
- **DSAR Deadline Tracking (Art. 12(3))** - Auto-calculated 30-day deadlines with extension support (max +60 days with mandatory reason)
- **Email Confirmation** - Double opt-in for data requests
- **DSAR Overdue Alerts** - Celery periodic task warns about approaching/overdue deadlines

### Security & Privacy
- **XSS Protection** - HTML sanitization of admin-configured banner text using DOMPurify (frontend) and nh3 (backend)
- **Rate Limiting** - DRF `AnonRateThrottle` on all public API endpoints (configurable per-env)
- **CSRF Protection** - `CSRF_TRUSTED_ORIGINS` configured for cross-origin session auth
- **IP Masking** - IP addresses masked before storage (last octet replaced)
- **Server-Side GeoIP** - EU/EEA detection via CDN headers (CF-IPCountry, X-Country-Code) or optional MaxMind GeoLite2 — no third-party JS calls
- **Email Error Handling** - `fail_silently=False` with proper logging and Celery retry (3 attempts, 5-min backoff)

### Breach & Compliance
- **Data Breach 72-Hour Tracking (Art. 33)** - `DataBreach` model with auto-calculated DPA notification deadline, overdue tracking
- **Data Breach Notifications (Art. 34)** - Mass email to affected users with Celery retry
- **Records of Processing Activities (Art. 30)** - `ProcessingActivity` model for RoPA documentation
- **Admin Audit Logging** - Immutable `AdminAuditLog` for all admin mutations (ISO 27701, NIST)
- **Policy Update Notifications** - Mass email for privacy policy changes with Celery retry
- **Data Retention** - Automated enforcement via Celery periodic tasks

### Admin & Integration
- **Admin Dashboard** - Manage requests, view consent/audit logs, send notifications, track breaches
- **Django Admin** - Full CRUD for services, categories, settings with compliance warnings
- **Privacy Policy Link** - Configurable URL displayed in cookie banner
- **Custom CSS** - Admin-configurable styling for cookie banner and modal

## Quick Start

### With Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/gdpr/
- Django Admin: http://localhost:8000/admin/

Create a superuser:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Without Docker

**Backend:**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set DB_HOST=localhost in .env
python manage.py migrate
python manage.py gdpr_seed
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Public (rate-limited)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gdpr/settings/` | Public settings + services + categories |
| POST | `/api/gdpr/consent/check/` | Check consent state for all services |
| POST | `/api/gdpr/consent/update/` | Toggle single service consent |
| POST | `/api/gdpr/consent/bulk/` | Allow all / decline all |
| POST | `/api/gdpr/policy/accept/` | Accept privacy policy or terms |
| POST | `/api/gdpr/requests/` | Submit a GDPR data request |
| GET | `/api/gdpr/requests/confirm/` | Confirm request via email link |
| GET | `/api/gdpr/geo-ip/` | Check EU/EEA visitor status (server-side) |

### Admin (requires `IsAdminUser`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/gdpr/admin/settings/` | View/update GDPR settings |
| GET/POST | `/api/gdpr/admin/categories/` | List/create service categories |
| GET/PUT/DEL | `/api/gdpr/admin/categories/<id>/` | Category detail |
| GET/POST | `/api/gdpr/admin/services/` | List/create services |
| GET/PUT/DEL | `/api/gdpr/admin/services/<id>/` | Service detail |
| GET | `/api/gdpr/admin/consent-logs/` | List anonymous consent logs |
| GET | `/api/gdpr/admin/user-consents/` | List user consent records |
| GET | `/api/gdpr/admin/consent-history/` | List immutable consent audit trail |
| GET | `/api/gdpr/admin/audit-logs/` | List admin audit logs |
| GET | `/api/gdpr/admin/requests/` | List data requests |
| GET/PUT | `/api/gdpr/admin/requests/<id>/` | View/update data request |
| POST | `/api/gdpr/admin/requests/<id>/action/` | Process request (export/delete/send/done) |
| POST | `/api/gdpr/admin/requests/<id>/extend-deadline/` | Extend DSAR deadline (Art. 12(3)) |
| GET/POST | `/api/gdpr/admin/data-breaches/` | List/create data breach records |
| GET/PUT | `/api/gdpr/admin/data-breaches/<id>/` | View/update data breach |
| POST | `/api/gdpr/admin/data-breaches/notify/` | Send breach notification |
| POST | `/api/gdpr/admin/policy-update/notify/` | Send policy update notification |
| GET/POST | `/api/gdpr/admin/processing-activities/` | List/create processing activities (RoPA) |
| GET/PUT/DEL | `/api/gdpr/admin/processing-activities/<id>/` | Processing activity detail |

## Integration

### Adding to an existing Next.js project

1. Copy `frontend/src/components/gdpr/`, `frontend/src/hooks/`, `frontend/src/lib/gdpr-api.ts`, and `frontend/src/types/gdpr.ts` into your project.

2. Install the DOMPurify dependency:

```bash
npm install dompurify
npm install -D @types/dompurify
```

3. Wrap your app with the GDPR provider in your root layout:

```tsx
import { GDPRProvider, CookieBanner, PrivacySettingsModal, PrivacySettingsTrigger } from "@/components/gdpr";

export default function Layout({ children }) {
  return (
    <GDPRProvider>
      {children}
      <CookieBanner />
      <PrivacySettingsModal />
      <PrivacySettingsTrigger />
    </GDPRProvider>
  );
}
```

4. Use the `useGDPR` hook anywhere:

```tsx
import { useGDPR } from "@/hooks/useGDPR";

function MyComponent() {
  const { consents, settings, openPreferences, updateCategoryConsent } = useGDPR();
  // Check if analytics is allowed
  const analyticsAllowed = Object.values(consents).some(
    (s) => s.allowed && s.category === "analytics"
  );
}
```

### Adding to an existing Django project

1. Copy the `backend/gdpr/` app into your Django project.
2. Add `"gdpr"` to `INSTALLED_APPS`.
3. Add `"gdpr.middleware.GDPRLastLoginMiddleware"` to `MIDDLEWARE`.
4. Add `path("api/gdpr/", include("gdpr.urls"))` to your URL conf.
5. Add GDPR settings to your `settings.py` (see `config/settings.py` for reference).
6. Run `python manage.py migrate && python manage.py gdpr_seed`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GDPR_ANON_THROTTLE_RATE` | `60/minute` | Rate limit for anonymous users |
| `GDPR_USER_THROTTLE_RATE` | `120/minute` | Rate limit for authenticated users |
| `GDPR_COOKIE_DOMAIN` | `""` | Cookie domain for consent cookies |
| `GDPR_COOKIE_LIFETIME_DAYS` | `365` | Cookie lifetime in days |
| `GDPR_DPO_EMAIL` | `dpo@example.com` | Data Protection Officer email |
| `GDPR_DATA_RETENTION_DAYS` | `730` | Days before inactive accounts are cleaned |
| `GDPR_BACKEND_URL` | `http://localhost:8000` | Backend URL for email confirmation links |
| `GDPR_GEO_IP_ENABLED` | `False` | Enable MaxMind GeoLite2 (requires GEOIP_PATH) |
| `GEOIP_PATH` | `""` | Path to MaxMind GeoLite2-Country.mmdb database |
| `GDPR_RECAPTCHA_SITE_KEY` | `""` | reCAPTCHA site key (optional) |
| `GDPR_RECAPTCHA_SECRET_KEY` | `""` | reCAPTCHA secret key (optional) |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:3000` | Comma-separated CSRF trusted origins |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `GDPR_LOG_LEVEL` | `INFO` | Logging level for GDPR namespace |

### Celery Periodic Tasks

Configure these in Celery Beat for automated compliance:

| Task | Recommended Schedule | Description |
|------|---------------------|-------------|
| `gdpr.tasks.enforce_data_retention` | Daily | Enforce data retention policy on inactive accounts |
| `gdpr.tasks.check_dsar_deadlines` | Daily | Alert on approaching/overdue DSAR deadlines |
| `gdpr.tasks.send_data_breach_notification` | On-demand (via admin) | Send breach notifications with retry |
| `gdpr.tasks.send_policy_update_notification` | On-demand (via admin) | Send policy update notifications with retry |

## Data Models

### Core Models
- **ServiceCategory** - Groups services (e.g., Essential, Analytics, Marketing)
- **Service** - Individual service/cookie (with legal basis, cookies list, scripts)
- **GDPRSettings** - Singleton configuration (consent version, popup style, feature flags)

### Consent Models
- **ConsentLog** - Anonymous visitor consent records (IP-based, masked)
- **UserConsent** - Authenticated user consent records
- **ConsentHistory** - Immutable append-only audit trail (Art. 7(1) proof)

### Data Subject Rights
- **DataRequest** - DSAR requests with deadline tracking and status workflow

### Compliance Models
- **DataBreach** - Breach records with 72-hour DPA deadline tracking (Art. 33)
- **ProcessingActivity** - Records of Processing Activities for RoPA (Art. 30)
- **AdminAuditLog** - Immutable log of all admin mutations

## Architecture

```
Frontend (Next.js)          Backend (Django + DRF)          Database (PostgreSQL)
─────────────────           ──────────────────────          ─────────────────────
GDPRProvider ──────────────> /api/gdpr/consent/check/  ───> ConsentLog (anonymous)
CookieBanner (sanitized)     /api/gdpr/consent/bulk/        UserConsent (authenticated)
PrivacySettingsModal ──────> /api/gdpr/consent/update/ ───> ConsentHistory (audit trail)
  (category toggles)         /api/gdpr/geo-ip/              Service (with legal_basis)
GDPRForms ─────────────────> /api/gdpr/requests/       ───> DataRequest (with deadline)
PrivacyCenter               /api/gdpr/settings/        ───> GDPRSettings (singleton)
Admin Dashboard ───────────> /api/gdpr/admin/*         ───> DataBreach (72h tracking)
                             ConsentService                 ProcessingActivity (RoPA)
                             DataExportService              AdminAuditLog (immutable)
                             DataDeleteService              ServiceCategory
                             DataBreachService
                             DataRetentionService
                             AuditService
                             GeoIPService

Celery Workers ──────────── enforce_data_retention (daily)
                             check_dsar_deadlines (daily)
                             send_data_breach_notification (on-demand, 3 retries)
                             send_policy_update_notification (on-demand, 3 retries)
```

## Compliance Standards

This module implements requirements from:

- **GDPR** - Art. 6 (legal basis), Art. 7 (consent proof), Art. 12-22 (data subject rights), Art. 25 (privacy by design), Art. 30 (RoPA), Art. 32-35 (security), Art. 33-34 (breach notification)
- **ePrivacy Directive** - Prior consent for non-essential cookies
- **CNIL Guidelines** - 13-month consent expiry
- **EDPB Guidance** - Consent versioning, granular per-service/category consent
- **OWASP API Security** - Rate limiting, input sanitization, CSRF protection
- **ISO 27701** - Admin audit logging
- **NIST Privacy Framework** - Administrative audit trail

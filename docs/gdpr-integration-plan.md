Context
Orion needs enterprise-grade GDPR compliance: cookie consent management, consent audit trails, data breach tracking, processing activities (RoPA), and a public Privacy Center. A standalone GDPR module exists at /gdpr-module/ with 10 Django models, 27 API endpoints, 4 Celery tasks, 7 service classes, and 13 frontend components. This plan integrates it cleanly into Orion's backend (Django app) and frontend (Next.js admin + public pages).
Key decisions made:

GDPR admin UI becomes new tabs on the existing /admin/compliance page
Cookie banner/privacy modal keep their CSS modules (they're overlay components with admin-configurable colors)
GDPR data requests (user-initiated via Privacy Center) coexist alongside existing compliance requests (admin-initiated)


Phase 1: Backend — Django App Integration
1.1 Copy GDPR app into Orion backend
Move: gdpr-module/backend/gdpr/ → backend/apps/gdpr/
Files to copy:

models.py, views.py, serializers.py, urls.py
tasks.py, middleware.py, admin.py, apps.py
services/ (all 7 service files)
management/commands/gdpr_seed.py
migrations/ → create fresh with __init__.py only

1.2 Adapt apps.py
pythonclass GdprConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.gdpr"  # Changed from "gdpr"
    verbose_name = "GDPR Compliance"
1.3 Fix all internal imports
All from gdpr. → from apps.gdpr. or relative imports (preferred).

services/ files: from ..models import ...
views.py: from .services.consent import ...
management/commands/gdpr_seed.py: from apps.gdpr.models import ...

1.4 Register in settings — backend/config/settings/base.py
pythonINSTALLED_APPS = [
    ...existing apps...
    'apps.gdpr',
]
Add GDPR middleware (after AuthenticationMiddleware):
pythonMIDDLEWARE = [
    ...
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.gdpr.middleware.GDPRLastLoginMiddleware',  # NEW
    ...
]
Add GDPR-specific settings:
python# GDPR Module Settings
GDPR_BACKEND_URL = os.environ.get('GDPR_BACKEND_URL', 'http://localhost')
GDPR_DPO_EMAIL = os.environ.get('GDPR_DPO_EMAIL', 'dpo@orion.jobs')
GDPR_EXPORTS_DIR = BASE_DIR / 'gdpr_exports'
GDPR_COOKIE_DOMAIN = os.environ.get('GDPR_COOKIE_DOMAIN', '')
GDPR_DATA_RETENTION_DAYS = int(os.environ.get('GDPR_DATA_RETENTION_DAYS', '730'))
Add Celery beat tasks:
pythonCELERY_BEAT_SCHEDULE = {
    ...existing tasks...
    'gdpr-enforce-data-retention': {
        'task': 'apps.gdpr.tasks.enforce_data_retention',
        'schedule': 60 * 60 * 24,  # Daily
    },
    'gdpr-check-dsar-deadlines': {
        'task': 'apps.gdpr.tasks.check_dsar_deadlines',
        'schedule': 60 * 60 * 24,  # Daily
    },
}
1.5 Add URL routing — backend/config/urls.py
pythonpath('api/gdpr/', include('apps.gdpr.urls')),
1.6 Adapt UserConsent serializer
Orion's User model is email-based (no username field). Fix UserConsentSerializer:
pythonclass UserConsentSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
Also fix AdminUserConsentListView search fields:
pythonsearch_fields = ["user__email", "user__first_name", "user__last_name"]
```

### 1.7 Add `nh3` dependency

Add to `backend/requirements.txt`:
```
nh3>=0.2.14
(nh3 is listed in the module's requirements for HTML sanitization. Check if it's actually imported in the backend — it may only be used in the README as a recommendation. If not imported, skip this.)
1.8 Add django-ipware dependency
Check if django-ipware is already in Orion's requirements. The module uses python-ipware for IP extraction in the consent service, but the current code uses request.META directly. Skip if not actually imported.
1.9 Generate and run migrations
bashcd backend && docker-compose exec web python manage.py makemigrations gdpr
cd backend && docker-compose exec web python manage.py migrate
1.10 Seed default data
bashcd backend && docker-compose exec web python manage.py gdpr_seed

Phase 2: Frontend — Types & API Client
2.1 Create GDPR types — lib/gdpr/types.ts
Copy types from gdpr-module/frontend/src/types/gdpr.ts. Add admin types for:

GDPRAdminSettings (full settings, not just public)
ConsentLogEntry, UserConsentEntry, ConsentHistoryEntry
AdminAuditLogEntry
DataBreachEntry, ProcessingActivityEntry
GDPRComplianceStats (for dashboard summary cards)

2.2 Create public GDPR API module — lib/api/gdpr.ts
Rewrite gdpr-module/frontend/src/lib/gdpr-api.ts to use Orion's apiClient from lib/api/client.ts:
typescriptimport { apiClient } from "./client"

export async function fetchGDPRPublicSettings() {
  return apiClient<GDPRPublicSettingsResponse>("/api/gdpr/settings/", { auth: false })
}

export async function checkConsent() {
  return apiClient<ConsentCheckResponse>("/api/gdpr/consent/check/", { method: "POST", auth: false })
}
// ... etc
Keep deleteCookies() and isBot() utilities in this file (they're client-side only, no API calls).
2.3 Create admin GDPR API module — lib/api/admin-gdpr.ts
Admin-only endpoints using Orion's apiClient:
typescriptexport async function getGDPRSettings() { ... }
export async function updateGDPRSettings(data: Partial<GDPRAdminSettings>) { ... }
export async function getServiceCategories() { ... }
export async function createServiceCategory(data) { ... }
// ... all 20+ admin endpoints

Phase 3: Frontend — GDPR Components
3.1 Copy GDPR components — components/gdpr/
Copy from gdpr-module/frontend/src/components/gdpr/:

GDPRProvider.tsx — adapt imports to @/lib/api/gdpr and @/lib/gdpr/types
CookieBanner.tsx — adapt imports
PrivacySettingsModal.tsx — adapt imports
PrivacySettingsTrigger.tsx — adapt imports
ConsentToggle.tsx — adapt imports
PrivacyCenter.tsx — adapt imports
GDPRForms.tsx — adapt imports
index.ts — barrel exports
gdpr.module.css — copy as-is

3.2 Create GDPR hook — hooks/use-gdpr.ts
Adapt from gdpr-module/frontend/src/hooks/useGDPR.ts:
typescriptimport { useContext } from "react"
import { GDPRContext } from "@/components/gdpr/GDPRProvider"
import type { GDPRContextValue } from "@/lib/gdpr/types"

export function useGDPR(): GDPRContextValue {
  const ctx = useContext(GDPRContext)
  if (!ctx) throw new Error("useGDPR must be used within <GDPRProvider>")
  return ctx
}
3.3 Install DOMPurify
bashnpm install dompurify
npm install -D @types/dompurify
3.4 Wire GDPRProvider into root layout — app/layout.tsx
Wrap {children} with <GDPRProvider>:
tsx<AuthProvider>
  <GDPRProvider>
    {children}
  </GDPRProvider>
</AuthProvider>
Add banner and trigger components:
tsx<GDPRProvider>
  {children}
  <CookieBanner />
  <PrivacySettingsModal />
  <PrivacySettingsTrigger />
</GDPRProvider>

Phase 4: Frontend — Privacy Center (Public Pages)
4.1 Create privacy center pages

app/privacy-center/page.tsx — Hub page with cards linking to sub-pages
app/privacy-center/layout.tsx — Simple public layout
app/privacy-center/request-data/page.tsx — Data access request form
app/privacy-center/forget-me/page.tsx — Erasure request form
app/privacy-center/contact-dpo/page.tsx — DPO contact form
app/privacy-center/data-rectification/page.tsx — Rectification form

Each page wraps the corresponding GDPRForm component from components/gdpr/GDPRForms.tsx, styled with Orion's layout conventions (centered content, proper spacing).

Phase 5: Frontend — Admin Dashboard (Compliance Page Extension)
5.1 Extend /admin/compliance with GDPR tabs
File: app/admin/compliance/page.tsx
Add new tabs to the existing Tabs component:

Cookie Services — CRUD for service categories and services (toggles, scripts, legal basis)
Consent Dashboard — Consent logs, user consents, consent history with search/filter
Data Breaches — Breach CRUD, severity, 72h DPA deadline tracking, notify button
Processing Activities — RoPA CRUD (Art. 30)
GDPR Audit — Immutable admin audit log viewer
GDPR Settings — Full settings form (popup config, colors, consent expiry, feature flags, email templates)

Each tab follows the existing compliance page patterns:

Card components for layout
Table for data display with Badge for statuses
Dialog for create/edit forms
toast for success/error feedback
motion for staggered reveal animations

5.2 Add GDPR stats to compliance summary
Add GDPR-specific stats cards at the top of the compliance page:

Pending DSARs (from GDPR module)
Active data breaches
Consent adoption rate
Overdue requests

5.3 Admin sidebar — no changes needed
The existing /admin/compliance route is already in the sidebar under "Support". No navigation changes required.

Phase 6: Wire Additional Integration Points
6.1 Admin context — hooks/use-admin.ts / lib/admin/context.tsx
Add GDPR stats to the admin dashboard quick counts:
typescript// In AdminProvider, add to fetchQuickCounts:
const gdprStats = await getGDPRComplianceStats()
// Merge into quickCounts for badge display
6.2 Admin types — lib/admin/types.ts
Add GDPR-related type exports for the compliance page extensions.

Files to Create (New)
FilePurposebackend/apps/gdpr/ (entire directory)Django GDPR applib/gdpr/types.tsGDPR TypeScript typeslib/api/gdpr.tsPublic GDPR API clientlib/api/admin-gdpr.tsAdmin GDPR API clientcomponents/gdpr/*.tsx7 GDPR components + CSS modulehooks/use-gdpr.tsGDPR context hookapp/privacy-center/ (5 pages)Public privacy center
Files to Modify (Existing)
FileChangebackend/config/settings/base.pyAdd INSTALLED_APPS, MIDDLEWARE, CELERY_BEAT_SCHEDULE, GDPR settingsbackend/config/urls.pyAdd api/gdpr/ URL includebackend/requirements.txtAdd nh3 (if needed)app/layout.tsxWrap with GDPRProvider + banner/modal/triggerapp/admin/compliance/page.tsxAdd GDPR tabs (Cookie Services, Consent, Breaches, RoPA, Audit, Settings)lib/admin/types.tsAdd GDPR admin types

Verification

Backend health check:

bash   cd backend && docker-compose exec web python manage.py check
   cd backend && docker-compose exec web python manage.py migrate --check

Seed data:

bash   cd backend && docker-compose exec web python manage.py gdpr_seed

API smoke test:

GET /api/gdpr/settings/ — returns public settings + services + categories
POST /api/gdpr/consent/check/ — returns consent states
GET /api/gdpr/admin/settings/ (authenticated admin) — returns full settings


Frontend build:

bash   npm run build

Manual verification:

Visit localhost:3000 — cookie banner should appear
Click "Accept All" / "Decline All" — banner dismisses, consent stored
Click privacy settings trigger (floating button) — modal opens
Visit /privacy-center — hub page with cards
Visit /admin/compliance — new GDPR tabs visible
Test GDPR settings tab — update settings, verify save




Implementation Order

Backend: Copy app, fix imports, register, migrate, seed
Frontend: Types + API clients
Frontend: Components + hook + DOMPurify install
Frontend: Root layout wiring (GDPRProvider + banner + modal + trigger)
Frontend: Privacy center pages
Frontend: Admin compliance page extensions (GDPR tabs)
Build verification: npm run build
End-to-end smoke test
---
name: fullstack-feature
description: Build end-to-end features spanning Django backend and Next.js frontend. Use when a task requires both API endpoints AND UI pages/components wired together.
user-invocable: true
---

# Fullstack Feature Development

Build features that span both the Django backend and Next.js frontend. This skill coordinates the django-api and frontend-page skills into a single workflow.

## Architecture Reminder

```
Next.js (localhost:3000) → Traefik (localhost:80) → Django (port 8000 internal)
                                                  → PostgreSQL, Redis, MinIO, Celery
```

## Workflow — Always Follow This Order

### Phase 1: Backend (Django)

1. **Model** — Create/update in `backend/apps/<app>/models.py`
2. **Serializer** — Create list/detail/create/update in `backend/apps/<app>/serializers.py`
3. **View** — Create ViewSet with permissions in `backend/apps/<app>/views.py`
4. **URLs** — Register with DefaultRouter in `backend/apps/<app>/urls.py`
5. **Root URLs** — Add to `backend/config/urls.py` if new app
6. **Migrate** — Run makemigrations + migrate via docker-compose exec
7. **Verify** — `curl http://localhost/api/<endpoint>/` to confirm it works

```bash
# Migration commands
cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py makemigrations
cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py migrate

# Quick API test
curl -s http://localhost/api/<endpoint>/ | python3 -m json.tool
curl -s -H "Authorization: Bearer <token>" http://localhost/api/<endpoint>/ | python3 -m json.tool
```

### Phase 2: Frontend Types

8. **Types** — Add TypeScript interfaces to the correct type file:
   - Auth/User types → `lib/auth/types.ts`
   - Company/Job/Billing types → `lib/company/types.ts`
   - Candidate types → `lib/candidate/types.ts`
   - Agency types → `lib/agency/types.ts`
   - Admin types → `lib/admin/types.ts`

### Phase 3: Frontend API Layer

9. **API module** — Add endpoint functions to the correct module in `lib/api/`:
   - Jobs → `lib/api/jobs.ts`
   - Companies → `lib/api/companies.ts`
   - Billing → `lib/api/billing.ts`
   - Admin → `lib/api/admin-<domain>.ts`
   - New domain → create `lib/api/<domain>.ts`

### Phase 4: Frontend UI

10. **Page** — Create page in `app/<role>/<feature>/page.tsx`
11. **Components** — Build in `components/` (or `components/ui/` for primitives)
12. **Hook** — Create custom hook in `hooks/` if state logic is complex

### Phase 5: Verify

13. **Build** — `npm run build` must pass
14. **Test** — Open in browser, verify the data flows end-to-end

## Key Files to Read First

Before building any fullstack feature, read these to understand existing patterns:

**Backend patterns** (pick the closest domain):
- Jobs: `backend/apps/jobs/views.py`, `serializers.py`, `urls.py`
- Users: `backend/apps/users/views.py`, `serializers.py`, `urls.py`
- Billing: `backend/apps/billing/views.py`, `serializers.py`, `urls.py`

**Frontend patterns** (pick the closest page):
- Company dashboard: `app/company/page.tsx`
- Admin pages: `app/admin/jobs/page.tsx`
- Job listing: `app/jobs/page.tsx`

**Shared**:
- API client: `lib/api/client.ts`
- Types: `lib/company/types.ts` (largest, has all main types)

## Common Fullstack Patterns

### CRUD Feature
```
Backend: Model → ListSerializer + DetailSerializer + CreateSerializer → ModelViewSet → URLs → migrate
Frontend: Types → API module → List page with table → Detail page/dialog → Create/Edit form
```

### Action Feature (publish, approve, suspend, etc.)
```
Backend: @action on existing ViewSet → returns serializer.data
Frontend: API function → Button handler on existing page → optimistic UI update
```

### Dashboard Stats
```
Backend: @action(detail=False) returning aggregated counts → Response(data)
Frontend: API function → useEffect fetch → Stat cards grid
```

## Permissions Mapping

| User Role | Backend Permission | Frontend Route | API Prefix |
|-----------|-------------------|----------------|------------|
| Admin | IsAdmin | /admin/* | /api/admin/ |
| Employer | IsEmployer | /company/* | /api/companies/, /api/jobs/company/ |
| Agency | IsAgency | /agency/* | /api/jobs/agency/ |
| Candidate | IsAuthenticated | /candidate/* | /api/applications/, /api/candidates/ |
| Public | AllowAny | /jobs/*, /companies/* | /api/jobs/, /api/search/ |

## Checklist

- [ ] Backend: Model + Serializer + View + URLs + Migration
- [ ] Backend: API returns correct data (test with curl)
- [ ] Frontend: Types added (no duplicates)
- [ ] Frontend: API module updated
- [ ] Frontend: Page created with proper layout pattern
- [ ] Frontend: `npm run build` passes
- [ ] End-to-end: Data flows from Django → API → Next.js UI

# Enterprise Production Readiness Checklist

Comprehensive checklist for reviewing Orion code before production deployment. Use as reference when the main SKILL.md criteria need deeper evaluation.

---

## Security

### Authentication & Authorization

- [ ] JWT tokens stored in localStorage + `orion_access_token` cookie flag
- [ ] All API calls use `apiClient` from `@/lib/api/client.ts` (auto-injects Bearer token)
- [ ] Token refresh handled by client.ts on 401 — no manual refresh logic
- [ ] Protected routes check auth in `proxy.ts` middleware — no client-only guards
- [ ] Role-based access: admin, employer, agency, candidate — checked server-side
- [ ] No token exposure in URLs, logs, or error messages

### Input Validation

- [ ] All form inputs validated with Zod schemas before submission
- [ ] URL parameters and query strings validated before use
- [ ] File uploads validated for type, size, and content (MinIO)
- [ ] Rich text (TipTap) sanitized before rendering
- [ ] No `dangerouslySetInnerHTML` without DOMPurify or equivalent

### OWASP Top 10

- [ ] **Injection**: No string interpolation in API paths — use template literals with encoded params
- [ ] **Broken Auth**: Account lockout after 5 failed attempts (backend enforced)
- [ ] **Sensitive Data**: No secrets in client bundle — only `NEXT_PUBLIC_*` env vars
- [ ] **XXE**: Not applicable (JSON APIs, no XML parsing)
- [ ] **Broken Access Control**: API returns only authorized data — frontend doesn't rely on hiding UI
- [ ] **Misconfig**: Security headers set by Traefik (XSS filter, frame deny, HSTS)
- [ ] **XSS**: React's default escaping + no raw HTML injection
- [ ] **Deserialization**: JSON.parse wrapped in try/catch where used
- [ ] **Vulnerable Components**: Dependencies audited (`npm audit`)
- [ ] **Logging**: No sensitive data (passwords, tokens, PII) in console.log or error reports

### Secrets Management

- [ ] API keys only in environment variables, never in source code
- [ ] `NEXT_PUBLIC_*` prefix only for truly public values (API URL, Stripe publishable key)
- [ ] `.env` files in `.gitignore` — never committed
- [ ] No hardcoded credentials, tokens, or API keys in any file

---

## Performance

### Bundle Size

- [ ] Tree-shakeable imports: `import { Button } from '@/components/ui/button'` not `import * as UI`
- [ ] Icon imports: `import { SearchIcon } from 'lucide-react'` not `import * as Icons`
- [ ] Dynamic imports for heavy components: `dynamic(() => import('./HeavyChart'))`
- [ ] No unused dependencies in `package.json`
- [ ] Images optimized and served via `next/image`

### Rendering

- [ ] Lists use stable `key` props (IDs, not array indices for dynamic lists)
- [ ] Expensive computations wrapped in `useMemo` with correct deps
- [ ] Callbacks passed to children wrapped in `useCallback` when needed
- [ ] No inline object/array creation in JSX props that triggers re-renders
- [ ] Large lists use virtualization if > 100 items

### Data Fetching

- [ ] No waterfall requests — parallel fetches where possible
- [ ] Pagination for large datasets — never fetch all records
- [ ] Loading states shown during async operations
- [ ] Stale data handled (refresh on focus, polling for real-time data)
- [ ] No duplicate API calls on mount (React 18 strict mode awareness)

### Caching

- [ ] Static data (industries, categories) loaded once, not on every render
- [ ] API responses cached where appropriate (company profile, user data)
- [ ] Form state preserved on navigation where expected (job wizard)

---

## Observability

### Error Handling

- [ ] All API calls wrapped in try/catch with user-facing error messages
- [ ] Error messages are actionable: "Failed to save job — check your connection" not "Error"
- [ ] Caught errors logged with context: `console.error('Failed to fetch jobs:', error)`
- [ ] Unhandled rejections caught at app level
- [ ] Error boundaries around independent UI sections

### Loading States

- [ ] Skeleton loaders for initial data fetch
- [ ] Spinner or disabled state for form submissions
- [ ] Progress indicators for multi-step operations
- [ ] Optimistic UI updates where appropriate (like/save actions)

### Debugging

- [ ] Meaningful component names (no anonymous default exports for pages)
- [ ] State changes traceable through React DevTools
- [ ] API request/response visible in Network tab (no opaque wrappers)

---

## Resilience

### Error Recovery

- [ ] Failed API calls show retry option where appropriate
- [ ] Form data preserved on submission failure — user doesn't re-enter
- [ ] Session expiry handled gracefully — redirect to login with return URL
- [ ] Network offline handled — show offline indicator, queue actions

### Graceful Degradation

- [ ] Page renders even if non-critical data fails to load
- [ ] Charts/analytics degrade to "No data" state, don't crash
- [ ] Social features (share, post) degrade if provider is unavailable
- [ ] Search works with partial results — show what's available

### Edge Cases

- [ ] Empty states for lists with no data (use `components/jobs/empty-state.tsx` pattern)
- [ ] Long text handled (truncation with tooltip, or word-break)
- [ ] Special characters in user input don't break rendering
- [ ] Concurrent edits handled (optimistic locking or last-write-wins with warning)

---

## Accessibility (WCAG 2.2 AA)

### Keyboard

- [ ] All interactive elements reachable via Tab
- [ ] Focus visible on all interactive elements
- [ ] Escape closes modals and dropdowns
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate within menus and lists

### Screen Readers

- [ ] Form inputs have `<label>` or `aria-label`
- [ ] Images have `alt` text (decorative images use `alt=""`)
- [ ] Icons-only buttons have `aria-label`
- [ ] Dynamic content changes announced (`aria-live` regions)
- [ ] Page landmarks: `<main>`, `<nav>`, `<header>`, `<footer>`

### Visual

- [ ] Color contrast ratio >= 4.5:1 for text
- [ ] Color is not the sole indicator of state (icons + text + color)
- [ ] Text resizable to 200% without loss of content
- [ ] No content triggered only by hover (must be keyboard-accessible too)
- [ ] Reduced motion respected: `prefers-reduced-motion` media query

---

## SEO (Orion-Specific)

### Google for Jobs

- [ ] Job listings include structured data (JSON-LD) per Google spec
- [ ] Required fields: title, description, datePosted, hiringOrganization, jobLocation
- [ ] Salary range included when available (improves ranking)
- [ ] `validThrough` set to job expiry date
- [ ] Job pages server-rendered or statically generated

### Meta Tags

- [ ] Every public page has unique `<title>` and `<meta name="description">`
- [ ] Open Graph tags for social sharing (og:title, og:description, og:image)
- [ ] Canonical URLs set to prevent duplicate content
- [ ] `robots.txt` and `sitemap.xml` present and accurate

### Core Web Vitals

- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] No layout shifts from lazy-loaded content

---

## Data Integrity

### Race Conditions

- [ ] Concurrent form submissions prevented (disable button on submit)
- [ ] Optimistic UI updates rolled back on failure
- [ ] State updates use functional form: `setState(prev => ...)` not `setState(value)`

### Idempotency

- [ ] Retry-safe operations (duplicate POST won't create duplicate records)
- [ ] Payment operations use idempotency keys (Stripe)
- [ ] Job publish/unpublish toggling is safe under rapid clicks

### Transactions

- [ ] Multi-step operations atomic where possible (job + entitlement deduction)
- [ ] Failed partial operations cleaned up (orphan records)
- [ ] Audit trail for state transitions (backend audit log)

---

## GDPR & Privacy

### Data Minimization

- [ ] Only collect data necessary for the feature
- [ ] No analytics or tracking without consent
- [ ] Temporary data cleaned up (completed wizard state, expired tokens)

### User Rights

- [ ] Data export endpoint exists and works (`/api/compliance/export/`)
- [ ] Account deletion endpoint exists (`/api/compliance/delete/`)
- [ ] 90-day retention for login attempts (auto-purge via Celery)
- [ ] Cookie consent for non-essential cookies

### Sensitive Data

- [ ] PII not logged (names, emails, phone numbers)
- [ ] Search queries not stored with user identity
- [ ] File uploads scanned and validated
- [ ] Passwords never exposed in API responses

# Security Patterns for Orion

Security review patterns specific to the Orion job board platform. Reference this when reviewing code for security vulnerabilities.

---

## JWT Handling

### Storage

Orion stores JWT tokens in localStorage with a cookie flag for middleware route protection.

```typescript
// CORRECT: Orion's auth pattern
localStorage.setItem('access_token', tokens.access)
localStorage.setItem('refresh_token', tokens.refresh)
document.cookie = `orion_access_token=true; path=/; SameSite=Lax`

// WRONG: Token in URL or query params
window.location.href = `/dashboard?token=${accessToken}`  // Leaks in referer, logs, history

// WRONG: Token in sessionStorage only (lost on tab close, breaks multi-tab)
sessionStorage.setItem('token', accessToken)
```

### Token Refresh

Token refresh is handled by `lib/api/client.ts` automatically on 401 responses. Never implement manual refresh logic.

```typescript
// WRONG: Manual refresh in a component
if (response.status === 401) {
  const newToken = await fetch('/api/auth/refresh/', { ... })
  // This races with client.ts auto-refresh
}

// CORRECT: Let client.ts handle it
const data = await apiClient.get<Job[]>('/api/jobs/')
// 401 → auto-refresh → retry → or session expired event
```

### Token Expiry

- Access token: 60 minutes
- Refresh token: 7 days with rotation
- On refresh failure: `session-expired` event fired → redirect to login

```typescript
// WRONG: Checking expiry manually
const payload = JSON.parse(atob(token.split('.')[1]))
if (payload.exp < Date.now() / 1000) { ... }

// CORRECT: Let the API client handle expiry via 401 response
```

---

## API Client Auth Injection

All API calls must use `apiClient` from `@/lib/api/client.ts`, which automatically injects the `Authorization: Bearer` header.

```typescript
// WRONG: Manual auth headers
const res = await fetch('/api/jobs/', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
})

// WRONG: Bypassing auth entirely
const res = await fetch('/api/admin/users/', {
  credentials: 'include'
})

// CORRECT: Typed API client
import { apiClient } from '@/lib/api/client'
const jobs = await apiClient.get<Job[]>('/api/jobs/')
const result = await apiClient.post<Job>('/api/jobs/', jobData)
```

---

## XSS Prevention

### React Default Escaping

React escapes JSX expressions by default. The main risk is `dangerouslySetInnerHTML`.

```tsx
// SAFE: React auto-escapes
<p>{userInput}</p>
<div title={userInput}></div>

// DANGEROUS: Raw HTML injection
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// SAFE: Sanitize if raw HTML is required (e.g., TipTap editor output)
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editorContent) }} />
```

### URL Injection

```typescript
// DANGEROUS: User-controlled URLs
<a href={userProvidedUrl}>Link</a>
<img src={userProvidedUrl} />

// SAFE: Validate URL scheme
const safeUrl = url.startsWith('https://') || url.startsWith('http://') ? url : '#'
<a href={safeUrl} rel="noopener noreferrer" target="_blank">Link</a>
```

### Event Handler Injection

```tsx
// DANGEROUS: Dynamic event handlers from user data
<button onClick={eval(userAction)}>Click</button>

// This should never exist in the codebase. All event handlers are static functions.
```

---

## CSRF Protection

Orion uses JWT Bearer tokens (not session cookies) for API auth, which is inherently CSRF-resistant. However:

```typescript
// IMPORTANT: Traefik adds security headers
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block

// The cookie flag (orion_access_token) is for route protection only,
// not for API auth. It contains no sensitive data (just "true").
```

---

## SQL Injection

Django ORM handles parameterization. Frontend risk is limited to API path construction.

```typescript
// WRONG: String interpolation in API paths
const data = await apiClient.get(`/api/jobs/?search=${userInput}`)
// If userInput contains special chars, it could break the URL

// CORRECT: Use URLSearchParams
const params = new URLSearchParams({ search: userInput })
const data = await apiClient.get<Job[]>(`/api/jobs/?${params}`)

// CORRECT: Pass params object if apiClient supports it
const data = await apiClient.get<Job[]>('/api/jobs/', { params: { search: userInput } })
```

---

## Secrets in Client Code

### Environment Variables

```typescript
// SAFE: NEXT_PUBLIC_ prefix — intended for client bundle
const apiUrl = process.env.NEXT_PUBLIC_API_URL
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// DANGEROUS: Server-only secrets in client code
const secretKey = process.env.STRIPE_SECRET_KEY      // Should be server-only
const dbUrl = process.env.DATABASE_URL                // Should never be in frontend
const apiKey = process.env.RESEND_API_KEY             // Should never be in frontend

// CHECK: No hardcoded secrets
const API_KEY = 'sk_live_abc123'                      // NEVER do this
const WEBHOOK_SECRET = 'whsec_...'                    // NEVER do this
```

### What to Look For

- Any string starting with `sk_`, `whsec_`, `key_`, `secret_` in source code
- Environment variables without `NEXT_PUBLIC_` prefix used in client components
- Base64-encoded strings that look like tokens
- API keys in comments ("use this key for testing")

---

## Rate Limiting

Rate limits are enforced by Django + Traefik. Frontend should handle rate limit responses gracefully.

```typescript
// Backend enforces:
// - 100 requests/hour for anonymous users
// - 1000 requests/hour for authenticated users
// - Traefik rate limiting middleware

// Frontend should handle 429 responses
try {
  const data = await apiClient.post('/api/jobs/', jobData)
} catch (error) {
  if (error.status === 429) {
    // Show user-friendly rate limit message
    toast.error('Too many requests. Please wait a moment and try again.')
  }
}
```

---

## Input Validation with Zod

All user inputs must be validated before API submission.

```typescript
// CORRECT: Zod schema validation
import { z } from 'zod'

const jobSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(50).max(10000),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  email: z.string().email(),
  url: z.string().url().optional(),
})

// Use with React Hook Form
const form = useForm<z.infer<typeof jobSchema>>({
  resolver: zodResolver(jobSchema),
})

// WRONG: No validation — trust client-side state
const handleSubmit = () => {
  apiClient.post('/api/jobs/', { title, description }) // No validation
}
```

---

## Stripe Webhook Verification

Stripe webhooks must be verified server-side (Django). Frontend never processes raw webhook data.

```typescript
// WRONG: Frontend handling webhooks
app.post('/api/webhooks/stripe', (req) => {
  const event = JSON.parse(req.body) // No signature verification!
})

// CORRECT: Backend handles webhook verification
// Django: stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
// Frontend only reads billing state from API after redirect
```

---

## File Upload Validation

File uploads go through MinIO (S3-compatible). Validate on both frontend and backend.

```typescript
// Frontend validation before upload
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'File size must be under 5MB'
  if (!ALLOWED_TYPES.includes(file.type)) return 'File type not allowed'
  return null
}

// Backend also validates (defense in depth):
// - File type verification (magic bytes, not just extension)
// - Size limits
// - Virus scanning (if configured)
// - Storage path sanitization
```

---

## Account Lockout

Backend enforces account lockout after 5 failed login attempts (15-minute lockout). Frontend should display appropriate messages.

```typescript
// Handle lockout response from backend
try {
  const result = await apiClient.post('/api/auth/login/', credentials)
} catch (error) {
  if (error.status === 403 && error.data?.code === 'account_locked') {
    // Show lockout message with remaining time
    toast.error('Account locked due to multiple failed attempts. Try again in 15 minutes.')
  } else if (error.status === 401) {
    // Show generic invalid credentials (don't reveal which field is wrong)
    toast.error('Invalid email or password.')
  }
}
```

---

## Security Review Checklist

When reviewing any code change, check:

1. **Auth**: Does it use `apiClient`? No manual token handling?
2. **Input**: Are user inputs validated with Zod?
3. **Output**: Any `dangerouslySetInnerHTML` without sanitization?
4. **Secrets**: Any hardcoded keys, tokens, or credentials?
5. **URLs**: Any user-controlled URLs without scheme validation?
6. **Errors**: Do error messages leak internal details (stack traces, DB schema)?
7. **Logging**: Is PII excluded from console.log and error reports?
8. **Env vars**: Only `NEXT_PUBLIC_*` in client components?
9. **Files**: Upload validation for type and size?
10. **Rate limits**: 429 responses handled gracefully?

# Simplification Patterns

Anti-patterns and their fixes. Each pattern includes a before/after example. Reference this when reviewing code for clarity, consistency, and maintainability.

---

## Anti-Pattern: Over-Abstraction

Creating abstractions for one-time operations or wrapping simple logic in unnecessary patterns.

### Strategy pattern for 3-line logic

```typescript
// BEFORE: Unnecessary abstraction
interface StatusHandler {
  handle(status: string): string
}
class ActiveHandler implements StatusHandler {
  handle() { return "bg-green-100 text-green-700" }
}
class PendingHandler implements StatusHandler {
  handle() { return "bg-amber-100 text-amber-700" }
}
const handlers: Record<string, StatusHandler> = {
  active: new ActiveHandler(),
  pending: new PendingHandler(),
}
const className = handlers[status]?.handle() ?? "bg-gray-100 text-gray-700"

// AFTER: Direct mapping
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
}
const className = statusColors[status] ?? "bg-gray-100 text-gray-700"
```

### Wrapper component that adds nothing

```tsx
// BEFORE: Wrapper with no added value
function AppButton({ children, ...props }: ButtonProps) {
  return <Button {...props}>{children}</Button>
}

// AFTER: Use the component directly
<Button variant="outline" onClick={handleClick}>Save</Button>
```

---

## Anti-Pattern: Speculative Features

Adding functionality nobody asked for — caching layers, notification systems, config options, feature flags for a single use case.

```typescript
// BEFORE: Speculative caching + retry + notification
async function fetchJobs(options?: {
  cache?: boolean
  retryCount?: number
  onNotify?: (msg: string) => void
}) {
  const cacheKey = 'jobs-list'
  if (options?.cache) {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached)
  }
  let attempts = options?.retryCount ?? 3
  while (attempts > 0) {
    try {
      const data = await apiClient.get<Job[]>('/api/jobs/')
      if (options?.cache) sessionStorage.setItem(cacheKey, JSON.stringify(data))
      options?.onNotify?.('Jobs loaded')
      return data
    } catch {
      attempts--
      if (attempts === 0) throw new Error('Failed after retries')
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

// AFTER: Just fetch the data
async function fetchJobs() {
  return apiClient.get<Job[]>('/api/jobs/')
}
```

---

## Anti-Pattern: Drive-By Refactoring

Changing unrelated code while fixing a bug or adding a feature. Creates noisy diffs and review burden.

```tsx
// Task: Fix the date format in the job card

// BEFORE: "While I'm here, let me also refactor the status badge,
// rename the component, add types, and reorganize imports"
// ... 200 lines changed, 5 lines were the actual fix

// AFTER: Only change the date format
// - app/components/jobs/job-card.tsx:42
<span>{format(job.createdAt, 'MMM d, yyyy')}</span>
// Changed from: <span>{job.createdAt}</span>
// Total diff: 1 line
```

---

## Anti-Pattern: Style Drift

Introducing new conventions that don't match the codebase.

```tsx
// BEFORE: New convention (semicolons, relative imports, inline styles)
import { Button } from "../../components/ui/button";
import styles from "./styles.module.css";

export default function Page() {
  return (
    <div style={{ padding: '24px' }}>
      <Button className={styles.button}>Click</Button>
    </div>
  );
}

// AFTER: Match Orion conventions
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="p-6">
      <Button variant="default">Click</Button>
    </div>
  )
}
```

---

## Pattern: Nested Ternaries → Readable Logic

```tsx
// BEFORE: Nested ternary
const label = status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : status === 'suspended' ? 'Suspended' : 'Unknown'

// AFTER: Object lookup or switch
const statusLabels: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
}
const label = statusLabels[status] ?? 'Unknown'
```

---

## Pattern: Deep Nesting → Early Returns

```typescript
// BEFORE: 4 levels of nesting
function processApplication(app: Application) {
  if (app) {
    if (app.status === 'submitted') {
      if (app.candidate) {
        if (app.candidate.isVerified) {
          return reviewApplication(app)
        } else {
          return { error: 'Candidate not verified' }
        }
      } else {
        return { error: 'No candidate' }
      }
    } else {
      return { error: 'Not submitted' }
    }
  } else {
    return { error: 'No application' }
  }
}

// AFTER: Guard clauses with early returns
function processApplication(app: Application) {
  if (!app) return { error: 'No application' }
  if (app.status !== 'submitted') return { error: 'Not submitted' }
  if (!app.candidate) return { error: 'No candidate' }
  if (!app.candidate.isVerified) return { error: 'Candidate not verified' }
  return reviewApplication(app)
}
```

---

## Pattern: God Component → Focused Components

```tsx
// BEFORE: 400-line component doing everything
export default function JobManagementPage() {
  // 50 lines of state
  // 100 lines of handlers
  // 50 lines of filter logic
  // 200 lines of JSX with stats, filters, table, dialogs all inline
}

// AFTER: Focused components
export default function JobManagementPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filters, setFilters] = useState(defaultFilters)
  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters])

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <JobStats jobs={jobs} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <JobFilters filters={filters} onChange={setFilters} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <JobTable jobs={filteredJobs} onAction={handleAction} />
      </motion.div>
    </motion.div>
  )
}
```

---

## Pattern: Raw Fetch → API Client

```typescript
// BEFORE: Raw fetch with manual auth
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json',
  },
})
if (!response.ok) throw new Error('Failed')
const data = await response.json()

// AFTER: Typed API client (handles auth, refresh, errors automatically)
import { apiClient } from '@/lib/api/client'
const data = await apiClient.get<Job[]>('/api/jobs/')
```

---

## Pattern: Duplicate Types → Existing Type Files

```typescript
// BEFORE: Defining types that already exist
interface JobData {
  id: number
  title: string
  status: string
  company: { id: number; name: string }
}

// AFTER: Import from existing type files
import { Job } from '@/lib/company/types'
// Job already has id, title, status, company and 30+ other fields
```

**Check these files first:**
- `lib/auth/types.ts` — User, roles, auth state
- `lib/company/types.ts` — Company, Job, Billing, Application, Notification (425+ lines)
- `lib/candidate/types.ts` — Candidate types
- `lib/agency/types.ts` — Agency types
- `lib/admin/types.ts` — Admin types

---

## Orion-Specific: Unused Animation Wrappers

```tsx
// BEFORE: motion.div that doesn't animate
<motion.div>
  <Card>...</Card>
</motion.div>

// AFTER: Remove wrapper or add animation
// Option A: Remove the wrapper
<Card>...</Card>

// Option B: Add proper animation
<motion.div variants={itemVariants}>
  <Card>...</Card>
</motion.div>
```

---

## Orion-Specific: Inconsistent Status Colors

```tsx
// BEFORE: Ad-hoc colors that don't match conventions
<Badge className="bg-teal-200 text-teal-800">Active</Badge>
<Badge className="bg-yellow-300 text-yellow-900">Pending</Badge>

// AFTER: Use established color conventions
<Badge className={cn(
  "bg-green-100 text-green-700",  // active = green
)}>Active</Badge>
<Badge className={cn(
  "bg-amber-100 text-amber-700",  // pending = amber
)}>Pending</Badge>
```

---

## Orion-Specific: Missing cn() Usage

```tsx
// BEFORE: String concatenation for conditional classes
<div className={`p-4 ${isActive ? 'bg-green-100' : 'bg-gray-100'} ${className}`}>

// AFTER: cn() utility
import { cn } from '@/lib/utils'
<div className={cn("p-4", isActive ? "bg-green-100" : "bg-gray-100", className)}>
```

---

## Orion-Specific: Hardcoded Colors in Charts

```tsx
// BEFORE: Hex values in chart components
<Bar dataKey="value" fill="#3B5BDB" />
<Line stroke="#10b981" />

// AFTER: Import from color constants
import { CHART_SEQUENCE } from '@/lib/constants/colors'
<Bar dataKey="value" fill={CHART_SEQUENCE[0]} />
<Line stroke={CHART_SEQUENCE[1]} />
```

---

## Orion-Specific: Component-Level Font Overrides

```tsx
// BEFORE: Font overrides in components
<h1 style={{ fontFamily: 'Manrope, sans-serif' }}>Dashboard</h1>
<p className="font-[Inter]">Description</p>

// AFTER: Fonts flow from globals.css — use semantic classes
<h1 className="font-secondary text-2xl font-bold">Dashboard</h1>
<p className="text-muted-foreground">Description</p>
```

---

## Summary: When to Simplify

| Signal | Action |
|--------|--------|
| Abstraction used once | Inline it |
| Wrapper adds no value | Remove it |
| 3+ levels of nesting | Early returns |
| Nested ternary | Object lookup or if-else |
| Raw fetch | Use apiClient |
| New type that exists | Import existing type |
| 300+ line component | Extract focused components |
| Commented-out code | Delete it |
| Unused import | Remove it |
| Magic number/string | Named constant |
| String class concatenation | Use cn() |
| Hardcoded hex in chart | Import from colors.ts |

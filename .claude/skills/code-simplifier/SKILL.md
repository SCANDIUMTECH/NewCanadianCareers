---
name: code-simplifier
description: Simplifies and reviews code for clarity, consistency, maintainability,
  and enterprise production readiness. Use after writing or modifying code, before
  committing, or when reviewing code for production deployment. Applies Orion project
  conventions and enterprise best practices.
---

# Code Simplifier & Enterprise Reviewer

Simplify and review code for clarity, consistency, maintainability, and production readiness. Enforce Orion project conventions. Flag only high-confidence issues.

---

## Core Principles

1. **Think Before Coding** — Understand the existing code and its context before suggesting changes. Read neighboring files, check types, trace data flow.
2. **Simplicity First** — The right amount of complexity is the minimum needed for the current task. Three similar lines > a premature abstraction.
3. **Surgical Changes** — Only modify what's needed. No drive-by refactors, no unsolicited improvements, no changing unrelated code.
4. **Goal-Driven Execution** — Every change must serve a clear purpose. If you can't articulate why a change improves the code, don't make it.

---

## When to Activate

- After writing or modifying code (proactive)
- User invokes `/code-simplifier` (manual)
- Before committing changes
- Reviewing code for production deployment
- PR review or code audit

---

## Refinement Process

1. **Identify** — Scan recently modified files for issues (focus on the diff, not the whole codebase)
2. **Analyze** — For each issue, determine confidence level and severity
3. **Filter** — Only report issues with >= 80% confidence. Discard uncertain findings.
4. **Simplify** — Provide concrete before/after code. Never just describe — show the fix.
5. **Verify** — Ensure simplifications preserve behavior. Run `npm run build` after changes.
6. **Document** — Report findings in structured format with file:line references

---

## Simplification Rules

### Clarity

- Replace nested ternaries with if-else or switch
- Replace deep nesting (3+ levels) with early returns / guard clauses
- Extract magic numbers and strings into named constants
- Rename ambiguous variables (`d`, `temp`, `data`) to descriptive names
- Replace complex boolean expressions with named variables

### Consistency

- Use `cn()` from `@/lib/utils` for conditional Tailwind classes — never string concatenation
- Use `@/` path aliases for all imports — never relative paths like `../../`
- Match existing code style: no semicolons in JSX, consistent spacing
- Use existing shadcn/ui components before creating new ones
- Use existing type definitions from `lib/*/types.ts` before creating new types

### Maintainability

- Remove dead code, unused imports, commented-out code
- Replace God components (300+ lines doing multiple things) with focused components
- Extract repeated logic (3+ occurrences) into shared utilities
- Replace raw `fetch()` with `apiClient` from `@/lib/api/client.ts`
- Remove speculative features (caching, notifications, config nobody asked for)

### What NOT to Simplify

- Working code that's already clear and follows conventions
- Code under active development (don't refactor mid-feature)
- Performance-critical code where clarity was intentionally traded for speed
- Third-party code or generated code (shadcn/ui primitives, etc.)

---

## Enterprise Review Criteria

### Security (Critical)

- No secrets in client code (API keys, tokens in source)
- No `dangerouslySetInnerHTML` without sanitization
- Zod validation on all user inputs (forms, URL params, query strings)
- JWT tokens stored correctly (localStorage + cookie flag)
- API calls use `apiClient` with auth injection — no raw fetch with manual headers
- See `./resources/security-patterns.md` for Orion-specific patterns

### Performance (High)

- No unnecessary re-renders (missing memo, deps arrays, inline object creation)
- Images use `next/image` with proper sizing
- Heavy components use dynamic imports / `React.lazy`
- No N+1 patterns in data fetching
- Bundle-conscious imports (import specific icons, not entire libraries)

### Resilience (High)

- Error boundaries around independent UI sections
- Loading states for async operations
- Graceful degradation when API calls fail
- No unhandled promise rejections

### Observability (Medium)

- Meaningful error messages (not just "Something went wrong")
- Console.error for caught errors in development
- API errors surface user-friendly messages from backend

### Accessibility (Medium)

- Interactive elements are keyboard-navigable
- Form inputs have associated labels
- Images have alt text
- Color is not the sole indicator of state

See `./resources/enterprise-checklist.md` for the full checklist.

---

## Orion-Specific Conventions

### API Client

```typescript
// CORRECT: Use typed apiClient
import { apiClient } from '@/lib/api/client'
const data = await apiClient.get<ResponseType>('/api/endpoint/')

// WRONG: Raw fetch
const res = await fetch('/api/endpoint/', { headers: { Authorization: `Bearer ${token}` } })
```

### Type System

Check these files before defining new types:
- `lib/auth/types.ts` — User, roles, auth state
- `lib/company/types.ts` — Company, Job, Billing, Application, Notification
- `lib/candidate/types.ts` — Candidate types
- `lib/agency/types.ts` — Agency types
- `lib/admin/types.ts` — Admin types

### Design System

- Colors from CSS variables in `app/globals.css` — never hardcode hex
- JS color constants from `lib/constants/colors.ts` for Recharts/canvas
- Glassmorphism: `bg-white/80 backdrop-blur-xl`
- Primary: `#3B5BDB` (use `--primary` CSS var)
- Rounded: `rounded-xl` / `rounded-2xl`
- Fonts flow from globals.css — no component-level font overrides

### Animation

```typescript
// Standard page animation pattern
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}
```

Don't add Framer Motion wrappers that don't animate anything. Every `motion.div` should have `variants`, `initial`, and `animate`.

### Status Colors

- **Green** (`green-100/700`): active, verified, published, completed
- **Amber** (`amber-100/700`): pending, review, warning
- **Red** (`red-100/700`): suspended, rejected, failed, critical
- **Blue** (`blue-100/700`): processing, info, in-progress
- **Gray** (`muted`): draft, inactive, default

---

## Confidence Scoring

Rate every finding:

| Confidence | Action | Example |
|-----------|--------|---------|
| >= 90% | Flag as **must-fix** | Security vulnerability, broken functionality |
| 80-89% | Flag as **should-fix** | Convention violation, clarity issue |
| 60-79% | **Do not flag** | Style preference, debatable improvement |
| < 60% | **Do not flag** | Uncertain, might be intentional |

Severity levels for flagged issues:
- **Critical** — Security vulnerability, data loss risk, broken functionality
- **High** — Performance issue, missing error handling, convention violation
- **Medium** — Clarity issue, minor inconsistency, accessibility gap
- **Low** — Style nit, naming suggestion (only flag if >= 80% confident)

---

## Output Format

```
## Code Review: [scope]

### Critical (must-fix)
- **[category]** `file/path.tsx:42` — Description of issue
  ```tsx
  // Before
  problematic code
  // After
  fixed code
  ```

### High (should-fix)
- **[category]** `file/path.tsx:15` — Description
  ...

### Summary
- X critical, Y high, Z medium issues found
- Overall: [PASS | NEEDS WORK | BLOCK]
```

---

## Resources

- `./resources/enterprise-checklist.md` — Full production readiness checklist
- `./resources/simplification-patterns.md` — Anti-patterns with before/after examples
- `./resources/security-patterns.md` — Orion-specific security review patterns

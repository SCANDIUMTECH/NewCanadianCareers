# CLAUDE.md

Project-specific instructions for Claude Code when working on Orion.

## Project Overview

Orion is a modern hiring platform with three user types: **Candidates**, **Companies**, and **Agencies**, plus a **Platform Admin** dashboard. Currently frontend-only (Next.js) with Django backend planned.

**Live**: Deployed on Vercel, synced with v0.app

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS variables for theming
- **Components**: shadcn/ui (new-york style), Radix UI primitives
- **Animation**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npm start        # Start production
```

## Directory Structure

```
/app                    # Next.js App Router pages
  /admin                # Platform admin dashboard (15+ pages)
  /company              # Employer dashboard
  /candidate            # Job seeker dashboard
  /agency               # Recruitment agency dashboard
  /jobs/[id]            # Public job detail page
  /login, /signup       # Auth pages
/components
  /ui                   # shadcn/ui components (30+)
  *.tsx                 # Feature components (hero, sections, etc.)
/lib
  utils.ts              # cn() utility for className merging
/hooks
  use-mobile.ts         # Mobile detection hook
/docs                   # Product requirements and workflows
```

## Code Conventions

### Imports
Use path aliases defined in components.json:
- `@/components` → components
- `@/components/ui` → UI primitives
- `@/lib/utils` → utilities
- `@/hooks` → custom hooks

### Styling
- Use `cn()` from `@/lib/utils` for conditional classes
- Tailwind with CSS variables (defined in globals.css)
- Match existing patterns: glassmorphism, gradients, backdrop-blur

### Components
- UI primitives go in `/components/ui`
- Feature components go in `/components`
- Use existing shadcn/ui components before creating new ones

### Animation Patterns
- Staggered reveals with Framer Motion
- `initial`, `animate`, `transition` with staggerChildren
- Scroll-responsive header styling

## UI/UX Patterns

### Layouts by Role
- **Admin**: Collapsible sidebar, searchable navigation
- **Company/Candidate/Agency**: Floating glassmorphism header, scroll-responsive
- **Auth**: Split screen (branding + form)

### Design System
- Primary color: Blue (#3B5BDB)
- Glassmorphism: `bg-white/80 backdrop-blur-xl`
- Rounded corners: `rounded-xl` or `rounded-2xl`
- Shadows: `shadow-lg`, `shadow-xl` with rgba transparency

## Data & State

Currently using mock/hardcoded data. When integrating backend:
- Backend will be Django + DRF (see /docs for data models)
- API endpoints to consume via fetch or SWR
- Auth: Django session-based (HTTP-only cookies)

## Behavioral Guidelines

### 1. Think Before Coding
- State assumptions explicitly before implementing
- If multiple approaches exist, present them
- Ask when requirements are unclear

### 2. Simplicity First
- No features beyond what was asked
- No abstractions for single-use code
- If 200 lines could be 50, simplify

### 3. Surgical Changes
- Only change lines directly related to the task
- Match existing code style (single quotes, no semicolons patterns)
- Don't refactor unrelated code

### 4. Goal-Driven Execution
For multi-step tasks:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---
name: frontend-page
description: Build Next.js pages and components for Orion frontend. Use when creating new pages, building UI components, integrating API endpoints, or working on forms and layouts.
user-invocable: true
---

# Frontend Page Development Skill

Build pages and components for Orion's Next.js frontend that connect to the Django backend API.

## Environment

- **Dev server**: `npm run dev` (port 3000)
- **Build check**: `npm run build` — ALWAYS run after changes
- **Backend API**: http://localhost (Traefik on port 80) or http://localhost:8000 (Django direct)

## Key Architecture

### API Client — `/lib/api/client.ts`
ALL API calls go through this. Never create new fetch wrappers.

```typescript
import { apiClient } from '@/lib/api/client'

// GET
const data = await apiClient.get<ResponseType>('/api/endpoint/')

// POST
const result = await apiClient.post<ResponseType>('/api/endpoint/', body)

// PATCH
const updated = await apiClient.patch<ResponseType>('/api/endpoint/1/', body)

// DELETE
await apiClient.delete('/api/endpoint/1/')
```

### Adding New API Endpoints
Add to the appropriate module in `/lib/api/`:

```typescript
// lib/api/jobs.ts (example)
import { apiClient } from './client'
import { Job } from '@/lib/company/types'

export const jobsApi = {
  list: () => apiClient.get<Job[]>('/api/jobs/'),
  get: (id: number) => apiClient.get<Job>(`/api/jobs/${id}/`),
  create: (data: Partial<Job>) => apiClient.post<Job>('/api/jobs/company/', data),
  publish: (id: number) => apiClient.post(`/api/jobs/company/${id}/publish/`),
}
```

### Existing API Modules
```
lib/api/
  client.ts          # Base client (auth, refresh, errors)
  auth.ts            # Login, register, logout, password reset, email verify
  jobs.ts            # Job CRUD, publish, pause, duplicate, stats
  companies.ts       # Company management
  candidates.ts      # Candidate profile
  applications.ts    # Application tracking
  billing.ts         # Stripe checkout, packages, entitlements
  notifications.ts   # Notifications
  social.ts          # Social media posting
  agencies.ts        # Agency management
  public.ts          # Public job search
  admin-*.ts         # Admin modules (12 files)
```

### Type Definitions — CHECK BEFORE DEFINING NEW ONES
```
lib/auth/types.ts      # User, LoginCredentials, AuthState, etc.
lib/company/types.ts   # Company, Job, Application, Package, etc.
lib/candidate/types.ts # CandidateProfile, SavedJob, etc.
lib/agency/types.ts    # Agency, AgencyClient, etc.
lib/admin/types.ts     # AdminUser, AdminDashboardStats, etc.
```

### Hooks
```
hooks/use-auth.ts          # Auth context (user, login, logout, isAuthenticated)
hooks/use-company.ts       # Company state
hooks/use-candidate.ts     # Candidate state
hooks/use-agency.ts        # Agency state
hooks/use-mobile.ts        # Mobile detection
hooks/use-quick-job-post.ts # Quick job form
```

## Page Patterns by Role

### Dashboard Page (Company/Agency/Candidate/Admin)

```tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await someApi.getDashboard()
        setData(result)
      } catch (error) {
        console.error('Failed to load:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {/* StatCards */}
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>{/* ... */}</CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
```

### Layout Patterns
- **Admin** (`/app/admin/layout.tsx`): Collapsible sidebar, searchable nav
- **Company/Candidate/Agency**: Floating glassmorphism header (`bg-white/80 backdrop-blur-xl`)
- **Auth** (`/login`, `/signup`): Split screen (branding left + form right)

## Design System

- **Primary**: Blue (#3B5BDB)
- **Glassmorphism**: `bg-white/80 backdrop-blur-xl border-white/20`
- **Rounded**: `rounded-xl` or `rounded-2xl`
- **Shadows**: `shadow-lg`, `shadow-xl`
- **Status colors**: Green=active, Amber=pending, Red=error, Blue=info, Gray=inactive
- **Spacing**: `space-y-6` for page sections, `gap-4` for grids
- **Icons**: Lucide React only

## Component Imports

```tsx
// UI primitives
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Utils
import { cn } from "@/lib/utils"
```

## Route Protection

`/proxy.ts` middleware checks `orion_access_token` cookie:
- Protected: `/admin/*`, `/company/*`, `/candidate/*`, `/agency/*`
- Public: `/`, `/jobs/*`, `/companies/*`
- Auth: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`

## Checklist

After creating frontend features:
- [ ] Page uses "use client" directive
- [ ] Uses Framer Motion containerVariants + itemVariants
- [ ] API calls use `/lib/api/client.ts` — no raw fetch
- [ ] Types from existing type files — no duplicates
- [ ] Components from `/components/ui/` — no custom reimplementations
- [ ] `npm run build` passes with no errors

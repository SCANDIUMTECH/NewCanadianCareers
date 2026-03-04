---
name: platform-admin
description: Build and maintain Orion platform admin features
---

# Platform Admin Skill

Build and maintain Orion platform admin features following established patterns and documented workflows.

---

## Overview

This skill guides development of the Platform Admin dashboard - the control center for managing governance, trust, configuration, monetization, and operations across the entire Orion job board.

**Key responsibilities:**
- User, company, and agency management
- Job posting rules and moderation
- Monetization (packages, banners, affiliates)
- Social distribution policies
- Email configuration and deliverability
- Audit logging and compliance

---

## When to Use

Activate this skill when working on:
- Any page under `/app/admin/*`
- Moderation workflows (jobs, reports, enforcement)
- System settings and configuration
- Audit logs and compliance features
- Admin-specific API integrations (future Django backend)

---

## Admin Modules Reference

The platform has **14 admin modules**. Each new feature should align with these domains:

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Dashboard** | Operational metrics | New jobs, pending reviews, revenue MTD, alerts |
| **Users** | All user management | Directory, roles, suspend/delete, data requests |
| **Companies** | Employer management | Verify, suspend, entitlements, payment history |
| **Agencies** | Agency management | Billing model, client companies, volume limits |
| **Jobs** | Job lifecycle | Approve, hide, expire, pause, edit, delete |
| **Moderation** | Content review | Queue, flags, spam detection, enforcement |
| **Monetization** | Revenue features | Packages, Stripe config, entitlements, banners |
| **Social Distribution** | Social posting | Policies, provider connections, templates, queue |
| **Email & Notifications** | Email system | Provider config, templates, triggers, deliverability |
| **Search & SEO** | Discovery | Index health, sitemap, Google for Jobs compliance |
| **System Settings** | Platform config | Defaults, feature flags, rate limits |
| **Audit Logs** | Activity tracking | Immutable logs, actor/target/action/reason |
| **Support Tools** | Admin utilities | Impersonation, timelines, CSV exports |
| **Compliance** | Privacy workflows | Data export, deletion, retention rules |

---

## Code Patterns

### Page Structure

Every admin page follows this structure:

```tsx
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
// ... imports

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function AdminFeaturePage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 1. Header with title + primary action */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        ...
      </motion.div>

      {/* 2. Stats grid (4 columns) */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        ...
      </motion.div>

      {/* 3. Filters in Card */}
      <motion.div variants={itemVariants}>
        <Card>...</Card>
      </motion.div>

      {/* 4. Main data table in Card */}
      <motion.div variants={itemVariants}>
        <Card>...</Card>
      </motion.div>
    </motion.div>
  )
}
```

### Status Badges

Use consistent color mapping:

```tsx
// Pattern 1: Inline with cn()
<Badge
  variant="secondary"
  className={cn(
    status === "active" && "bg-green-100 text-green-700",
    status === "pending" && "bg-amber-100 text-amber-700",
    status === "suspended" && "bg-red-100 text-red-700"
  )}
>
  {status}
</Badge>

// Pattern 2: Config object for complex states
const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: AlertTriangle },
}
```

**Color conventions:**
- **Green** (`green-100/700`): active, verified, published, completed, resolved
- **Amber** (`amber-100/700`): pending, review, warning, investigating
- **Red** (`red-100/700`): suspended, rejected, failed, blocked, critical
- **Blue** (`blue-100/700`): processing, info, in-progress
- **Gray** (`muted`): draft, inactive, default

### Data Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredItems.map((item) => (
      <TableRow key={item.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge ...>{item.status}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <EyeIcon className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {/* More actions */}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Animated Table Rows

For dynamic content with AnimatePresence:

```tsx
<AnimatePresence mode="popLayout">
  {filteredItems.map((item, index) => (
    <motion.tr
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className="border-border/50"
    >
      ...
    </motion.tr>
  ))}
</AnimatePresence>
```

### Filter Bar

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter dropdowns */}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          ...
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

### Dialogs

**Detail view dialog:**
```tsx
<Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Details</DialogTitle>
      <DialogDescription>View item information</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Field</Label>
          <p className="font-medium">{selectedItem?.field}</p>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSelectedItem(null)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Action dialog with form:**
```tsx
<Dialog open={actionDialog.open} onOpenChange={...}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{actionTitle}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Textarea
        placeholder="Reason..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button onClick={executeAction}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Stat Cards

```tsx
function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <p className={cn("text-2xl font-semibold mt-2", color)}>{value}</p>
      </CardContent>
    </Card>
  )
}
```

---

## File Locations

```
/app/admin/                    # All admin pages
  /dashboard/page.tsx          # Main dashboard
  /users/page.tsx              # User management
  /companies/page.tsx          # Company management
  /agencies/page.tsx           # Agency management
  /jobs/page.tsx               # Job management
  /moderation/page.tsx         # Moderation queue
  /payments/page.tsx           # Payment history
  /packages/page.tsx           # Package config
  /settings/page.tsx           # System settings
  /email/page.tsx              # Email configuration
  /features/page.tsx           # Feature flags
  /audit/page.tsx              # Audit logs
  /fraud/page.tsx              # Fraud detection
  /search/page.tsx             # Search admin
  /social/page.tsx             # Social distribution
  /support/page.tsx            # Support tools
  /compliance/page.tsx         # GDPR compliance
  layout.tsx                   # Admin layout with sidebar

/components/ui/                # shadcn/ui primitives
/lib/utils.ts                  # cn() utility
/docs/platform_admin_*.md      # Workflow documentation
```

---

## Checklist for New Admin Features

Before submitting, verify:

- [ ] Uses `containerVariants` and `itemVariants` for animations
- [ ] Follows header → stats → filters → table structure
- [ ] Status badges use established color conventions
- [ ] Actions logged with reason (where applicable)
- [ ] Filters use state-based filtering pattern
- [ ] Tables use shadcn/ui Table components
- [ ] Dialogs follow detail view or action form pattern
- [ ] Icons from Lucide React
- [ ] Responsive: 4-col stats grid → 2-col on mobile
- [ ] Uses `cn()` for conditional classes
- [ ] Matches existing code style (no semicolons in JSX)

---

## Resources

- `./resources/page-template.tsx` - Complete page template
- `./resources/patterns.md` - Quick pattern reference
- `./resources/workflows-reference.md` - Module feature checklist

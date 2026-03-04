# Platform Admin UI Patterns

Quick reference for common patterns used in admin pages.

---

## Animation Variants

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
}
```

**Row animation with AnimatePresence:**
```tsx
<AnimatePresence mode="popLayout">
  {items.map((item, index) => (
    <motion.tr
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
    >
      ...
    </motion.tr>
  ))}
</AnimatePresence>
```

**Expandable content:**
```tsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

---

## Status Badge Colors

### Standard Status Colors

| Status | Background | Text | Use For |
|--------|------------|------|---------|
| Active | `bg-green-100` | `text-green-700` | Enabled, verified, published |
| Pending | `bg-amber-100` | `text-amber-700` | Awaiting action, in review |
| Suspended | `bg-red-100` | `text-red-700` | Blocked, failed, rejected |
| Processing | `bg-blue-100` | `text-blue-700` | In progress |
| Draft | `bg-muted` | default | Inactive, default |

### Severity Colors (Fraud/Alerts)

| Severity | Background | Text |
|----------|------------|------|
| Critical | `bg-red-500/10` | `text-red-600` |
| High | `bg-orange-500/10` | `text-orange-600` |
| Medium | `bg-yellow-500/10` | `text-yellow-600` |
| Low | `bg-blue-500/10` | `text-blue-600` |

### Role/Type Badge (Outline)

```tsx
<Badge
  variant="outline"
  className={cn(
    role === "admin" && "border-purple-200 text-purple-700",
    role === "employer" && "border-blue-200 text-blue-700",
    role === "agency" && "border-teal-200 text-teal-700"
  )}
>
  {role}
</Badge>
```

---

## Status Config Pattern

For pages with multiple status types:

```tsx
const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    icon: Clock
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-700",
    icon: RefreshCw
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    icon: Check
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle
  },
}

// Usage:
const status = statusConfig[item.status]
const StatusIcon = status.icon

<Badge className={cn("text-xs gap-1", status.color)}>
  <StatusIcon className="w-3 h-3" />
  {status.label}
</Badge>
```

---

## Common Component Combinations

### Avatar + Info Cell

```tsx
<TableCell>
  <div className="flex items-center gap-3">
    <Avatar className="h-9 w-9">
      <AvatarFallback>
        {name.split(" ").map((n) => n[0]).join("")}
      </AvatarFallback>
    </Avatar>
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{email}</p>
    </div>
  </div>
</TableCell>
```

### Actions Dropdown

```tsx
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
    <DropdownMenuItem>
      <EditIcon className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-red-600">
      <TrashIcon className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Search Input with Icon

```tsx
<div className="relative flex-1">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-9"
  />
</div>
```

### Stat Card with Icon

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Icon className={cn("w-4 h-4", color)} />
    </div>
    <p className={cn("text-2xl font-semibold mt-2", color)}>{value}</p>
  </CardContent>
</Card>
```

---

## Form Field Patterns

### Label + Value Display (Detail View)

```tsx
<div>
  <Label className="text-xs text-muted-foreground">Field Name</Label>
  <p className="font-medium">{value}</p>
</div>
```

### Two-Column Grid for Details

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label className="text-xs text-muted-foreground">Label 1</Label>
    <p className="font-medium">{value1}</p>
  </div>
  <div>
    <Label className="text-xs text-muted-foreground">Label 2</Label>
    <p className="font-medium">{value2}</p>
  </div>
</div>
```

### Context Box (in Dialogs)

```tsx
<div className="p-3 bg-muted/30 rounded-lg">
  <p className="text-sm font-medium">{contextInfo}</p>
  <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
</div>
```

---

## Common Icons (Lucide React)

**Actions:**
- `Eye` - View
- `Edit` / `Pencil` - Edit
- `Trash2` - Delete
- `MoreHorizontal` - Actions menu
- `Plus` - Add new
- `Download` - Export
- `Upload` - Import

**Status:**
- `Check` / `CheckCircle` - Completed, verified
- `Clock` - Pending, waiting
- `AlertTriangle` - Warning, error
- `RefreshCw` - Processing, syncing
- `XCircle` - Failed, rejected
- `Shield` - Security, protected

**Navigation:**
- `Search` - Search
- `Filter` - Filters
- `ChevronDown` - Dropdown
- `ArrowLeft` / `ArrowRight` - Navigation

**Content:**
- `Users` - User management
- `Building2` - Companies
- `Briefcase` - Jobs
- `Mail` - Email
- `Settings` - Settings
- `FileText` - Documents, logs

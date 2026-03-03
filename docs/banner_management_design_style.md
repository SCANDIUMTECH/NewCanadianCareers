# Banner Management Page — Design Style Reference

> Replicable design patterns from `app/admin/banners/page.tsx`, consistent with the Orion admin page style used across Dashboard, Companies, Jobs, and other admin pages.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Page Header (icon + title + actions)               │
├─────────────────────────────────────────────────────┤
│  Stats Grid (5-col metric cards with sparklines)    │
├─────────────────────────────────────────────────────┤
│  Filters (Card-wrapped search + dropdowns)          │
├─────────────────────────────────────────────────────┤
│  Content Grid (3-col banner cards / empty state)    │
└─────────────────────────────────────────────────────┘
```

- Outer container: `space-y-8`
- Each section wrapped in `<motion.div variants={itemVariants}>`
- Parent uses `<motion.div variants={containerVariants} initial="hidden" animate="show">`

---

## 1. Animation Variants

Shared across all admin pages. Stagger children on page load, ease-out-expo curve.

```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
}
```

---

## 2. Page Header

Two-column flex layout. Left = gradient icon block + title. Right = action buttons.

```tsx
<motion.div variants={itemVariants} className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <div className="relative">
      {/* 48px icon block — rounded-2xl, gradient, colored shadow */}
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600
        flex items-center justify-center shadow-lg shadow-pink-500/20">
        <Icon className="h-6 w-6 text-white" />
      </div>
      {/* Status dot — green-500, border matches page background */}
      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full
        bg-green-500 border-2 border-background" />
    </div>
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
      <p className="text-muted-foreground text-sm mt-0.5">Subtitle</p>
    </div>
  </div>

  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" className="gap-1.5">Secondary</Button>
    <Button className="gap-1.5 shadow-sm">Primary</Button>
  </div>
</motion.div>
```

**Key details:**
- Icon: `h-12 w-12 rounded-2xl`, gradient uses two adjacent hues (`from-X-500 to-Y-600`)
- Shadow: dominant hue at 20% (`shadow-pink-500/20`)
- Status dot: `bg-green-500 border-2 border-background` (uses `border-background` not a white circle wrapper)
- Title: `text-2xl font-semibold tracking-tight`
- Subtitle: `text-muted-foreground text-sm mt-0.5`

**Gradient pairings used across admin pages:**

| Page       | Gradient                                      | Shadow              |
|------------|-----------------------------------------------|---------------------|
| Dashboard  | `from-indigo-500 via-blue-500 to-cyan-500`    | `shadow-indigo-500/20` |
| Companies  | `from-blue-600 to-indigo-600`                 | `shadow-blue-500/20`   |
| Banners    | `from-pink-500 to-rose-600`                   | `shadow-pink-500/20`   |
| Jobs       | `from-blue-600 to-indigo-600`                 | `shadow-blue-500/20`   |

---

## 3. Stat Cards

Grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-4` (or `lg:grid-cols-5` for banners).

Each stat card follows this exact structure:

```tsx
<Card className="relative overflow-hidden group">
  {/* Decorative circle — top-right, low opacity, grows on hover */}
  <div className={cn(
    "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]",
    "transition-opacity duration-300 group-hover:opacity-[0.10]",
    "bg-emerald-500"  // matches the card's semantic color
  )} />

  {/* Bottom gradient bar — hidden, appears on hover */}
  <div className={cn(
    "absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r",
    "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
    "from-emerald-500 to-teal-600"  // matches the icon gradient
  )} />

  <CardContent className="p-4 relative">
    {/* Row: label + icon */}
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Label</p>
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        "bg-gradient-to-br text-white shadow-sm",
        "from-emerald-500 to-teal-600"
      )}>
        <Icon className="h-4 w-4" />
      </div>
    </div>

    {/* Value */}
    <p className="mt-1 text-2xl font-bold tabular-nums">1,234</p>

    {/* Optional sparkline */}
    <div className="mt-2 h-10 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparkData}>
          <defs>
            <linearGradient id="gradient-id" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v"
            stroke={color} strokeWidth={1.5}
            fill="url(#gradient-id)" dot={false}
            isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

**Key details:**
- Label: `text-sm text-muted-foreground` (sentence case, NOT uppercase)
- Icon: `h-8 w-8 rounded-lg bg-gradient-to-br text-white shadow-sm`
- Icon inner: `h-4 w-4`
- Value: `text-2xl font-bold tabular-nums` (bold, not semibold)
- Colored values: `text-green-600`, `text-amber-600`, `text-primary` etc.
- Decorative circle: `absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]`
- Bottom bar: `h-0.5`, full-width gradient, hidden by default, appears on hover
- Sparkline height: `h-10` (dashboard) or `h-10` with `-mx-1`
- Area gradient: 30% opacity top → 5% bottom
- Bar chart: `opacity={0.3}`, `barCategoryGap="15%"`, radius `[2,2,0,0]`
- Padding: `p-4`

**Skeleton:**
```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="mt-1 h-8 w-16" />
  </CardContent>
</Card>
```

**Color mapping for banners page:**

| Stat             | Gradient                          | bgAccent        | sparkColor     | Value color    |
|------------------|-----------------------------------|-----------------|----------------|----------------|
| Total Banners    | `from-slate-600 to-slate-800`     | `bg-slate-500`  | —              | default        |
| Active Now       | `from-emerald-500 to-teal-600`    | `bg-emerald-500`| `STATUS.success` | `text-green-600` |
| Scheduled        | `from-blue-500 to-indigo-600`     | `bg-blue-500`   | —              | `text-primary` |
| Impressions      | `from-pink-500 to-rose-600`       | `bg-pink-500`   | `CHART.pink`   | default        |
| Clicks           | `from-violet-500 to-purple-600`   | `bg-violet-500` | `CHART.purple` | default        |

---

## 4. Filter Bar

Wrapped in a `<Card>` with `<CardContent className="p-4">`. Flex row with search input and dropdown selects.

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search input with icon */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
          text-muted-foreground" />
        <Input placeholder="Search by..." className="pl-9" />
      </div>

      {/* Filter dropdowns */}
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="option">Option</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

**Key details:**
- Always wrapped in `<Card>` (not bare)
- Search icon: `h-4 w-4 text-muted-foreground`, positioned `left-3 top-1/2 -translate-y-1/2`
- Input: `pl-9` to account for icon
- Select width: `w-[180px]`
- Responsive: `flex-col sm:flex-row`

---

## 5. Content Grid (Banner Cards)

Grid: `grid gap-6 md:grid-cols-2 lg:grid-cols-3`

```tsx
<Card className="overflow-hidden transition-all hover:shadow-md">
  {/* Image preview */}
  <div className="relative aspect-[4/1] bg-muted">
    <img className="w-full h-full object-cover" />

    {/* Badges — absolute positioned */}
    <div className="absolute top-2 left-2">
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        Homepage
      </Badge>
    </div>
    <div className="absolute top-2 right-2">
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        Active
      </Badge>
    </div>
  </div>

  <CardContent className="p-4 space-y-3">
    {/* Title + dropdown menu */}
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="font-medium truncate">Title</p>
        <p className="text-sm text-muted-foreground">Subtitle</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {/* Date range */}
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4" />
      <span>1/15/2026 - 3/15/2026</span>
    </div>

    {/* Metrics footer */}
    <div className="flex items-center justify-between pt-2 border-t">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span>1,234</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointer className="h-4 w-4 text-muted-foreground" />
          <span>56</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground">4.54% CTR</span>
    </div>
  </CardContent>
</Card>
```

**Key details:**
- Image: `aspect-[4/1] bg-muted`
- Card hover: `transition-all hover:shadow-md` (CSS, not Framer Motion)
- Badges: `variant="secondary"` with colored classes
- Title: `font-medium truncate`
- Dropdown trigger: always visible (`h-8 w-8 p-0`), not hidden on hover
- Dropdown icons: `mr-2 h-4 w-4`
- Metrics footer: `pt-2 border-t`
- Metric icons: `h-4 w-4 text-muted-foreground`

**Badge color classes:**

| Placement       | Class                            |
|-----------------|----------------------------------|
| Homepage        | `bg-green-100 text-green-700`    |
| Search Top      | `bg-blue-100 text-blue-700`     |
| Search Sidebar  | `bg-purple-100 text-purple-700` |
| Job Detail      | `bg-amber-100 text-amber-700`   |

| Status    | Class                          |
|-----------|--------------------------------|
| Active    | `bg-green-100 text-green-700`  |
| Scheduled | `bg-blue-100 text-blue-700`    |
| Expired   | `bg-gray-100 text-gray-700`    |
| Inactive  | `bg-red-100 text-red-700`      |

---

## 6. Empty State

Simple and centered, inside a full-width Card.

```tsx
<div className="col-span-full">
  <Card>
    <CardContent className="p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground">No items found</h3>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Contextual help text
      </p>
    </CardContent>
  </Card>
</div>
```

**Key details:**
- `col-span-full` to span the grid
- Icon: `h-12 w-12 text-muted-foreground/30`
- Heading: `text-lg font-medium text-muted-foreground`
- Body: `text-sm text-muted-foreground/70`
- Padding: `p-12`

---

## 7. Dialog (Edit/Create)

Standard shadcn Dialog with max width `max-w-2xl`.

```tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>

    <div className="space-y-6 py-4">
      {/* Form fields */}
      <div className="space-y-2">
        <Label htmlFor="field">Label</Label>
        <Input id="field" placeholder="..." />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 md:grid-cols-2">
        ...
      </div>

      {/* Performance metrics (edit mode only) */}
      <div className="pt-4 border-t">
        <Label className="mb-3 block">Performance</Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Label</p>
            <p className="text-lg font-semibold">Value</p>
          </div>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Key details:**
- Form spacing: `space-y-6 py-4`
- Field spacing: `space-y-2`
- Grid columns: `grid gap-4 md:grid-cols-2`
- Performance metrics: `bg-muted rounded-lg p-3`
- Metric label: `text-xs text-muted-foreground`
- Metric value: `text-lg font-semibold`

---

## 8. File Upload Area

Two modes toggled via Tabs: URL input or file upload.

```tsx
{/* Dashed drop zone */}
<div className={cn(
  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
  "transition-colors hover:border-muted-foreground/50",
  hasError ? "border-destructive" : "border-muted-foreground/25"
)}>
  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
  <p className="text-sm font-medium">Click to upload</p>
  <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPEG &bull; Max 5MB</p>
</div>
```

---

## 9. Delete Confirmation

Standard AlertDialog with destructive action styling.

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Banner</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground
        hover:bg-destructive/90">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Quick Reference: Common Sizes

| Element              | Size / Class                             |
|----------------------|------------------------------------------|
| Page header icon     | `h-12 w-12 rounded-2xl`                 |
| Stat card icon       | `h-8 w-8 rounded-lg`                    |
| Stat card icon inner | `h-4 w-4`                               |
| Decorative circle    | `w-24 h-24 rounded-full` at `-top-6 -right-6` |
| Bottom hover bar     | `h-0.5` full-width gradient             |
| Sparkline height     | `h-10`                                   |
| Card image           | `aspect-[4/1]`                           |
| Badge variant        | `variant="secondary"` + color classes    |
| Dropdown icon        | `mr-2 h-4 w-4`                          |
| Metric icon          | `h-4 w-4 text-muted-foreground`         |
| Empty state icon     | `h-12 w-12 text-muted-foreground/30`    |
| Stat card padding    | `p-4`                                    |
| Filter card padding  | `p-4`                                    |
| Content card padding | `p-4`                                    |
| Section spacing      | `space-y-8` (outer)                      |
| Stats grid gap       | `gap-4`                                  |
| Content grid gap     | `gap-6`                                  |

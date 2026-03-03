"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getEmailTemplatesFiltered,
  createEmailTemplate,
  duplicateEmailTemplate,
  archiveEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
  type TemplateType,
  type TemplateSubcategory,
  type TemplateStatus,
} from "@/lib/api/admin-email"
import {
  FileText,
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  Loader2,
  Mail,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Tag,
  Megaphone,
  Settings,
  RefreshCw,
  Inbox,
} from "lucide-react"

// =============================================================================
// CONSTANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

interface CategoryGroup {
  label: string
  icon: typeof Mail
  gradient: string
  subcategories: { value: TemplateSubcategory; label: string }[]
}

const CATEGORY_TAXONOMY: Record<TemplateType, CategoryGroup> = {
  Transactional: {
    label: "Transactional",
    icon: Zap,
    gradient: "from-blue-500 to-indigo-600",
    subcategories: [
      { value: "Authentication", label: "Authentication" },
      { value: "Jobs", label: "Jobs" },
      { value: "Applications", label: "Applications" },
      { value: "Billing", label: "Billing" },
      { value: "Alerts", label: "Alerts" },
    ],
  },
  Marketing: {
    label: "Marketing",
    icon: Megaphone,
    gradient: "from-violet-500 to-purple-600",
    subcategories: [
      { value: "Campaign", label: "Campaign" },
      { value: "Promotional", label: "Promotional" },
      { value: "Newsletter", label: "Newsletter" },
      { value: "Coupon", label: "Coupon" },
      { value: "Announcement", label: "Announcement" },
    ],
  },
  System: {
    label: "System",
    icon: Settings,
    gradient: "from-slate-500 to-gray-600",
    subcategories: [
      { value: "Default", label: "Default" },
      { value: "Internal", label: "Internal" },
    ],
  },
}

const TYPE_COLORS: Record<TemplateType, string> = {
  Transactional: "bg-blue-500",
  Marketing: "bg-violet-500",
  System: "bg-slate-500",
}

const STATUS_CONFIG: Record<TemplateStatus, { label: string; className: string }> = {
  Published: { label: "Published", className: "bg-green-100 text-green-700 border-green-200" },
  Draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
  Archived: { label: "Archived", className: "bg-amber-100 text-amber-700 border-amber-200" },
}

const SUBCATEGORY_COLORS: Record<string, string> = {
  Authentication: "border-blue-200 text-blue-600",
  Jobs: "border-emerald-200 text-emerald-600",
  Applications: "border-sky-200 text-sky-600",
  Billing: "border-amber-200 text-amber-600",
  Alerts: "border-red-200 text-red-600",
  Campaign: "border-violet-200 text-violet-600",
  Promotional: "border-pink-200 text-pink-600",
  Newsletter: "border-teal-200 text-teal-600",
  Coupon: "border-orange-200 text-orange-600",
  Announcement: "border-fuchsia-200 text-fuchsia-600",
  Default: "border-slate-200 text-slate-600",
  Internal: "border-gray-200 text-gray-600",
}

// Map existing template slugs to subcategories for display when backend doesn't provide subcategory
const SLUG_SUBCATEGORY_MAP: Record<string, TemplateSubcategory> = {
  welcome: "Authentication",
  email_verification: "Authentication",
  password_reset: "Authentication",
  security_alert: "Alerts",
  fraud_alert: "Alerts",
  job_pending_review: "Jobs",
  job_approved: "Jobs",
  job_rejected: "Jobs",
  application_received: "Applications",
  application_status: "Applications",
  job_alert: "Jobs",
  payment_success: "Billing",
  payment_failed: "Billing",
  payment_action_required: "Billing",
  subscription_past_due: "Billing",
  default: "Default",
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EmailTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [activeType, setActiveType] = useState<TemplateType | "All">("All")
  const [activeSubcategory, setActiveSubcategory] = useState<TemplateSubcategory | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    slug: "",
    type: "Transactional" as TemplateType,
    subcategory: null as TemplateSubcategory | null,
    subject: "",
    preheader: "",
    html: "",
    status: "Draft" as TemplateStatus,
    variables: [] as string[],
  })

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Resolve subcategory — from the template's subcategory field or inferred from slug
  const resolveSubcategory = (t: EmailTemplate): TemplateSubcategory | null => {
    return t.subcategory || SLUG_SUBCATEGORY_MAP[t.slug] || null
  }

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getEmailTemplatesFiltered({
        type: activeType !== "All" ? activeType : undefined,
        subcategory: activeSubcategory || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
        page,
      })
      setTemplates(res.results)
      setTotalCount(res.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }, [activeType, activeSubcategory, statusFilter, searchQuery, page])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeType, activeSubcategory, statusFilter, searchQuery])

  // Derive stats from current page results (approximate)
  const stats = useMemo(() => {
    const total = totalCount
    const published = templates.filter((t) => t.status === "Published").length
    const draft = templates.filter((t) => t.status === "Draft").length
    const archived = templates.filter((t) => t.status === "Archived").length
    const transactional = templates.filter((t) => t.type === "Transactional").length
    const marketing = templates.filter((t) => t.type === "Marketing").length
    const system = templates.filter((t) => t.type === "System").length
    return { total, published, draft, archived, transactional, marketing, system }
  }, [templates, totalCount])

  // Category counts from current page (best effort with server-side filtering)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: totalCount }
    for (const type of ["Transactional", "Marketing", "System"] as TemplateType[]) {
      counts[type] = templates.filter((t) => t.type === type).length
      const group = CATEGORY_TAXONOMY[type]
      for (const sub of group.subcategories) {
        counts[sub.value] = templates.filter((t) => t.type === type && resolveSubcategory(t) === sub.value).length
      }
    }
    return counts
  }, [templates, totalCount])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewTemplate((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }))
  }

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.slug) return
    setIsCreating(true)
    try {
      const created = await createEmailTemplate({
        ...newTemplate,
        version: 1,
        createdAt: new Date().toISOString(),
      })
      setCreateOpen(false)
      setNewTemplate({ name: "", slug: "", type: "Transactional", subcategory: null, subject: "", preheader: "", html: "", status: "Draft", variables: [] })
      toast.success("Template created")
      router.push(`/admin/email/templates/${created.id}`)
    } catch (err) {
      toast.error("Failed to create template")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateEmailTemplate(id)
      toast.success(`Template duplicated`)
      fetchTemplates()
    } catch {
      toast.error("Failed to duplicate template")
    }
  }

  const handleArchive = async (id: number) => {
    try {
      await archiveEmailTemplate(id)
      toast.success("Template archived")
      fetchTemplates()
    } catch {
      toast.error("Failed to archive template")
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteEmailTemplate(deletingId)
      setDeletingId(null)
      toast.success("Template deleted")
      fetchTemplates()
    } catch {
      toast.error("Failed to delete template")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCategorySelect = (type: TemplateType | "All", sub: TemplateSubcategory | null) => {
    setActiveType(type)
    setActiveSubcategory(sub)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage transactional and marketing email templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Template
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard title="Total" value={stats.total} icon={<FileText className="h-3.5 w-3.5" />} gradient="from-slate-600 to-slate-800" />
            <StatCard title="Published" value={stats.published} icon={<CheckCircle2 className="h-3.5 w-3.5" />} gradient="from-green-500 to-emerald-600" />
            <StatCard title="Draft" value={stats.draft} icon={<Clock className="h-3.5 w-3.5" />} gradient="from-amber-500 to-orange-600" />
            <StatCard title="Archived" value={stats.archived} icon={<Archive className="h-3.5 w-3.5" />} gradient="from-gray-500 to-slate-600" />
            <Card className="relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-4 relative">
                <p className="text-sm text-muted-foreground mb-2">By Type</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold tabular-nums">{stats.transactional}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm font-semibold tabular-nums">{stats.marketing}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-sm font-semibold tabular-nums">{stats.system}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TemplateStatus | "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                <Button size="sm" variant={viewMode === "grid" ? "secondary" : "ghost"} onClick={() => setViewMode("grid")} className="h-8 w-8 p-0">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")} className="h-8 w-8 p-0">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content: Category Sidebar + Templates */}
      <motion.div variants={itemVariants} className="flex gap-6">
        {/* Category Sidebar */}
        <div className="w-60 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-1">
                {/* All Templates */}
                <button
                  onClick={() => handleCategorySelect("All", null)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    activeType === "All" && !activeSubcategory
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>All Templates</span>
                  <span className="text-xs tabular-nums">{categoryCounts.All}</span>
                </button>

                {/* Type Sections */}
                {(["Transactional", "Marketing", "System"] as TemplateType[]).map((type) => {
                  const group = CATEGORY_TAXONOMY[type]
                  return (
                    <CategorySection
                      key={type}
                      type={type}
                      group={group}
                      activeType={activeType}
                      activeSubcategory={activeSubcategory}
                      counts={categoryCounts}
                      onSelect={handleCategorySelect}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Templates Grid/List */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className={cn(viewMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-32 mb-3" />
                    <Skeleton className="h-3 w-20 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchTemplates}>Retry</Button>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 mx-auto mb-4">
                  <Inbox className="h-7 w-7 text-indigo-500/50" />
                </div>
                <h3 className="text-lg font-medium">No templates found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all" || activeType !== "All"
                    ? "Try adjusting your filters"
                    : "Create your first email template to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && activeType === "All" && (
                  <Button onClick={() => setCreateOpen(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" /> Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  subcategory={resolveSubcategory(template)}
                  onEdit={() => router.push(`/admin/email/templates/${template.id}`)}
                  onDuplicate={() => handleDuplicate(template.id)}
                  onArchive={() => handleArchive(template.id)}
                  onDelete={() => setDeletingId(template.id)}
                />
              ))}
            </div>
          ) : (
            <TemplatesTable
              templates={templates}
              resolveSubcategory={resolveSubcategory}
              onEdit={(id) => router.push(`/admin/email/templates/${id}`)}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={setDeletingId}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-muted-foreground">
                Showing {templates.length} of {totalCount} templates
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-sm tabular-nums px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Create a new email template. You can edit the content after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                value={newTemplate.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Welcome Email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-slug">Slug</Label>
              <Input
                id="tpl-slug"
                value={newTemplate.slug}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="welcome_email"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Used as the template identifier in code</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newTemplate.type}
                  onValueChange={(v) => setNewTemplate((prev) => ({ ...prev, type: v as TemplateType, subcategory: null }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transactional">Transactional</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={newTemplate.subcategory || ""}
                  onValueChange={(v) => setNewTemplate((prev) => ({ ...prev, subcategory: v as TemplateSubcategory }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TAXONOMY[newTemplate.type].subcategories.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject Line</Label>
              <Input
                id="tpl-subject"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Your email subject..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating || !newTemplate.name || !newTemplate.slug}>
              {isCreating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating...</> : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ title, value, icon, gradient }: {
  title: string
  value: number
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <Card className="relative overflow-hidden group">
      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
            {icon}
          </div>
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function CategorySection({ type, group, activeType, activeSubcategory, counts, onSelect }: {
  type: TemplateType
  group: CategoryGroup
  activeType: TemplateType | "All"
  activeSubcategory: TemplateSubcategory | null
  counts: Record<string, number>
  onSelect: (type: TemplateType | "All", sub: TemplateSubcategory | null) => void
}) {
  const [isOpen, setIsOpen] = useState(activeType === type)
  useEffect(() => {
    if (activeType === type) setIsOpen(true)
  }, [activeType, type])
  const isTypeActive = activeType === type && !activeSubcategory
  const Icon = group.icon

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mt-4 mb-1">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Icon className="h-3 w-3" />
            {group.label}
            <span className="ml-auto tabular-nums text-[10px]">{counts[type] || 0}</span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="space-y-0.5">
          {/* Type-level item */}
          <button
            onClick={() => onSelect(type, null)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors pl-8",
              isTypeActive
                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                : "hover:bg-muted/50 text-muted-foreground"
            )}
          >
            <span>All {group.label}</span>
            <span className="text-xs tabular-nums">{counts[type] || 0}</span>
          </button>

          {/* Subcategory items */}
          {group.subcategories.map((sub) => (
            <button
              key={sub.value}
              onClick={() => onSelect(type, sub.value)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors pl-10",
                activeType === type && activeSubcategory === sub.value
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <span>{sub.label}</span>
              <span className="text-xs tabular-nums">{counts[sub.value] || 0}</span>
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function TemplateCard({ template, subcategory, onEdit, onDuplicate, onArchive, onDelete }: {
  template: EmailTemplate
  subcategory: TemplateSubcategory | null
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const statusConfig = STATUS_CONFIG[template.status] || STATUS_CONFIG.Draft
  const typeColor = TYPE_COLORS[template.type] || "bg-slate-500"

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md group cursor-pointer" onClick={onEdit}>
      {/* Type indicator strip */}
      <div className={cn("h-1 w-full", typeColor)} />
      <CardContent className="p-5 space-y-3">
        {/* Name & Slug */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{template.name}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                {template.status !== "Archived" && (
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="w-4 h-4 mr-2" /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <code className="text-xs text-muted-foreground font-mono">{template.slug}</code>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
          {subcategory && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SUBCATEGORY_COLORS[subcategory])}>
              {subcategory}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{template.usedBy} trigger{template.usedBy !== 1 ? "s" : ""}</span>
          <span>{template.lastUpdated}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function TemplatesTable({ templates, resolveSubcategory, onEdit, onDuplicate, onArchive, onDelete }: {
  templates: EmailTemplate[]
  resolveSubcategory: (t: EmailTemplate) => TemplateSubcategory | null
  onEdit: (id: number) => void
  onDuplicate: (id: number) => void
  onArchive: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Triggers</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => {
            const sub = resolveSubcategory(t)
            const statusConfig = STATUS_CONFIG[t.status] || STATUS_CONFIG.Draft
            return (
              <TableRow key={t.id} className="group cursor-pointer" onClick={() => onEdit(t.id)}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <code className="text-xs text-muted-foreground font-mono">{t.slug}</code>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", TYPE_COLORS[t.type])} />
                    <span className="text-sm">{t.type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {sub ? (
                    <Badge variant="outline" className={cn("text-xs", SUBCATEGORY_COLORS[sub])}>{sub}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center tabular-nums">{t.usedBy}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.lastUpdated}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEdit(t.id)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(t.id)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      {t.status !== "Archived" && (
                        <DropdownMenuItem onClick={() => onArchive(t.id)}>
                          <Archive className="w-4 h-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => onDelete(t.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

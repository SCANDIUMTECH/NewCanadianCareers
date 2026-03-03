"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getEmailTemplate,
  getEmailProviders,
  updateEmailTemplate,
  publishEmailTemplate,
  unpublishEmailTemplate,
  archiveEmailTemplate,
  duplicateEmailTemplate,
  deleteEmailTemplate,
  testProvider,
  getEmailTemplateVersions,
  type EmailTemplateDetail,
  type EmailTemplateVersion,
  type TemplateStatus,
} from "@/lib/api/admin-email"
import {
  ArrowLeft,
  Save,
  Send,
  Monitor,
  Smartphone,
  History,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Code,
  Eye,
  FileText,
  Plus,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
  RotateCcw,
  Upload,
} from "lucide-react"

// =============================================================================
// CONSTANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  name: "Recipient's name",
  first_name: "User's first name",
  last_name: "User's last name",
  email: "User's email address",
  company_name: "Company name",
  job_title: "Job posting title",
  verify_url: "Email verification link",
  reset_url: "Password reset link",
  job_url: "Link to job posting",
  review_url: "Admin review link",
  alert_url: "Alert review link",
  billing_url: "Billing page link",
  hosted_url: "Hosted authentication link",
  content: "Dynamic content block",
  current_year: "Current year (auto)",
  ip_address: "IP address",
  location: "Geographic location",
  time: "Timestamp",
  status: "Application status",
  reason: "Rejection reason",
  severity: "Alert severity level",
  alert_type: "Fraud alert type",
  subject_name: "Subject of alert",
  description: "Alert description",
  indicators: "Fraud indicators",
  rule_name: "Detection rule name",
  job_count: "Number of matching jobs",
  search_name: "Saved search name",
  jobs: "List of matching jobs",
  coupon_code: "Coupon/discount code",
  discount_amount: "Discount amount or percentage",
  expiry_date: "Coupon expiry date",
  amount: "Payment amount",
  package_name: "Package or plan name",
  invoice_url: "Invoice download link",
}

const VARIABLE_CATEGORIES: { label: string; variables: string[] }[] = [
  { label: "Identity", variables: ["name", "first_name", "last_name", "email", "company_name"] },
  { label: "Links", variables: ["verify_url", "reset_url", "job_url", "review_url", "alert_url", "billing_url", "hosted_url", "invoice_url"] },
  { label: "Jobs", variables: ["job_title", "job_count", "search_name", "jobs"] },
  { label: "Alerts", variables: ["severity", "alert_type", "subject_name", "description", "indicators", "rule_name"] },
  { label: "Billing", variables: ["amount", "package_name", "coupon_code", "discount_amount", "expiry_date"] },
  { label: "Other", variables: ["status", "reason", "ip_address", "location", "time", "content", "current_year"] },
]

const STATUS_CONFIG: Record<TemplateStatus, { label: string; className: string; dotColor: string }> = {
  Published: { label: "Published", className: "bg-green-100 text-green-700 border-green-200", dotColor: "bg-green-500" },
  Draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200", dotColor: "bg-gray-400" },
  Archived: { label: "Archived", className: "bg-amber-100 text-amber-700 border-amber-200", dotColor: "bg-amber-500" },
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EmailTemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = Number(params.id)

  // Template data
  const [template, setTemplate] = useState<EmailTemplateDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editor state
  const [editSubject, setEditSubject] = useState("")
  const [editPreheader, setEditPreheader] = useState("")
  const [editHtml, setEditHtml] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Preview
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [previewHtml, setPreviewHtml] = useState("")

  // Actions
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Dialogs
  const [confirmAction, setConfirmAction] = useState<"publish" | "unpublish" | "archive" | "delete" | null>(null)
  const [testSendOpen, setTestSendOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<EmailTemplateVersion[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  // Active variable category
  const [activeVarCategory, setActiveVarCategory] = useState(VARIABLE_CATEGORIES[0].label)

  // Derive state
  const hasChanges = useMemo(() => {
    if (!template) return false
    return (
      editSubject !== template.subject ||
      editPreheader !== template.preheader ||
      editHtml !== template.html
    )
  }, [template, editSubject, editPreheader, editHtml])

  const statusConfig = template ? (STATUS_CONFIG[template.status] || STATUS_CONFIG.Draft) : STATUS_CONFIG.Draft

  // Debounced preview
  useEffect(() => {
    const timer = setTimeout(() => setPreviewHtml(editHtml), 300)
    return () => clearTimeout(timer)
  }, [editHtml])

  // Fetch template
  const fetchTemplate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const detail = await getEmailTemplate(templateId)
      setTemplate(detail)
      setEditSubject(detail.subject)
      setEditPreheader(detail.preheader)
      setEditHtml(detail.html)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template")
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasChanges])

  // Handlers
  const handleSave = async () => {
    if (!template) return
    setIsSaving(true)
    try {
      await updateEmailTemplate(template.id, {
        subject: editSubject,
        preheader: editPreheader,
        html: editHtml,
      })
      const refreshed = await getEmailTemplate(template.id)
      setTemplate(refreshed)
      setEditSubject(refreshed.subject)
      setEditPreheader(refreshed.preheader)
      setEditHtml(refreshed.html)
      setVersions([])
      toast.success("Template saved")
    } catch {
      toast.error("Failed to save template")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!template) return
    setIsPublishing(true)
    try {
      // Save first if there are changes
      if (hasChanges) {
        await updateEmailTemplate(template.id, {
          subject: editSubject,
          preheader: editPreheader,
          html: editHtml,
        })
      }
      await publishEmailTemplate(template.id)
      const refreshed = await getEmailTemplate(template.id)
      setTemplate(refreshed)
      setEditSubject(refreshed.subject)
      setEditPreheader(refreshed.preheader)
      setEditHtml(refreshed.html)
      setConfirmAction(null)
      toast.success("Template published")
    } catch {
      toast.error("Failed to publish template")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!template) return
    try {
      await unpublishEmailTemplate(template.id)
      const refreshed = await getEmailTemplate(template.id)
      setTemplate(refreshed)
      setConfirmAction(null)
      toast.success("Template unpublished")
    } catch {
      toast.error("Failed to unpublish template")
    }
  }

  const handleArchive = async () => {
    if (!template) return
    try {
      await archiveEmailTemplate(template.id)
      setConfirmAction(null)
      toast.success("Template archived")
      router.push("/admin/email/templates")
    } catch {
      toast.error("Failed to archive template")
    }
  }

  const handleDuplicate = async () => {
    if (!template) return
    try {
      const duplicated = await duplicateEmailTemplate(template.id)
      toast.success("Template duplicated")
      router.push(`/admin/email/templates/${duplicated.id}`)
    } catch {
      toast.error("Failed to duplicate template")
    }
  }

  const handleDelete = async () => {
    if (!template) return
    try {
      await deleteEmailTemplate(template.id)
      setConfirmAction(null)
      toast.success("Template deleted")
      router.push("/admin/email/templates")
    } catch {
      toast.error("Failed to delete template")
    }
  }

  const handleSendTest = async () => {
    if (!template || !testEmail) return
    setIsSendingTest(true)
    try {
      const providers = await getEmailProviders()
      const active = providers.find((p) => p.connected && p.status === "active")
      if (!active) {
        toast.error("No active email provider configured")
        setIsSendingTest(false)
        return
      }
      const result = await testProvider(active.id, {
        templateSlug: template.slug,
        recipientEmail: testEmail,
      })
      if (result.success) {
        toast.success(result.message || `Test email sent to ${testEmail}`)
        setTestEmail("")
        setTestSendOpen(false)
      } else {
        toast.error(result.message || "Test email failed to send")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email")
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleLoadVersions = async () => {
    if (!template) return
    setVersionHistoryOpen(true)
    if (versions.length > 0) return
    setIsLoadingVersions(true)
    try {
      const data = await getEmailTemplateVersions(template.id)
      setVersions(data)
    } catch {
      toast.error("Failed to load version history")
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleRestoreVersion = (version: EmailTemplateVersion) => {
    setEditSubject(version.subject)
    setEditPreheader(version.preheader)
    setEditHtml(version.html)
    setVersionHistoryOpen(false)
    toast.success(`Restored to version ${version.version}. Save to persist.`)
  }

  const insertVariable = (varName: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const insertion = `{{ ${varName} }}`
    const newHtml = editHtml.slice(0, start) + insertion + editHtml.slice(end)
    setEditHtml(newHtml)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + insertion.length, start + insertion.length)
    })
  }

  const copyHtml = () => {
    navigator.clipboard.writeText(editHtml).then(() => toast.success("HTML copied to clipboard")).catch(() => toast.error("Failed to copy"))
  }

  // Available variables based on template
  const templateVariables = template?.variables || []

  // Filter variable categories to only show variables this template uses + all available
  const activeCategory = VARIABLE_CATEGORIES.find((c) => c.label === activeVarCategory)
  const displayedVariables = activeCategory
    ? activeCategory.variables.filter((v) => templateVariables.includes(v) || templateVariables.length === 0)
    : []

  // Confirm dialog content
  const confirmDialogConfig: Record<string, { title: string; description: string; action: string; variant: "default" | "destructive" }> = {
    publish: { title: "Publish Template", description: "This will make the template active and available for use in triggers and campaigns.", action: "Publish", variant: "default" },
    unpublish: { title: "Unpublish Template", description: "This will revert the template to Draft status. It will no longer be used in active triggers.", action: "Unpublish", variant: "default" },
    archive: { title: "Archive Template", description: "This will archive the template and remove it from active use. You can restore it later.", action: "Archive", variant: "default" },
    delete: { title: "Delete Template", description: "This will permanently delete this template. This action cannot be undone.", action: "Delete", variant: "destructive" },
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4 h-[calc(100vh-260px)]">
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold">{error || "Template not found"}</h2>
          <Button variant="outline" onClick={() => router.push("/admin/email/templates")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Templates
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col h-[calc(100vh-56px)]">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="border-b bg-background/95 backdrop-blur px-6 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/email">Email</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/email/templates">Templates</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{template.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
              <Link href="/admin/email/templates">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold truncate">{template.name}</h1>
                <Badge variant="outline" className={cn("text-xs shrink-0", statusConfig.className)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full mr-1", statusConfig.dotColor)} />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono shrink-0">{template.slug}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {template.type} &middot; Updated {template.lastUpdated}
                <AnimatePresence>
                  {hasChanges && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-amber-600 ml-2 inline-flex items-center gap-1"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Unsaved changes
                    </motion.span>
                  )}
                </AnimatePresence>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save */}
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>

            {/* Lifecycle Actions */}
            {template.status === "Draft" && (
              <Button size="sm" onClick={() => setConfirmAction("publish")} disabled={isPublishing}>
                <Upload className="h-4 w-4 mr-1.5" />
                Publish
              </Button>
            )}
            {template.status === "Published" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Status <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setConfirmAction("unpublish")}>
                    <Clock className="h-4 w-4 mr-2" /> Unpublish (→ Draft)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmAction("archive")}>
                    <Archive className="h-4 w-4 mr-2" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {template.status === "Archived" && (
              <Button size="sm" variant="outline" onClick={() => setConfirmAction("unpublish")}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Restore to Draft
              </Button>
            )}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTestSendOpen(true)}>
                  <Send className="h-4 w-4 mr-2" /> Send Test
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLoadVersions}>
                  <History className="h-4 w-4 mr-2" /> Version History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => setConfirmAction("delete")}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Subject & Preheader Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 px-6 py-3 border-b bg-muted/20 flex-shrink-0">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject Line</Label>
          <div className="relative">
            <Input
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              placeholder="Email subject..."
              className="pr-12 h-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 tabular-nums">
              {editSubject.length}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preheader <span className="font-normal">(preview text)</span></Label>
          <div className="relative">
            <Input
              value={editPreheader}
              onChange={(e) => setEditPreheader(e.target.value)}
              placeholder="Preview text shown in inbox..."
              className="pr-16 h-9"
            />
            <span className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums",
              editPreheader.length > 0 && editPreheader.length < 40 ? "text-amber-500" : "text-muted-foreground/50"
            )}>
              {editPreheader.length}/130
            </span>
          </div>
        </div>
      </motion.div>

      {/* Split Pane: Code + Preview */}
      <motion.div variants={itemVariants} className="flex-1 flex min-h-0">
        {/* Left Pane: Code Editor */}
        <div className="flex-1 flex flex-col border-r min-w-0">
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">HTML</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {editHtml.split("\n").length} lines
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={copyHtml}>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>

          {/* Code Editor */}
          <ScrollArea className="flex-1">
            <Textarea
              ref={textareaRef}
              value={editHtml}
              onChange={(e) => setEditHtml(e.target.value)}
              className="min-h-full resize-none font-mono text-sm leading-relaxed border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
              placeholder="Enter your email HTML here..."
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault()
                  const start = e.currentTarget.selectionStart
                  const end = e.currentTarget.selectionEnd
                  const newHtml = editHtml.slice(0, start) + "  " + editHtml.slice(end)
                  setEditHtml(newHtml)
                  requestAnimationFrame(() => {
                    e.currentTarget.setSelectionRange(start + 2, start + 2)
                  })
                }
                // Save shortcut
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault()
                  if (hasChanges) handleSave()
                }
              }}
            />
          </ScrollArea>
        </div>

        {/* Right Pane: Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 bg-muted p-0.5 rounded-md">
                <Button
                  size="sm"
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  onClick={() => setPreviewDevice("desktop")}
                  className="h-6 px-2 text-xs"
                >
                  <Monitor className="h-3 w-3 mr-1" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  onClick={() => setPreviewDevice("mobile")}
                  className="h-6 px-2 text-xs"
                >
                  <Smartphone className="h-3 w-3 mr-1" /> Mobile
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Frame */}
          <div className={cn(
            "flex-1 overflow-auto",
            previewDevice === "mobile" ? "bg-muted/30 flex items-start justify-center p-6" : "bg-white"
          )}>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                title="Email Preview"
                sandbox=""
                className={cn(
                  "border-0",
                  previewDevice === "desktop"
                    ? "w-full h-full"
                    : "w-[375px] h-[667px] border rounded-2xl shadow-xl bg-white"
                )}
                style={{ minHeight: previewDevice === "desktop" ? 600 : undefined }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Start typing HTML to see a preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Variable Toolbar */}
      <motion.div variants={itemVariants} className="border-t bg-muted/20 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Variables:</span>
          {/* Category pills */}
          <div className="flex items-center gap-1 shrink-0">
            {VARIABLE_CATEGORIES.map((cat) => {
              const hasVars = cat.variables.some((v) => templateVariables.includes(v) || templateVariables.length === 0)
              if (!hasVars) return null
              return (
                <Button
                  key={cat.label}
                  size="sm"
                  variant={activeVarCategory === cat.label ? "secondary" : "ghost"}
                  onClick={() => setActiveVarCategory(cat.label)}
                  className="h-6 px-2 text-[11px]"
                >
                  {cat.label}
                </Button>
              )
            })}
          </div>
          <Separator orientation="vertical" className="h-4" />
          {/* Variable chips */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {displayedVariables.map((v) => (
                <Tooltip key={v}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => insertVariable(v)}
                      className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-mono cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors whitespace-nowrap"
                    >
                      {`{{ ${v} }}`}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{VARIABLE_DESCRIPTIONS[v] || "Template variable"}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {displayedVariables.length === 0 && (
                <span className="text-xs text-muted-foreground">No variables in this category</span>
              )}
            </div>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialogConfig[confirmAction].title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialogConfig[confirmAction].description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmAction === "publish") handlePublish()
                  else if (confirmAction === "unpublish") handleUnpublish()
                  else if (confirmAction === "archive") handleArchive()
                  else if (confirmAction === "delete") handleDelete()
                }}
                className={confirmDialogConfig[confirmAction].variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                {confirmDialogConfig[confirmAction].action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Test Send Dialog */}
      <Dialog open={testSendOpen} onOpenChange={setTestSendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Send a test email using the active provider with this template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTest} disabled={isSendingTest || !testEmail}>
              <Send className="h-4 w-4 mr-1.5" />
              {isSendingTest ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Sheet */}
      <Sheet open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>Previous versions of this template</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {isLoadingVersions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No previous versions</p>
              </div>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-mono">v{v.version}</Badge>
                      {v.version === (template?.version || 0) && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.savedAt} &middot; {v.savedBy}
                    </p>
                  </div>
                  {v.version !== (template?.version || 0) && (
                    <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(v)}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Restore
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}

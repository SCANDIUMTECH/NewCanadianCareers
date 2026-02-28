"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Check,
  X,
  Eye,
  EyeOff,
  Pause,
  Play,
  Trash2,
  Edit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink,
  Flag,
  Settings,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Download,
  RefreshCw,
  Star,
  CalendarPlus,
  Mail,
  Loader2,
  AlertCircle,
  Briefcase,
  Printer,
  FileSpreadsheet,
  Upload,
  MoreHorizontal,
  Ban,
  CreditCard,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, getCompanyInitials } from "@/lib/utils"
import { toast } from "sonner"
import {
  getAdminJobs,
  getAdminJobStats,
  approveJob,
  rejectJob,
  pauseJob,
  resumeJob,
  hideJob,
  extendJobExpiration,
  bulkJobAction,
  preApproveCheck,
  exportAdminJobs,
  contactJobPoster,
  getJobReports,
  dismissJobReport,
  actionJobReport,
  getTrashedJobs,
  restoreJob,
  markJobFilled,
  emptyTrash,
  permanentDeleteJob,
  trashJob,
} from "@/lib/api/admin-jobs"
import type {
  AdminJob,
  AdminJobStats,
  AdminJobFilters,
  AdminJobReport,
  AdminJobStatus,
  AdminJobLocationType,
  PreApproveCheckResponse,
} from "@/lib/admin/types"
import { ImportJobsDialog } from "@/components/admin/import-jobs-dialog"
import { JobPolicySettingsDialog } from "@/components/admin/job-policy-settings-dialog"

// Status config (used in mobile card badges)
const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending_payment: { label: "Pending Payment", color: "bg-orange-100 text-orange-700", icon: CreditCard },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700", icon: Clock },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: Check },
  paused: { label: "Paused", color: "bg-blue-100 text-blue-700", icon: Pause },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-600", icon: Clock },
  filled: { label: "Filled", color: "bg-teal-100 text-teal-700", icon: CheckCircle },
  hidden: { label: "Hidden", color: "bg-red-100 text-red-700", icon: EyeOff },
}

// Status dot config (used in desktop table rows)
const statusDotConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-gray-400", label: "Draft" },
  pending: { color: "bg-amber-500", label: "Pending Review" },
  pending_payment: { color: "bg-orange-500", label: "Pending Payment" },
  scheduled: { color: "bg-purple-500", label: "Scheduled" },
  published: { color: "bg-emerald-500", label: "Published" },
  paused: { color: "bg-blue-500", label: "Paused" },
  expired: { color: "bg-gray-400", label: "Expired" },
  filled: { color: "bg-teal-500", label: "Filled" },
  hidden: { color: "bg-red-500", label: "Hidden" },
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// Consolidated column system
type ColumnKey = "postedBy" | "engagement" | "applications" | "expiry" | "location" | "salary" | "reports"

const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; width: string; sortField?: SortField }> = {
  postedBy:     { label: "Posted By",    width: "minmax(0, 1.2fr)" },
  engagement:   { label: "Views",        width: "minmax(80px, 0.7fr)", sortField: "views" },
  applications: { label: "Applications", width: "minmax(80px, 0.7fr)", sortField: "applications_count" },
  expiry:       { label: "Expires",      width: "minmax(100px, 0.8fr)", sortField: "expires_at" },
  location:     { label: "Location",     width: "minmax(0, 1fr)" },
  salary:       { label: "Salary",       width: "minmax(0, 1fr)" },
  reports:      { label: "Reports",      width: "minmax(60px, 0.5fr)", sortField: "report_count" },
}

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: "postedBy",     label: "Posted By" },
  { key: "engagement",   label: "Views" },
  { key: "applications", label: "Applications" },
  { key: "expiry",       label: "Expiry" },
  { key: "location",     label: "Location" },
  { key: "salary",       label: "Salary" },
  { key: "reports",      label: "Reports" },
]

// Sortable columns matching backend ordering_fields
type SortField = "posted_at" | "expires_at" | "views" | "applications_count" | "report_count"
type SortDirection = "asc" | "desc"

// Date formatter — always show actual date (e.g. "Feb 20, 2026")
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Deterministic avatar colors for initials fallback
const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-fuchsia-600", "bg-teal-600",
  "bg-indigo-600", "bg-orange-600", "bg-lime-600", "bg-sky-600",
]

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function JobsManagementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <JobsManagementContent />
    </Suspense>
  )
}

function JobsManagementContent() {
  const searchParams = useSearchParams()

  // Data state
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [stats, setStats] = useState<AdminJobStats | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Filter state — initialize from URL params if present
  const [activeTab, setActiveTab] = useState(() => {
    const status = searchParams.get("status")
    if (status === "draft") return "draft"
    if (status === "published") return "published"
    if (status === "pending") return "pending"
    if (status === "pending_payment") return "pending_payment"
    if (status === "flagged") return "flagged"
    if (status === "expired") return "expired"
    if (status === "trash") return "trash"
    return "all"
  })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("company") || searchParams.get("q") || "")
  const [statusFilter, setStatusFilter] = useState<AdminJobStatus[]>(() => {
    const status = searchParams.get("status")
    if (status && !["published", "pending", "pending_payment", "flagged", "expired", "trash"].includes(status)) {
      return [status as AdminJobStatus]
    }
    return []
  })
  const [locationTypeFilter, setLocationTypeFilter] = useState<AdminJobLocationType[]>([])
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("company") || searchParams.get("q") || "")

  // UI state
  const [groupBy, setGroupBy] = useState<"none" | "company" | "agency">("none")
  const [selectedJobs, setSelectedJobs] = useState<number[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "postedBy", "engagement", "applications", "expiry"
  ])
  const [sortField, setSortField] = useState<SortField>("posted_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Dynamic grid template based on visible columns
  const gridTemplate = useMemo(() => {
    const parts = ["36px", "minmax(0, 2.5fr)"] // checkbox + job (always)
    visibleColumns.forEach(col => {
      parts.push(COLUMN_DEFINITIONS[col].width)
    })
    return parts.join(" ")
  }, [visibleColumns])

  // Dialog states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: string
    jobs: AdminJob[]
  }>({ open: false, action: "", jobs: [] })
  const [actionReason, setActionReason] = useState("")
  const [approveDateOption, setApproveDateOption] = useState<"created" | "today" | "custom">("today")
  const [approveCustomDate, setApproveCustomDate] = useState<Date | undefined>()
  const [creditCheck, setCreditCheck] = useState<PreApproveCheckResponse | null>(null)
  const [creditCheckLoading, setCreditCheckLoading] = useState(false)
  const actionDialogRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Empty trash dialog state
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")
  const [exportScope, setExportScope] = useState<"all" | "filtered" | "selected">("filtered")
  const [exportFields, setExportFields] = useState<string[]>(["title", "company", "status", "location", "salary", "posted", "views", "applications"])

  // Extend expiration dialog state
  const [extendingJob, setExtendingJob] = useState<AdminJob | null>(null)
  const [newExpirationDate, setNewExpirationDate] = useState<Date | undefined>()
  const [extendReason, setExtendReason] = useState("")
  const [extendDialogNode, setExtendDialogNode] = useState<HTMLDivElement | null>(null)

  // View reports dialog state
  const [viewingReportsFor, setViewingReportsFor] = useState<AdminJob | null>(null)
  const [reports, setReports] = useState<AdminJobReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)

  // Contact poster dialog state
  const [contactingPosterFor, setContactingPosterFor] = useState<AdminJob | null>(null)
  const [contactSubject, setContactSubject] = useState("")
  const [contactTemplate, setContactTemplate] = useState("")
  const [contactMessage, setContactMessage] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Trash tab uses a separate endpoint
      if (activeTab === "trash") {
        const response = await getTrashedJobs()
        setJobs(response.results)
        setTotalCount(response.count)
        return
      }

      const filters: AdminJobFilters = {
        page: currentPage,
        page_size: pageSize,
        ordering: sortDirection === "desc" ? `-${sortField}` : sortField,
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (statusFilter.length === 1) filters.status = statusFilter[0]
      if (locationTypeFilter.length === 1) filters.location_type = locationTypeFilter[0]

      // Dropdown-based filters
      if (activeTab === "all") filters.include_trashed = true
      if (activeTab === "draft") filters.status = "draft"
      if (activeTab === "published") filters.status = "published"
      if (activeTab === "pending") filters.status = "pending"
      if (activeTab === "pending_payment") filters.status = "pending_payment"
      if (activeTab === "flagged") filters.has_reports = true
      if (activeTab === "expired") filters.status = "expired"

      const response = await getAdminJobs(filters)
      setJobs(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, locationTypeFilter, activeTab, sortField, sortDirection])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminJobStats()
      setStats(data)
    } catch {
      console.error("Failed to load job stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, locationTypeFilter, activeTab, pageSize])

  // Group jobs for display
  const groupedJobs = useMemo(() => {
    if (groupBy === "none") {
      return { ungrouped: jobs }
    }

    const groups: Record<string, AdminJob[]> = {}

    jobs.forEach(job => {
      let key: string
      if (groupBy === "company") {
        key = job.company.name
      } else if (groupBy === "agency") {
        key = job.agency?.name || "Direct (No Agency)"
      } else {
        key = "ungrouped"
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(job)
    })

    return groups
  }, [jobs, groupBy])

  // Toggle group expansion
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  // Select all in view
  const selectAllVisible = () => {
    const visibleIds = jobs.map(j => j.id)
    setSelectedJobs(prev => {
      const allSelected = visibleIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !visibleIds.includes(id))
      }
      return [...new Set([...prev, ...visibleIds])]
    })
  }

  // Open action dialog (single or bulk) with pre-flight credit check
  const openActionDialog = useCallback((action: string, jobsList: AdminJob[]) => {
    setCreditCheck(null)
    setCreditCheckLoading(false)
    setActionDialog({ open: true, action, jobs: jobsList })

    // Pre-flight credit check for approve actions
    if (action === "approve" && jobsList.length > 0) {
      setCreditCheckLoading(true)
      preApproveCheck(jobsList.map(j => j.id))
        .then(setCreditCheck)
        .catch(() => setCreditCheck(null))
        .finally(() => setCreditCheckLoading(false))
    }
  }, [])

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    const selectedJobsList = jobs.filter(j => selectedJobs.includes(j.id))
    openActionDialog(action, selectedJobsList)
  }

  // Execute action
  const executeAction = async () => {
    if (!actionDialog.action || actionDialog.jobs.length === 0) return

    setActionLoading("action")
    try {
      const jobIds = actionDialog.jobs.map(j => j.id)

      if (actionDialog.jobs.length === 1) {
        // Single job action
        const jobId = jobIds[0]
        switch (actionDialog.action) {
          case "approve": {
            let postedAt: string | undefined
            if (approveDateOption === "created") {
              postedAt = actionDialog.jobs[0].created_at
            } else if (approveDateOption === "custom" && approveCustomDate) {
              postedAt = approveCustomDate.toISOString()
            }
            // "today" → postedAt stays undefined → backend defaults to timezone.now()
            await approveJob(jobId, { reason: actionReason, posted_at: postedAt })
            break
          }
          case "reject":
            await rejectJob(jobId, { reason: actionReason, notify_poster: true })
            break
          case "pause":
            await pauseJob(jobId)
            break
          case "resume":
            await resumeJob(jobId)
            break
          case "hide":
            await hideJob(jobId, actionReason)
            break
          case "restore":
            await restoreJob(jobId)
            break
          case "delete":
            await trashJob(jobId)
            break
          case "mark_filled":
            await markJobFilled(jobId)
            break
        }
      } else {
        // Bulk action
        const result = await bulkJobAction({
          job_ids: jobIds,
          action: actionDialog.action as 'approve' | 'reject' | 'pause' | 'resume' | 'hide' | 'delete',
          reason: actionReason,
        })

        // Show detailed toast for bulk approve with skipped jobs
        if (actionDialog.action === "approve" && result.skipped_no_credits?.length) {
          const skippedNames = result.skipped_no_credits
            .map(s => `${s.title} (${s.entity_name})`)
            .join(", ")
          toast.warning(
            `Approved ${result.approved_count} of ${result.total_requested} jobs. ` +
            `${result.skipped_no_credits.length} skipped due to insufficient credits: ${skippedNames}`,
            { duration: 8000 }
          )
        }
      }

      setActionDialog({ open: false, action: "", jobs: [] })
      setActionReason("")
      setApproveDateOption("today")
      setApproveCustomDate(undefined)
      setCreditCheck(null)
      setSelectedJobs([])
      fetchJobs()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform action")
    } finally {
      setActionLoading(null)
    }
  }

  // Handle sync (refresh data)
  const handleSync = async () => {
    setIsSyncing(true)
    await Promise.all([fetchJobs(), fetchStats()])
    setIsSyncing(false)
  }

  // Handle export
  const handleExport = async () => {
    setActionLoading("export")
    try {
      const filters: AdminJobFilters = {}
      if (exportScope === "filtered") {
        if (debouncedSearch) filters.search = debouncedSearch
        if (statusFilter.length === 1) filters.status = statusFilter[0]
      }
      // Note: selected scope would need backend support for job_ids filter

      const blob = await exportAdminJobs(filters, exportFormat)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jobs-export.${exportFormat}`
      a.click()
      window.URL.revokeObjectURL(url)
      setExportDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export jobs")
    } finally {
      setActionLoading(null)
    }
  }


  // Handle extend expiration
  const handleExtendExpiration = async () => {
    if (!extendingJob || !newExpirationDate) return
    setActionLoading("extend")
    try {
      await extendJobExpiration(extendingJob.id, {
        expires_at: newExpirationDate.toISOString(),
        reason: extendReason,
      })
      setExtendingJob(null)
      setNewExpirationDate(undefined)
      setExtendReason("")
      fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend expiration")
    } finally {
      setActionLoading(null)
    }
  }

  // Handle view reports
  const handleViewReports = async (job: AdminJob) => {
    setViewingReportsFor(job)
    setReportsLoading(true)
    try {
      const data = await getJobReports(job.id)
      setReports(data)
    } catch (err) {
      console.error("Failed to load reports:", err)
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  // Handle report action
  const handleReportAction = async (reportId: number, action: "dismiss" | "take_action") => {
    if (!viewingReportsFor) return
    setActionLoading(`report-${reportId}`)
    try {
      if (action === "dismiss") {
        await dismissJobReport(viewingReportsFor.id, reportId)
      } else {
        await actionJobReport(viewingReportsFor.id, reportId, "hide")
      }
      // Refresh reports
      const data = await getJobReports(viewingReportsFor.id)
      setReports(data)
      fetchJobs()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process report")
    } finally {
      setActionLoading(null)
    }
  }

  // Handle contact poster
  const handleContactPoster = async () => {
    if (!contactingPosterFor || !contactSubject || !contactMessage) return
    setActionLoading("contact")
    try {
      await contactJobPoster(contactingPosterFor.id, {
        subject: contactSubject,
        message: contactMessage,
        template: contactTemplate || undefined,
      })
      setContactingPosterFor(null)
      setContactSubject("")
      setContactTemplate("")
      setContactMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setActionLoading(null)
    }
  }


  // Empty trash
  const handleEmptyTrash = async () => {
    setActionLoading("empty-trash")
    try {
      const result = await emptyTrash()
      toast.success(`${result.count} trashed job${result.count !== 1 ? "s" : ""} permanently deleted`)
      setEmptyTrashDialogOpen(false)
      fetchJobs()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to empty trash")
    } finally {
      setActionLoading(null)
    }
  }

  // Permanent delete single job
  const handlePermanentDelete = async (job: AdminJob) => {
    setActionLoading(`perm-delete-${job.id}`)
    try {
      await permanentDeleteJob(job.id)
      toast.success(`"${job.title}" permanently deleted`)
      fetchJobs()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to permanently delete job")
    } finally {
      setActionLoading(null)
    }
  }

  // Format salary
  const formatSalary = (job: AdminJob) => {
    if (!job.salary_min || !job.salary_max) return "Not specified"
    const cur = job.salary_currency || "CAD"
    const locale = cur === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`
  }

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = "desc"
    if (sortField === field) {
      newDirection = sortDirection === "desc" ? "asc" : "desc"
    }
    setSortField(field)
    setSortDirection(newDirection)
    setCurrentPage(1)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
    if (sortDirection === "asc") return <ArrowUp className="w-3 h-3" />
    return <ArrowDown className="w-3 h-3" />
  }

  // Bulk export handler (CSV / Excel)
  const handleBulkExport = async (fmt: "csv" | "xlsx") => {
    setActionLoading("export")
    try {
      const filters: AdminJobFilters = {}
      if (debouncedSearch) filters.search = debouncedSearch
      if (statusFilter.length === 1) filters.status = statusFilter[0]
      if (activeTab === "pending") filters.status = "pending"
      if (activeTab === "flagged") filters.has_reports = true
      if (activeTab === "expired") filters.status = "expired"

      const blob = await exportAdminJobs(filters, fmt)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jobs-export.${fmt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${totalCount.toLocaleString()} jobs as ${fmt.toUpperCase()}`)
    } catch {
      toast.error("Failed to export jobs.")
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk print handler
  const handleBulkPrint = () => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const selectedJobsList = jobs.filter(j => selectedJobs.includes(j.id))
    const rows = selectedJobsList.length > 0 ? selectedJobsList : jobs
    const header = "Title\tCompany\tStatus\tLocation\tViews\tApplications\tPosted"
    const printContent = rows
      .map(
        (j) =>
          `${j.title}\t${j.company.name}\t${statusConfig[j.status].label}\t${j.location || "—"}\t${j.views.toLocaleString()}\t${j.applications.toLocaleString()}\t${j.posted_at ? new Date(j.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}`
      )
      .join("\n")
    const win = window.open("", "_blank")
    if (win) {
      win.document.write(`<html><head><title>Jobs Report</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb}th{font-weight:600;background:#f9fafb;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;color:#6b7280}td{color:#111827}h1{font-size:18px;margin-bottom:16px;font-weight:600}</style></head><body>`)
      win.document.write(`<h1>Jobs Report</h1><p style="color:#6b7280;font-size:13px;margin-bottom:16px">${esc(rows.length.toLocaleString())} jobs · Generated ${esc(new Date().toLocaleDateString())}</p>`)
      win.document.write("<table><thead><tr>")
      header.split("\t").forEach((h) => win.document.write(`<th>${esc(h)}</th>`))
      win.document.write("</tr></thead><tbody>")
      printContent.split("\n").forEach((row) => {
        win.document.write("<tr>")
        row.split("\t").forEach((cell) => {
          win.document.write(`<td>${esc(cell)}</td>`)
        })
        win.document.write("</tr>")
      })
      win.document.write("</tbody></table></body></html>")
      win.document.close()
      win.print()
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Jobs Management</h1>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                  {totalCount.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage, moderate, and configure job postings platform-wide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Job Policies
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-red-600 hover:text-red-700"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Jobs"
              value={stats?.total || 0}
              icon={<FileText className="h-4 w-4" />}
              gradient="from-slate-600 to-slate-800"
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              subtitle={stats ? `${stats.draft} draft · ${stats.expired} expired` : undefined}
            />
            <StatCard
              title="Needs Review"
              value={(stats?.pending || 0) + (stats?.flagged || 0)}
              color="amber"
              icon={<AlertTriangle className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
              urgent
              subtitle={stats ? `${stats.pending} pending · ${stats.flagged} flagged` : undefined}
            />
            <StatCard
              title="Published"
              value={stats?.published || 0}
              color="green"
              icon={<Check className="h-4 w-4" />}
              gradient="from-green-500 to-emerald-600"
              active={activeTab === "published"}
              onClick={() => setActiveTab("published")}
              subtitle={stats ? `${stats.featured} featured · ${stats.paused} paused` : undefined}
            />
            <StatCard
              title="Flagged"
              value={stats?.flagged || 0}
              color="red"
              icon={<Flag className="h-4 w-4" />}
              gradient="from-red-500 to-rose-600"
              active={activeTab === "flagged"}
              onClick={() => setActiveTab("flagged")}
              urgent
              subtitle={stats?.trashed ? `${stats.trashed} in trash` : undefined}
            />
          </>
        )}
      </motion.div>

      {/* Filters & Table */}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="draft">
                  Draft{stats?.draft ? ` (${stats.draft})` : ""}
                </SelectItem>
                <SelectItem value="published">
                  Published{stats?.published ? ` (${stats.published})` : ""}
                </SelectItem>
                <SelectItem value="pending">
                  Pending Review{stats?.pending ? ` (${stats.pending})` : ""}
                </SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="flagged">
                  Flagged{stats?.flagged ? ` (${stats.flagged})` : ""}
                </SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="trash">
                  Trash{stats?.trashed ? ` (${stats.trashed})` : ""}
                </SelectItem>
              </SelectContent>
            </Select>

            {activeTab === "trash" && stats && stats.trashed > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setEmptyTrashDialogOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Empty Trash
              </Button>
            )}
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative w-full lg:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-full lg:w-[200px]"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <Filter className="w-4 h-4 mr-2" />
                    Status
                    {statusFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {statusFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={statusFilter.includes(key as AdminJobStatus)}
                      onCheckedChange={checked => {
                        setStatusFilter(prev =>
                          checked ? [...prev, key as AdminJobStatus] : prev.filter(s => s !== key)
                        )
                      }}
                    >
                      {config.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Location Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                    {locationTypeFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {locationTypeFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["remote", "onsite", "hybrid"] as AdminJobLocationType[]).map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={locationTypeFilter.includes(type)}
                      onCheckedChange={checked => {
                        setLocationTypeFilter(prev =>
                          checked ? [...prev, type] : prev.filter(t => t !== type)
                        )
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Group By */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Group: </span>{groupBy === "none" ? "None" : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupBy("none")}>No Grouping</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("company")}>By Company</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("agency")}>By Agency</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0 hidden sm:flex">
                    <Columns className="w-4 h-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {COLUMN_OPTIONS.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibleColumns.includes(col.key)}
                      onCheckedChange={checked => {
                        setVisibleColumns(prev =>
                          checked ? [...prev, col.key] : prev.filter(c => c !== col.key)
                        )
                      }}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Rows per page */}
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="h-8 w-[68px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {[20, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedJobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 sm:py-2 mb-4"
            >
              <span className="text-sm font-medium">
                {selectedJobs.length.toLocaleString()} job{selectedJobs.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {activeTab === "trash" ? (
                  <>
                    {/* Trash-only actions */}
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("restore")} className="h-7 gap-1.5 text-xs flex-shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs text-red-600 bg-transparent flex-shrink-0"
                      onClick={() => setEmptyTrashDialogOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Empty Trash</span>
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Moderation actions */}
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("approve")} className="h-7 gap-1.5 text-xs flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Approve</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("pause")} className="h-7 gap-1.5 text-xs flex-shrink-0">
                      <Pause className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pause</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("hide")} className="h-7 gap-1.5 text-xs flex-shrink-0">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hide</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs text-red-600 bg-transparent flex-shrink-0" onClick={() => handleBulkAction("delete")}>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </>
                )}

                <div className="h-4 w-px bg-border mx-0.5" />

                {/* Export & Print actions */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={() => handleBulkExport("csv")}
                  disabled={actionLoading === "export"}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={() => handleBulkExport("xlsx")}
                  disabled={actionLoading === "export"}
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={handleBulkPrint}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </Button>

                <div className="h-4 w-px bg-border mx-0.5" />

                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground flex-shrink-0" onClick={() => setSelectedJobs([])}>
                  Clear
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jobs Table */}
        <div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table Header */}
            <div
              className="hidden sm:grid gap-4 px-4 py-2.5 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground items-center"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div>
                <Checkbox
                  checked={jobs.length > 0 && jobs.every(j => selectedJobs.includes(j.id))}
                  onCheckedChange={() => selectAllVisible()}
                />
              </div>
              <div>
                <button
                  onClick={() => handleSort("posted_at")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Job
                  {getSortIcon("posted_at")}
                </button>
              </div>
              {visibleColumns.map(col => {
                const def = COLUMN_DEFINITIONS[col]
                if (def.sortField) {
                  return (
                    <div key={col}>
                      <button
                        onClick={() => handleSort(def.sortField!)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {def.label}
                        {getSortIcon(def.sortField!)}
                      </button>
                    </div>
                  )
                }
                return <div key={col}>{def.label}</div>
              })}
            </div>

            {/* Mobile header */}
            <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={jobs.length > 0 && jobs.every(j => selectedJobs.includes(j.id))}
                  onCheckedChange={() => selectAllVisible()}
                />
                <span className="text-sm font-medium text-muted-foreground">Select All</span>
              </div>
              <span className="text-sm text-muted-foreground">{totalCount.toLocaleString()} jobs</span>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                ))
              ) : jobs.length === 0 ? (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  No jobs found matching your criteria
                </div>
              ) : groupBy === "none" ? (
                // Flat list
                jobs.map((job, index) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    index={index}
                    selected={selectedJobs.includes(job.id)}
                    onSelect={id => {
                      setSelectedJobs(prev =>
                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                      )
                    }}
                    visibleColumns={visibleColumns}
                    formatSalary={formatSalary}
                    onAction={(action, j) => openActionDialog(action, [j])}
                    onPermanentDelete={handlePermanentDelete}
                    onExtendExpiration={setExtendingJob}
                    onViewReports={handleViewReports}
                    onContactPoster={setContactingPosterFor}
                    actionLoading={actionLoading}
                    gridTemplate={gridTemplate}
                    selectedJobsCount={selectedJobs.length}
                    isTrashView={activeTab === "trash"}
                  />
                ))
              ) : (
                // Grouped list
                Object.entries(groupedJobs).map(([groupName, groupJobs]) => (
                  <div key={groupName}>
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      {expandedGroups.includes(groupName) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      {groupBy === "company" ? (
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{groupName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {groupJobs.length} job{groupJobs.length > 1 ? "s" : ""}
                      </Badge>
                    </button>

                    <AnimatePresence>
                      {expandedGroups.includes(groupName) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {groupJobs.map((job, index) => (
                            <JobRow
                              key={job.id}
                              job={job}
                              index={index}
                              selected={selectedJobs.includes(job.id)}
                              onSelect={id => {
                                setSelectedJobs(prev =>
                                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                )
                              }}
                              visibleColumns={visibleColumns}
                              formatSalary={formatSalary}
                              onAction={(action, j) => openActionDialog(action, [j])}
                              onPermanentDelete={handlePermanentDelete}
                              onExtendExpiration={setExtendingJob}
                              onViewReports={handleViewReports}
                              onContactPoster={setContactingPosterFor}
                              indented
                              actionLoading={actionLoading}
                              gridTemplate={gridTemplate}
                              selectedJobsCount={selectedJobs.length}
                              isTrashView={activeTab === "trash"}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && totalCount > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Showing{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {((currentPage - 1) * pageSize + 1).toLocaleString()}
                  </span>
                  –
                  <span className="font-medium text-foreground tabular-nums">
                    {Math.min(currentPage * pageSize, totalCount).toLocaleString()}
                  </span>
                  {" "}of{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {totalCount.toLocaleString()}
                  </span>
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {(() => {
                      const pages: (number | string)[] = []
                      const total = totalPages
                      const current = currentPage
                      if (total <= 7) {
                        for (let i = 1; i <= total; i++) pages.push(i)
                      } else {
                        pages.push(1)
                        if (current > 3) pages.push("…")
                        const start = Math.max(2, current - 1)
                        const end = Math.min(total - 1, current + 1)
                        for (let i = start; i <= end; i++) pages.push(i)
                        if (current < total - 2) pages.push("…")
                        pages.push(total)
                      }
                      return pages.map((p, idx) =>
                        typeof p === "string" ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                            {p}
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === current ? "default" : "outline"}
                            size="icon"
                            className={cn("h-7 w-7 text-xs", p === current && "pointer-events-none")}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      )
                    })()}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => {
        if (!open) {
          setActionDialog({ open: false, action: "", jobs: [] })
          setApproveDateOption("today")
          setApproveCustomDate(undefined)
          setCreditCheck(null)
          setCreditCheckLoading(false)
        }
      }}>
        <DialogContent ref={actionDialogRef}>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approve" && "Approve Jobs"}
              {actionDialog.action === "hide" && "Hide Jobs"}
              {actionDialog.action === "pause" && "Pause Jobs"}
              {actionDialog.action === "delete" && "Delete Jobs"}
              {actionDialog.action === "reject" && "Reject Jobs"}
              {actionDialog.action === "restore" && "Restore Jobs"}
              {actionDialog.action === "mark_filled" && "Mark as Filled"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve" && `Approve ${actionDialog.jobs.length} job(s) for publishing`}
              {actionDialog.action === "hide" && `Hide ${actionDialog.jobs.length} job(s) from public view`}
              {actionDialog.action === "pause" && `Pause ${actionDialog.jobs.length} job(s) temporarily`}
              {actionDialog.action === "delete" && `Move ${actionDialog.jobs.length} job(s) to trash`}
              {actionDialog.action === "reject" && `Reject ${actionDialog.jobs.length} job(s)`}
              {actionDialog.action === "restore" && `Restore ${actionDialog.jobs.length} job(s) from trash`}
              {actionDialog.action === "mark_filled" && `Mark ${actionDialog.jobs.length} job(s) as filled`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
              {actionDialog.jobs.map(job => (
                <div key={job.id} className="text-sm py-1">
                  <span className="font-medium">{job.title}</span>
                  <span className="text-muted-foreground"> - {job.company?.name}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this action (required for audit)"
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
              />
            </div>

            {/* Approve: Publish Date Selection */}
            {actionDialog.action === "approve" && actionDialog.jobs.length === 1 && (() => {
              const targetJob = actionDialog.jobs[0]
              const allowBackdate = targetJob.agency?.allow_backdate_posting ?? false
              return (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <Label className="text-sm font-medium">Publish Date</Label>
                  <RadioGroup
                    value={approveDateOption}
                    onValueChange={v => setApproveDateOption(v as "created" | "today" | "custom")}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="created" id="approve-opt-created" />
                      <Label htmlFor="approve-opt-created" className="font-normal cursor-pointer">
                        Created date ({new Date(targetJob.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="today" id="approve-opt-today" />
                      <Label htmlFor="approve-opt-today" className="font-normal cursor-pointer">
                        Today (now)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="approve-opt-custom" />
                      <Label htmlFor="approve-opt-custom" className="font-normal cursor-pointer">
                        Custom date
                      </Label>
                    </div>
                  </RadioGroup>
                  {approveDateOption === "custom" && (
                    <div className="pl-6">
                      <DatePicker
                        value={approveCustomDate}
                        onChange={setApproveCustomDate}
                        container={actionDialogRef.current}
                        placeholder="Select publish date"
                        disabled={(date) => {
                          const now = new Date()
                          now.setHours(23, 59, 59, 999)
                          return date > now
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Approve: Credit / Subscription Status */}
            {actionDialog.action === "approve" && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Credit Status
                </Label>
                {creditCheckLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking credit availability…
                  </div>
                ) : creditCheck ? (
                  <div className="space-y-2">
                    {creditCheck.entities.map((entity) => (
                      <div
                        key={`${entity.entity_type}-${entity.entity_id}`}
                        className={cn(
                          "rounded-lg p-3 text-sm",
                          entity.sufficient
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-red-50 border border-red-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-medium">
                            {entity.sufficient ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{entity.entity_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {entity.entity_type === "agency" ? "Agency" : "Company"}
                          </span>
                        </div>
                        <div className="mt-1.5 pl-5.5 space-y-0.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Credits remaining</span>
                            <span className="font-medium">{entity.credits_remaining}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Credits needed</span>
                            <span className="font-medium">{entity.credits_needed}</span>
                          </div>
                          {entity.jobs_already_paid.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Already paid</span>
                              <span className="font-medium text-emerald-600">{entity.jobs_already_paid.length}</span>
                            </div>
                          )}
                          {!entity.sufficient && (
                            <div className="flex justify-between text-red-600 font-medium pt-0.5">
                              <span>Deficit</span>
                              <span>{entity.deficit} credit{entity.deficit !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {!creditCheck.can_approve_all && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Insufficient credits</p>
                          <p className="text-amber-700 text-xs mt-0.5">
                            Some entities do not have enough job posting credits.
                            Add credits or an active subscription before approving.
                            Jobs without sufficient credits will be skipped.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    Credit check unavailable — approval will enforce credits server-side.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: "", jobs: [] })}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={
                !actionReason.trim() ||
                actionLoading === "action" ||
                (actionDialog.action === "approve" && approveDateOption === "custom" && !approveCustomDate) ||
                (actionDialog.action === "approve" && creditCheckLoading) ||
                (actionDialog.action === "approve" && creditCheck !== null && !creditCheck.can_approve_all && creditCheck.total_credits_needed > 0)
              }
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
            >
              {actionLoading === "action" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm {actionDialog.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Policy Settings Dialog */}
      <JobPolicySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Jobs</DialogTitle>
            <DialogDescription>
              Export job data in your preferred format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(v: "csv" | "xlsx") => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Export Scope</Label>
              <Select value={exportScope} onValueChange={(v: "all" | "filtered" | "selected") => setExportScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="filtered">Filtered Results ({jobs.length})</SelectItem>
                  <SelectItem value="selected" disabled={selectedJobs.length === 0}>
                    Selected Jobs ({selectedJobs.length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={actionLoading === "export"}>
              {actionLoading === "export" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Expiration Dialog */}
      <Dialog open={!!extendingJob} onOpenChange={open => {
        if (!open) {
          setExtendingJob(null)
          setNewExpirationDate(undefined)
          setExtendReason("")
        }
      }}>
        <DialogContent>
          <div ref={setExtendDialogNode}>
          <DialogHeader>
            <DialogTitle>Extend Job Expiration</DialogTitle>
            <DialogDescription>
              Set a new expiration date for &quot;{extendingJob?.title}&quot;. Only published jobs can be extended.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Expiration</span>
                <span className="font-medium">
                  {extendingJob?.expires_at
                    ? new Date(extendingJob.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "No expiry set"}
                </span>
              </div>
              {extendingJob?.expires_at && (() => {
                const now = new Date()
                const exp = new Date(extendingJob.expires_at)
                const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000)
                return (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={daysLeft <= 0 ? "destructive" : daysLeft <= 7 ? "secondary" : "outline"} className="text-xs">
                      {daysLeft <= 0 ? "Expired" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                    </Badge>
                  </div>
                )
              })()}
            </div>

            <div className="space-y-2">
              <Label>New Expiration Date <span className="text-red-500">*</span></Label>
              <DatePicker
                value={newExpirationDate}
                onChange={setNewExpirationDate}
                placeholder="Select new expiry date"
                container={extendDialogNode}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return date < today
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extend-reason">Reason (optional)</Label>
              <Textarea
                id="extend-reason"
                placeholder="Enter reason for extending expiration..."
                value={extendReason}
                onChange={e => setExtendReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendingJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleExtendExpiration} disabled={!newExpirationDate || actionLoading === "extend"}>
              {actionLoading === "extend" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CalendarPlus className="w-4 h-4 mr-2" />
              Extend Expiration
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Reports Dialog */}
      <Dialog open={!!viewingReportsFor} onOpenChange={open => !open && setViewingReportsFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reports for &quot;{viewingReportsFor?.title}&quot;</DialogTitle>
            <DialogDescription>
              {viewingReportsFor?.report_count} report{viewingReportsFor?.report_count !== 1 ? "s" : ""} have been submitted for this job
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports found
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{report.reason}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Reported by: {report.reporter}</span>
                        <span>·</span>
                        <span>{new Date(report.reported_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-xs",
                      report.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {report.status}
                    </Badge>
                  </div>
                  {report.status === "pending" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReportAction(report.id, "dismiss")}
                        disabled={actionLoading === `report-${report.id}`}
                      >
                        {actionLoading === `report-${report.id}` && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleReportAction(report.id, "take_action")}
                        disabled={actionLoading === `report-${report.id}`}
                      >
                        Take Action
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingReportsFor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Poster Dialog */}
      <Dialog open={!!contactingPosterFor} onOpenChange={open => {
        if (!open) {
          setContactingPosterFor(null)
          setContactSubject("")
          setContactTemplate("")
          setContactMessage("")
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Job Poster</DialogTitle>
            <DialogDescription>
              Send a message to {contactingPosterFor?.agency?.name || contactingPosterFor?.company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">Regarding: </span>
                <span className="font-medium">{contactingPosterFor?.title}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="text-muted-foreground">Posted by: </span>
                <span className="font-medium">
                  {contactingPosterFor?.agency
                    ? `${contactingPosterFor.agency.name} (for ${contactingPosterFor.company.name})`
                    : contactingPosterFor?.company.name}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message Template (optional)</Label>
              <Select value={contactTemplate} onValueChange={value => {
                setContactTemplate(value)
                if (value === "policy_violation") {
                  setContactSubject("Policy Violation Notice")
                  setContactMessage("We have identified potential policy violations in your job posting. Please review our guidelines and make the necessary corrections.")
                } else if (value === "info_request") {
                  setContactSubject("Information Request")
                  setContactMessage("We require additional information regarding your job posting. Please respond with the requested details.")
                } else if (value === "general") {
                  setContactSubject("")
                  setContactMessage("")
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy_violation">Policy Violation Notice</SelectItem>
                  <SelectItem value="info_request">Information Request</SelectItem>
                  <SelectItem value="general">General Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject <span className="text-red-500">*</span></Label>
              <Input
                id="contact-subject"
                placeholder="Enter subject line..."
                value={contactSubject}
                onChange={e => setContactSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="contact-message"
                placeholder="Enter your message..."
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setContactingPosterFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleContactPoster}
              disabled={!contactSubject.trim() || !contactMessage.trim() || actionLoading === "contact"}
            >
              {actionLoading === "contact" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Mail className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirmation Dialog */}
      <Dialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Empty Trash
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {stats?.trashed ?? 0} trashed job{(stats?.trashed ?? 0) !== 1 ? "s" : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptyTrashDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmptyTrash}
              disabled={actionLoading === "empty-trash"}
            >
              {actionLoading === "empty-trash" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Permanently Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Jobs Dialog */}
      <ImportJobsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          fetchJobs()
          fetchStats()
        }}
      />
    </motion.div>
  )
}

// StatCard and StatCardSkeleton Components
function StatCard({ title, value, color, icon, gradient, active, onClick, urgent, subtitle }: {
  title: string
  value: number
  color?: string
  icon?: React.ReactNode
  gradient?: string
  active?: boolean
  onClick?: () => void
  urgent?: boolean
  subtitle?: string
}) {
  const isUrgentActive = urgent && value > 0

  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md",
        active && "ring-2 ring-primary/40 shadow-md",
        isUrgentActive && !active && "ring-1 ring-amber-400/50 shadow-[0_0_20px_-4px_rgba(245,158,11,0.25)]"
      )}
      onClick={onClick}
    >
      {gradient && (
        <>
          <div className={cn(
            "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
            color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : color === "red" ? "bg-red-500" : "bg-slate-500"
          )} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
        </>
      )}

      {/* Urgent: animated glow border sweep */}
      {isUrgentActive && (
        <>
          {/* Warm radial glow behind the icon area */}
          <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent animate-pulse" />
          {/* Subtle bottom accent bar — always visible when urgent */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-80" />
        </>
      )}

      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{title}</span>
            {isUrgentActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_6px_1px_rgba(245,158,11,0.5)]" />
              </span>
            )}
          </div>
          {icon && gradient && !isUrgentActive && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
          {isUrgentActive && (
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 blur-md animate-pulse" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-lg shadow-amber-500/30">
                {/* Premium bell/alert icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 animate-[wiggle_2s_ease-in-out_infinite]"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  <path d="M4 2C2.8 3.7 2 5.7 2 8" />
                  <path d="M22 8c0-2.3-.8-4.3-2-6" />
                </svg>
              </div>
            </div>
          )}
        </div>
        <p className={cn("text-2xl font-bold mt-2 tabular-nums",
          color === "amber" && "text-amber-600",
          color === "red" && "text-red-600",
          color === "green" && "text-emerald-600"
        )}>{value.toLocaleString()}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-16" />
      </CardContent>
    </Card>
  )
}

// Job Row Component
// Action button for hover-expand action bar
function ActionBtn({
  icon: Icon,
  label,
  href,
  onClick,
  variant = "default",
  active = false,
}: {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "success" | "warning" | "destructive" | "ghost"
  active?: boolean
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
    variant === "default" && "text-muted-foreground hover:text-foreground hover:bg-muted/80",
    variant === "success" && "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    variant === "warning" && "text-amber-700 bg-amber-50 hover:bg-amber-100",
    variant === "destructive" && "text-red-600 hover:text-red-700 hover:bg-red-50",
    variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted/60",
    active && "text-amber-600"
  )

  const content = (
    <>
      <Icon className={cn("w-3.5 h-3.5", active && "fill-current")} />
      <span className="hidden lg:inline">{label}</span>
    </>
  )

  if (href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className={classes}>{content}</Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} className={classes}>{content}</button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

function JobRow({
  job,
  index,
  selected,
  onSelect,
  visibleColumns,
  formatSalary,
  onAction,
  onExtendExpiration,
  onViewReports,
  onContactPoster,
  onPermanentDelete,
  indented = false,
  actionLoading,
  gridTemplate,
  selectedJobsCount = 0,
  isTrashView = false,
}: {
  job: AdminJob
  index: number
  selected: boolean
  onSelect: (id: number) => void
  visibleColumns: ColumnKey[]
  formatSalary: (job: AdminJob) => string
  onAction: (action: string, job: AdminJob) => void
  onExtendExpiration: (job: AdminJob) => void
  onViewReports: (job: AdminJob) => void
  onContactPoster: (job: AdminJob) => void
  onPermanentDelete?: (job: AdminJob) => void
  indented?: boolean
  actionLoading: string | null
  gridTemplate: string
  selectedJobsCount?: number
  isTrashView?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const status = statusConfig[job.status]
  const StatusIcon = status.icon
  const dot = statusDotConfig[job.status] || statusDotConfig.draft

  // Expiry urgency
  const expiryInfo = useMemo(() => {
    if (!job.expires_at) return { className: "text-muted-foreground", label: "—", daysLeft: 999 }
    const expiresDate = new Date(job.expires_at)
    const now = new Date()
    const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
    const dateStr = expiresDate.toLocaleDateString("en-US", dateOpts)
    if (daysLeft <= 0) return { className: "text-muted-foreground/50 line-through", label: dateStr, daysLeft }
    if (daysLeft <= 3) return { className: "text-red-600 font-medium", label: dateStr, daysLeft }
    if (daysLeft <= 7) return { className: "text-amber-600", label: dateStr, daysLeft }
    return { className: "text-muted-foreground", label: dateStr, daysLeft }
  }, [job.expires_at])

  // Mobile action menu (kept for touch devices)
  const MobileActionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isTrashView ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/admin/jobs/${job.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("restore", job)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPermanentDelete?.(job)} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Permanently Delete
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/admin/jobs/${job.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/jobs/${job.id}?edit=true`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Job
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {job.status === "published" && (
              <DropdownMenuItem onClick={() => onExtendExpiration(job)}>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Extend Expiration
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onContactPoster(job)}>
              <Mail className="w-4 h-4 mr-2" />
              Contact Poster
            </DropdownMenuItem>
            {(job.report_count ?? 0) > 0 && (
              <DropdownMenuItem onClick={() => onViewReports(job)}>
                <Flag className="w-4 h-4 mr-2 text-red-500" />
                View Reports ({job.report_count ?? 0})
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {(job.status === "pending" || job.status === "draft") && (
              <DropdownMenuItem onClick={() => onAction("approve", job)}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </DropdownMenuItem>
            )}
            {job.status === "published" && (
              <>
                <DropdownMenuItem onClick={() => onAction("pause", job)}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction("hide", job)} className="text-red-600">
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              </>
            )}
            {job.status === "paused" && (
              <DropdownMenuItem onClick={() => onAction("resume", job)}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </DropdownMenuItem>
            )}
            {job.status !== "published" && (
              <DropdownMenuItem onClick={() => onAction("hide", job)}>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide
              </DropdownMenuItem>
            )}
            {(job.status === "published" || job.status === "paused") && (
              <DropdownMenuItem onClick={() => onAction("mark_filled", job)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Filled
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("delete", job)} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      {/* Mobile Card Layout */}
      <div className={cn(
        "sm:hidden p-4 hover:bg-muted/30 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary",
        indented && "pl-8"
      )}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(job.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0 ring-2 ring-background", dot.color, job.status === "pending" && "animate-pulse")} />
                  <h3 className="font-medium text-foreground leading-tight truncate">{job.title}</h3>
                  {job.featured && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5 ml-[18px]">
                  {(() => {
                    const mPosterName = (job.agency ? job.agency.name : job.company?.name) ?? "Unknown"
                    const mPosterLogo = job.agency ? job.agency.logo : job.company?.logo
                    return mPosterLogo ? (
                      <img src={mPosterLogo} alt={mPosterName} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                    ) : (
                      <span className={cn("w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0", getAvatarColor(mPosterName))}>
                        {getCompanyInitials(mPosterName)}
                      </span>
                    )
                  })()}
                  <span className="truncate">{job.agency ? job.agency.name : (job.company?.name ?? "Unknown")}</span>
                  {!job.agency && job.company?.verified && (
                    <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  )}
                  <span className="text-border">·</span>
                  <span>{job.category}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2.5 ml-[18px]">
              <Badge className={cn("text-xs gap-1", status.color)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="capitalize">{job.location_type}</span>
              </span>
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50 ml-[18px]">
              <div className="flex items-center gap-4 text-sm text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {(job.views ?? 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {(job.applications ?? 0).toLocaleString()}
                </span>
                <span className="text-xs">{formatDate(job.posted_at ?? job.created_at)}</span>
                {(job.report_count ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 rounded px-1 py-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {job.report_count}
                  </span>
                )}
                {(job.spam_score ?? 0) > 0 && (
                  <span className={cn(
                    "flex items-center gap-0.5 text-[10px] font-medium rounded px-1 py-0.5",
                    (job.spam_score ?? 0) >= 70 ? "text-red-700 bg-red-50" :
                    (job.spam_score ?? 0) >= 40 ? "text-amber-700 bg-amber-50" :
                    "text-gray-600 bg-gray-100"
                  )}>
                    Spam {job.spam_score}
                  </span>
                )}
              </div>
              <MobileActionMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table Row */}
      <div
        className={cn(
          "hidden sm:block group relative transition-colors",
          selected && "bg-primary/5 border-l-2 border-l-primary",
          !selected && isHovered && "bg-muted/40",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Data Row */}
        <div
          className="grid gap-4 px-4 py-2.5 items-center"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {/* Checkbox */}
          <div>
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(job.id)}
            />
          </div>

          {/* Job Cell — always visible */}
          <div className={cn("min-w-0", indented && "pl-6")}>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap",
                status.color,
                job.status === "pending" && "animate-pulse"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", dot.color)} />
                {dot.label}
              </span>
              <Link
                href={`/admin/jobs/${job.id}`}
                className="font-medium text-foreground truncate hover:text-primary transition-colors"
              >
                {job.title}
              </Link>
              {job.featured && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              )}
              {(job.report_count ?? 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 rounded px-1 py-0.5 flex-shrink-0">
                      <Flag className="w-2.5 h-2.5" />
                      {job.report_count}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{job.report_count} report(s)</TooltipContent>
                </Tooltip>
              )}
              {(job.spam_score ?? 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "text-[10px] font-medium rounded px-1 py-0.5 flex-shrink-0",
                      (job.spam_score ?? 0) >= 70 ? "text-red-700 bg-red-50" :
                      (job.spam_score ?? 0) >= 40 ? "text-amber-700 bg-amber-50" :
                      "text-gray-600 bg-gray-100"
                    )}>
                      Spam {job.spam_score}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Spam score: {job.spam_score}/100</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 ml-[18px]">
              <span className="truncate">{job.category}</span>
              {job.apply_mode === "external" && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-0.5">
                    <ExternalLink className="w-2.5 h-2.5" />
                    External
                  </span>
                </>
              )}
              <span className="text-border">·</span>
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(job.posted_at ?? job.created_at)}
              </span>
            </div>
          </div>

          {/* Dynamic Columns */}
          {visibleColumns.map(col => {
            switch (col) {
              case "postedBy": {
                const posterName = (job.agency ? job.agency.name : job.company?.name) ?? "Unknown"
                const posterLogo = job.agency ? job.agency.logo : job.company?.logo
                return (
                  <div key={col} className="min-w-0 flex items-center gap-2">
                    {posterLogo ? (
                      <img
                        src={posterLogo}
                        alt={posterName}
                        className="w-7 h-7 rounded-md object-cover flex-shrink-0 ring-1 ring-border"
                      />
                    ) : (
                      <span className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0",
                        getAvatarColor(posterName)
                      )}>
                        {getCompanyInitials(posterName)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {posterName}
                        </span>
                        {!job.agency && job.company?.verified && (
                          <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground block truncate">
                        {job.agency && (
                          <span className="text-muted-foreground/60">for {job.company?.name ?? "Unknown"} · </span>
                        )}
                        {formatDate(job.posted_at ?? job.created_at)}
                      </span>
                    </div>
                  </div>
                )
              }
              case "engagement":
                return (
                  <div key={col} className="tabular-nums text-sm">
                    <span className="text-foreground font-medium">{(job.views ?? 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">views</span>
                  </div>
                )
              case "applications":
                return (
                  <div key={col} className="tabular-nums text-sm">
                    <span className="text-foreground font-medium">{(job.applications ?? 0).toLocaleString()}</span>
                  </div>
                )
              case "expiry":
                return (
                  <div key={col} className="text-sm tabular-nums">
                    <span className={expiryInfo.className}>{expiryInfo.label}</span>
                    {expiryInfo.daysLeft > 0 && expiryInfo.daysLeft <= 3 && (
                      <span className="text-[10px] text-red-500 block">{expiryInfo.daysLeft}d left</span>
                    )}
                  </div>
                )
              case "location":
                return (
                  <div key={col} className="min-w-0">
                    <span className="text-sm capitalize">{job.location_type}</span>
                    {job.location && (
                      <span className="text-xs text-muted-foreground block truncate">{job.location}</span>
                    )}
                  </div>
                )
              case "salary":
                return (
                  <div key={col} className="text-sm text-muted-foreground tabular-nums truncate">
                    {formatSalary(job) || "—"}
                  </div>
                )
              case "reports":
                return (
                  <div key={col} className="text-sm tabular-nums">
                    {(job.report_count ?? 0) > 0 ? (
                      <span className="text-red-600 font-medium">{job.report_count}</span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </div>
                )
              default:
                return null
            }
          })}
        </div>

        {/* Hover Action Bar */}
        <AnimatePresence>
          {isHovered && selectedJobsCount === 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1 px-4 pb-2.5 pt-0">
                <div style={{ width: "36px" }} className="flex-shrink-0" />
                {isTrashView ? (
                  <>
                    <div className="flex items-center gap-0.5 ml-[18px]">
                      <ActionBtn icon={Eye} label="View" href={`/admin/jobs/${job.id}`} />
                      <ActionBtn icon={RotateCcw} label="Restore" onClick={() => onAction("restore", job)} variant="success" />
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-0.5">
                      <ActionBtn icon={Trash2} label="Permanently Delete" onClick={() => onPermanentDelete?.(job)} variant="destructive" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5 ml-[18px]">
                      <ActionBtn icon={Eye} label="View" href={`/admin/jobs/${job.id}`} />
                      <ActionBtn icon={Edit} label="Edit" href={`/admin/jobs/${job.id}?edit=true`} />
                      {job.status === "published" && (
                        <ActionBtn icon={CalendarPlus} label="Extend" onClick={() => onExtendExpiration(job)} />
                      )}
                      <ActionBtn icon={Mail} label="Contact" onClick={() => onContactPoster(job)} />
                      {(job.status === "pending" || job.status === "draft") && (
                        <ActionBtn icon={Check} label="Approve" onClick={() => onAction("approve", job)} variant="success" />
                      )}
                      {job.status === "published" && (
                        <>
                          <ActionBtn icon={Pause} label="Pause" onClick={() => onAction("pause", job)} />
                          <ActionBtn icon={Ban} label="Suspend" onClick={() => onAction("hide", job)} variant="destructive" />
                        </>
                      )}
                      {job.status === "paused" && (
                        <ActionBtn icon={Play} label="Resume" onClick={() => onAction("resume", job)} />
                      )}
                      {(job.report_count ?? 0) > 0 && (
                        <ActionBtn icon={Flag} label={`Reports (${job.report_count})`} onClick={() => onViewReports(job)} variant="warning" />
                      )}
                      {(job.status === "published" || job.status === "paused") && (
                        <ActionBtn icon={CheckCircle} label="Mark Filled" onClick={() => onAction("mark_filled", job)} />
                      )}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-0.5">
                      {job.status !== "published" && (
                        <ActionBtn icon={EyeOff} label="Hide" onClick={() => onAction("hide", job)} variant="ghost" />
                      )}
                      <ActionBtn icon={Trash2} label="Delete" onClick={() => onAction("delete", job)} variant="destructive" />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

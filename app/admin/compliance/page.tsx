"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  ShieldCheck,
  FileText,
  Trash2,
  Download,
  Clock,
  Check,
  AlertTriangle,
  User,
  Building2,
  Search,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Archive,
  Globe,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getComplianceRequests,
  getComplianceRequest,
  getComplianceStats,
  startProcessingRequest,
  processComplianceRequest,
  requestVerification,
  generateDataExport,
  previewDeletion,
  executeDeletion,
  exportComplianceRequests,
  generateComplianceReport,
  getRetentionRules,
  createRetentionRule,
  updateRetentionRule,
  deleteRetentionRule,
  getLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  publishLegalDocument,
  archiveLegalDocument,
} from "@/lib/api/admin-compliance"
import type {
  ComplianceRequest,
  ComplianceStats,
  ComplianceFilters,
  PaginatedResponse,
  RetentionRule,
  RetentionEnforcement,
  CreateRetentionRuleData,
  LegalDocument,
  LegalDocumentType,
  CreateLegalDocumentData,
} from "@/lib/admin/types"

const enforcementConfig: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-gray-100 text-gray-700" },
  automated: { label: "Automated", color: "bg-blue-100 text-blue-700" },
  legal_hold: { label: "Legal Hold", color: "bg-amber-100 text-amber-700" },
}

const docTypeLabels: Record<string, string> = {
  privacy_policy: "Privacy Policy",
  terms_of_service: "Terms of Service",
  cookie_policy: "Cookie Policy",
  dpa: "Data Processing Agreement",
  acceptable_use: "Acceptable Use Policy",
  other: "Other",
}

const docStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", color: "bg-amber-100 text-amber-700" },
}

const formatRetention = (days: number) => {
  if (days >= 365) {
    const years = Math.round(days / 365)
    return `${years} year${years > 1 ? "s" : ""}`
  }
  if (days >= 30) {
    const months = Math.round(days / 30)
    return `${months} month${months > 1 ? "s" : ""}`
  }
  return `${days} day${days > 1 ? "s" : ""}`
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  in_progress: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: AlertTriangle },
}

const typeLabels: Record<string, string> = {
  gdpr_access: "GDPR Access",
  gdpr_delete: "GDPR Deletion",
  gdpr_portability: "GDPR Portability",
  ccpa_access: "CCPA Access",
  ccpa_delete: "CCPA Deletion",
  ccpa_opt_out: "CCPA Opt-Out",
}

const isDeletionType = (type: string) => ["gdpr_delete", "ccpa_delete"].includes(type)

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("requests")

  // Data state
  const [requests, setRequests] = useState<ComplianceRequest[]>([])
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, count: 0 })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<ComplianceFilters>({
    status: "all",
    type: "all",
    page: 1,
    page_size: 20,
  })
  const [searchInput, setSearchInput] = useState("")

  // Selection and dialog states
  const [selectedRequest, setSelectedRequest] = useState<ComplianceRequest | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: string
    request: ComplianceRequest | null
  }>({
    open: false,
    action: "",
    request: null,
  })
  const [verificationDialog, setVerificationDialog] = useState(false)
  const [deletionPreviewDialog, setDeletionPreviewDialog] = useState(false)
  const [deletionConfirmText, setDeletionConfirmText] = useState("")

  // Action states
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [generateReportOpen, setGenerateReportOpen] = useState(false)
  const [reportType, setReportType] = useState<"monthly" | "quarterly" | "annual">("monthly")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [deletionPreview, setDeletionPreview] = useState<{
    user_data: { type: string; count: number }[]
    total_records: number
    warnings: string[]
  } | null>(null)

  // Form state
  const [actionNotes, setActionNotes] = useState("")
  const [verificationMessage, setVerificationMessage] = useState("")
  const [processResolution, setProcessResolution] = useState("")

  // Retention rules state
  const [retentionRules, setRetentionRules] = useState<RetentionRule[]>([])
  const [isRetentionLoading, setIsRetentionLoading] = useState(false)
  const [retentionDialog, setRetentionDialog] = useState<{ open: boolean; rule: RetentionRule | null }>({ open: false, rule: null })
  const [retentionForm, setRetentionForm] = useState<CreateRetentionRuleData>({
    category: "", description: "", retention_days: 365, is_deletable: false, is_active: true,
    enforcement: "manual", legal_basis: "", sort_order: 0,
  })
  const [isRetentionSaving, setIsRetentionSaving] = useState(false)
  const [retentionDeleteDialog, setRetentionDeleteDialog] = useState<{ open: boolean; rule: RetentionRule | null }>({ open: false, rule: null })

  // Legal documents state
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([])
  const [isDocsLoading, setIsDocsLoading] = useState(false)
  const [docDeleteDialog, setDocDeleteDialog] = useState<{ open: boolean; doc: LegalDocument | null }>({ open: false, doc: null })
  const [docViewDialog, setDocViewDialog] = useState<{ open: boolean; doc: LegalDocument | null }>({ open: false, doc: null })

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const response: PaginatedResponse<ComplianceRequest> = await getComplianceRequests(filters)
      setRequests(response.results)
      setPagination({
        page: filters.page || 1,
        total_pages: Math.ceil(response.count / (filters.page_size || 20)),
        count: response.count,
      })
    } catch (err) {
      const error = err as { message?: string; status?: number }
      console.error("Failed to fetch compliance requests:", error.message || err, error.status ? `(status: ${error.status})` : "")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getComplianceStats()
      setStats(data)
    } catch (err) {
      const error = err as { message?: string; status?: number }
      console.error("Failed to fetch stats:", error.message || err, error.status ? `(status: ${error.status})` : "")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  const fetchRetentionRules = useCallback(async () => {
    setIsRetentionLoading(true)
    try {
      const data = await getRetentionRules()
      setRetentionRules(data)
    } catch (err) {
      console.error("Failed to fetch retention rules:", err)
    } finally {
      setIsRetentionLoading(false)
    }
  }, [])

  const fetchLegalDocs = useCallback(async () => {
    setIsDocsLoading(true)
    try {
      const data = await getLegalDocuments()
      setLegalDocs(data)
    } catch (err) {
      console.error("Failed to fetch legal documents:", err)
    } finally {
      setIsDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Lazy-load retention rules and legal docs when tabs are activated
  useEffect(() => {
    if (activeTab === "retention" && retentionRules.length === 0 && !isRetentionLoading) {
      fetchRetentionRules()
    }
    if (activeTab === "policies" && legalDocs.length === 0 && !isDocsLoading) {
      fetchLegalDocs()
    }
  }, [activeTab, retentionRules.length, legalDocs.length, isRetentionLoading, isDocsLoading, fetchRetentionRules, fetchLegalDocs])

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleAction = (action: string, request: ComplianceRequest) => {
    setActionDialog({ open: true, action, request })
  }

  const executeAction = async () => {
    if (!actionDialog.request) return
    setIsProcessingAction(true)

    try {
      if (actionDialog.action === "process") {
        await startProcessingRequest(actionDialog.request.id)
      } else if (actionDialog.action === "complete") {
        await processComplianceRequest(actionDialog.request.id, {
          resolution: processResolution,
          notes: actionNotes || undefined,
        })
      } else if (actionDialog.action === "reject") {
        await processComplianceRequest(actionDialog.request.id, {
          resolution: "rejected",
          notes: actionNotes,
        })
      }

      setActionDialog({ open: false, action: "", request: null })
      setActionNotes("")
      setProcessResolution("")
      fetchRequests()
      fetchStats()
    } catch (err) {
      console.error("Failed to execute action:", err)
      toast.error("Failed to execute action. Please try again.")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleSendVerification = async () => {
    if (!selectedRequest) return
    setIsProcessingAction(true)
    try {
      await requestVerification(selectedRequest.id, verificationMessage)
      setVerificationDialog(false)
      setVerificationMessage("")
      fetchRequests()
    } catch (err) {
      console.error("Failed to send verification:", err)
      toast.error("Failed to send verification request. Please try again.")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handlePreviewDeletion = async (request: ComplianceRequest) => {
    setSelectedRequest(request)
    try {
      const preview = await previewDeletion(request.id)
      setDeletionPreview(preview)
      setDeletionPreviewDialog(true)
    } catch (err) {
      console.error("Failed to preview deletion:", err)
      toast.error("Failed to preview deletion. Please try again.")
    }
  }

  const handleExecuteDeletion = async () => {
    if (!selectedRequest) return
    setIsProcessingAction(true)
    try {
      await executeDeletion(selectedRequest.id, true)
      setDeletionPreviewDialog(false)
      setDeletionPreview(null)
      setSelectedRequest(null)
      fetchRequests()
      fetchStats()
    } catch (err) {
      console.error("Failed to execute deletion:", err)
      toast.error("Failed to execute deletion. Please try again.")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleExportData = async (request: ComplianceRequest) => {
    try {
      const result = await generateDataExport(request.id)
      window.open(result.download_url, "_blank")
    } catch (err) {
      console.error("Failed to generate export:", err)
      toast.error("Failed to generate data export. Please try again.")
    }
  }

  const handleExportRequests = async () => {
    setIsExporting(true)
    try {
      const blob = await exportComplianceRequests(filters, "csv")
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "compliance-requests-export.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to export:", err)
      toast.error("Failed to export compliance requests. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const result = await generateComplianceReport(reportType)
      if (result.report_url) {
        window.open(result.report_url, "_blank")
      }
      setGenerateReportOpen(false)
    } catch (err) {
      console.error("Failed to generate report:", err)
      toast.error("Failed to generate compliance report. Please try again.")
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Retention rule handlers
  const openRetentionDialog = (rule?: RetentionRule) => {
    if (rule) {
      setRetentionForm({
        category: rule.category,
        description: rule.description,
        retention_days: rule.retention_days,
        is_deletable: rule.is_deletable,
        is_active: rule.is_active,
        enforcement: rule.enforcement,
        legal_basis: rule.legal_basis,
        sort_order: rule.sort_order,
      })
      setRetentionDialog({ open: true, rule })
    } else {
      setRetentionForm({
        category: "", description: "", retention_days: 365, is_deletable: false, is_active: true,
        enforcement: "manual", legal_basis: "", sort_order: retentionRules.length,
      })
      setRetentionDialog({ open: true, rule: null })
    }
  }

  const handleSaveRetentionRule = async () => {
    if (!retentionForm.category.trim() || !retentionForm.description.trim()) return
    setIsRetentionSaving(true)
    try {
      if (retentionDialog.rule) {
        await updateRetentionRule(retentionDialog.rule.id, retentionForm)
        toast.success("Retention rule updated")
      } else {
        await createRetentionRule(retentionForm)
        toast.success("Retention rule created")
      }
      setRetentionDialog({ open: false, rule: null })
      fetchRetentionRules()
    } catch (err) {
      console.error("Failed to save retention rule:", err)
      toast.error("Failed to save retention rule")
    } finally {
      setIsRetentionSaving(false)
    }
  }

  const handleDeleteRetentionRule = async () => {
    if (!retentionDeleteDialog.rule) return
    setIsRetentionSaving(true)
    try {
      await deleteRetentionRule(retentionDeleteDialog.rule.id)
      toast.success("Retention rule deleted")
      setRetentionDeleteDialog({ open: false, rule: null })
      fetchRetentionRules()
    } catch (err) {
      console.error("Failed to delete retention rule:", err)
      toast.error("Failed to delete retention rule")
    } finally {
      setIsRetentionSaving(false)
    }
  }

  // Legal document handlers
  const handleDeleteDoc = async () => {
    if (!docDeleteDialog.doc) return
    try {
      await deleteLegalDocument(docDeleteDialog.doc.id)
      toast.success("Document deleted")
      setDocDeleteDialog({ open: false, doc: null })
      fetchLegalDocs()
    } catch (err) {
      console.error("Failed to delete document:", err)
      toast.error("Failed to delete document")
    }
  }

  const handlePublishDoc = async (doc: LegalDocument) => {
    try {
      await publishLegalDocument(doc.id)
      toast.success("Document published")
      fetchLegalDocs()
    } catch (err) {
      console.error("Failed to publish document:", err)
      toast.error("Failed to publish document")
    }
  }

  const handleArchiveDoc = async (doc: LegalDocument) => {
    try {
      await archiveLegalDocument(doc.id)
      toast.success("Document archived")
      fetchLegalDocs()
    } catch (err) {
      console.error("Failed to archive document:", err)
      toast.error("Failed to archive document")
    }
  }

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value as ComplianceFilters["status"], page: 1 }))
  }

  const handleTypeFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, type: value as ComplianceFilters["type"], page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const filteredRequests = requests.filter((req) => {
    if (!searchInput) return true
    const q = searchInput.toLowerCase()
    return (
      req.requester_name.toLowerCase().includes(q) ||
      req.requester_email.toLowerCase().includes(q) ||
      String(req.id).includes(q)
    )
  })

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Compliance & Privacy</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Handle data export requests, deletion requests, and retention policies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setGenerateReportOpen(true)} className="gap-1.5">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportRequests} disabled={isExporting} className="gap-1.5">
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-1 h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{stats.pending_count}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{stats.processing_count}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{stats.completed_count}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total_count}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </motion.div>

      <motion.div variants={itemVariants}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">
            Data Requests
            {stats && stats.pending_count > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pending_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="retention">Retention Rules</TabsTrigger>
          <TabsTrigger value="policies">Privacy Policies</TabsTrigger>
        </TabsList>

        {/* Data Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.type || "all"} onValueChange={handleTypeFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="gdpr_access">GDPR Access</SelectItem>
                    <SelectItem value="gdpr_delete">GDPR Deletion</SelectItem>
                    <SelectItem value="gdpr_portability">GDPR Portability</SelectItem>
                    <SelectItem value="ccpa_access">CCPA Access</SelectItem>
                    <SelectItem value="ccpa_delete">CCPA Deletion</SelectItem>
                    <SelectItem value="ccpa_opt_out">CCPA Opt-Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          <Card>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No requests found matching your criteria</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRequests.map((request, i) => {
                  const status = statusConfig[request.status] || statusConfig.pending
                  const StatusIcon = status.icon
                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isDeletionType(request.type) ? "bg-red-100" : "bg-blue-100"
                        )}
                      >
                        {isDeletionType(request.type) ? (
                          <Trash2 className="w-5 h-5 text-red-600" />
                        ) : (
                          <Download className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.requester_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {request.requester_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.requester_email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>ID: CR-{String(request.id).padStart(3, "0")}</span>
                          <span>·</span>
                          <span>Requested: {formatDate(request.created_at)}</span>
                          {request.completed_at && (
                            <>
                              <span>·</span>
                              <span>Completed: {formatDate(request.completed_at)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={cn("text-xs gap-1", status.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[request.type] || request.type}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {request.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleAction("process", request)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Start Processing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setVerificationDialog(true)
                                  }}
                                >
                                  <User className="w-4 h-4 mr-2" />
                                  Request Verification
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("reject", request)}
                                  className="text-red-600"
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Reject Request
                                </DropdownMenuItem>
                              </>
                            )}
                            {request.status === "in_progress" && (
                              <>
                                {!isDeletionType(request.type) && (
                                  <DropdownMenuItem onClick={() => handleExportData(request)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Generate Export
                                  </DropdownMenuItem>
                                )}
                                {isDeletionType(request.type) && (
                                  <DropdownMenuItem onClick={() => handlePreviewDeletion(request)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Preview Deletion
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleAction("complete", request)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.total_pages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Retention Rules Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-medium">Data Retention Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Defines how long data is kept before automatic deletion
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => openRetentionDialog()}>
                <Plus className="w-4 h-4" />
                Add Rule
              </Button>
            </div>
            <div className="divide-y divide-border">
              {isRetentionLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-4 flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))
              ) : retentionRules.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No retention rules defined yet.
                </div>
              ) : (
                retentionRules.map((rule, i) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-4 py-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rule.category}</p>
                        {!rule.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      {rule.legal_basis && (
                        <p className="text-xs text-muted-foreground mt-1">{rule.legal_basis}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Badge variant="outline">{formatRetention(rule.retention_days)}</Badge>
                      <Badge className={enforcementConfig[rule.enforcement]?.color || ""}>
                        {enforcementConfig[rule.enforcement]?.label || rule.enforcement}
                      </Badge>
                      {rule.is_deletable ? (
                        <Badge className="bg-emerald-100 text-emerald-700">User Deletable</Badge>
                      ) : (
                        <Badge variant="secondary">Protected</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openRetentionDialog(rule)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRetentionDeleteDialog({ open: true, rule })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Retention Policy Notes</p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Hard deletes only when legally required</li>
                  <li>Audit logs preserved with anonymization</li>
                  <li>Deletion requests processed within 30 days</li>
                  <li>Payment records retained per financial regulations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Legal Documents</h3>
              <p className="text-sm text-muted-foreground">Manage privacy policies, terms, and legal agreements</p>
            </div>
            <Button size="sm" className="gap-1.5" asChild>
              <a href="/admin/compliance/documents/new">
                <Plus className="w-4 h-4" />
                New Document
              </a>
            </Button>
          </div>
          {isDocsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-4" />
                  <Skeleton className="h-4 w-48 mt-2" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : legalDocs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No legal documents yet. Create your first document to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {legalDocs.map((doc) => (
                <Card key={doc.id} className="relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={docStatusConfig[doc.status]?.color || ""}>
                          {docStatusConfig[doc.status]?.label || doc.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                      </div>
                    </div>
                    <h3 className="font-medium mt-4">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {docTypeLabels[doc.document_type] || doc.document_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDate(doc.updated_at)}
                      {doc.effective_date && ` \u00b7 Effective ${formatDate(doc.effective_date)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setDocViewDialog({ open: true, doc })}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={`/admin/compliance/documents/${doc.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                          Edit
                        </a>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {doc.status === "draft" && (
                            <DropdownMenuItem onClick={() => handlePublishDoc(doc)}>
                              <Send className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {doc.status === "published" && (
                            <DropdownMenuItem onClick={() => handleArchiveDoc(doc)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {doc.public_url && (
                            <DropdownMenuItem onClick={() => window.open(doc.public_url, "_blank")}>
                              <Globe className="w-4 h-4 mr-2" />
                              View Public URL
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDocDeleteDialog({ open: true, doc })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !verificationDialog && !deletionPreviewDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {isDeletionType(selectedRequest?.type || "") ? "Data Deletion Request" : "Data Access/Export Request"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Request ID</Label>
                  <p className="font-medium">CR-{String(selectedRequest.id).padStart(3, "0")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={cn("mt-1", statusConfig[selectedRequest.status]?.color || "")}>
                    {statusConfig[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Requester</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedRequest.requester_type === "candidate" ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{selectedRequest.requester_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.requester_email}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Requested</Label>
                  <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                {selectedRequest.completed_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Completed</Label>
                    <p>{new Date(selectedRequest.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedRequest.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: "", request: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "process" && "Start Processing Request"}
              {actionDialog.action === "complete" && "Complete Request"}
              {actionDialog.action === "reject" && "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "process" && "Begin processing this data request"}
              {actionDialog.action === "complete" && "Mark this request as completed"}
              {actionDialog.action === "reject" && "Reject this request with a reason"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">{actionDialog.request?.requester_name}</p>
              <p className="text-xs text-muted-foreground">{actionDialog.request?.requester_email}</p>
            </div>
            {actionDialog.action === "complete" && (
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={processResolution} onValueChange={setProcessResolution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed Successfully</SelectItem>
                    <SelectItem value="partial">Partially Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes {actionDialog.action === "reject" && "*"}</Label>
              <Textarea
                placeholder={
                  actionDialog.action === "reject"
                    ? "Reason for rejection (required)..."
                    : "Optional notes..."
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: "", request: null })}
              disabled={isProcessingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={
                (actionDialog.action === "reject" && !actionNotes.trim()) ||
                (actionDialog.action === "complete" && !processResolution) ||
                isProcessingAction
              }
              variant={actionDialog.action === "reject" ? "destructive" : "default"}
            >
              {isProcessingAction
                ? "Processing..."
                : actionDialog.action === "process"
                  ? "Start Processing"
                  : actionDialog.action === "complete"
                    ? "Mark Complete"
                    : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Identity Verification</DialogTitle>
            <DialogDescription>
              Send a verification request to {selectedRequest?.requester_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Message</Label>
              <Textarea
                placeholder="Please provide additional documentation to verify your identity..."
                value={verificationMessage}
                onChange={(e) => setVerificationMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationDialog(false)} disabled={isProcessingAction}>
              Cancel
            </Button>
            <Button onClick={handleSendVerification} disabled={!verificationMessage.trim() || isProcessingAction}>
              {isProcessingAction ? "Sending..." : "Send Verification Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Preview Dialog */}
      <Dialog open={deletionPreviewDialog} onOpenChange={setDeletionPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Deletion Preview</DialogTitle>
            <DialogDescription>
              Review the data that will be deleted for {selectedRequest?.requester_name}
            </DialogDescription>
          </DialogHeader>
          {deletionPreview && (
            <div className="space-y-4">
              <div className="border rounded-lg divide-y">
                {deletionPreview.user_data.map((item) => (
                  <div key={item.type} className="px-4 py-2 flex justify-between">
                    <span className="text-sm">{item.type}</span>
                    <span className="text-sm font-medium">{item.count} records</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Total Records</span>
                <span>{deletionPreview.total_records}</span>
              </div>
              {deletionPreview.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800">Warnings</p>
                  <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                    {deletionPreview.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  This action is permanent and cannot be undone. All data will be deleted.
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted mb-2">
                  Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm permanent data deletion:
                </p>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={deletionConfirmText}
                  onChange={(e) => setDeletionConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletionPreviewDialog(false); setDeletionConfirmText("") }} disabled={isProcessingAction}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { handleExecuteDeletion(); setDeletionConfirmText("") }} disabled={isProcessingAction || deletionConfirmText !== "DELETE"}>
              {isProcessingAction ? "Deleting..." : "Confirm Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={generateReportOpen} onOpenChange={setGenerateReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Compliance Report</DialogTitle>
            <DialogDescription>
              Generate a compliance report for the selected period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
              {isGeneratingReport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retention Rule Create/Edit Dialog */}
      <Dialog open={retentionDialog.open} onOpenChange={(open) => !open && setRetentionDialog({ open: false, rule: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{retentionDialog.rule ? "Edit Retention Rule" : "Add Retention Rule"}</DialogTitle>
            <DialogDescription>
              {retentionDialog.rule ? "Update the data retention rule." : "Define a new data retention rule."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                placeholder="e.g., Candidate Profiles"
                value={retentionForm.category}
                onChange={(e) => setRetentionForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="e.g., Retained for 3 years after last activity"
                value={retentionForm.description}
                onChange={(e) => setRetentionForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Retention (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={retentionForm.retention_days}
                  onChange={(e) => setRetentionForm((f) => ({ ...f, retention_days: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">{formatRetention(retentionForm.retention_days || 0)}</p>
              </div>
              <div className="space-y-2">
                <Label>Enforcement</Label>
                <Select
                  value={retentionForm.enforcement}
                  onValueChange={(v) => setRetentionForm((f) => ({ ...f, enforcement: v as RetentionEnforcement }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automated">Automated</SelectItem>
                    <SelectItem value="legal_hold">Legal Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Legal Basis</Label>
              <Input
                placeholder="e.g., GDPR Article 5(1)(e)"
                value={retentionForm.legal_basis}
                onChange={(e) => setRetentionForm((f) => ({ ...f, legal_basis: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={retentionForm.is_deletable}
                  onChange={(e) => setRetentionForm((f) => ({ ...f, is_deletable: e.target.checked }))}
                  className="rounded border-input"
                />
                User Deletable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={retentionForm.is_active}
                  onChange={(e) => setRetentionForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-input"
                />
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionDialog({ open: false, rule: null })} disabled={isRetentionSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRetentionRule}
              disabled={!retentionForm.category.trim() || !retentionForm.description.trim() || isRetentionSaving}
            >
              {isRetentionSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {retentionDialog.rule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retention Rule Delete Dialog */}
      <Dialog open={retentionDeleteDialog.open} onOpenChange={(open) => !open && setRetentionDeleteDialog({ open: false, rule: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Retention Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the &quot;{retentionDeleteDialog.rule?.category}&quot; retention rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionDeleteDialog({ open: false, rule: null })} disabled={isRetentionSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRetentionRule} disabled={isRetentionSaving}>
              {isRetentionSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal Document View Dialog */}
      <Dialog open={docViewDialog.open} onOpenChange={(open) => !open && setDocViewDialog({ open: false, doc: null })}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{docViewDialog.doc?.title}</DialogTitle>
            <DialogDescription>
              {docTypeLabels[docViewDialog.doc?.document_type || ""] || docViewDialog.doc?.document_type} &middot; v{docViewDialog.doc?.version} &middot; {docStatusConfig[docViewDialog.doc?.status || ""]?.label || docViewDialog.doc?.status}
            </DialogDescription>
          </DialogHeader>
          {docViewDialog.doc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {docViewDialog.doc.effective_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Effective Date</Label>
                    <p>{formatDate(docViewDialog.doc.effective_date)}</p>
                  </div>
                )}
                {docViewDialog.doc.published_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Published</Label>
                    <p>{formatDate(docViewDialog.doc.published_at)}</p>
                  </div>
                )}
                {docViewDialog.doc.reviewed_by_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reviewed By</Label>
                    <p>{docViewDialog.doc.reviewed_by_name}</p>
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: docViewDialog.doc.content || "<p class='text-muted-foreground'>No content yet.</p>" }} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocViewDialog({ open: false, doc: null })}>
              Close
            </Button>
            {docViewDialog.doc && (
              <Button asChild>
                <a href={`/admin/compliance/documents/${docViewDialog.doc.id}/edit`}>Edit Document</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal Document Delete Dialog */}
      <Dialog open={docDeleteDialog.open} onOpenChange={(open) => !open && setDocDeleteDialog({ open: false, doc: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{docDeleteDialog.doc?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDeleteDialog({ open: false, doc: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoc}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

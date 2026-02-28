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
} from "@/lib/api/admin-compliance"
import type {
  ComplianceRequest,
  ComplianceStats,
  ComplianceFilters,
  PaginatedResponse,
} from "@/lib/admin/types"

// Retention rules (static config)
const retentionRules = [
  { category: "Candidate Profiles", retention: "3 years after last activity", deletable: true },
  { category: "Job Applications", retention: "2 years after application", deletable: true },
  { category: "Employer Accounts", retention: "5 years after account closure", deletable: true },
  { category: "Payment Records", retention: "7 years (legal requirement)", deletable: false },
  { category: "Audit Logs", retention: "Permanent (anonymized after 5 years)", deletable: false },
  { category: "Email Communications", retention: "1 year", deletable: true },
]

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: AlertTriangle },
}

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

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.type || "all"} onValueChange={handleTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="export">Data Export</SelectItem>
                    <SelectItem value="deletion">Data Deletion</SelectItem>
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
                          request.type === "export" ? "bg-blue-100" : "bg-red-100"
                        )}
                      >
                        {request.type === "export" ? (
                          <Download className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-red-600" />
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
                          {request.type === "export" ? "Export" : "Deletion"}
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
                            {request.status === "processing" && (
                              <>
                                {request.type === "export" && (
                                  <DropdownMenuItem onClick={() => handleExportData(request)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Generate Export
                                  </DropdownMenuItem>
                                )}
                                {request.type === "deletion" && (
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
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">Data Retention Policies</h3>
              <p className="text-sm text-muted-foreground">
                Defines how long data is kept before automatic deletion
              </p>
            </div>
            <div className="divide-y divide-border">
              {retentionRules.map((rule, i) => (
                <motion.div
                  key={rule.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-4 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{rule.category}</p>
                    <p className="text-sm text-muted-foreground">{rule.retention}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.deletable ? (
                      <Badge className="bg-emerald-100 text-emerald-700">User Deletable</Badge>
                    ) : (
                      <Badge variant="secondary">Protected</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Privacy Policy", lastUpdated: "2026-01-15", url: "/privacy" },
              { title: "Terms of Service", lastUpdated: "2026-01-15", url: "/terms" },
              { title: "Cookie Policy", lastUpdated: "2025-12-01", url: "/cookies" },
              { title: "Data Processing Agreement", lastUpdated: "2025-11-20", url: "/dpa" },
            ].map((policy, i) => (
              <Card
                key={policy.title}
                className="relative overflow-hidden group"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Updated {formatDate(policy.lastUpdated)}
                    </Badge>
                  </div>
                  <h3 className="font-medium mt-4">{policy.title}</h3>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !verificationDialog && !deletionPreviewDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.type === "export" ? "Data Export Request" : "Data Deletion Request"}
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
    </motion.div>
  )
}

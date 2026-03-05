"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CompanyAvatar } from "@/components/company-avatar"
import { Switch } from "@/components/ui/switch"
import { IndustryCombobox } from "@/components/admin/industry-combobox"
import { cn, formatCurrency } from "@/lib/utils"
import {
  getAdminAgencies,
  getAdminAgencyStats,
  createAdminAgency,
  verifyAgency,
  suspendAgency,
  reactivateAgency,
  changeAgencyBillingModel,
  exportAdminAgencies,
} from "@/lib/api/admin-agencies"
import { getAdminUsers } from "@/lib/api/admin-users"
import { toast } from "sonner"
import type {
  AdminAgency,
  AdminAgencyStats,
  AdminAgencyFilters,
  AdminAgencyStatus,
  AdminAgencyBillingStatus,
  AdminAgencyBillingModel,
  AdminAgencyRiskLevel,
  AdminUser,
  PaginatedResponse,
} from "@/lib/admin/types"
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Eye,
  Building,
  CheckCircle,
  Settings,
  Ban,
  RefreshCw,
  X,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
} from "lucide-react"

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

export default function AgenciesPage() {
  // Data state
  const [agencies, setAgencies] = useState<AdminAgency[]>([])
  const [stats, setStats] = useState<AdminAgencyStats | null>(null)
  const [pagination, setPagination] = useState<{ page: number; total_pages: number; count: number }>({
    page: 1,
    total_pages: 1,
    count: 0,
  })

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<AdminAgencyFilters>({
    search: "",
    status: "all",
    billing_status: "all",
    risk_level: "all",
    page: 1,
    page_size: 20,
    ordering: "-created_at",
  })

  // Sort state
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Search debounce
  const [searchInput, setSearchInput] = useState("")

  // Dialog states
  const [addAgencyOpen, setAddAgencyOpen] = useState(false)
  const [verifyingAgency, setVerifyingAgency] = useState<AdminAgency | null>(null)
  const [suspendingAgency, setSuspendingAgency] = useState<AdminAgency | null>(null)
  const [reactivatingAgency, setReactivatingAgency] = useState<AdminAgency | null>(null)
  const [changingBillingFor, setChangingBillingFor] = useState<AdminAgency | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // Action loading states
  const [isCreating, setIsCreating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSuspending, setIsSuspending] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isChangingBilling, setIsChangingBilling] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Add Agency form state
  const [newAgency, setNewAgency] = useState({
    name: "",
    contact_email: "",
    website: "",
    location: "",
    industry: "",
    billing_model: "agency_pays" as AdminAgencyBillingModel,
    send_invite: true,
  })
  const [selectedOwner, setSelectedOwner] = useState<AdminUser | null>(null)
  const [ownerSearch, setOwnerSearch] = useState("")
  const [ownerResults, setOwnerResults] = useState<AdminUser[]>([])
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false)

  // Suspend form state
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendTeam, setSuspendTeam] = useState(false)
  const [suspendJobs, setSuspendJobs] = useState(true)

  // Reactivate form state
  const [reactivateReason, setReactivateReason] = useState("")

  // Change billing state
  const [newBillingModel, setNewBillingModel] = useState<AdminAgencyBillingModel>("agency_pays")

  // Export format
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchAgencies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<AdminAgency> = await getAdminAgencies(filters)
      setAgencies(response.results)
      setPagination({
        page: filters.page || 1,
        total_pages: Math.ceil(response.count / (filters.page_size || 20)),
        count: response.count,
      })
    } catch (err) {
      console.error("Failed to fetch agencies:", err)
      setError("Failed to load agencies. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const statsData = await getAdminAgencyStats()
      setStats(statsData)
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgencies()
  }, [fetchAgencies])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  // Debounced owner user search
  useEffect(() => {
    if (!ownerSearch || ownerSearch.length < 2) {
      setOwnerResults([])
      return
    }
    const timer = setTimeout(async () => {
      setOwnerSearchLoading(true)
      try {
        const response = await getAdminUsers({ search: ownerSearch, page_size: 10 })
        setOwnerResults(response.results)
      } catch {
        setOwnerResults([])
      } finally {
        setOwnerSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [ownerSearch])

  // ==========================================================================
  // Form Helpers
  // ==========================================================================

  const resetAddAgencyForm = () => {
    setNewAgency({
      name: "",
      contact_email: "",
      website: "",
      location: "",
      industry: "",
      billing_model: "agency_pays",
      send_invite: true,
    })
    setSelectedOwner(null)
    setOwnerSearch("")
    setOwnerResults([])
  }

  const resetSuspendForm = () => {
    setSuspendReason("")
    setSuspendTeam(false)
    setSuspendJobs(true)
  }

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleCreateAgency = async () => {
    setIsCreating(true)
    try {
      await createAdminAgency({
        name: newAgency.name,
        contact_email: newAgency.contact_email,
        website: newAgency.website || undefined,
        location: newAgency.location || undefined,
        industry: newAgency.industry || undefined,
        billing_model: newAgency.billing_model,
        owner_id: selectedOwner?.id || undefined,
        send_invite: newAgency.send_invite,
      })
      setAddAgencyOpen(false)
      resetAddAgencyForm()
      fetchAgencies()
      fetchStats()
    } catch (err) {
      console.error("Failed to create agency:", err)
      toast.error("Failed to create agency. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleVerifyAgency = async () => {
    if (!verifyingAgency) return
    setIsVerifying(true)
    try {
      await verifyAgency(verifyingAgency.id)
      setVerifyingAgency(null)
      fetchAgencies()
      fetchStats()
    } catch (err) {
      console.error("Failed to verify agency:", err)
      toast.error("Failed to verify agency. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSuspendAgency = async () => {
    if (!suspendingAgency) return
    setIsSuspending(true)
    try {
      await suspendAgency(suspendingAgency.id, {
        reason: suspendReason,
        suspend_team: suspendTeam,
        suspend_jobs: suspendJobs,
      })
      setSuspendingAgency(null)
      resetSuspendForm()
      fetchAgencies()
      fetchStats()
    } catch (err) {
      console.error("Failed to suspend agency:", err)
      toast.error("Failed to suspend agency. Please try again.")
    } finally {
      setIsSuspending(false)
    }
  }

  const handleReactivateAgency = async () => {
    if (!reactivatingAgency) return
    setIsReactivating(true)
    try {
      await reactivateAgency(reactivatingAgency.id, reactivateReason || undefined)
      setReactivatingAgency(null)
      setReactivateReason("")
      fetchAgencies()
      fetchStats()
    } catch (err) {
      console.error("Failed to reactivate agency:", err)
      toast.error("Failed to reactivate agency. Please try again.")
    } finally {
      setIsReactivating(false)
    }
  }

  const handleChangeBilling = async () => {
    if (!changingBillingFor) return
    setIsChangingBilling(true)
    try {
      await changeAgencyBillingModel(changingBillingFor.id, newBillingModel)
      setChangingBillingFor(null)
      setNewBillingModel("agency_pays")
      fetchAgencies()
    } catch (err) {
      console.error("Failed to change billing model:", err)
      toast.error("Failed to change billing model. Please try again.")
    } finally {
      setIsChangingBilling(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportAdminAgencies(filters, exportFormat)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `agencies-export.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setExportOpen(false)
    } catch (err) {
      console.error("Failed to export:", err)
      toast.error("Failed to export agencies. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // ==========================================================================
  // Filter Handlers
  // ==========================================================================

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value as AdminAgencyStatus | "all",
      page: 1,
    }))
  }

  const handleBillingStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      billing_status: value as AdminAgencyBillingStatus | "all",
      page: 1,
    }))
  }

  const handleRiskFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      risk_level: value as AdminAgencyRiskLevel | "all",
      page: 1,
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  // ==========================================================================
  // Sort Handlers
  // ==========================================================================

  const toggleSort = (field: string) => {
    if (sortField === field) {
      const newDir = sortDirection === "asc" ? "desc" : "asc"
      setSortDirection(newDir)
      setFilters((prev) => ({ ...prev, ordering: newDir === "desc" ? `-${field}` : field, page: 1 }))
    } else {
      setSortField(field)
      setSortDirection("asc")
      setFilters((prev) => ({ ...prev, ordering: field, page: 1 }))
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/sort:text-muted-foreground transition-colors" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    )
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadgeClass = (status: AdminAgencyStatus) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-amber-100 text-amber-700"
      case "unverified":
        return "bg-gray-100 text-gray-700"
      default:
        return ""
    }
  }

  const getBillingStatusBadgeClass = (status?: AdminAgencyBillingStatus) => {
    switch (status) {
      case "active":
        return "border-green-200 text-green-700"
      case "trial":
        return "border-sky/20 text-sky"
      case "suspended":
        return "border-red-200 text-red-700"
      default:
        return ""
    }
  }

  const getRiskDotClass = (risk: AdminAgencyRiskLevel) => {
    switch (risk) {
      case "low":
        return "bg-green-500"
      case "medium":
        return "bg-amber-500"
      case "high":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agencies</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage recruitment agencies and their client relationships
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setAddAgencyOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agency
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div variants={itemVariants}>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAgencies}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard title="Total Agencies" value={stats.total_agencies.toString()} icon={<Briefcase className="h-4 w-4" />} gradient="from-slate-600 to-slate-800" />
            <StatCard title="Verified" value={stats.verified_agencies.toString()} color="green" icon={<ShieldCheck className="h-4 w-4" />} gradient="from-green-500 to-emerald-600" />
            <StatCard title="Total Volume (MTD)" value={formatCurrency(stats.monthly_volume)} color="primary" icon={<DollarSign className="h-4 w-4" />} gradient="from-sky to-sky-deep" />
            <StatCard title="Low Credits" value={(stats.low_credits ?? 0).toString()} color="amber" icon={<AlertTriangle className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" />
          </>
        ) : (
          <>
            <StatCard title="Total Agencies" value="--" icon={<Briefcase className="h-4 w-4" />} gradient="from-slate-600 to-slate-800" />
            <StatCard title="Verified" value="--" color="green" icon={<ShieldCheck className="h-4 w-4" />} gradient="from-green-500 to-emerald-600" />
            <StatCard title="Total Volume (MTD)" value="--" color="primary" icon={<DollarSign className="h-4 w-4" />} gradient="from-sky to-sky-deep" />
            <StatCard title="Low Credits" value="--" color="amber" icon={<AlertTriangle className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" />
          </>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agencies..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.billing_status || "all"} onValueChange={handleBillingStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.risk_level || "all"} onValueChange={handleRiskFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <TableSkeleton />
          ) : agencies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <p>No agencies found matching your criteria.</p>
                {(searchInput || (filters.status && filters.status !== "all") || (filters.billing_status && filters.billing_status !== "all") || (filters.risk_level && filters.risk_level !== "all")) && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSearchInput("")
                      setFilters((prev) => ({
                        ...prev,
                        search: "",
                        status: "all",
                        billing_status: "all",
                        risk_level: "all",
                        page: 1,
                      }))
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("name")}
                      >
                        Agency
                        {getSortIcon("name")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("status")}
                      >
                        Status & Risk
                        {getSortIcon("status")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("billing_status")}
                      >
                        Subscription
                        {getSortIcon("billing_status")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        onClick={() => toggleSort("active_jobs_count")}
                      >
                        Jobs
                        {getSortIcon("active_jobs_count")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        onClick={() => toggleSort("job_credits_remaining")}
                      >
                        Job Credits
                        {getSortIcon("job_credits_remaining")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="group/sort inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("created_at")}
                      >
                        Registered
                        {getSortIcon("created_at")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency) => {
                    const creditsRemaining = agency.job_credits_remaining ?? 0
                    const creditsTotal = agency.job_credits_total ?? 0
                    const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0
                    const isLowCredits = creditsRemaining <= 2

                    return (
                      <TableRow key={agency.id} className="group">
                        {/* Agency (composite: avatar + name + owner) */}
                        <TableCell>
                          <Link href={`/admin/agencies/${agency.id}`} className="flex items-center gap-3 group/link">
                            <CompanyAvatar name={agency.name} logo={agency.logo} size="xs" />
                            <div>
                              <p className="font-medium group-hover/link:text-primary transition-colors">{agency.name}</p>
                              {agency.owner ? (
                                <p className="text-xs text-muted-foreground">{agency.owner.email}</p>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  No owner
                                </span>
                              )}
                            </div>
                          </Link>
                        </TableCell>

                        {/* Status & Risk (combined) */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(getStatusBadgeClass(agency.status))}
                            >
                              {agency.status}
                            </Badge>
                            <div className={cn("h-2 w-2 rounded-full", getRiskDotClass(agency.risk_level))} />
                          </div>
                        </TableCell>

                        {/* Subscription */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(getBillingStatusBadgeClass(agency.billing_status))}
                          >
                            {agency.billing_status === "active" ? "Active" :
                             agency.billing_status === "trial" ? "Trial" :
                             agency.billing_status === "suspended" ? "Suspended" :
                             "—"}
                          </Badge>
                        </TableCell>

                        {/* Jobs (active / total) */}
                        <TableCell className="text-right">
                          <span className="font-medium">{agency.active_jobs_count ?? 0}</span>
                          <span className="text-muted-foreground"> / {agency.job_count ?? 0}</span>
                        </TableCell>

                        {/* Job Credits (remaining / total + micro progress) */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("text-sm", isLowCredits && "text-red-600 font-medium")}>
                              {creditsRemaining} / {creditsTotal}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  creditPercent > 50 ? "bg-green-500" :
                                  creditPercent > 20 ? "bg-amber-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${Math.min(creditPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* Registered */}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(agency.created_at)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/agencies/${agency.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/companies?agency=${agency.id}`}>
                                  <Building className="mr-2 h-4 w-4" />
                                  View Clients
                                </Link>
                              </DropdownMenuItem>
                              {agency.status !== "verified" && (
                                <DropdownMenuItem onClick={() => setVerifyingAgency(agency)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Verify Agency
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setChangingBillingFor(agency)
                                  setNewBillingModel(agency.billing_model)
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Change Billing Model
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {agency.billing_status === "suspended" ? (
                                <DropdownMenuItem
                                  className="text-emerald-600"
                                  onClick={() => setReactivatingAgency(agency)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivate Agency
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setSuspendingAgency(agency)}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend Agency
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * (filters.page_size || 20) + 1} to{" "}
                    {Math.min(pagination.page * (filters.page_size || 20), pagination.count)} of{" "}
                    {pagination.count} agencies
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
                    <span className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.total_pages}
                    </span>
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
            </>
          )}
        </Card>
      </motion.div>

      {/* Add Agency Dialog */}
      <Dialog
        open={addAgencyOpen}
        onOpenChange={(open) => {
          setAddAgencyOpen(open)
          if (!open) resetAddAgencyForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Agency</DialogTitle>
            <DialogDescription>
              Create a new recruitment agency account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Agency Name *</Label>
              <Input
                id="agency-name"
                value={newAgency.name}
                onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                placeholder="Enter agency name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-email">Contact Email *</Label>
              <Input
                id="agency-email"
                type="email"
                value={newAgency.contact_email}
                onChange={(e) => setNewAgency({ ...newAgency, contact_email: e.target.value })}
                placeholder="contact@agency.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agency-website">Website</Label>
                <Input
                  id="agency-website"
                  value={newAgency.website}
                  onChange={(e) => setNewAgency({ ...newAgency, website: e.target.value })}
                  placeholder="https://agency.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency-location">Location</Label>
                <Input
                  id="agency-location"
                  value={newAgency.location}
                  onChange={(e) => setNewAgency({ ...newAgency, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <IndustryCombobox
                  value={newAgency.industry}
                  onValueChange={(value) => setNewAgency({ ...newAgency, industry: value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency-billing">Billing Model</Label>
                <Select
                  value={newAgency.billing_model}
                  onValueChange={(value) =>
                    setNewAgency({ ...newAgency, billing_model: value as AdminAgencyBillingModel })
                  }
                >
                  <SelectTrigger id="agency-billing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency_pays">Agency Pays</SelectItem>
                    <SelectItem value="company_pays">Company Pays</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Owner Assignment */}
            <div className="space-y-2">
              <Label>Owner (optional)</Label>
              <p className="text-xs text-muted-foreground">
                If no owner is selected, you will be assigned as the owner.
              </p>
              {selectedOwner ? (
                <div className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedOwner.full_name || selectedOwner.email}</p>
                    <p className="text-xs text-muted-foreground">{selectedOwner.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedOwner(null)
                      setOwnerSearch("")
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search users by name or email..."
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                  />
                  {ownerSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {ownerResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-auto">
                      {ownerResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center justify-between"
                          onClick={() => {
                            setSelectedOwner(user)
                            setOwnerSearch("")
                            setOwnerResults([])
                          }}
                        >
                          <div>
                            <span className="font-medium">{user.full_name || user.email}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {user.role}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Send Invite Toggle */}
            {selectedOwner && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="send-invite" className="text-sm font-medium">Send setup email</Label>
                  <p className="text-xs text-muted-foreground">
                    Send a password setup email to the owner so they can access their account.
                  </p>
                </div>
                <Switch
                  id="send-invite"
                  checked={newAgency.send_invite}
                  onCheckedChange={(checked) => setNewAgency({ ...newAgency, send_invite: checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAgencyOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgency}
              disabled={!newAgency.name || !newAgency.contact_email || isCreating}
            >
              {isCreating ? "Creating..." : "Create Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Agency Dialog */}
      <Dialog open={!!verifyingAgency} onOpenChange={(open) => !open && setVerifyingAgency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Agency</DialogTitle>
            <DialogDescription>Confirm verification for {verifyingAgency?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <p className="font-medium text-sm">Verification Checklist</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Business registration verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Contact information confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Industry credentials reviewed</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm text-emerald-800">
                Verification enables the agency to access premium features, display a verified badge,
                and build trust with client companies.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyingAgency(null)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAgency}
              disabled={isVerifying}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isVerifying ? "Verifying..." : "Verify Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Billing Model Dialog */}
      <Dialog
        open={!!changingBillingFor}
        onOpenChange={(open) => {
          if (!open) {
            setChangingBillingFor(null)
            setNewBillingModel("agency_pays")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Billing Model</DialogTitle>
            <DialogDescription>Update billing model for {changingBillingFor?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Billing Model</Label>
              <p className="text-sm text-muted-foreground">
                {changingBillingFor?.billing_model === "agency_pays" ? "Agency Pays" : "Company Pays"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-billing">New Billing Model</Label>
              <Select value={newBillingModel} onValueChange={(v) => setNewBillingModel(v as AdminAgencyBillingModel)}>
                <SelectTrigger id="new-billing">
                  <SelectValue placeholder="Select billing model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_pays">Agency Pays</SelectItem>
                  <SelectItem value="company_pays">Company Pays</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Changing the billing model will affect how future job postings are billed. Existing
                jobs will retain their current billing arrangement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingBillingFor(null)} disabled={isChangingBilling}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeBilling}
              disabled={!newBillingModel || newBillingModel === changingBillingFor?.billing_model || isChangingBilling}
            >
              {isChangingBilling ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Agency Dialog */}
      <Dialog
        open={!!suspendingAgency}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendingAgency(null)
            resetSuspendForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Agency</DialogTitle>
            <DialogDescription>Suspend {suspendingAgency?.name} from the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this agency..."
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-team"
                  checked={suspendTeam}
                  onCheckedChange={(checked) => setSuspendTeam(checked === true)}
                />
                <Label htmlFor="suspend-team" className="text-sm font-normal cursor-pointer">
                  Suspend all team members
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-jobs"
                  checked={suspendJobs}
                  onCheckedChange={(checked) => setSuspendJobs(checked === true)}
                />
                <Label htmlFor="suspend-jobs" className="text-sm font-normal cursor-pointer">
                  Pause all active job postings
                </Label>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Suspending this agency will immediately prevent them from accessing the platform.
                This action can be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendingAgency(null)} disabled={isSuspending}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspendAgency}
              disabled={!suspendReason.trim() || isSuspending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSuspending ? "Suspending..." : "Suspend Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Agency Dialog */}
      <Dialog
        open={!!reactivatingAgency}
        onOpenChange={(open) => {
          if (!open) {
            setReactivatingAgency(null)
            setReactivateReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Agency</DialogTitle>
            <DialogDescription>Reactivate {reactivatingAgency?.name} on the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reactivate-reason">Reason for Reactivation (Optional)</Label>
              <Textarea
                id="reactivate-reason"
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                placeholder="Enter the reason for reactivating this agency..."
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm text-emerald-800">
                Reactivating this agency will restore their access to the platform. Team members and
                job postings will be restored based on their previous state.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivatingAgency(null)} disabled={isReactivating}>
              Cancel
            </Button>
            <Button
              onClick={handleReactivateAgency}
              disabled={isReactivating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isReactivating ? "Reactivating..." : "Reactivate Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Agencies</DialogTitle>
            <DialogDescription>Download agency data in your preferred format.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {pagination.count} agencies will be exported based on current filters.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Exporting..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ==========================================================================
// Sub Components
// ==========================================================================

function StatCard({ title, value, color, icon, gradient }: { title: string; value: string; color?: string; icon?: React.ReactNode; gradient?: string }) {
  return (
    <Card className="relative overflow-hidden group">
      {gradient && (
        <>
          <div className={cn(
            "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
            color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : color === "red" ? "bg-red-500" : color === "primary" ? "bg-primary" : "bg-slate-500"
          )} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
        </>
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          color === "green" && "text-green-600",
          color === "amber" && "text-amber-600",
          color === "red" && "text-red-600",
          color === "primary" && "text-primary"
        )}>
          {value}
        </p>
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
        <Skeleton className="mt-1 h-8 w-16" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agency</TableHead>
          <TableHead>Status & Risk</TableHead>
          <TableHead>Subscription</TableHead>
          <TableHead className="text-right">Jobs</TableHead>
          <TableHead className="text-right">Job Credits</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-14" /></TableCell>
            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
            <TableCell>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-1.5 w-16" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

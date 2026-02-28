"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
import { COMPANY_SIZES } from "@/lib/constants/company-sizes"
import { cn } from "@/lib/utils"
import {
  getAdminCompanies,
  getAdminCompanyStats,
  createAdminCompany,
  verifyCompany,
  suspendCompany,
  reactivateCompany,
  contactCompany,
  getCompanyBilling,
} from "@/lib/api/admin-companies"
import { getAdminUsers } from "@/lib/api/admin-users"
import type { AdminUser } from "@/lib/admin/types"
import type {
  AdminCompany,
  AdminCompanyStats,
  AdminCompanyFilters,
  AdminCompanyStatus,
  AdminCompanyBillingStatus,
  AdminCompanyRiskLevel,
} from "@/lib/admin/types"
import { IndustryCombobox } from "@/components/admin/industry-combobox"
import { ChangePlanDialog } from "@/components/admin/change-plan-dialog"
import { AddCreditsDialog } from "@/components/admin/add-credits-dialog"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  CheckCircle,
  FileText,
  CreditCard,
  Ban,
  Mail,
  AlertCircle,
  Loader2,
  Upload,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  RefreshCw,
  Building2,
  Building,
  ShieldCheck,
  Clock,
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

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <CompaniesContent />
    </Suspense>
  )
}

function CompaniesContent() {
  const searchParams = useSearchParams()

  // Data state
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [stats, setStats] = useState<AdminCompanyStats | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Cross-navigation: agency filter from query param
  const agencyFilter = searchParams.get("agency") || undefined

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminCompanyStatus | "all">("all")
  const [billingStatusFilter, setBillingStatusFilter] = useState<AdminCompanyBillingStatus | "all">("all")
  const [riskFilter, setRiskFilter] = useState<AdminCompanyRiskLevel | "all">("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [ordering, setOrdering] = useState("-created_at")

  // Dialog states
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)
  const [verifyingCompany, setVerifyingCompany] = useState<AdminCompany | null>(null)
  const [suspendingCompany, setSuspendingCompany] = useState<AdminCompany | null>(null)
  const [managingBillingFor, setManagingBillingFor] = useState<AdminCompany | null>(null)
  const [billingInfo, setBillingInfo] = useState<{
    plan: string
    monthly_spend: number
    next_billing_date: string | null
    payment_method: string | null
  } | null>(null)
  const [contactingCompany, setContactingCompany] = useState<AdminCompany | null>(null)
  const [changePlanFor, setChangePlanFor] = useState<AdminCompany | null>(null)
  const [addCreditsFor, setAddCreditsFor] = useState<AdminCompany | null>(null)

  // Form states
  const [newCompany, setNewCompany] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    industry: "",
    size: "11-50",
    send_invite: true,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<AdminUser | null>(null)
  const [ownerSearch, setOwnerSearch] = useState("")
  const [ownerResults, setOwnerResults] = useState<AdminUser[]>([])
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendUsers, setSuspendUsers] = useState(false)
  const [suspendJobs, setSuspendJobs] = useState(true)
  const [contactSubject, setContactSubject] = useState("")
  const [contactTemplate, setContactTemplate] = useState("general")
  const [contactMessage, setContactMessage] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: AdminCompanyFilters = {
        page: currentPage,
        page_size: pageSize,
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (statusFilter !== "all") filters.status = statusFilter
      if (billingStatusFilter !== "all") filters.billing_status = billingStatusFilter
      if (riskFilter !== "all") filters.risk_level = riskFilter
      if (agencyFilter) filters.agency = agencyFilter
      if (ordering) filters.ordering = ordering

      const response = await getAdminCompanies(filters)
      setCompanies(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, billingStatusFilter, riskFilter, agencyFilter, ordering])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminCompanyStats()
      setStats(data)
    } catch {
      console.error("Failed to load company stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, billingStatusFilter, riskFilter, ordering])

  // ==========================================================================
  // Sort Handlers
  // ==========================================================================

  const toggleSort = (field: string) => {
    setOrdering((prev) => {
      if (prev === field) return `-${field}`
      if (prev === `-${field}`) return ""
      return field
    })
  }

  const getSortIcon = (field: string) => {
    if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />
    if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/sort:text-muted-foreground transition-colors" />
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

  const getStatusBadgeClass = (status: AdminCompanyStatus) => {
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

  const getBillingStatusBadgeClass = (status?: AdminCompanyBillingStatus) => {
    switch (status) {
      case "active":
        return "border-green-200 text-green-700"
      case "trial":
        return "border-blue-200 text-blue-700"
      case "suspended":
        return "border-red-200 text-red-700"
      default:
        return ""
    }
  }

  const getRiskDotClass = (risk: AdminCompanyRiskLevel) => {
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
  // Form Helpers
  // ==========================================================================

  const clearLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview(null)
  }

  const resetAddCompanyForm = () => {
    setNewCompany({
      name: "",
      domain: "",
      contactEmail: "",
      industry: "",
      size: "11-50",
      send_invite: true,
    })
    clearLogo()
    setSelectedOwner(null)
    setOwnerSearch("")
    setOwnerResults([])
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg']
    if (!validTypes.includes(file.type)) {
      setError('Please upload an SVG, PNG, or JPG file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be smaller than 2MB')
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const resetSuspendForm = () => {
    setSuspendReason("")
    setSuspendUsers(false)
    setSuspendJobs(true)
  }

  const resetContactForm = () => {
    setContactSubject("")
    setContactTemplate("general")
    setContactMessage("")
  }

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleCreateCompany = async () => {
    setActionLoading("create")
    try {
      await createAdminCompany({
        name: newCompany.name,
        domain: newCompany.domain || undefined,
        contact_email: newCompany.contactEmail,
        industry: newCompany.industry,
        size: newCompany.size,
        owner_id: selectedOwner?.id || undefined,
        send_invite: newCompany.send_invite,
      }, logoFile || undefined)
      setAddCompanyOpen(false)
      resetAddCompanyForm()
      fetchCompanies()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateCompany = async (company: AdminCompany) => {
    setActionLoading("reactivate")
    try {
      await reactivateCompany(company.id, "Reactivated by admin")
      toast.success(`${company.name} reactivated`)
      fetchCompanies()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate company")
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerifyCompany = async () => {
    if (!verifyingCompany) return
    setActionLoading("verify")
    try {
      await verifyCompany(verifyingCompany.id)
      setVerifyingCompany(null)
      fetchCompanies()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify company")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspendCompany = async () => {
    if (!suspendingCompany) return
    setActionLoading("suspend")
    try {
      await suspendCompany(suspendingCompany.id, {
        reason: suspendReason,
        suspend_users: suspendUsers,
        suspend_jobs: suspendJobs,
        notify: true,
      })
      setSuspendingCompany(null)
      resetSuspendForm()
      fetchCompanies()
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend company")
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenBilling = async (company: AdminCompany) => {
    setManagingBillingFor(company)
    setBillingInfo(null)
    try {
      const data = await getCompanyBilling(company.id)
      setBillingInfo(data)
    } catch (err) {
      console.error("Failed to load billing info:", err)
    }
  }

  const handleSendContact = async () => {
    if (!contactingCompany) return
    setActionLoading("contact")
    try {
      await contactCompany(contactingCompany.id, {
        subject: contactSubject,
        message: contactMessage,
        template: contactTemplate,
      })
      setContactingCompany(null)
      resetContactForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email")
    } finally {
      setActionLoading(null)
    }
  }

  const isAddCompanyValid = newCompany.name && newCompany.contactEmail && newCompany.industry
  const isSuspendValid = suspendReason.trim().length > 0
  const isContactValid = contactSubject.trim().length > 0 && contactMessage.trim().length > 0

  const totalPages = Math.ceil(totalCount / pageSize)

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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage company accounts, verification, and billing
            </p>
          </div>
        </div>
        <Button onClick={() => setAddCompanyOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div variants={itemVariants}>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
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
        ) : (
          <>
            <StatCard title="Total Companies" value={stats?.total?.toLocaleString() || "0"} icon={<Building className="h-4 w-4" />} gradient="from-slate-600 to-slate-800" />
            <StatCard title="Verified" value={stats?.verified?.toLocaleString() || "0"} color="green" icon={<ShieldCheck className="h-4 w-4" />} gradient="from-green-500 to-emerald-600" />
            <StatCard title="Pending Verification" value={stats?.pending?.toLocaleString() || "0"} color="primary" icon={<Clock className="h-4 w-4" />} gradient="from-blue-500 to-indigo-600" />
            <StatCard title="Low Credits" value={(stats?.low_credits ?? 0).toLocaleString()} color="amber" icon={<AlertTriangle className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" />
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
                  placeholder="Search companies by name or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AdminCompanyStatus | "all")}>
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
              <Select value={billingStatusFilter} onValueChange={(v) => setBillingStatusFilter(v as AdminCompanyBillingStatus | "all")}>
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
              <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as AdminCompanyRiskLevel | "all")}>
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
          ) : companies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <p>No companies found</p>
                {(debouncedSearch || statusFilter !== "all" || billingStatusFilter !== "all" || riskFilter !== "all") && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
                      setBillingStatusFilter("all")
                      setRiskFilter("all")
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
                        Company
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
                  {companies.map((company) => {
                    const creditsRemaining = company.job_credits_remaining ?? 0
                    const creditsTotal = company.job_credits_total ?? 0
                    const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0
                    const isLowCredits = creditsRemaining <= 2

                    return (
                      <TableRow key={company.id} className="group">
                        {/* Company (composite: avatar + name + owner) */}
                        <TableCell>
                          <Link href={`/admin/companies/${company.id}`} className="flex items-center gap-3 group/link">
                            <CompanyAvatar name={company.name} size="xs" />
                            <div>
                              <p className="font-medium group-hover/link:text-primary transition-colors">{company.name}</p>
                              {company.owner ? (
                                <p className="text-xs text-muted-foreground">{company.owner.email}</p>
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
                              className={cn(getStatusBadgeClass(company.status))}
                            >
                              {company.status}
                            </Badge>
                            <div className={cn("h-2 w-2 rounded-full", getRiskDotClass(company.risk_level))} />
                          </div>
                        </TableCell>

                        {/* Subscription */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(getBillingStatusBadgeClass(company.billing_status))}
                          >
                            {company.billing_status === "active" ? "Active" :
                             company.billing_status === "trial" ? "Trial" :
                             company.billing_status === "suspended" ? "Suspended" :
                             "—"}
                          </Badge>
                        </TableCell>

                        {/* Jobs (active / total) */}
                        <TableCell className="text-right">
                          <span className="font-medium">{company.active_jobs_count}</span>
                          <span className="text-muted-foreground"> / {company.job_count ?? 0}</span>
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
                          {formatDate(company.created_at)}
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
                                <Link href={`/admin/companies/${company.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {company.owner && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/users/${company.owner.id}`}>
                                    <User className="mr-2 h-4 w-4" />
                                    View Owner
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setVerifyingCompany(company)}
                                disabled={company.status === "verified"}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Company
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/jobs?company=${company.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Jobs
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenBilling(company)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Manage Billing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setContactingCompany(company)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Contact Company
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {company.billing_status === "suspended" ? (
                                <DropdownMenuItem
                                  className="text-emerald-600"
                                  onClick={() => handleReactivateCompany(company)}
                                  disabled={actionLoading === "reactivate"}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivate Company
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setSuspendingCompany(company)}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend Company
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} companies
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
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

      {/* Add Company Dialog */}
      <Dialog open={addCompanyOpen} onOpenChange={(open) => {
        setAddCompanyOpen(open)
        if (!open) resetAddCompanyForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Create a new company account on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {newCompany.name ? newCompany.name.substring(0, 2).toUpperCase() : "CO"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {logoFile ? "Change" : "Upload"}
                    </Button>
                    {logoFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearLogo}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">SVG, PNG, or JPG. Max 2MB.</p>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="Acme Corp"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-domain">Domain</Label>
              <Input
                id="company-domain"
                placeholder="acme.com"
                value={newCompany.domain}
                onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Primary Contact Email *</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="admin@acme.com"
                value={newCompany.contactEmail}
                onChange={(e) => setNewCompany({ ...newCompany, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry *</Label>
              <IndustryCombobox
                value={newCompany.industry}
                onValueChange={(value) => setNewCompany({ ...newCompany, industry: value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Company Size</Label>
              <Select
                value={newCompany.size}
                onValueChange={(value) => setNewCompany({ ...newCompany, size: value })}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Owner Assignment */}
            <div className="space-y-2">
              <Label>Account Owner</Label>
              <p className="text-xs text-muted-foreground">If no owner is selected, you will be assigned as the owner.</p>
              {selectedOwner ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{selectedOwner.full_name || selectedOwner.email}</span>
                    <span className="text-xs text-muted-foreground">{selectedOwner.email}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedOwner(null)
                      setOwnerSearch("")
                      setOwnerResults([])
                    }}
                  >
                    <X className="h-4 w-4" />
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
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {ownerResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {ownerResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => {
                            setSelectedOwner(user)
                            setOwnerSearch("")
                            setOwnerResults([])
                          }}
                        >
                          <span className="font-medium">{user.full_name || user.email}</span>
                          <span className="text-xs text-muted-foreground">{user.email} &middot; {user.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {ownerSearch.length >= 2 && !ownerSearchLoading && ownerResults.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2">
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Send Invite Toggle */}
            {selectedOwner && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="send-invite-company" className="text-sm font-medium">Send setup email</Label>
                  <p className="text-xs text-muted-foreground">
                    Send a password setup email to the owner so they can access their account.
                  </p>
                </div>
                <Switch
                  id="send-invite-company"
                  checked={newCompany.send_invite}
                  onCheckedChange={(checked) => setNewCompany({ ...newCompany, send_invite: checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCompanyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={!isAddCompanyValid || actionLoading === "create"}>
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Company Dialog */}
      <Dialog open={!!verifyingCompany} onOpenChange={(open) => !open && setVerifyingCompany(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Company</DialogTitle>
            <DialogDescription>
              Confirm verification for {verifyingCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {verifyingCompany && (
                <CompanyAvatar name={verifyingCompany.name} size="xs" />
              )}
              <div>
                <p className="font-medium">{verifyingCompany?.name}</p>
                <p className="text-sm text-muted-foreground">{verifyingCompany?.domain}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Verification checklist:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Domain ownership confirmed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Business registration validated
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Contact information verified
                </li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              Verified companies gain a verified badge on their job postings and access to premium features.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyingCompany(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyCompany}
              disabled={actionLoading === "verify"}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {actionLoading === "verify" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Company Dialog */}
      <Dialog open={!!suspendingCompany} onOpenChange={(open) => {
        if (!open) {
          setSuspendingCompany(null)
          resetSuspendForm()
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Company</DialogTitle>
            <DialogDescription>
              Suspend {suspendingCompany?.name}&apos;s account and related activities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {suspendingCompany && (
                <CompanyAvatar name={suspendingCompany.name} size="xs" />
              )}
              <div>
                <p className="font-medium">{suspendingCompany?.name}</p>
                <p className="text-sm text-muted-foreground">{suspendingCompany?.domain}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for suspension *</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter the reason for suspending this company..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-users"
                  checked={suspendUsers}
                  onCheckedChange={(checked) => setSuspendUsers(checked as boolean)}
                />
                <Label htmlFor="suspend-users" className="text-sm font-normal cursor-pointer">
                  Suspend all company users ({suspendingCompany?.users_count} users)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-jobs"
                  checked={suspendJobs}
                  onCheckedChange={(checked) => setSuspendJobs(checked as boolean)}
                />
                <Label htmlFor="suspend-jobs" className="text-sm font-normal cursor-pointer">
                  Suspend all active jobs ({suspendingCompany?.active_jobs_count} jobs)
                </Label>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Suspending this company will immediately prevent them from accessing the platform.
                This action can be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendingCompany(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspendCompany}
              disabled={!isSuspendValid || actionLoading === "suspend"}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {actionLoading === "suspend" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suspend Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Billing Dialog */}
      <Dialog open={!!managingBillingFor} onOpenChange={(open) => !open && setManagingBillingFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Billing</DialogTitle>
            <DialogDescription>
              Billing management for {managingBillingFor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {managingBillingFor && (
                <CompanyAvatar name={managingBillingFor.name} size="xs" />
              )}
              <div>
                <p className="font-medium">{managingBillingFor?.name}</p>
                <Badge
                  variant="outline"
                  className={cn(getBillingStatusBadgeClass(managingBillingFor?.billing_status))}
                >
                  {managingBillingFor?.billing_status}
                </Badge>
              </div>
            </div>
            {billingInfo ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg border">
                  <p className="text-muted-foreground">Current Plan</p>
                  <p className="font-medium">{billingInfo.plan}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-muted-foreground">Monthly Spend</p>
                  <p className="font-medium">${billingInfo.monthly_spend}/mo</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Actions</p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setChangePlanFor(managingBillingFor)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Change Plan
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setAddCreditsFor(managingBillingFor)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Credits
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href={`/admin/companies/${managingBillingFor?.id}?tab=billing`}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Invoices
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingBillingFor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      {changePlanFor && (
        <ChangePlanDialog
          company={{
            id: changePlanFor.id,
            name: changePlanFor.name,
            currentPlan: billingInfo?.plan || "Free",
          }}
          open={!!changePlanFor}
          onOpenChange={(open) => !open && setChangePlanFor(null)}
          onSuccess={async () => {
            fetchCompanies()
            if (managingBillingFor) {
              const data = await getCompanyBilling(managingBillingFor.id)
              setBillingInfo(data)
            }
          }}
        />
      )}

      {/* Add Credits Dialog */}
      {addCreditsFor && (
        <AddCreditsDialog
          company={{
            id: addCreditsFor.id,
            name: addCreditsFor.name,
          }}
          open={!!addCreditsFor}
          onOpenChange={(open) => !open && setAddCreditsFor(null)}
          onSuccess={() => {
            fetchCompanies()
            if (managingBillingFor) {
              getCompanyBilling(managingBillingFor.id).then(setBillingInfo)
            }
          }}
        />
      )}

      {/* Contact Company Dialog */}
      <Dialog open={!!contactingCompany} onOpenChange={(open) => {
        if (!open) {
          setContactingCompany(null)
          resetContactForm()
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Company</DialogTitle>
            <DialogDescription>
              Send an email to {contactingCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-template">Message Template</Label>
              <Select value={contactTemplate} onValueChange={setContactTemplate}>
                <SelectTrigger id="contact-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="verification">Verification Request</SelectItem>
                  <SelectItem value="billing">Billing Issue</SelectItem>
                  <SelectItem value="compliance">Compliance Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject *</Label>
              <Input
                id="contact-subject"
                placeholder="Enter email subject..."
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message *</Label>
              <Textarea
                id="contact-message"
                placeholder="Enter your message..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactingCompany(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendContact} disabled={!isContactValid || actionLoading === "contact"}>
              {actionLoading === "contact" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Email
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
            color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : color === "primary" ? "bg-primary" : "bg-slate-500"
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
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            color === "green" && "text-green-600",
            color === "amber" && "text-amber-600",
            color === "red" && "text-red-600",
            color === "primary" && "text-primary"
          )}
        >
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
          <TableHead>Company</TableHead>
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

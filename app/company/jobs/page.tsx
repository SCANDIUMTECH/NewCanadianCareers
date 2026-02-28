"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Info, CreditCard, Check, Sparkles, Zap, AlertCircle, RefreshCw,
  Eye, Edit, Pause, Play, Copy, Trash2, ExternalLink, RotateCcw,
  MapPin, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, CalendarClock,
} from "lucide-react"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { JOB_STATUS_STYLES } from "@/lib/constants/status-styles"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { PaginationWrapper } from "@/components/ui/pagination"
import { getCompanyJobs, publishJob, pauseJob, resumeJob, deleteJob, duplicateJob, refreshJob, trashJob, restoreJob, getTrashedJobs, getJobStats, JobStats } from "@/lib/api/jobs"
import { getSocialAccounts } from "@/lib/api/social"
import { getPackages } from "@/lib/api/billing"
import type { JobListItem, JobStatus, PaginatedResponse, SocialAccount, Package } from "@/lib/company/types"
import { useCompanyContext } from "@/hooks/use-company"
import { useCart } from "@/hooks/use-cart"

const PENDING_PUBLISH_KEY = "orion-pending-publish"

/**
 * Company Jobs Management
 * Full job management with filtering, bulk actions, and status management
 * Integrated with backend API
 */

interface StatusFilter {
  value: JobStatus | "all" | "trash"
  label: string
  count: number
}

// Sortable columns matching backend ordering_fields
type SortField = "posted_at" | "expires_at" | "applications_count"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE = 10

// Date formatter
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function CompanyJobsPage() {
  const router = useRouter()
  const { entitlements, refreshEntitlements } = useCompanyContext()
  const { addItem, clearCart } = useCart()
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all" | "trash">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [jobToPublish, setJobToPublish] = useState<JobListItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Sort state
  const [sortField, setSortField] = useState<SortField>("posted_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // API state
  const [jobsData, setJobsData] = useState<PaginatedResponse<JobListItem> | null>(null)
  const [jobStats, setJobStats] = useState<JobStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [trashCount, setTrashCount] = useState(0)

  // Social distribution state
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  // Package selection state (no-credits flow)
  const [packages, setPackages] = useState<Package[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "single"; jobId: string } | { type: "bulk" } | null>(null)

  const remainingCredits = entitlements?.remaining_credits ?? 0
  const hasCredits = remainingCredits >= 1

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const stats = await getJobStats()
      setJobStats(stats)
    } catch (err) {
      console.error("Failed to load job stats:", err)
    }
  }, [])

  // Fetch trash count for the tab badge
  const fetchTrashCount = useCallback(async () => {
    try {
      const trashed = await getTrashedJobs()
      setTrashCount(trashed.length)
    } catch {
      // Silently fail — trash count is non-critical
    }
  }, [])

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Trash tab uses a separate endpoint
      if (selectedStatus === "trash") {
        const trashedJobs = await getTrashedJobs()
        setTrashCount(trashedJobs.length)
        setJobsData({
          count: trashedJobs.length,
          next: null,
          previous: null,
          results: trashedJobs,
        })
        return
      }

      const ordering = sortDirection === "desc" ? `-${sortField}` : sortField
      const data = await getCompanyJobs({
        status: selectedStatus === "all" ? undefined : selectedStatus,
        search: debouncedSearch || undefined,
        page: currentPage,
        page_size: ITEMS_PER_PAGE,
        ordering,
      })
      setJobsData(data)
    } catch (err) {
      const message = (err as { message?: string })?.message || "Failed to load jobs"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [selectedStatus, debouncedSearch, currentPage, sortField, sortDirection])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    fetchStats()
    fetchTrashCount()
  }, [fetchStats, fetchTrashCount])

  // Fetch social accounts for publish dialog
  useEffect(() => {
    getSocialAccounts()
      .then((accounts) => setSocialAccounts(accounts))
      .catch(() => {
        // Silently fail — social distribution is optional
      })
  }, [])

  // Calculate status counts from stats
  const statusFilters: StatusFilter[] = [
    { value: "all", label: "All Jobs", count: jobStats?.total_jobs ?? 0 },
    { value: "published", label: "Published", count: jobStats?.published_jobs ?? 0 },
    { value: "pending", label: "Pending", count: jobStats?.pending_jobs ?? 0 },
    { value: "draft", label: "Draft", count: jobStats?.draft_jobs ?? 0 },
    { value: "paused", label: "Paused", count: jobStats?.paused_jobs ?? 0 },
    { value: "expired", label: "Expired", count: jobStats?.expired_jobs ?? 0 },
    { value: "trash", label: "Trash", count: trashCount },
  ]

  const jobs = jobsData?.results ?? []

  const handleStatusChange = (status: JobStatus | "all" | "trash") => {
    setSelectedStatus(status)
    setCurrentPage(1)
    setSelectedJobs([])
  }

  // Sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
    setCurrentPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === jobs.length && jobs.length > 0) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(jobs.map(j => j.job_id))
    }
  }

  // Fetch packages when dialog opens and no credits
  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true)
      setPackagesError(null)
      const pkgs = await getPackages()
      setPackages(pkgs)
    } catch {
      setPackagesError("Failed to load packages.")
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  // Job actions
  const handlePublish = async () => {
    if (!jobToPublish) return
    setIsActionLoading(true)
    setPublishError(null)
    try {
      if (!hasCredits) {
        // No credits: purchase flow
        if (!selectedPackage) {
          setPublishError("Please select a plan to continue.")
          setIsActionLoading(false)
          return
        }

        // Store pending publish intent
        localStorage.setItem(PENDING_PUBLISH_KEY, JSON.stringify({
          jobId: jobToPublish.job_id,
          socialPlatforms: selectedPlatforms,
          savedAt: new Date().toISOString(),
        }))

        // Add package to cart and redirect to checkout
        clearCart()
        addItem({
          id: `pkg-${selectedPackage.id}`,
          type: "package",
          name: `${selectedPackage.name} Package`,
          description: `${selectedPackage.job_credits ?? selectedPackage.credits} job posting credits`,
          credits: selectedPackage.job_credits ?? selectedPackage.credits,
          unitPrice: selectedPackage.price,
          popular: selectedPackage.is_popular,
        })

        setShowPublishDialog(false)
        router.push("/company/checkout")
        return
      }

      // Has credits: publish directly
      await publishJob(jobToPublish.job_id, {
        social_platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      })
      setShowPublishDialog(false)
      setJobToPublish(null)
      setSelectedPlatforms([])
      setSelectedPackage(null)
      fetchJobs()
      fetchStats()
      refreshEntitlements()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish job. Please try again."
      setPublishError(message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePause = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await pauseJob(jobId)
      fetchJobs()
      fetchStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to pause job"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleResume = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await resumeJob(jobId)
      fetchJobs()
      fetchStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to resume job"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDuplicate = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await duplicateJob(jobId)
      fetchJobs()
      fetchStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to duplicate job"
      console.error("Failed to duplicate job:", msg)
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRefresh = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await refreshJob(jobId)
      fetchJobs()
      fetchStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh job"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = (jobId: string) => {
    setDeleteConfirm({ type: "single", jobId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    setIsActionLoading(true)
    try {
      if (deleteConfirm.type === "single") {
        await deleteJob(deleteConfirm.jobId)
      } else {
        await Promise.all(selectedJobs.map(jobId => deleteJob(jobId)))
        setSelectedJobs([])
      }
      fetchJobs()
      fetchStats()
      fetchTrashCount()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete job(s)"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
      setDeleteConfirm(null)
    }
  }

  // Bulk actions
  const handleBulkPause = async () => {
    if (selectedJobs.length === 0) return
    setIsActionLoading(true)
    try {
      await Promise.all(selectedJobs.map(jobId => pauseJob(jobId)))
      setSelectedJobs([])
      fetchJobs()
      fetchStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to pause jobs"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedJobs.length === 0) return
    setDeleteConfirm({ type: "bulk" })
  }

  // Trash actions
  const handleTrash = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await trashJob(jobId)
      fetchJobs()
      fetchStats()
      fetchTrashCount()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to trash job"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRestore = async (jobId: string) => {
    setIsActionLoading(true)
    try {
      await restoreJob(jobId)
      fetchJobs()
      fetchStats()
      fetchTrashCount()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to restore job"
      toast.error(msg)
    } finally {
      setIsActionLoading(false)
    }
  }

  const formatLocation = (job: JobListItem): string => {
    if (job.location_type === "remote") return "Remote"
    const parts = [job.city, job.state, job.country].filter(Boolean)
    return parts.length > 0 ? parts.slice(0, 2).join(", ") : "Not specified"
  }

  const formatEmploymentType = (type: string): string => {
    return type.replace("_", "-").replace(/\b\w/g, l => l.toUpperCase())
  }

  // Expiry info with urgency
  const getExpiryInfo = (expiresAt: string | null) => {
    if (!expiresAt) return { className: "text-foreground-muted", label: "—", daysLeft: 999 }
    const expiresDate = new Date(expiresAt)
    const now = new Date()
    const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const dateStr = formatDate(expiresAt)
    if (daysLeft <= 0) return { className: "text-foreground-muted/50 line-through", label: dateStr, daysLeft }
    if (daysLeft <= 3) return { className: "text-red-600 font-medium", label: dateStr, daysLeft }
    if (daysLeft <= 7) return { className: "text-amber-600", label: dateStr, daysLeft }
    return { className: "text-foreground-muted", label: dateStr, daysLeft }
  }

  const isTrashView = selectedStatus === "trash"

  // Loading skeleton
  if (isLoading && !jobsData) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
            <div className="h-4 w-48 bg-background-secondary rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-background-secondary rounded animate-pulse" />
        </div>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-background-secondary rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !jobsData) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load jobs</h2>
          <p className="text-foreground-muted mb-6">{error}</p>
          <Button onClick={fetchJobs}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Jobs</h1>
            <p className="text-sm text-foreground-muted mt-1">Manage your job postings</p>
          </div>
          <Link href="/company/jobs/new">
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Post New Job
            </Button>
          </Link>
        </div>
      </MotionWrapper>

      {/* Filters & Search */}
      <MotionWrapper delay={100}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:pb-0">
                {statusFilters.map((filter) => {
                  const isActive = selectedStatus === filter.value
                  const dotColor = filter.value !== "all" && filter.value !== "trash"
                    ? statusDotConfig[filter.value]?.color
                    : null

                  return (
                    <button
                      key={filter.value}
                      onClick={() => handleStatusChange(filter.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] whitespace-nowrap transition-all",
                        isActive
                          ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/15"
                          : "text-foreground-muted hover:text-foreground hover:bg-background-secondary/60"
                      )}
                    >
                      {filter.value === "trash" ? (
                        <Trash2 className="w-3.5 h-3.5" />
                      ) : dotColor ? (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          dotColor,
                          !isActive && "opacity-50"
                        )} />
                      ) : null}
                      <span>{filter.label}</span>
                      {filter.count > 0 && (
                        <span className={cn(
                          "text-[10px] tabular-nums leading-none rounded-full min-w-[18px] text-center px-1.5 py-0.5",
                          isActive
                            ? "bg-primary/15 text-primary font-semibold"
                            : "bg-foreground/[0.06] text-foreground-muted"
                        )}>
                          {filter.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Search */}
              <div className="flex-1 lg:max-w-xs ml-auto">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedJobs.length > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                <span className="text-sm text-foreground-muted">
                  {selectedJobs.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={handleBulkPause}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? "Pausing..." : "Pause Selected"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent text-destructive hover:bg-destructive/10"
                    onClick={handleBulkDelete}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? "Deleting..." : "Delete Selected"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Expired retention info banner */}
      {selectedStatus === "expired" && (jobStats?.expired_jobs ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200 mb-4">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Expired jobs are hidden from public search but remain accessible here.{" "}
            {jobStats?.expired_retention_days && jobStats.expired_retention_days > 0
              ? `They will be permanently deleted after ${jobStats.expired_retention_days} day${jobStats.expired_retention_days !== 1 ? "s" : ""}. Use "Re-post as New" to create a fresh listing before then.`
              : "They are kept indefinitely until you delete them. Use \"Re-post as New\" to create a fresh listing at any time."}
          </p>
        </div>
      )}

      {/* Trash info banner */}
      {isTrashView && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-200 mb-4">
          <Trash2 className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Trashed jobs are soft-deleted. You can restore them or permanently delete them.
          </p>
        </div>
      )}

      {/* Jobs Table */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-[32px_1fr_88px_64px_72px_108px_108px] gap-3 px-4 py-2 border-b border-border/50 bg-background-secondary/30 items-center">
            <div>
              <Checkbox
                checked={selectedJobs.length === jobs.length && jobs.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Job</div>
            <div className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Status</div>
            <div className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider text-right">Views</div>
            <SortableHeader label="Applies" field="applications_count" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Posted" field="posted_at" currentField={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Expires" field="expires_at" currentField={sortField} direction={sortDirection} onSort={handleSort} />
          </div>

          {/* Job rows */}
          <div className="divide-y divide-border/50">
            {jobs.map((job, index) => (
              <JobRow
                key={job.id}
                job={job}
                index={index}
                selected={selectedJobs.includes(job.job_id)}
                onSelect={toggleSelectJob}
                onPublish={(j) => {
                  setJobToPublish(j)
                  setPublishError(null)
                  setSelectedPackage(null)
                  setSelectedPlatforms(
                    socialAccounts.filter(a => a.is_connected).map(a => a.platform)
                  )
                  if (!hasCredits) fetchPackages()
                  setShowPublishDialog(true)
                }}
                onPause={handlePause}
                onResume={handleResume}
                onDuplicate={handleDuplicate}
                onRefresh={handleRefresh}
                onDelete={handleDelete}
                onTrash={handleTrash}
                onRestore={handleRestore}
                formatLocation={formatLocation}
                formatEmploymentType={formatEmploymentType}
                getExpiryInfo={getExpiryInfo}
                isActionLoading={isActionLoading}
                selectedJobsCount={selectedJobs.length}
                isTrashView={isTrashView}
              />
            ))}
          </div>

          {jobs.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                {isTrashView ? (
                  <Trash2 className="w-6 h-6 text-foreground-muted" />
                ) : (
                  <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                {isTrashView ? "Trash is empty" : "No jobs found"}
              </h3>
              <p className="text-sm text-foreground-muted mb-4">
                {isTrashView ? "Deleted jobs will appear here" : "Try adjusting your filters or search query"}
              </p>
              {!isTrashView && (
                <Link href="/company/jobs/new">
                  <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    Post New Job
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {jobs.length > 0 && (
            <div className="p-4 border-t border-border/50">
              <PaginationWrapper
                currentPage={currentPage}
                pageSize={ITEMS_PER_PAGE}
                totalItems={jobsData?.count ?? 0}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      </MotionWrapper>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={(open) => {
        setShowPublishDialog(open)
        if (!open) { setPublishError(null); setSelectedPackage(null) }
      }}>
        <DialogContent className={cn(!hasCredits && "sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>{hasCredits ? "Publish Job" : "Get Credits to Publish"}</DialogTitle>
            <DialogDescription>
              {hasCredits
                ? "This will use 1 job credit and make your job publicly visible."
                : "Choose a plan below to purchase credits and publish your job."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Job summary */}
            <div className="p-4 rounded-lg bg-background-secondary/50">
              <p className="font-medium text-foreground">{jobToPublish?.title}</p>
              <p className="text-sm text-foreground-muted mt-1">
                {jobToPublish ? formatLocation(jobToPublish) : ""} · {jobToPublish ? formatEmploymentType(jobToPublish.employment_type) : ""}
              </p>
            </div>

            {/* ── No Credits: Inline package selection ── */}
            {!hasCredits && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Select a plan</label>
                {packagesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-[140px] bg-background-secondary rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : packagesError ? (
                  <div className="text-center py-4">
                    <AlertCircle className="w-6 h-6 text-foreground-muted mx-auto mb-1.5" />
                    <p className="text-xs text-foreground-muted mb-2">{packagesError}</p>
                    <Button variant="outline" size="sm" onClick={fetchPackages} className="bg-transparent">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id
                      const Icon = pkg.is_popular ? Sparkles : Zap
                      const credits = pkg.job_credits ?? pkg.credits ?? 0
                      const perCredit = credits > 0 ? (pkg.price / credits).toFixed(2) : "0"
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackage(isSelected ? null : pkg)
                            setPublishError(null)
                          }}
                          className={cn(
                            "relative text-left rounded-xl border-2 p-3 transition-all duration-200",
                            "hover:border-primary/50 hover:shadow-sm",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/50 bg-card",
                            pkg.is_popular && !isSelected && "border-primary/30"
                          )}
                        >
                          {pkg.is_popular && (
                            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                              Popular
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="pt-0.5">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center mb-2",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-semibold text-foreground text-sm">{pkg.name}</p>
                            <div className="mt-1">
                              <span className="text-xl font-bold text-primary">
                                {getCurrencySymbol(pkg.currency)}{pkg.price}
                              </span>
                              {pkg.billing_period && pkg.package_type !== "one_time" && (
                                <span className="text-xs text-foreground-muted">
                                  /{pkg.billing_period === "month" || pkg.billing_period === "monthly" ? "mo" : "yr"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground-muted mt-0.5">
                              {credits} credits · {getCurrencySymbol(pkg.currency)}{perCredit}/credit
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected package summary */}
                {selectedPackage && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs text-foreground-muted">
                        <span className="font-medium text-foreground">{selectedPackage.name}</span>
                        {" — "}{getCurrencySymbol(selectedPackage.currency)}{selectedPackage.price}
                        {" · "}1 credit will be used to publish this job
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Has Credits: Social distribution ── */}
            {hasCredits && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Social Distribution</label>
                <div className="space-y-2">
                  {socialAccounts.length > 0 ? (
                    socialAccounts.map((account) => {
                      const platformStyles: Record<string, { bg: string; text: string; label: string; icon: string }> = {
                        linkedin: { bg: "bg-social-linkedin/10", text: "text-social-linkedin", label: "LinkedIn", icon: "in" },
                        twitter: { bg: "bg-foreground/10", text: "text-foreground", label: "X (Twitter)", icon: "X" },
                        facebook: { bg: "bg-social-facebook/10", text: "text-social-facebook", label: "Facebook", icon: "f" },
                      }
                      const style = platformStyles[account.platform] || { bg: "bg-primary/10", text: "text-primary", label: account.platform, icon: "?" }
                      const isSelected = selectedPlatforms.includes(account.platform)

                      return (
                        <div key={account.id} className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          account.is_connected ? "border-border/50" : "border-border/30 opacity-60"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded flex items-center justify-center", style.bg)}>
                              <span className={cn("text-xs font-bold", style.text)}>{style.icon}</span>
                            </div>
                            <div>
                              <span className="text-sm">{style.label}</span>
                              {account.is_connected ? (
                                <p className="text-xs text-foreground-muted">{account.account_name}</p>
                              ) : (
                                <p className="text-xs text-foreground-muted">Not connected</p>
                              )}
                            </div>
                          </div>
                          <Checkbox
                            checked={isSelected}
                            disabled={!account.is_connected}
                            onCheckedChange={(checked) => {
                              setSelectedPlatforms(prev =>
                                checked
                                  ? [...prev, account.platform]
                                  : prev.filter(p => p !== account.platform)
                              )
                            }}
                          />
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-foreground-muted py-2">
                      No social accounts connected.{" "}
                      <Link href="/company/settings" className="text-primary hover:underline">Connect accounts</Link>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {publishError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{publishError}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isActionLoading || (!hasCredits && !selectedPackage)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isActionLoading
                ? (hasCredits ? "Publishing..." : "Redirecting...")
                : hasCredits
                  ? `Publish (1 Credit)`
                  : "Purchase & Publish"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === "bulk"
                ? `Delete ${selectedJobs.length} job(s)?`
                : "Delete this job?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The job{deleteConfirm?.type === "bulk" ? "s" : ""} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Status badge with dot indicator
const statusDotConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-slate-400", label: "Draft" },
  pending: { color: "bg-amber-500", label: "Pending" },
  pending_payment: { color: "bg-orange-500", label: "Payment" },
  scheduled: { color: "bg-purple-500", label: "Scheduled" },
  published: { color: "bg-emerald-500", label: "Published" },
  paused: { color: "bg-orange-500", label: "Paused" },
  expired: { color: "bg-red-500", label: "Expired" },
  filled: { color: "bg-teal-500", label: "Filled" },
  hidden: { color: "bg-gray-400", label: "Hidden" },
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const style = JOB_STATUS_STYLES[status]
  return (
    <Badge variant="outline" className={cn("text-xs", style?.className)}>
      {style?.label ?? status}
    </Badge>
  )
}

// Sortable column header
function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = "left",
}: {
  label: string
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  align?: "left" | "right"
}) {
  const isActive = currentField === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors",
        isActive ? "text-foreground" : "text-foreground-muted hover:text-foreground",
        align === "right" && "justify-end"
      )}
    >
      {label}
      {isActive ? (
        direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  )
}

// Hover action button (inline in row)
function ActionBtn({
  icon: Icon,
  label,
  href,
  onClick,
  variant = "default",
}: {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "success" | "warning" | "destructive"
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
    variant === "default" && "text-foreground-muted hover:text-foreground hover:bg-background-secondary",
    variant === "success" && "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    variant === "warning" && "text-amber-700 bg-amber-50 hover:bg-amber-100",
    variant === "destructive" && "text-red-600 hover:text-red-700 hover:bg-red-50",
  )

  const content = (
    <>
      <Icon className="w-3.5 h-3.5" />
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

// Job row component with hover-expand actions
function JobRow({
  job,
  index,
  selected,
  onSelect,
  onPublish,
  onPause,
  onResume,
  onDuplicate,
  onRefresh,
  onDelete,
  onTrash,
  onRestore,
  formatLocation,
  formatEmploymentType,
  getExpiryInfo,
  isActionLoading,
  selectedJobsCount,
  isTrashView,
}: {
  job: JobListItem
  index: number
  selected: boolean
  onSelect: (jobId: string) => void
  onPublish: (job: JobListItem) => void
  onPause: (jobId: string) => void
  onResume: (jobId: string) => void
  onDuplicate: (jobId: string) => void
  onRefresh: (jobId: string) => void
  onDelete: (jobId: string) => void
  onTrash: (jobId: string) => void
  onRestore: (jobId: string) => void
  formatLocation: (job: JobListItem) => string
  formatEmploymentType: (type: string) => string
  getExpiryInfo: (expiresAt: string | null) => { className: string; label: string; daysLeft: number }
  isActionLoading: boolean
  selectedJobsCount: number
  isTrashView: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const dot = statusDotConfig[job.status] || statusDotConfig.draft
  const expiryInfo = useMemo(() => getExpiryInfo(job.expires_at), [job.expires_at, getExpiryInfo])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      {/* Mobile Card Layout */}
      <div className={cn(
        "sm:hidden p-4 hover:bg-background-secondary/30 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary",
      )}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(job.job_id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dot.color, job.status === "pending" && "animate-pulse")} />
                  <Link href={`/company/jobs/${job.job_id}`} className="font-medium text-foreground leading-tight truncate text-sm hover:text-primary transition-colors">
                    {job.title}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted mt-0.5 ml-[18px]">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{formatLocation(job)}</span>
                  <span className="text-border">·</span>
                  <span>{formatEmploymentType(job.employment_type)}</span>
                </div>
              </div>
              {/* Mobile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" disabled={isActionLoading}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isTrashView ? (
                    <>
                      <DropdownMenuItem onClick={() => onRestore(job.job_id)}>Restore</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(job.job_id)} className="text-destructive">Delete Permanently</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild><Link href={`/company/jobs/${job.job_id}`}>View</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/company/jobs/${job.job_id}/edit`}>Edit</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {job.status === "draft" && <DropdownMenuItem onClick={() => onPublish(job)}>Publish</DropdownMenuItem>}
                      {job.status === "published" && <DropdownMenuItem onClick={() => onPause(job.job_id)}>Pause</DropdownMenuItem>}
                      {job.status === "published" && <DropdownMenuItem onClick={() => onRefresh(job.job_id)}>Refresh</DropdownMenuItem>}
                      {job.status === "paused" && <DropdownMenuItem onClick={() => onResume(job.job_id)}>Resume</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => onDuplicate(job.job_id)}>
                        {job.status === "expired" ? "Re-post as New" : "Duplicate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onTrash(job.job_id)} className="text-destructive">Delete</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3 mt-2 ml-[18px]">
              <JobStatusBadge status={job.status} />
              <span className="text-xs text-foreground-muted tabular-nums flex items-center gap-1">
                <Eye className="w-3 h-3" />{(job.views ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-foreground-muted tabular-nums">
                {job.applications_count ?? 0} applies
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Row */}
      <div
        className={cn(
          "hidden sm:block relative transition-colors",
          selected && "bg-primary/5 border-l-2 border-l-primary",
          !selected && isHovered && "bg-background-secondary/40",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Data Row */}
        <div className="grid grid-cols-[32px_1fr_88px_64px_72px_108px_108px] gap-3 px-4 py-2 items-center">
          {/* Checkbox */}
          <div>
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(job.job_id)}
            />
          </div>

          {/* Job Cell — title + subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full flex-shrink-0",
                dot.color,
                job.status === "pending" && "animate-pulse"
              )} />
              <Link
                href={`/company/jobs/${job.job_id}`}
                className="font-medium text-foreground truncate hover:text-primary transition-colors text-[13px]"
              >
                {job.title}
              </Link>
              {job.is_featured && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Featured listing</TooltipContent>
                </Tooltip>
              )}
              {job.last_refreshed_at && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RefreshCw className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Bumped {Math.max(0, Math.floor((Date.now() - new Date(job.last_refreshed_at).getTime()) / 86400000))}d ago
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-foreground-muted mt-px ml-[15px]">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
              <span className="truncate">{formatLocation(job)}</span>
              {job.category && (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate capitalize">{job.category.replace(/_/g, ' ')}</span>
                </>
              )}
              <span className="text-border">·</span>
              <span className="flex-shrink-0">{formatEmploymentType(job.employment_type)}</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <JobStatusBadge status={job.status} />
          </div>

          {/* Views */}
          <div className="text-right tabular-nums text-[13px] text-foreground-muted">
            {(job.views ?? 0).toLocaleString()}
          </div>

          {/* Applications */}
          <div className="text-right tabular-nums text-[13px] text-foreground-muted">
            {(job.applications_count ?? 0).toLocaleString()}
          </div>

          {/* Posted date */}
          <div className="text-[13px] text-foreground-muted tabular-nums">
            {formatDate(job.posted_at)}
          </div>

          {/* Expiry date */}
          <div className="text-[13px] tabular-nums">
            <span className={expiryInfo.className}>{expiryInfo.label}</span>
          </div>
        </div>

        {/* Hover Action Bar — slides down on hover */}
        <AnimatePresence>
          {isHovered && selectedJobsCount === 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-0.5 px-4 pb-2 pt-0">
                <div style={{ width: "32px" }} className="flex-shrink-0" />
                {isTrashView ? (
                  <>
                    <div className="flex items-center gap-0.5 ml-[15px]">
                      <ActionBtn icon={Eye} label="View" href={`/company/jobs/${job.job_id}`} />
                      <ActionBtn icon={RotateCcw} label="Restore" onClick={() => onRestore(job.job_id)} variant="success" />
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-0.5">
                      <ActionBtn icon={Trash2} label="Delete Permanently" onClick={() => onDelete(job.job_id)} variant="destructive" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5 ml-[15px]">
                      <ActionBtn icon={Eye} label="View" href={`/company/jobs/${job.job_id}`} />
                      <ActionBtn icon={Edit} label="Edit" href={`/company/jobs/${job.job_id}/edit`} />
                      {job.status === "draft" && (
                        <ActionBtn icon={Check} label="Publish" onClick={() => onPublish(job)} variant="success" />
                      )}
                      {job.status === "published" && (
                        <>
                          <ActionBtn icon={Pause} label="Pause" onClick={() => onPause(job.job_id)} />
                          <ActionBtn icon={RefreshCw} label="Refresh" onClick={() => onRefresh(job.job_id)} />
                          <ActionBtn icon={CalendarClock} label="Extend" href={`/company/jobs/${job.job_id}?extend=true`} />
                        </>
                      )}
                      {job.status === "paused" && (
                        <ActionBtn icon={Play} label="Resume" onClick={() => onResume(job.job_id)} variant="success" />
                      )}
                      <ActionBtn
                        icon={Copy}
                        label={job.status === "expired" ? "Re-post" : "Duplicate"}
                        onClick={() => onDuplicate(job.job_id)}
                      />
                      {(job.status === "published" || job.status === "paused") && (
                        <ActionBtn icon={ExternalLink} label="Share" href={`/jobs/${job.job_id}`} />
                      )}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-0.5">
                      <ActionBtn icon={Trash2} label="Delete" onClick={() => onTrash(job.job_id)} variant="destructive" />
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

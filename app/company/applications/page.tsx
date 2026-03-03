"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { UserAvatar } from "@/components/user-avatar"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  getCompanyApplications,
  getApplication,
  updateApplicationStatus,
  addApplicationNote,
  rateApplication,
  bulkUpdateStatus,
  getApplicationMessages,
  sendApplicationMessage,
  getApplicationStats,
  exportApplicationsCsv,
  type ApplicationStats,
} from "@/lib/api/applications"
import { Download } from "lucide-react"
import { toast } from "sonner"
import type {
  Application,
  ApplicationListItem,
  ApplicationStatus,
  ApplicationMessage,
  PaginatedResponse,
} from "@/lib/company/types"

/**
 * Company Applications Page
 * Employer ATS (Applicant Tracking System) view.
 * List + detail panel with status management, rating, notes, and messaging.
 */

const statusConfig: Record<ApplicationStatus, { label: string; color: string }> = {
  pending:     { label: "New",         color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  reviewing:   { label: "Reviewing",   color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  shortlisted: { label: "Shortlisted", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  interviewed: { label: "Interviewed", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  offered:     { label: "Offered",     color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  hired:       { label: "Hired",       color: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected:    { label: "Rejected",    color: "bg-red-500/10 text-red-600 border-red-500/20" },
  withdrawn:   { label: "Withdrawn",   color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
}

const statusFilters: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewed", label: "Interviewed" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
]

// Context-aware status transitions
const nextStatusActions: Record<ApplicationStatus, { label: string; status: ApplicationStatus; variant?: "default" | "destructive" }[]> = {
  pending:     [{ label: "Start Review", status: "reviewing" }, { label: "Reject", status: "rejected", variant: "destructive" }],
  reviewing:   [{ label: "Shortlist", status: "shortlisted" }, { label: "Reject", status: "rejected", variant: "destructive" }],
  shortlisted: [{ label: "Schedule Interview", status: "interviewed" }, { label: "Reject", status: "rejected", variant: "destructive" }],
  interviewed: [{ label: "Make Offer", status: "offered" }, { label: "Reject", status: "rejected", variant: "destructive" }],
  offered:     [{ label: "Mark Hired", status: "hired" }, { label: "Reject", status: "rejected", variant: "destructive" }],
  hired:       [],
  rejected:    [],
  withdrawn:   [],
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function CompanyApplicationsPage() {
  // List data
  const [applicationsData, setApplicationsData] = useState<PaginatedResponse<ApplicationListItem> | null>(null)
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Selection (bulk actions)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Detail panel
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Actions
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Notes
  const [noteText, setNoteText] = useState("")

  // Messages
  const [messages, setMessages] = useState<ApplicationMessage[]>([])
  const [messageText, setMessageText] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: Record<string, string | number> = { page: currentPage, page_size: 20 }
      if (statusFilter !== "all") filters.status = statusFilter
      if (debouncedSearch) filters.search = debouncedSearch
      const data = await getCompanyApplications(filters as Parameters<typeof getCompanyApplications>[0])
      setApplicationsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, debouncedSearch, currentPage])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await getApplicationStats()
      setStats(data)
    } catch {
      // Stats are non-critical
    }
  }, [])

  useEffect(() => { fetchApplications() }, [fetchApplications])
  useEffect(() => { fetchStats() }, [fetchStats])

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1) }, [statusFilter, debouncedSearch])

  // Load detail
  const fetchApplicationDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true)
    try {
      const [detail, msgs] = await Promise.all([
        getApplication(id),
        getApplicationMessages(id).catch(() => []),
      ])
      setSelectedApp(detail)
      setMessages(msgs)
      setNoteText("")
    } catch (err) {
      console.error("Failed to load application detail:", err)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  // Status change
  const handleStatusChange = async (id: number, status: ApplicationStatus) => {
    setIsActionLoading(true)
    try {
      await updateApplicationStatus(id, status)
      await Promise.all([fetchApplicationDetail(id), fetchApplications(), fetchStats()])
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Rate
  const handleRate = async (id: number, rating: number | null) => {
    try {
      await rateApplication(id, rating)
      await fetchApplicationDetail(id)
    } catch (err) {
      console.error("Failed to rate:", err)
    }
  }

  // Add note
  const handleAddNote = async (id: number) => {
    if (!noteText.trim()) return
    setIsActionLoading(true)
    try {
      await addApplicationNote(id, noteText)
      setNoteText("")
      await fetchApplicationDetail(id)
    } catch (err) {
      console.error("Failed to add note:", err)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Send message
  const handleSendMessage = async (id: number) => {
    if (!messageText.trim()) return
    setIsActionLoading(true)
    try {
      await sendApplicationMessage(id, messageText)
      setMessageText("")
      const msgs = await getApplicationMessages(id).catch(() => [])
      setMessages(msgs)
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Bulk status update
  const handleBulkStatusUpdate = async (status: ApplicationStatus) => {
    if (selectedIds.length === 0) return
    setIsActionLoading(true)
    try {
      await bulkUpdateStatus(selectedIds, status)
      setSelectedIds([])
      await Promise.all([fetchApplications(), fetchStats()])
    } catch (err) {
      console.error("Failed to bulk update:", err)
    } finally {
      setIsActionLoading(false)
    }
  }

  // CSV export
  const handleExportCsv = async () => {
    try {
      const filters: Record<string, string | number> = {}
      if (statusFilter !== "all") filters.status = statusFilter
      if (debouncedSearch) filters.search = debouncedSearch
      const csvData = await exportApplicationsCsv(filters as Parameters<typeof exportApplicationsCsv>[0])

      // Create download blob
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `applications-${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Applications exported successfully")
    } catch {
      toast.error("Failed to export applications")
    }
  }

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    const results = applicationsData?.results || []
    if (selectedIds.length === results.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(results.map(a => a.id))
    }
  }

  const applications = applicationsData?.results || []
  const totalPages = applicationsData ? Math.ceil(applicationsData.count / 20) : 0

  // Loading state
  if (isLoading && !applicationsData) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-8 w-40 bg-background-secondary rounded animate-pulse" />
          <div className="h-4 w-56 bg-background-secondary rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-background-secondary rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-background-secondary rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-background-secondary rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error && !applicationsData) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load applications</h2>
          <p className="text-foreground-muted mb-6">{error}</p>
          <Button onClick={fetchApplications}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Applications</h1>
            <p className="text-sm text-foreground-muted mt-1">Review and manage candidate applications</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="shrink-0 gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={50}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatPill label="Total" value={stats?.total ?? 0} />
          <StatPill label="New" value={stats?.pending ?? 0} dotColor="bg-blue-500" />
          <StatPill label="Reviewing" value={stats?.reviewing ?? 0} dotColor="bg-amber-500" />
          <StatPill label="Shortlisted" value={stats?.shortlisted ?? 0} dotColor="bg-cyan-500" />
          <StatPill label="Offered" value={stats?.offered ?? 0} dotColor="bg-emerald-500" />
        </div>
      </MotionWrapper>

      {/* Filters */}
      <MotionWrapper delay={100}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Status filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:pb-0 flex-1">
                {statusFilters.map((sf) => (
                  <button
                    key={sf.value}
                    onClick={() => setStatusFilter(sf.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                      statusFilter === sf.value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground-muted hover:text-foreground hover:bg-background-secondary/50"
                    )}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="lg:w-64">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                <span className="text-sm text-foreground-muted">{selectedIds.length} selected</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate("reviewing")} disabled={isActionLoading}>
                    Mark Reviewing
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate("shortlisted")} disabled={isActionLoading}>
                    Shortlist
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => handleBulkStatusUpdate("rejected")} disabled={isActionLoading}>
                    Reject
                  </Button>
                </div>
                <button onClick={() => setSelectedIds([])} className="text-sm text-foreground-muted hover:text-foreground ml-auto">
                  Clear selection
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application list */}
        <MotionWrapper delay={150} className="lg:col-span-2">
          <div className="space-y-2">
            {/* Select all header */}
            {applications.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2">
                <Checkbox
                  checked={selectedIds.length === applications.length && applications.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-foreground-muted">
                  {applicationsData?.count ?? 0} application{(applicationsData?.count ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {applications.map((app) => (
              <Card
                key={app.id}
                className={cn(
                  "overflow-hidden border cursor-pointer transition-all duration-200",
                  selectedApp?.id === app.id
                    ? "border-primary/50 bg-primary/[0.03] shadow-sm"
                    : "border-border/50 hover:border-border hover:shadow-sm"
                )}
                onClick={() => fetchApplicationDetail(app.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                      />
                    </div>
                    <UserAvatar
                      name={app.candidate_name}
                      avatar={null}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/candidates/${app.candidate}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-medium text-foreground hover:text-primary truncate block transition-colors"
                      >
                        {app.candidate_name}
                      </Link>
                      <p className="text-xs text-foreground-muted truncate">{app.job_title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.rating && <RatingDisplay rating={app.rating} />}
                      <Badge variant="outline" className={cn("text-xs", statusConfig[app.status]?.color)}>
                        {statusConfig[app.status]?.label ?? app.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="ml-14 mt-1">
                    <span className="text-xs text-foreground-muted/60">Applied {formatDate(app.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty state */}
            {!isLoading && applications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="text-foreground-muted font-medium">No applications found</p>
                <p className="text-sm text-foreground-muted/60 mt-1">
                  {statusFilter !== "all" || debouncedSearch
                    ? "Try adjusting your filters or search query."
                    : "Applications will appear here when candidates apply to your jobs."}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-foreground-muted px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </MotionWrapper>

        {/* Right: Detail panel */}
        <MotionWrapper delay={200}>
          <Card className="border-border/50 shadow-sm sticky top-28 overflow-hidden">
            {isLoadingDetail ? (
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background-secondary animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-32 bg-background-secondary rounded animate-pulse" />
                      <div className="h-4 w-48 bg-background-secondary rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 bg-background-secondary rounded animate-pulse" />
                  <div className="h-20 bg-background-secondary rounded animate-pulse" />
                </div>
              </CardContent>
            ) : selectedApp ? (
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <CardContent className="p-6 space-y-6">
                  {/* Candidate header */}
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      name={selectedApp.candidate.full_name}
                      avatar={selectedApp.candidate.avatar}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/candidates/${selectedApp.candidate.id}`}
                        className="text-lg font-semibold text-foreground hover:text-primary truncate block transition-colors"
                      >
                        {selectedApp.candidate.full_name}
                      </Link>
                      <p className="text-sm text-foreground-muted truncate">{selectedApp.candidate.email}</p>
                      {selectedApp.candidate.phone && (
                        <p className="text-sm text-foreground-muted">{selectedApp.candidate.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Applied for */}
                  <div className="p-3 rounded-lg bg-background-secondary/50">
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Applied for</p>
                    <Link href={`/company/jobs/${selectedApp.job.job_id}`} className="text-sm font-medium text-primary hover:underline">
                      {selectedApp.job.title}
                    </Link>
                    <p className="text-xs text-foreground-muted mt-1">Applied {formatDate(selectedApp.created_at)}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs text-foreground-muted uppercase tracking-wider">Status</p>
                      <Badge variant="outline" className={cn("text-xs", statusConfig[selectedApp.status]?.color)}>
                        {statusConfig[selectedApp.status]?.label ?? selectedApp.status}
                      </Badge>
                    </div>
                    {nextStatusActions[selectedApp.status]?.length > 0 && (
                      <div className="flex items-center gap-2">
                        {nextStatusActions[selectedApp.status].map((action) => (
                          <Button
                            key={action.status}
                            variant={action.variant === "destructive" ? "outline" : "default"}
                            size="sm"
                            className={cn(
                              action.variant === "destructive"
                                ? "text-destructive border-destructive/30 hover:bg-destructive/5"
                                : "bg-primary hover:bg-primary-hover text-primary-foreground"
                            )}
                            disabled={isActionLoading}
                            onClick={() => handleStatusChange(selectedApp.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">Rating</p>
                    <RatingInput
                      rating={selectedApp.rating}
                      onChange={(r) => handleRate(selectedApp.id, r)}
                    />
                  </div>

                  {/* Resume & Cover Letter */}
                  {(selectedApp.resume || selectedApp.cover_letter) && (
                    <div className="space-y-3">
                      {selectedApp.resume && (
                        <a
                          href={selectedApp.resume}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Resume
                        </a>
                      )}
                      {selectedApp.cover_letter && (
                        <div>
                          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Cover Letter</p>
                          <p className="text-sm text-foreground-muted leading-relaxed line-clamp-4">
                            {selectedApp.cover_letter}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">Notes</p>
                    {selectedApp.notes && (
                      <p className="text-sm text-foreground-muted bg-background-secondary/50 rounded-lg p-3 mb-2 whitespace-pre-wrap">
                        {selectedApp.notes}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="min-h-[60px] text-sm resize-none"
                        rows={2}
                      />
                    </div>
                    {noteText.trim() && (
                      <Button
                        size="sm"
                        className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground"
                        onClick={() => handleAddNote(selectedApp.id)}
                        disabled={isActionLoading}
                      >
                        Save Note
                      </Button>
                    )}
                  </div>

                  {/* Messages */}
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">Messages</p>
                    {isLoadingMessages ? (
                      <div className="h-20 bg-background-secondary rounded-lg animate-pulse" />
                    ) : messages.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "p-2.5 rounded-lg text-sm",
                              msg.sender_role === "employer"
                                ? "bg-primary/5 ml-4"
                                : "bg-background-secondary/50 mr-4"
                            )}
                          >
                            <p className="text-foreground">{msg.content}</p>
                            <p className="text-xs text-foreground-muted/60 mt-1">
                              {msg.sender_name || (msg.sender_role === "employer" ? "You" : selectedApp.candidate.first_name)} · {formatTime(msg.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground-muted/60 mb-3">No messages yet.</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Send a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(selectedApp.id)
                          }
                        }}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0"
                        onClick={() => handleSendMessage(selectedApp.id)}
                        disabled={isActionLoading || !messageText.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            ) : (
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-foreground-muted text-sm">Select an application to view details</p>
              </CardContent>
            )}
          </Card>
        </MotionWrapper>
      </div>
    </div>
  )
}

// =============================================================================
// Local Components
// =============================================================================

function StatPill({ label, value, dotColor }: { label: string; value: number; dotColor?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/30 border border-border/30">
      {dotColor && <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />}
      <div className="min-w-0">
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-foreground-muted truncate">{label}</p>
      </div>
    </div>
  )
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn("w-3 h-3", star <= rating ? "text-amber-400 fill-amber-400" : "text-foreground-muted/20")}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function RatingInput({ rating, onChange }: { rating: number | null; onChange: (r: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(rating === star ? null : star)}
          className="p-0.5"
        >
          <svg
            className={cn(
              "w-5 h-5 cursor-pointer transition-colors",
              star <= (hovered ?? rating ?? 0)
                ? "text-amber-400 fill-amber-400"
                : "text-foreground-muted/20 hover:text-foreground-muted/40"
            )}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {rating && (
        <button onClick={() => onChange(null)} className="text-xs text-foreground-muted hover:text-foreground ml-1">
          Clear
        </button>
      )}
    </div>
  )
}

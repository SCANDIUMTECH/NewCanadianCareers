"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { cn, formatTimeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MotionWrapper } from "@/components/motion-wrapper"
import { EmptyState } from "@/components/jobs/empty-state"
import { getSavedJobs, unsaveJob } from "@/lib/api/candidates"
import { useCandidate } from "@/hooks/use-candidate"
import type { SavedJob, SavedJobFilters } from "@/lib/candidate/types"

export default function SavedJobsPage() {
  const { refreshCounts } = useCandidate()

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sortBy, setSortBy] = useState<SavedJobFilters["sort"]>("date_saved")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedJobs, setSelectedJobs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchSavedJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getSavedJobs({
        search: debouncedSearch || undefined,
        sort: sortBy,
        page,
        page_size: pageSize,
      })
      setSavedJobs(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved jobs")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, sortBy, page])

  useEffect(() => {
    fetchSavedJobs()
  }, [fetchSavedJobs])

  const handleUnsave = async (savedJobId: number) => {
    try {
      await unsaveJob(savedJobId)
      setSavedJobs((prev) => prev.filter((j) => j.id !== savedJobId))
      setTotalCount((prev) => prev - 1)
      setSelectedJobs((prev) => prev.filter((id) => id !== savedJobId))
      refreshCounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove job")
    }
  }

  const handleBulkRemove = async () => {
    if (!confirm(`Remove ${selectedJobs.length} job(s) from saved?`)) return

    setIsRemoving(true)
    try {
      const results = await Promise.allSettled(selectedJobs.map((id) => unsaveJob(id)))
      const succeeded = selectedJobs.filter((_, i) => results[i].status === "fulfilled")
      const failedCount = results.filter((r) => r.status === "rejected").length

      if (succeeded.length > 0) {
        setSavedJobs((prev) => prev.filter((j) => !succeeded.includes(j.id)))
        setTotalCount((prev) => prev - succeeded.length)
        setSelectedJobs((prev) => prev.filter((id) => !succeeded.includes(id)))
        refreshCounts()
      }

      if (failedCount > 0) {
        toast.error(`Failed to remove ${failedCount} job(s)`)
      }
    } finally {
      setIsRemoving(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-background-secondary/50 rounded w-48" />
            <div className="h-10 bg-background-secondary/50 rounded w-32" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-background-secondary/50 rounded flex-1 max-w-md" />
            <div className="h-10 bg-background-secondary/50 rounded w-40" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-background-secondary/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchSavedJobs}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Saved Jobs</h1>
            <p className="text-sm text-foreground-muted mt-1">
              {totalCount} job{totalCount !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link href="/jobs">
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find More Jobs
            </Button>
          </Link>
        </div>
      </MotionWrapper>

      {/* Filters */}
      <MotionWrapper delay={100}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search saved jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SavedJobFilters["sort"])}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_saved">Date Saved</SelectItem>
                <SelectItem value="posted_at">Date Posted</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === "list" ? "bg-foreground/5 text-foreground" : "text-foreground-muted hover:text-foreground"
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === "grid" ? "bg-foreground/5 text-foreground" : "text-foreground-muted hover:text-foreground"
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </MotionWrapper>

      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <MotionWrapper delay={0}>
          <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">{selectedJobs.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove from saved"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedJobs([])}>
              Clear selection
            </Button>
          </div>
        </MotionWrapper>
      )}

      {/* Jobs List/Grid */}
      <MotionWrapper delay={200}>
        {savedJobs.length > 0 ? (
          viewMode === "list" ? (
            <div className="space-y-3">
              {savedJobs.map((savedJob) => (
                <JobListCard
                  key={savedJob.id}
                  savedJob={savedJob}
                  isSelected={selectedJobs.includes(savedJob.id)}
                  onSelect={() => toggleSelect(savedJob.id)}
                  onUnsave={() => handleUnsave(savedJob.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedJobs.map((savedJob) => (
                <JobGridCard
                  key={savedJob.id}
                  savedJob={savedJob}
                  isSelected={selectedJobs.includes(savedJob.id)}
                  onSelect={() => toggleSelect(savedJob.id)}
                  onUnsave={() => handleUnsave(savedJob.id)}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            icon="bookmark"
            title={search ? "No saved jobs match your search" : "No saved jobs yet"}
            description={
              search
                ? "Try adjusting your search terms to find saved jobs."
                : "Start saving jobs you're interested in to see them here."
            }
            action={{ label: "Browse Jobs", href: "/jobs" }}
            secondaryAction={
              search ? { label: "Clear search", onClick: () => setSearch("") } : undefined
            }
          />
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-foreground-muted">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </MotionWrapper>
    </div>
  )
}

function JobListCard({
  savedJob,
  isSelected,
  onSelect,
  onUnsave,
}: {
  savedJob: SavedJob
  isSelected: boolean
  onSelect: () => void
  onUnsave: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const job = savedJob.job

  return (
    <Card
      className={cn(
        "overflow-hidden border transition-all duration-300",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border hover:shadow-md"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={onSelect}
            className={cn(
              "flex-shrink-0 w-5 h-5 mt-1 rounded border-2 transition-all duration-200",
              isSelected
                ? "bg-primary border-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            {isSelected && (
              <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Company Logo */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center overflow-hidden">
            {job.company_logo ? (
              <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-foreground-muted">
                {job.company_name.charAt(0)}
              </span>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/jobs/${job.job_id}`}>
                    <h3 className="text-base font-medium text-foreground hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                  </Link>
                  {job.is_new && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">{job.company_name}</p>
              </div>

              {/* Actions */}
              <div className={cn("flex items-center gap-2 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
                <Link href={`/jobs/${job.job_id}`}>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                    Apply
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/jobs/${job.job_id}`}>View details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={onUnsave}>
                      Remove from saved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs font-normal">
                {job.location}
              </Badge>
              {job.salary_display && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {job.salary_display}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs font-normal">
                {job.employment_type}
              </Badge>
            </div>

            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.skills.slice(0, 3).map((skill) => (
                  <span key={skill} className="text-xs text-foreground-muted bg-background-secondary px-2 py-0.5 rounded">
                    {skill}
                  </span>
                ))}
                {job.skills.length > 3 && (
                  <span className="text-xs text-foreground-muted">+{job.skills.length - 3}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-muted">
              <span>Saved {formatTimeAgo(savedJob.created_at)}</span>
              <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>Posted {formatTimeAgo(job.posted_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function JobGridCard({
  savedJob,
  isSelected,
  onSelect,
  onUnsave,
}: {
  savedJob: SavedJob
  isSelected: boolean
  onSelect: () => void
  onUnsave: () => void
}) {
  const job = savedJob.job

  return (
    <Card
      className={cn(
        "overflow-hidden border transition-all duration-300 hover:shadow-lg",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border/50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center overflow-hidden">
            {job.company_logo ? (
              <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-foreground-muted">
                {job.company_name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {job.is_new && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                New
              </Badge>
            )}
            <button
              onClick={onSelect}
              className={cn(
                "w-5 h-5 rounded border-2 transition-all",
                isSelected ? "bg-primary border-primary" : "border-border hover:border-primary/50"
              )}
            >
              {isSelected && (
                <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <Link href={`/jobs/${job.job_id}`}>
          <h3 className="text-base font-medium text-foreground hover:text-primary transition-colors line-clamp-2">
            {job.title}
          </h3>
        </Link>
        <p className="text-sm text-foreground-muted mt-1">{job.company_name}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="secondary" className="text-xs font-normal">
            {job.location}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {job.employment_type}
          </Badge>
        </div>

        {job.salary_display && (
          <p className="text-sm font-medium text-foreground mt-3">{job.salary_display}</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-foreground-muted">Saved {formatTimeAgo(savedJob.created_at)}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onUnsave}>
              <svg className="w-4 h-4 text-foreground-muted hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
            <Link href={`/jobs/${job.job_id}`}>
              <Button size="sm" className="h-8">Apply</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

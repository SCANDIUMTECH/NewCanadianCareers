"use client"

import { Suspense, useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MotionWrapper } from "@/components/motion-wrapper"
import { JobCard, type JobCardProps } from "@/components/jobs/job-card"
import { JobFiltersSidebar, type JobFilters } from "@/components/jobs/job-filters-sidebar"
import { JobFiltersSheet } from "@/components/jobs/job-filters-sheet"
import { JobsEmptyState } from "@/components/jobs/empty-state"
import { BannerSlot } from "@/components/banners/banner-slot"
import { AffiliateSlot } from "@/components/affiliates/affiliate-slot"
import { searchJobs, type PublicJobListItem, type PublicJobSearchFilters } from "@/lib/api/public"
import { saveJob, unsaveJob, getSavedJobs } from "@/lib/api/candidates"
import { useAuth } from "@/hooks/use-auth"

function JobsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-foreground">NCC</span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-foreground/10 rounded-lg" />
          <div className="h-12 bg-foreground/10 rounded-lg" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-foreground/10 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function transformJob(job: PublicJobListItem): JobCardProps {
  const hasSalary = job.show_salary && job.salary_min && job.salary_max

  return {
    id: job.job_id,
    title: job.title,
    company: {
      name: job.company_name,
      logo: job.company_logo || undefined,
    },
    location: {
      city: job.city,
      state: job.state || undefined,
      country: job.country,
      remote: job.location_type,
    },
    type: job.employment_type,
    salary: hasSalary
      ? {
          min: parseFloat(job.salary_min!),
          max: parseFloat(job.salary_max!),
          currency: job.salary_currency,
        }
      : undefined,
    skills: job.skills || [],
    postedDate: job.posted_at,
    featured: job.featured,
  }
}

const defaultFilters: JobFilters = {
  location: "",
  remote: [],
  type: [],
  salaryMin: 0,
  salaryMax: 0,
  datePosted: "",
}

const sortOptions = [
  { value: "relevance", label: "Most Relevant" },
  { value: "date", label: "Most Recent" },
  { value: "salary-high", label: "Salary: High to Low" },
  { value: "salary-low", label: "Salary: Low to High" },
]

function JobsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const isCandidate = user?.role === 'candidate'

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [filters, setFilters] = useState<JobFilters>(() => ({
    location: searchParams.get("location") || "",
    remote: searchParams.get("remote")?.split(",").filter(Boolean) || [],
    type: searchParams.get("type")?.split(",").filter(Boolean) || [],
    salaryMin: parseInt(searchParams.get("salaryMin") || "0") || 0,
    salaryMax: parseInt(searchParams.get("salaryMax") || "0") || 0,
    datePosted: searchParams.get("datePosted") || "",
  }))
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance")
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  // Map of job ID string → saved job record ID (for unsaving)
  const [savedJobMap, setSavedJobMap] = useState<Record<string, number>>({})

  // API state
  const [jobs, setJobs] = useState<PublicJobListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set("q", debouncedQuery)
    if (filters.location) params.set("location", filters.location)
    if (filters.remote.length) params.set("remote", filters.remote.join(","))
    if (filters.type.length) params.set("type", filters.type.join(","))
    if (filters.salaryMin) params.set("salaryMin", filters.salaryMin.toString())
    if (filters.salaryMax) params.set("salaryMax", filters.salaryMax.toString())
    if (filters.datePosted) params.set("datePosted", filters.datePosted)
    if (sortBy !== "relevance") params.set("sort", sortBy)

    const url = params.toString() ? `?${params.toString()}` : "/jobs"
    router.replace(url, { scroll: false })
  }, [debouncedQuery, filters, sortBy, router])

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const apiFilters: PublicJobSearchFilters = {
          q: debouncedQuery || undefined,
          location: filters.location || undefined,
          remote: filters.remote.length > 0 ? filters.remote : undefined,
          type: filters.type.length > 0 ? filters.type : undefined,
          salaryMin: filters.salaryMin > 0 ? filters.salaryMin : undefined,
          salaryMax: filters.salaryMax > 0 ? filters.salaryMax : undefined,
          datePosted: filters.datePosted || undefined,
          sort: sortBy as PublicJobSearchFilters['sort'],
          page_size: 50,
        }

        const response = await searchJobs(apiFilters)
        setJobs(response.results)
        setTotalCount(response.count)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load jobs"
        setError(message)
        // Keep existing jobs on error for better UX
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [debouncedQuery, filters, sortBy])

  // Fetch saved jobs for authenticated candidates
  useEffect(() => {
    if (!isAuthenticated || !isCandidate) return
    const fetchSaved = async () => {
      try {
        const response = await getSavedJobs({ page_size: 200 })
        const ids = response.results.map((sj) => String(sj.job.id))
        const map: Record<string, number> = {}
        response.results.forEach((sj) => { map[String(sj.job.id)] = sj.id })
        setSavedJobs(ids)
        setSavedJobMap(map)
      } catch {
        // Silently fail - saved status is a nice-to-have
      }
    }
    fetchSaved()
  }, [isAuthenticated, isCandidate])

  const displayJobs = useMemo(() => jobs.map(transformJob), [jobs])

  const handleResetFilters = useCallback(() => {
    setSearchQuery("")
    setFilters(defaultFilters)
    setSortBy("relevance")
  }, [])

  const handleSaveJob = useCallback(async (id: string) => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent('/jobs' + window.location.search)}`)
      return
    }
    if (!isCandidate) return

    const isSaved = savedJobs.includes(id)
    // Optimistic update
    setSavedJobs((prev) =>
      isSaved ? prev.filter((j) => j !== id) : [...prev, id]
    )

    try {
      if (isSaved) {
        const recordId = savedJobMap[id]
        if (recordId) {
          await unsaveJob(recordId)
          setSavedJobMap((prev) => { const next = { ...prev }; delete next[id]; return next })
        }
      } else {
        const jobId = parseInt(id, 10)
        if (!isNaN(jobId)) {
          const result = await saveJob({ job_id: jobId })
          setSavedJobMap((prev) => ({ ...prev, [id]: result.id }))
        }
      }
    } catch {
      // Revert on error
      setSavedJobs((prev) =>
        isSaved ? [...prev, id] : prev.filter((j) => j !== id)
      )
    }
  }, [isAuthenticated, isCandidate, savedJobs, savedJobMap, router])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.location) count++
    count += filters.remote.length
    count += filters.type.length
    if (filters.salaryMin > 0) count++
    if (filters.salaryMax > 0) count++
    if (filters.datePosted) count++
    return count
  }, [filters])

  const activeFilters = useMemo(() => {
    const result: { key: string; label: string; onRemove: () => void }[] = []

    if (filters.location) {
      result.push({
        key: "location",
        label: filters.location,
        onRemove: () => setFilters((f) => ({ ...f, location: "" })),
      })
    }

    filters.remote.forEach((r) => {
      result.push({
        key: `remote-${r}`,
        label: r.charAt(0).toUpperCase() + r.slice(1),
        onRemove: () =>
          setFilters((f) => ({ ...f, remote: f.remote.filter((x) => x !== r) })),
      })
    })

    filters.type.forEach((t) => {
      result.push({
        key: `type-${t}`,
        label: t.charAt(0).toUpperCase() + t.slice(1).replace("-", " "),
        onRemove: () =>
          setFilters((f) => ({ ...f, type: f.type.filter((x) => x !== t) })),
      })
    })

    if (filters.salaryMin > 0 || filters.salaryMax > 0) {
      const label =
        filters.salaryMin > 0 && filters.salaryMax > 0
          ? `$${filters.salaryMin.toLocaleString()} - $${filters.salaryMax.toLocaleString()}`
          : filters.salaryMin > 0
          ? `$${filters.salaryMin.toLocaleString()}+`
          : `Up to $${filters.salaryMax.toLocaleString()}`
      result.push({
        key: "salary",
        label,
        onRemove: () => setFilters((f) => ({ ...f, salaryMin: 0, salaryMax: 0 })),
      })
    }

    if (filters.datePosted) {
      const labels: Record<string, string> = {
        "24h": "Past 24 hours",
        "7d": "Past week",
        "30d": "Past month",
      }
      result.push({
        key: "date",
        label: labels[filters.datePosted] || filters.datePosted,
        onRemove: () => setFilters((f) => ({ ...f, datePosted: "" })),
      })
    }

    return result
  }, [filters])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center group">
              <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                NCC
              </span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all duration-500 group-hover:bg-primary" />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-foreground-muted hover:text-foreground">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Hero */}
      <div className="bg-card border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 md:py-12">
          <MotionWrapper delay={0}>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
              Find your next opportunity
            </h1>
            <p className="text-foreground-muted mb-6">
              Discover {totalCount > 0 ? `${totalCount.toLocaleString()}+` : ""} jobs at companies that value great talent
            </p>
          </MotionWrapper>

          <MotionWrapper delay={100}>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  placeholder="Search by title, company, or skill..."
                  className="pl-12 h-12 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                className="h-12 px-8 bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => setDebouncedQuery(searchQuery)}
              >
                Search Jobs
              </Button>
            </div>
          </MotionWrapper>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <BannerSlot placement="search_top" className="mb-6" />
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <MotionWrapper delay={150}>
              <div className="sticky top-24 space-y-6">
                <JobFiltersSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={handleResetFilters}
                />
                <BannerSlot placement="search_sidebar" />
              </div>
            </MotionWrapper>
          </aside>

          {/* Jobs List */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <MotionWrapper delay={150}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {/* Mobile Filters */}
                  <div className="lg:hidden">
                    <JobFiltersSheet
                      filters={filters}
                      onFiltersChange={setFilters}
                      onReset={handleResetFilters}
                      activeFilterCount={activeFilterCount}
                    />
                  </div>

                  <p className="text-sm text-foreground-muted">
                    {isLoading ? (
                      "Loading..."
                    ) : error ? (
                      <span className="text-destructive">{error}</span>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">{totalCount}</span>{" "}
                        {totalCount === 1 ? "job" : "jobs"} found
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground-muted">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </MotionWrapper>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <MotionWrapper delay={175}>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {activeFilters.map((filter) => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="px-3 py-1.5 bg-foreground/5 cursor-pointer hover:bg-foreground/10"
                      onClick={filter.onRemove}
                    >
                      {filter.label}
                      <svg
                        className="w-3 h-3 ml-1.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Badge>
                  ))}
                  <button
                    onClick={handleResetFilters}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </MotionWrapper>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-foreground/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {/* Error State with Retry */}
            {!isLoading && error && (
              <MotionWrapper delay={200}>
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load jobs</h3>
                  <p className="text-foreground-muted mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              </MotionWrapper>
            )}

            {/* Jobs Grid */}
            {!isLoading && !error && displayJobs.length > 0 && (
              <div className="space-y-4">
                {displayJobs.map((job, index) => (
                  <div key={job.id}>
                    <MotionWrapper delay={200 + index * 50}>
                      <JobCard
                        {...job}
                        onSave={handleSaveJob}
                        isSaved={savedJobs.includes(job.id)}
                      />
                    </MotionWrapper>
                    {index === 4 && (
                      <div className="mt-4">
                        <AffiliateSlot placement="search_results" variant="inline" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && displayJobs.length === 0 && (
              <MotionWrapper delay={200}>
                <JobsEmptyState
                  hasFilters={activeFilterCount > 0 || !!searchQuery}
                  onReset={handleResetFilters}
                />
              </MotionWrapper>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">NCC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span>&copy; {new Date().getFullYear()} New Canadian Careers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function JobsSearchClient() {
  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <JobsPageContent />
    </Suspense>
  )
}

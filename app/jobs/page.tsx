"use client"

import React, { Suspense, useState, useEffect, useMemo, useCallback } from "react"
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

/**
 * Public Job Search Page
 * Full-featured job search with filters, sort, and URL state
 */

// Loading fallback for Suspense
function JobsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-foreground">Orion</span>
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

// Mock job data
const mockJobs: JobCardProps[] = [
  {
    id: "job-1",
    title: "Senior Product Designer",
    company: { name: "Stellar Labs", verified: true },
    location: { city: "San Francisco", state: "CA", country: "USA", remote: "hybrid" },
    type: "Full-time",
    salary: { min: 150000, max: 200000, currency: "USD" },
    skills: ["Product Design", "Figma", "Design Systems", "User Research"],
    postedDate: "2026-01-28",
    featured: true,
  },
  {
    id: "job-2",
    title: "Frontend Engineer",
    company: { name: "TechFlow", verified: true },
    location: { city: "New York", state: "NY", country: "USA", remote: "remote" },
    type: "Full-time",
    salary: { min: 140000, max: 180000, currency: "USD" },
    skills: ["React", "TypeScript", "Next.js", "GraphQL"],
    postedDate: "2026-01-27",
    featured: true,
  },
  {
    id: "job-3",
    title: "Product Manager",
    company: { name: "Acme Corp", verified: false },
    location: { city: "Austin", state: "TX", country: "USA", remote: "onsite" },
    type: "Full-time",
    salary: { min: 130000, max: 170000, currency: "USD" },
    skills: ["Product Strategy", "Roadmapping", "Analytics", "Agile"],
    postedDate: "2026-01-26",
  },
  {
    id: "job-4",
    title: "UX Researcher",
    company: { name: "Design Co", verified: true },
    location: { city: "Seattle", state: "WA", country: "USA", remote: "hybrid" },
    type: "Full-time",
    salary: { min: 110000, max: 140000, currency: "USD" },
    skills: ["User Research", "Usability Testing", "Data Analysis", "Interviews"],
    postedDate: "2026-01-25",
  },
  {
    id: "job-5",
    title: "Backend Engineer",
    company: { name: "CloudScale", verified: true },
    location: { city: "Denver", state: "CO", country: "USA", remote: "remote" },
    type: "Full-time",
    salary: { min: 145000, max: 190000, currency: "USD" },
    skills: ["Node.js", "Python", "PostgreSQL", "AWS"],
    postedDate: "2026-01-24",
  },
  {
    id: "job-6",
    title: "Marketing Manager",
    company: { name: "GrowthBox", verified: false },
    location: { city: "Chicago", state: "IL", country: "USA", remote: "hybrid" },
    type: "Full-time",
    salary: { min: 90000, max: 120000, currency: "USD" },
    skills: ["Content Marketing", "SEO", "Analytics", "Campaign Management"],
    postedDate: "2026-01-23",
  },
  {
    id: "job-7",
    title: "Data Scientist",
    company: { name: "DataViz", verified: true },
    location: { city: "Boston", state: "MA", country: "USA", remote: "remote" },
    type: "Full-time",
    salary: { min: 135000, max: 175000, currency: "USD" },
    skills: ["Python", "Machine Learning", "SQL", "Statistics"],
    postedDate: "2026-01-22",
  },
  {
    id: "job-8",
    title: "DevOps Engineer",
    company: { name: "InfraStack", verified: true },
    location: { city: "Portland", state: "OR", country: "USA", remote: "remote" },
    type: "Contract",
    salary: { min: 70, max: 100, currency: "USD" },
    skills: ["Kubernetes", "Docker", "Terraform", "CI/CD"],
    postedDate: "2026-01-21",
  },
]

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

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = [...mockJobs]

    // Search query
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase()
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.name.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query))
      )
    }

    // Location filter
    if (filters.location) {
      const loc = filters.location.toLowerCase()
      result = result.filter(
        (job) =>
          job.location.city.toLowerCase().includes(loc) ||
          job.location.state?.toLowerCase().includes(loc) ||
          job.location.country.toLowerCase().includes(loc)
      )
    }

    // Remote filter
    if (filters.remote.length) {
      result = result.filter((job) => filters.remote.includes(job.location.remote))
    }

    // Type filter
    if (filters.type.length) {
      result = result.filter((job) =>
        filters.type.some((t) => job.type.toLowerCase().includes(t))
      )
    }

    // Salary filter
    if (filters.salaryMin > 0) {
      result = result.filter((job) => job.salary && job.salary.max >= filters.salaryMin)
    }
    if (filters.salaryMax > 0) {
      result = result.filter((job) => job.salary && job.salary.min <= filters.salaryMax)
    }

    // Sort
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
        break
      case "salary-high":
        result.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0))
        break
      case "salary-low":
        result.sort((a, b) => (a.salary?.min || 0) - (b.salary?.min || 0))
        break
      default:
        // Relevance: featured first, then by date
        result.sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
        })
    }

    return result
  }, [debouncedQuery, filters, sortBy])

  const handleResetFilters = useCallback(() => {
    setSearchQuery("")
    setFilters(defaultFilters)
    setSortBy("relevance")
  }, [])

  const handleSaveJob = useCallback((id: string) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    )
  }, [])

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
                Orion
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
              Discover {mockJobs.length}+ jobs at companies that value great talent
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
              <Button className="h-12 px-8 bg-primary hover:bg-primary-hover text-primary-foreground">
                Search Jobs
              </Button>
            </div>
          </MotionWrapper>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <MotionWrapper delay={150}>
              <div className="sticky top-24">
                <JobFiltersSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={handleResetFilters}
                />
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
                    <span className="font-medium text-foreground">{filteredJobs.length}</span>{" "}
                    {filteredJobs.length === 1 ? "job" : "jobs"} found
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

            {/* Jobs Grid */}
            {filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {filteredJobs.map((job, index) => (
                  <MotionWrapper key={job.id} delay={200 + index * 50}>
                    <JobCard
                      {...job}
                      onSave={handleSaveJob}
                      isSaved={savedJobs.includes(job.id)}
                    />
                  </MotionWrapper>
                ))}
              </div>
            ) : (
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
              <span className="text-lg font-semibold text-foreground">Orion</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span>&copy; {new Date().getFullYear()} Orion</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Wrap with Suspense for useSearchParams
export default function JobsPage() {
  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <JobsPageContent />
    </Suspense>
  )
}

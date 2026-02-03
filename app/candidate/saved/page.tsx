"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
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

/**
 * Saved Jobs Page
 * List of bookmarked jobs with filtering and sorting
 */

const savedJobs = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    companyLogo: null,
    location: "Remote",
    salary: "$140,000 - $180,000",
    type: "Full-time",
    experience: "Senior",
    savedAt: new Date("2026-01-30"),
    postedAt: new Date("2026-01-25"),
    description: "We're looking for an experienced frontend engineer to join our product team...",
    tags: ["React", "TypeScript", "Next.js"],
    isNew: true,
  },
  {
    id: 2,
    title: "Product Designer",
    company: "Stellar Inc",
    companyLogo: null,
    location: "San Francisco, CA",
    salary: "$120,000 - $160,000",
    type: "Full-time",
    experience: "Mid-level",
    savedAt: new Date("2026-01-29"),
    postedAt: new Date("2026-01-20"),
    description: "Join our design team to create beautiful, intuitive product experiences...",
    tags: ["Figma", "Design Systems", "Prototyping"],
    isNew: false,
  },
  {
    id: 3,
    title: "Full Stack Developer",
    company: "Nova Labs",
    companyLogo: null,
    location: "New York, NY",
    salary: "$130,000 - $170,000",
    type: "Full-time",
    experience: "Senior",
    savedAt: new Date("2026-01-27"),
    postedAt: new Date("2026-01-15"),
    description: "Build and scale our core platform with a focus on performance...",
    tags: ["Node.js", "PostgreSQL", "AWS"],
    isNew: false,
  },
  {
    id: 4,
    title: "DevOps Engineer",
    company: "CloudFirst",
    companyLogo: null,
    location: "Remote",
    salary: "$150,000 - $190,000",
    type: "Full-time",
    experience: "Senior",
    savedAt: new Date("2026-01-26"),
    postedAt: new Date("2026-01-18"),
    description: "Lead our infrastructure and deployment automation efforts...",
    tags: ["Kubernetes", "Terraform", "CI/CD"],
    isNew: false,
  },
  {
    id: 5,
    title: "Engineering Manager",
    company: "TechFlow",
    companyLogo: null,
    location: "Austin, TX",
    salary: "$180,000 - $220,000",
    type: "Full-time",
    experience: "Lead",
    savedAt: new Date("2026-01-25"),
    postedAt: new Date("2026-01-10"),
    description: "Lead a team of talented engineers building the future of work...",
    tags: ["Leadership", "Agile", "Mentorship"],
    isNew: false,
  },
]

export default function SavedJobsPage() {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("savedAt")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedJobs, setSelectedJobs] = useState<number[]>([])

  const filteredJobs = savedJobs
    .filter((job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "savedAt") return b.savedAt.getTime() - a.savedAt.getTime()
      if (sortBy === "postedAt") return b.postedAt.getTime() - a.postedAt.getTime()
      if (sortBy === "salary") return 0 // Would need proper salary parsing
      return 0
    })

  const toggleSelect = (id: number) => {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Saved Jobs</h1>
            <p className="text-sm text-foreground-muted mt-1">
              {savedJobs.length} jobs saved
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savedAt">Date Saved</SelectItem>
                <SelectItem value="postedAt">Date Posted</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
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
            <Button variant="outline" size="sm">
              Remove from saved
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedJobs([])}>
              Clear selection
            </Button>
          </div>
        </MotionWrapper>
      )}

      {/* Jobs List/Grid */}
      <MotionWrapper delay={200}>
        {viewMode === "list" ? (
          <div className="space-y-3">
            {filteredJobs.map((job, index) => (
              <JobListCard
                key={job.id}
                job={job}
                isSelected={selectedJobs.includes(job.id)}
                onSelect={() => toggleSelect(job.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job, index) => (
              <JobGridCard
                key={job.id}
                job={job}
                isSelected={selectedJobs.includes(job.id)}
                onSelect={() => toggleSelect(job.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </MotionWrapper>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <MotionWrapper delay={200}>
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
        </MotionWrapper>
      )}
    </div>
  )
}

function JobListCard({
  job,
  isSelected,
  onSelect,
  formatDate,
}: {
  job: typeof savedJobs[0]
  isSelected: boolean
  onSelect: () => void
  formatDate: (date: Date) => string
}) {
  const [isHovered, setIsHovered] = useState(false)

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
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center">
            <span className="text-lg font-semibold text-foreground-muted">
              {job.company.charAt(0)}
            </span>
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/jobs/${job.id}`}>
                    <h3 className="text-base font-medium text-foreground hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                  </Link>
                  {job.isNew && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">{job.company}</p>
              </div>

              {/* Actions */}
              <div className={cn("flex items-center gap-2 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                  Apply
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Share job</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Remove from saved</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs font-normal">
                {job.location}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {job.salary}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {job.type}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-muted">
              <span>Saved {formatDate(job.savedAt)}</span>
              <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>Posted {formatDate(job.postedAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function JobGridCard({
  job,
  isSelected,
  onSelect,
  formatDate,
}: {
  job: typeof savedJobs[0]
  isSelected: boolean
  onSelect: () => void
  formatDate: (date: Date) => string
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border transition-all duration-300 hover:shadow-lg",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border/50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center">
            <span className="text-lg font-semibold text-foreground-muted">
              {job.company.charAt(0)}
            </span>
          </div>
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

        <Link href={`/jobs/${job.id}`}>
          <h3 className="text-base font-medium text-foreground hover:text-primary transition-colors line-clamp-2">
            {job.title}
          </h3>
        </Link>
        <p className="text-sm text-foreground-muted mt-1">{job.company}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="secondary" className="text-xs font-normal">
            {job.location}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {job.type}
          </Badge>
        </div>

        <p className="text-sm font-medium text-foreground mt-3">{job.salary}</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-foreground-muted">Saved {formatDate(job.savedAt)}</span>
          <Button size="sm" className="h-8">Apply</Button>
        </div>
      </CardContent>
    </Card>
  )
}

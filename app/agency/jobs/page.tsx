"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Info } from "lucide-react"
import { cn, getCompanyInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useAgencyContext } from "@/hooks/use-agency"
import {
  getAgencyJobs,
  getAgencyJobStats,
  publishAgencyJob,
  pauseAgencyJob,
  deleteAgencyJob,
} from "@/lib/api/agencies"
import type { AgencyJobStats } from "@/lib/api/agencies"
import type { AgencyJob, AgencyJobStatus } from "@/lib/agency/types"
import { JOB_STATUS_STYLES } from "@/lib/constants/status-styles"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Agency Jobs Management
 * Multi-company job management with company filtering, grouping, and bulk actions
 */

// Colors for client companies
const clientColors = ['#3B5BDB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

function getClientColor(index: number): string {
  return clientColors[index % clientColors.length]
}

// Display type for jobs with additional computed fields
interface JobDisplay {
  id: number
  job_id: string
  title: string
  company: {
    id: number
    name: string
    initials: string
    color: string
  }
  location: string
  type: string
  status: string
  views: number
  applies: number
  posted: string
  daysLeft: number | null
  salary: string | null
}

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "All Jobs" },
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
]

export default function AgencyJobsPage() {
  const { clients, isLoading: contextLoading } = useAgencyContext()

  // Local state
  const [jobs, setJobs] = useState<JobDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [jobToPublish, setJobToPublish] = useState<JobDisplay | null>(null)
  const [groupBy, setGroupBy] = useState<"none" | "company">("none")
  const [isPublishing, setIsPublishing] = useState(false)
  const [jobStats, setJobStats] = useState<AgencyJobStats | null>(null)

  // Fetch job stats (for retention info)
  useEffect(() => {
    getAgencyJobStats()
      .then(setJobStats)
      .catch(() => { /* non-critical */ })
  }, [])

  // Transform clients for display (memoized to prevent infinite re-render loops)
  const clientCompanies = useMemo(() => clients.map((client, index) => ({
    id: client.company,
    name: client.company_name,
    initials: getCompanyInitials(client.company_name),
    color: getClientColor(index),
  })), [clients])

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: { status?: AgencyJobStatus; company_id?: number; search?: string } = {}
      if (selectedStatus !== "all") {
        filters.status = selectedStatus as AgencyJobStatus
      }
      if (selectedCompany !== "all") {
        filters.company_id = parseInt(selectedCompany)
      }
      if (searchQuery) {
        filters.search = searchQuery
      }

      const response = await getAgencyJobs({ ...filters, page_size: 100 })

      // Transform jobs for display
      const jobDisplays: JobDisplay[] = response.results.map((job: AgencyJob) => {
        const clientIndex = clientCompanies.findIndex(c => c.id === job.company.id)
        const color = clientIndex >= 0 ? clientCompanies[clientIndex].color : getClientColor(0)

        // Calculate days left
        let daysLeft: number | null = null
        if (job.expires_at) {
          const expiresDate = new Date(job.expires_at)
          const today = new Date()
          daysLeft = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (daysLeft < 0) daysLeft = 0
        }

        // Format location
        const locationParts = []
        if (job.city) locationParts.push(job.city)
        if (job.state) locationParts.push(job.state)
        if (job.country) locationParts.push(job.country)
        const location = locationParts.length > 0 ? locationParts.join(', ') : job.location_type === 'remote' ? 'Remote' : 'Not specified'

        // Format salary
        let salary: string | null = null
        if (job.salary_min || job.salary_max) {
          const formatSalary = (val: number) => {
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`
            return `$${val}`
          }
          if (job.salary_min && job.salary_max) {
            salary = `${formatSalary(job.salary_min)}-${formatSalary(job.salary_max)}`
          } else if (job.salary_min) {
            salary = `${formatSalary(job.salary_min)}+`
          } else if (job.salary_max) {
            salary = `Up to ${formatSalary(job.salary_max)}`
          }
        }

        return {
          id: job.id,
          job_id: job.job_id,
          title: job.title,
          company: {
            id: job.company.id,
            name: job.company.name,
            initials: getCompanyInitials(job.company.name),
            color,
          },
          location,
          type: job.employment_type.replace('_', '-'),
          status: job.status,
          views: job.views ?? 0,
          applies: job.applications_count ?? 0,
          posted: job.posted_at
            ? new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '-',
          daysLeft,
          salary,
        }
      })

      setJobs(jobDisplays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }, [selectedStatus, selectedCompany, searchQuery, clientCompanies])

  useEffect(() => {
    if (!contextLoading) {
      fetchJobs()
    }
  }, [fetchJobs, contextLoading])

  // Filter jobs client-side for instant feedback
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Group jobs by company if grouping is enabled
  const groupedJobs = groupBy === "company"
    ? clientCompanies.map(company => ({
        company,
        jobs: filteredJobs.filter(job => job.company.id === company.id)
      })).filter(group => group.jobs.length > 0)
    : null

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(filteredJobs.map(j => j.job_id))
    }
  }

  // Get status counts
  const getStatusCount = (status: string) => {
    const jobsToCount = selectedCompany === "all"
      ? jobs
      : jobs.filter(j => j.company.id.toString() === selectedCompany)
    return status === "all" ? jobsToCount.length : jobsToCount.filter(j => j.status === status).length
  }

  // Handle publish
  const handlePublish = async () => {
    if (!jobToPublish) return

    setIsPublishing(true)
    try {
      await publishAgencyJob(jobToPublish.job_id)
      setShowPublishDialog(false)
      setJobToPublish(null)
      fetchJobs() // Refresh jobs
    } catch (err) {
      console.error('Failed to publish job:', err)
      toast.error("Failed to publish job. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  // Handle pause
  const handlePause = async (jobId: string) => {
    try {
      await pauseAgencyJob(jobId)
      fetchJobs()
    } catch (err) {
      console.error('Failed to pause job:', err)
    }
  }

  // Handle delete
  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      await deleteAgencyJob(jobId)
      fetchJobs()
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedJobs.length} jobs?`)) return

    try {
      await Promise.all(selectedJobs.map(jobId => deleteAgencyJob(jobId)))
      setSelectedJobs([])
      fetchJobs()
    } catch (err) {
      console.error('Failed to delete jobs:', err)
    }
  }

  // Handle bulk pause
  const handleBulkPause = async () => {
    try {
      await Promise.all(selectedJobs.map(jobId => pauseAgencyJob(jobId)))
      setSelectedJobs([])
      fetchJobs()
    } catch (err) {
      console.error('Failed to pause jobs:', err)
    }
  }

  // Loading state
  if (contextLoading || isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-destructive">{error}</p>
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
            <p className="text-sm text-foreground-muted mt-1">
              Manage job postings across all client companies
            </p>
          </div>
          <Link href="/agency/jobs/new">
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
            <div className="flex flex-col gap-4">
              {/* Top Row: Company Filter + Search + Group Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Company Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-muted whitespace-nowrap">Company:</span>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {clientCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${company.color}20` }}
                            >
                              <span className="text-[10px] font-bold" style={{ color: company.color }}>
                                {company.initials}
                              </span>
                            </div>
                            {company.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="flex-1 lg:max-w-xs">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Group Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-foreground-muted">Group by:</span>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setGroupBy("none")}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium transition-colors",
                        groupBy === "none" ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-background-secondary"
                      )}
                    >
                      None
                    </button>
                    <button
                      onClick={() => setGroupBy("company")}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium transition-colors border-l border-border",
                        groupBy === "company" ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-background-secondary"
                      )}
                    >
                      Company
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {statusFilters.map((filter) => {
                  const count = getStatusCount(filter.value)
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedStatus(filter.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                        selectedStatus === filter.value
                          ? "bg-primary/10 text-primary"
                          : "text-foreground-muted hover:text-foreground hover:bg-background-secondary"
                      )}
                    >
                      {filter.label}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-md",
                        selectedStatus === filter.value ? "bg-primary/20" : "bg-background-secondary"
                      )}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Bulk Actions */}
              {selectedJobs.length > 0 && (
                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <span className="text-sm text-foreground-muted">
                    {selectedJobs.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-transparent" onClick={handleBulkPause}>
                      Pause Selected
                    </Button>
                    <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:bg-destructive/10" onClick={handleBulkDelete}>
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Expired retention info banner */}
      {selectedStatus === "expired" && jobs.some(j => j.status === "expired") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Expired jobs are hidden from public search but remain accessible here.{" "}
            {jobStats?.expired_retention_days && jobStats.expired_retention_days > 0
              ? `They will be permanently deleted after ${jobStats.expired_retention_days} day${jobStats.expired_retention_days !== 1 ? "s" : ""}. Use "Re-post as New" to create a fresh listing before then.`
              : "They are kept indefinitely until you delete them. Use \"Re-post as New\" to create a fresh listing at any time."}
          </p>
        </div>
      )}

      {/* Jobs List */}
      <MotionWrapper delay={200}>
        {groupBy === "company" && groupedJobs ? (
          // Grouped View
          <div className="space-y-6">
            {groupedJobs.map((group) => (
              <Card key={group.company.id} className="border-border/50 shadow-sm overflow-hidden">
                {/* Company Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-border/50"
                  style={{ backgroundColor: `${group.company.color}08` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.company.color}20` }}
                    >
                      <span className="text-sm font-bold" style={{ color: group.company.color }}>
                        {group.company.initials}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{group.company.name}</p>
                      <p className="text-xs text-foreground-muted">{group.jobs.length} jobs</p>
                    </div>
                  </div>
                  <Link href={`/agency/jobs/new?company=${group.company.id}`}>
                    <Button variant="ghost" size="sm" className="text-primary">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Post Job
                    </Button>
                  </Link>
                </div>

                {/* Jobs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-background-secondary/30">
                        <th className="w-12 px-4 py-3">
                          <Checkbox />
                        </th>
                        <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Job Title</th>
                        <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3 hidden md:table-cell">Location</th>
                        <th className="text-center text-xs font-medium text-foreground-muted px-4 py-3">Status</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Views</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Applies</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {group.jobs.map((job) => (
                        <JobRow
                          key={job.id}
                          job={job}
                          showCompany={false}
                          isSelected={selectedJobs.includes(job.job_id)}
                          onSelect={() => toggleSelectJob(job.job_id)}
                          onPublish={() => { setJobToPublish(job); setShowPublishDialog(true); }}
                          onPause={() => handlePause(job.job_id)}
                          onDelete={() => handleDelete(job.job_id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Flat View
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-background-secondary/30">
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={selectedJobs.length === filteredJobs.length && filteredJobs.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Job / Company</th>
                    <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3 hidden md:table-cell">Location</th>
                    <th className="text-center text-xs font-medium text-foreground-muted px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Views</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Applies</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden lg:table-cell">Days Left</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      showCompany={true}
                      isSelected={selectedJobs.includes(job.job_id)}
                      onSelect={() => toggleSelectJob(job.job_id)}
                      onPublish={() => { setJobToPublish(job); setShowPublishDialog(true); }}
                      onPause={() => handlePause(job.job_id)}
                      onDelete={() => handleDelete(job.job_id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No jobs found</h3>
                <p className="text-sm text-foreground-muted mb-4">Try adjusting your filters or search query</p>
                <Link href="/agency/jobs/new">
                  <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    Post New Job
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        )}
      </MotionWrapper>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Job</DialogTitle>
            <DialogDescription>
              This will use 1 credit from your pooled agency credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-background-secondary/50">
              <p className="font-medium text-foreground">{jobToPublish?.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${jobToPublish?.company.color}20` }}
                >
                  <span className="text-[10px] font-bold" style={{ color: jobToPublish?.company.color }}>
                    {jobToPublish?.company.initials}
                  </span>
                </div>
                <span className="text-sm text-foreground-muted">{jobToPublish?.company.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Social Distribution</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-social-linkedin/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-social-linkedin">in</span>
                    </div>
                    <span className="text-sm">LinkedIn</span>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center">
                      <span className="text-xs font-bold">X</span>
                    </div>
                    <span className="text-sm">X (Twitter)</span>
                  </div>
                  <Checkbox />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-violet-600">This job will be posted under {jobToPublish?.company.name}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? "Publishing..." : "Publish (1 Credit)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Job Row Component
function JobRow({
  job,
  showCompany,
  isSelected,
  onSelect,
  onPublish,
  onPause,
  onDelete,
}: {
  job: JobDisplay
  showCompany: boolean
  isSelected: boolean
  onSelect: () => void
  onPublish: () => void
  onPause: () => void
  onDelete: () => void
}) {
  return (
    <tr className="hover:bg-background-secondary/30 transition-colors group">
      <td className="px-4 py-4">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </td>
      <td className="px-4 py-4">
        <Link href={`/agency/jobs/${job.job_id}`} className="flex items-center gap-3">
          {showCompany && (
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${job.company.color}15` }}
            >
              <span className="text-xs font-semibold" style={{ color: job.company.color }}>
                {job.company.initials}
              </span>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {job.title}
            </span>
            {showCompany && (
              <p className="text-xs text-foreground-muted">{job.company.name}</p>
            )}
          </div>
        </Link>
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <span className="text-sm text-foreground-muted">{job.location}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <JobStatusBadge status={job.status} />
      </td>
      <td className="px-4 py-4 text-right text-sm text-foreground-muted hidden sm:table-cell">
        {(job.views ?? 0).toLocaleString()}
      </td>
      <td className="px-4 py-4 text-right text-sm text-foreground-muted hidden sm:table-cell">
        {job.applies}
      </td>
      {showCompany && (
        <td className="px-4 py-4 text-right hidden lg:table-cell">
          {job.daysLeft !== null ? (
            <span className={cn(
              "text-sm",
              job.daysLeft <= 7 ? "text-amber-600" : "text-foreground-muted"
            )}>
              {job.daysLeft}d
            </span>
          ) : (
            <span className="text-sm text-foreground-muted">-</span>
          )}
        </td>
      )}
      <td className="px-4 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-foreground-muted">
              {job.company.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/agency/jobs/${job.job_id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/agency/jobs/${job.job_id}/edit`}>Edit Job</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {job.status === "draft" && (
              <DropdownMenuItem onClick={onPublish}>
                Publish Job
              </DropdownMenuItem>
            )}
            {job.status === "published" && (
              <DropdownMenuItem onClick={onPause}>Pause Job</DropdownMenuItem>
            )}
            {job.status === "paused" && (
              <DropdownMenuItem onClick={onPublish}>Resume Job</DropdownMenuItem>
            )}
            {job.status === "pending" && (
              <DropdownMenuItem className="text-foreground-muted" disabled>
                Awaiting Approval
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuItem>View Analytics</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function JobStatusBadge({ status }: { status: string }) {
  const style = JOB_STATUS_STYLES[status] || JOB_STATUS_STYLES.draft
  return (
    <Badge variant="outline" className={cn("text-xs", style.className)}>
      {style.label}
    </Badge>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
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

// Mock companies
const clientCompanies = [
  { id: 1, name: "Acme Corporation", initials: "AC", color: "#3B5BDB" },
  { id: 2, name: "TechStart Inc", initials: "TS", color: "#10B981" },
  { id: 3, name: "Global Dynamics", initials: "GD", color: "#F59E0B" },
  { id: 4, name: "Innovate Labs", initials: "IL", color: "#8B5CF6" },
]

// Mock jobs data with company association
const allJobs = [
  { id: 1, title: "Senior Frontend Engineer", company: clientCompanies[0], location: "Remote", type: "Full-time", status: "published", views: 342, applies: 28, posted: "Jan 28", daysLeft: 22, salary: "$140k-$180k" },
  { id: 2, title: "Backend Developer", company: clientCompanies[0], location: "New York, NY", type: "Full-time", status: "published", views: 215, applies: 18, posted: "Jan 25", daysLeft: 19, salary: "$130k-$170k" },
  { id: 3, title: "DevOps Engineer", company: clientCompanies[0], location: "Remote", type: "Full-time", status: "pending", views: 0, applies: 0, posted: "Feb 1", daysLeft: 30, salary: "$150k-$190k" },
  { id: 4, title: "Product Designer", company: clientCompanies[1], location: "San Francisco", type: "Full-time", status: "published", views: 189, applies: 15, posted: "Jan 22", daysLeft: 16, salary: "$120k-$160k" },
  { id: 5, title: "UX Researcher", company: clientCompanies[1], location: "Remote", type: "Contract", status: "published", views: 156, applies: 12, posted: "Jan 20", daysLeft: 14, salary: "$80-$100/hr" },
  { id: 6, title: "Data Analyst", company: clientCompanies[1], location: "Austin, TX", type: "Full-time", status: "draft", views: 0, applies: 0, posted: "-", daysLeft: null, salary: "$100k-$130k" },
  { id: 7, title: "Financial Analyst", company: clientCompanies[2], location: "Chicago, IL", type: "Full-time", status: "published", views: 234, applies: 19, posted: "Jan 18", daysLeft: 12, salary: "$90k-$120k" },
  { id: 8, title: "Risk Manager", company: clientCompanies[2], location: "Remote", type: "Full-time", status: "paused", views: 81, applies: 9, posted: "Jan 10", daysLeft: 4, salary: "$130k-$160k" },
]

const statusFilters = [
  { value: "all", label: "All Jobs" },
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
]

export default function AgencyJobsPage() {
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJobs, setSelectedJobs] = useState<number[]>([])
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [jobToPublish, setJobToPublish] = useState<typeof allJobs[0] | null>(null)
  const [groupBy, setGroupBy] = useState<"none" | "company">("none")

  const filteredJobs = allJobs.filter((job) => {
    const matchesStatus = selectedStatus === "all" || job.status === selectedStatus
    const matchesCompany = selectedCompany === "all" || job.company.id.toString() === selectedCompany
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesCompany && matchesSearch
  })

  // Group jobs by company if grouping is enabled
  const groupedJobs = groupBy === "company" 
    ? clientCompanies.map(company => ({
        company,
        jobs: filteredJobs.filter(job => job.company.id === company.id)
      })).filter(group => group.jobs.length > 0)
    : null

  const toggleSelectJob = (jobId: number) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(filteredJobs.map(j => j.id))
    }
  }

  // Get status counts
  const getStatusCount = (status: string) => {
    const jobs = selectedCompany === "all" 
      ? allJobs 
      : allJobs.filter(j => j.company.id.toString() === selectedCompany)
    return status === "all" ? jobs.length : jobs.filter(j => j.status === status).length
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
                    <Button variant="outline" size="sm" className="bg-transparent">
                      Pause Selected
                    </Button>
                    <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:bg-destructive/10">
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

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
                          isSelected={selectedJobs.includes(job.id)}
                          onSelect={() => toggleSelectJob(job.id)}
                          onPublish={() => { setJobToPublish(job); setShowPublishDialog(true); }}
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
                      isSelected={selectedJobs.includes(job.id)}
                      onSelect={() => toggleSelectJob(job.id)}
                      onPublish={() => { setJobToPublish(job); setShowPublishDialog(true); }}
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
                    <div className="w-8 h-8 rounded bg-[#0077B5]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#0077B5]">in</span>
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
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Publish (1 Credit)
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
  onPublish
}: { 
  job: typeof allJobs[0]
  showCompany: boolean
  isSelected: boolean
  onSelect: () => void
  onPublish: () => void
}) {
  return (
    <tr className="hover:bg-background-secondary/30 transition-colors group">
      <td className="px-4 py-4">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
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
        </div>
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <span className="text-sm text-foreground-muted">{job.location}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <JobStatusBadge status={job.status} />
      </td>
      <td className="px-4 py-4 text-right text-sm text-foreground-muted hidden sm:table-cell">
        {job.views.toLocaleString()}
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
              <Link href={`/agency/jobs/${job.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/agency/jobs/${job.id}/edit`}>Edit Job</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {job.status === "draft" && (
              <DropdownMenuItem onClick={onPublish}>
                Publish Job
              </DropdownMenuItem>
            )}
            {job.status === "published" && (
              <DropdownMenuItem>Pause Job</DropdownMenuItem>
            )}
            {job.status === "paused" && (
              <DropdownMenuItem>Resume Job</DropdownMenuItem>
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
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    paused: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    expired: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  const labels: Record<string, string> = {
    published: "Published",
    pending: "Pending",
    draft: "Draft",
    paused: "Paused",
    expired: "Expired",
  }

  return (
    <Badge variant="outline" className={cn("text-xs", styles[status])}>
      {labels[status]}
    </Badge>
  )
}

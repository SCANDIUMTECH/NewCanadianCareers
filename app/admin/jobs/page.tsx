"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  MoreHorizontal,
  Check,
  X,
  Eye,
  EyeOff,
  Pause,
  Play,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink,
  Flag,
  Settings,
  FileText,
  ArrowUpDown,
  Columns,
  Download,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// Types
interface Job {
  id: string
  title: string
  company: {
    id: string
    name: string
    logo?: string
    verified: boolean
  }
  agency?: {
    id: string
    name: string
  }
  status: "draft" | "pending" | "published" | "paused" | "expired" | "hidden"
  locationType: "remote" | "onsite" | "hybrid"
  location: string
  salary?: {
    min: number
    max: number
    currency: string
  }
  applyMode: "direct" | "external"
  externalUrl?: string
  postedAt: string
  expiresAt: string
  views: number
  applications: number
  reportCount: number
  featured: boolean
  category: string
}

// Mock data with companies/agencies for grouping
const mockJobs: Job[] = [
  {
    id: "job-001",
    title: "Senior Software Engineer",
    company: { id: "c1", name: "TechCorp Inc", verified: true },
    status: "published",
    locationType: "remote",
    location: "Worldwide",
    salary: { min: 150000, max: 200000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2026-01-28",
    expiresAt: "2026-02-28",
    views: 1234,
    applications: 45,
    reportCount: 0,
    featured: true,
    category: "Engineering",
  },
  {
    id: "job-002",
    title: "Product Designer",
    company: { id: "c1", name: "TechCorp Inc", verified: true },
    status: "published",
    locationType: "hybrid",
    location: "San Francisco, CA",
    salary: { min: 120000, max: 160000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2026-01-25",
    expiresAt: "2026-02-25",
    views: 876,
    applications: 32,
    reportCount: 0,
    featured: false,
    category: "Design",
  },
  {
    id: "job-003",
    title: "DevOps Engineer",
    company: { id: "c1", name: "TechCorp Inc", verified: true },
    status: "pending",
    locationType: "remote",
    location: "US Only",
    salary: { min: 130000, max: 170000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2026-02-01",
    expiresAt: "2026-03-01",
    views: 0,
    applications: 0,
    reportCount: 0,
    featured: false,
    category: "Engineering",
  },
  {
    id: "job-004",
    title: "Marketing Manager",
    company: { id: "c2", name: "GrowthLabs", verified: true },
    agency: { id: "a1", name: "TalentFirst Agency" },
    status: "published",
    locationType: "onsite",
    location: "New York, NY",
    salary: { min: 90000, max: 120000, currency: "USD" },
    applyMode: "external",
    externalUrl: "https://growthlabs.com/careers/marketing-manager",
    postedAt: "2026-01-20",
    expiresAt: "2026-02-20",
    views: 543,
    applications: 28,
    reportCount: 2,
    featured: false,
    category: "Marketing",
  },
  {
    id: "job-005",
    title: "Sales Representative",
    company: { id: "c2", name: "GrowthLabs", verified: true },
    agency: { id: "a1", name: "TalentFirst Agency" },
    status: "published",
    locationType: "hybrid",
    location: "Chicago, IL",
    applyMode: "direct",
    postedAt: "2026-01-22",
    expiresAt: "2026-02-22",
    views: 321,
    applications: 15,
    reportCount: 0,
    featured: false,
    category: "Sales",
  },
  {
    id: "job-006",
    title: "Data Scientist",
    company: { id: "c3", name: "DataFlow Analytics", verified: false },
    status: "pending",
    locationType: "remote",
    location: "Worldwide",
    salary: { min: 140000, max: 180000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2026-02-01",
    expiresAt: "2026-03-01",
    views: 0,
    applications: 0,
    reportCount: 0,
    featured: false,
    category: "Data",
  },
  {
    id: "job-007",
    title: "Frontend Developer",
    company: { id: "c4", name: "WebWorks Studio", verified: true },
    agency: { id: "a2", name: "HireRight Partners" },
    status: "paused",
    locationType: "remote",
    location: "Europe",
    salary: { min: 80000, max: 110000, currency: "EUR" },
    applyMode: "direct",
    postedAt: "2026-01-15",
    expiresAt: "2026-02-15",
    views: 654,
    applications: 22,
    reportCount: 0,
    featured: false,
    category: "Engineering",
  },
  {
    id: "job-008",
    title: "Scam Job Posting",
    company: { id: "c5", name: "Unknown Corp", verified: false },
    status: "hidden",
    locationType: "remote",
    location: "Anywhere",
    applyMode: "external",
    externalUrl: "https://suspicious-site.com/apply",
    postedAt: "2026-01-30",
    expiresAt: "2026-02-28",
    views: 12,
    applications: 0,
    reportCount: 15,
    featured: false,
    category: "Other",
  },
  {
    id: "job-009",
    title: "Customer Success Manager",
    company: { id: "c2", name: "GrowthLabs", verified: true },
    status: "expired",
    locationType: "onsite",
    location: "Austin, TX",
    salary: { min: 70000, max: 95000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2025-12-01",
    expiresAt: "2026-01-01",
    views: 890,
    applications: 41,
    reportCount: 0,
    featured: false,
    category: "Support",
  },
  {
    id: "job-010",
    title: "UX Researcher",
    company: { id: "c1", name: "TechCorp Inc", verified: true },
    status: "draft",
    locationType: "hybrid",
    location: "Seattle, WA",
    salary: { min: 100000, max: 130000, currency: "USD" },
    applyMode: "direct",
    postedAt: "2026-02-02",
    expiresAt: "2026-03-02",
    views: 0,
    applications: 0,
    reportCount: 0,
    featured: false,
    category: "Design",
  },
]

// Job Policy Settings type
interface JobPolicySettings {
  defaultPostDuration: number
  maxActiveJobsPerCompany: number
  salaryRequired: boolean
  prohibitedKeywords: string[]
  allowedCategories: string[]
  defaultApplyMode: "direct" | "external" | "both"
  externalUrlValidation: boolean
  requireApprovalForNewCompanies: boolean
  requireApprovalForUnverified: boolean
  autoExpireEnabled: boolean
}

const defaultPolicySettings: JobPolicySettings = {
  defaultPostDuration: 30,
  maxActiveJobsPerCompany: 25,
  salaryRequired: false,
  prohibitedKeywords: ["crypto", "mlm", "pyramid", "get rich quick"],
  allowedCategories: ["Engineering", "Design", "Marketing", "Sales", "Data", "Support", "Operations", "Finance", "HR", "Other"],
  defaultApplyMode: "both",
  externalUrlValidation: true,
  requireApprovalForNewCompanies: true,
  requireApprovalForUnverified: true,
  autoExpireEnabled: true,
}

// Status config
const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: Check },
  paused: { label: "Paused", color: "bg-blue-100 text-blue-700", icon: Pause },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-600", icon: Clock },
  hidden: { label: "Hidden", color: "bg-red-100 text-red-700", icon: EyeOff },
}

// Visible columns type
type ColumnKey = "company" | "agency" | "status" | "location" | "salary" | "applyMode" | "posted" | "expires" | "views" | "applications" | "reports"

export default function JobsManagementPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [locationTypeFilter, setLocationTypeFilter] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<"none" | "company" | "agency">("none")
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: string
    jobs: Job[]
  }>({ open: false, action: "", jobs: [] })
  const [actionReason, setActionReason] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [policySettings, setPolicySettings] = useState<JobPolicySettings>(defaultPolicySettings)
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "company", "status", "location", "salary", "posted", "views", "applications", "reports"
  ])

  // Filter jobs based on tab and filters
  const filteredJobs = useMemo(() => {
    let result = [...mockJobs]

    // Tab filter
    if (activeTab === "pending") {
      result = result.filter(j => j.status === "pending")
    } else if (activeTab === "flagged") {
      result = result.filter(j => j.reportCount > 0)
    } else if (activeTab === "expired") {
      result = result.filter(j => j.status === "expired")
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        j =>
          j.title.toLowerCase().includes(q) ||
          j.company.name.toLowerCase().includes(q) ||
          j.agency?.name.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter.length > 0) {
      result = result.filter(j => statusFilter.includes(j.status))
    }

    // Location type filter
    if (locationTypeFilter.length > 0) {
      result = result.filter(j => locationTypeFilter.includes(j.locationType))
    }

    return result
  }, [activeTab, searchQuery, statusFilter, locationTypeFilter])

  // Group jobs
  const groupedJobs = useMemo(() => {
    if (groupBy === "none") {
      return { ungrouped: filteredJobs }
    }

    const groups: Record<string, Job[]> = {}
    
    filteredJobs.forEach(job => {
      let key: string
      if (groupBy === "company") {
        key = job.company.name
      } else if (groupBy === "agency") {
        key = job.agency?.name || "Direct (No Agency)"
      } else {
        key = "ungrouped"
      }
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(job)
    })

    return groups
  }, [filteredJobs, groupBy])

  // Toggle group expansion
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  // Select all in view
  const selectAllVisible = () => {
    const visibleIds = filteredJobs.map(j => j.id)
    setSelectedJobs(prev => {
      const allSelected = visibleIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !visibleIds.includes(id))
      }
      return [...new Set([...prev, ...visibleIds])]
    })
  }

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    const jobs = mockJobs.filter(j => selectedJobs.includes(j.id))
    setActionDialog({ open: true, action, jobs })
  }

  // Execute action
  const executeAction = () => {
    console.log(`Executing ${actionDialog.action} on jobs:`, actionDialog.jobs.map(j => j.id), "Reason:", actionReason)
    setActionDialog({ open: false, action: "", jobs: [] })
    setActionReason("")
    setSelectedJobs([])
  }

  // Format salary
  const formatSalary = (salary?: Job["salary"]) => {
    if (!salary) return "Not specified"
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`
  }

  // Stats
  const stats = {
    total: mockJobs.length,
    pending: mockJobs.filter(j => j.status === "pending").length,
    flagged: mockJobs.filter(j => j.reportCount > 0).length,
    published: mockJobs.filter(j => j.status === "published").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, moderate, and configure job postings platform-wide
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Job Policies
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-600" },
          { label: "Flagged", value: stats.flagged, icon: Flag, color: "text-red-600" },
          { label: "Published", value: stats.published, icon: Check, color: "text-emerald-600" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <p className={cn("text-2xl font-semibold mt-2", stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All Jobs</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending Review
              {stats.pending > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="relative">
              Flagged
              {stats.flagged > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.flagged}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          {/* Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Status
                  {statusFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {statusFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={statusFilter.includes(key)}
                    onCheckedChange={checked => {
                      setStatusFilter(prev =>
                        checked ? [...prev, key] : prev.filter(s => s !== key)
                      )
                    }}
                  >
                    {config.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Location Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                  {locationTypeFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {locationTypeFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["remote", "onsite", "hybrid"].map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={locationTypeFilter.includes(type)}
                    onCheckedChange={checked => {
                      setLocationTypeFilter(prev =>
                        checked ? [...prev, type] : prev.filter(t => t !== type)
                      )
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Group By */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Group: {groupBy === "none" ? "None" : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy("none")}>No Grouping</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("company")}>By Company</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("agency")}>By Agency</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { key: "company" as ColumnKey, label: "Company" },
                  { key: "agency" as ColumnKey, label: "Agency" },
                  { key: "status" as ColumnKey, label: "Status" },
                  { key: "location" as ColumnKey, label: "Location" },
                  { key: "salary" as ColumnKey, label: "Salary" },
                  { key: "applyMode" as ColumnKey, label: "Apply Mode" },
                  { key: "posted" as ColumnKey, label: "Posted" },
                  { key: "expires" as ColumnKey, label: "Expires" },
                  { key: "views" as ColumnKey, label: "Views" },
                  { key: "applications" as ColumnKey, label: "Applications" },
                  { key: "reports" as ColumnKey, label: "Reports" },
                ].map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.includes(col.key)}
                    onCheckedChange={checked => {
                      setVisibleColumns(prev =>
                        checked ? [...prev, col.key] : prev.filter(c => c !== col.key)
                      )
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedJobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 mb-4"
            >
              <span className="text-sm font-medium">
                {selectedJobs.length} job{selectedJobs.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("approve")}>
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("pause")}>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("hide")}>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 bg-transparent" onClick={() => handleBulkAction("delete")}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedJobs([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jobs Table */}
        <TabsContent value={activeTab} className="mt-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_2fr_repeat(8,1fr)_auto] gap-4 px-4 py-3 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Checkbox
                  checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedJobs.includes(j.id))}
                  onCheckedChange={() => selectAllVisible()}
                />
              </div>
              <div>Job Title</div>
              {visibleColumns.includes("company") && <div>Company</div>}
              {visibleColumns.includes("status") && <div>Status</div>}
              {visibleColumns.includes("location") && <div>Location</div>}
              {visibleColumns.includes("salary") && <div>Salary</div>}
              {visibleColumns.includes("posted") && <div>Posted</div>}
              {visibleColumns.includes("views") && <div>Views</div>}
              {visibleColumns.includes("applications") && <div>Apps</div>}
              {visibleColumns.includes("reports") && <div>Reports</div>}
              <div>Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {groupBy === "none" ? (
                // Flat list
                filteredJobs.map((job, index) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    index={index}
                    selected={selectedJobs.includes(job.id)}
                    onSelect={id => {
                      setSelectedJobs(prev =>
                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                      )
                    }}
                    visibleColumns={visibleColumns}
                    formatSalary={formatSalary}
                    onAction={(action, j) => setActionDialog({ open: true, action, jobs: [j] })}
                  />
                ))
              ) : (
                // Grouped list
                Object.entries(groupedJobs).map(([groupName, jobs]) => (
                  <div key={groupName}>
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      {expandedGroups.includes(groupName) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      {groupBy === "company" ? (
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{groupName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {jobs.length} job{jobs.length > 1 ? "s" : ""}
                      </Badge>
                    </button>

                    {/* Group Jobs */}
                    <AnimatePresence>
                      {expandedGroups.includes(groupName) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {jobs.map((job, index) => (
                            <JobRow
                              key={job.id}
                              job={job}
                              index={index}
                              selected={selectedJobs.includes(job.id)}
                              onSelect={id => {
                                setSelectedJobs(prev =>
                                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                )
                              }}
                              visibleColumns={visibleColumns}
                              formatSalary={formatSalary}
                              onAction={(action, j) => setActionDialog({ open: true, action, jobs: [j] })}
                              indented
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}

              {filteredJobs.length === 0 && (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  No jobs found matching your criteria
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => !open && setActionDialog({ open: false, action: "", jobs: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approve" && "Approve Jobs"}
              {actionDialog.action === "hide" && "Hide Jobs"}
              {actionDialog.action === "pause" && "Pause Jobs"}
              {actionDialog.action === "delete" && "Delete Jobs"}
              {actionDialog.action === "edit" && "Edit Job"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve" && `Approve ${actionDialog.jobs.length} job(s) for publishing`}
              {actionDialog.action === "hide" && `Hide ${actionDialog.jobs.length} job(s) from public view`}
              {actionDialog.action === "pause" && `Pause ${actionDialog.jobs.length} job(s) temporarily`}
              {actionDialog.action === "delete" && `Permanently delete ${actionDialog.jobs.length} job(s)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Job list preview */}
            <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
              {actionDialog.jobs.map(job => (
                <div key={job.id} className="text-sm py-1">
                  <span className="font-medium">{job.title}</span>
                  <span className="text-muted-foreground"> - {job.company.name}</span>
                </div>
              ))}
            </div>

            {/* Reason (required for moderation actions) */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this action (required for audit)"
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: "", jobs: [] })}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={!actionReason.trim()}
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
            >
              Confirm {actionDialog.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Policy Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Policy Settings</DialogTitle>
            <DialogDescription>
              Configure platform-wide rules and defaults for job postings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Posting Defaults */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Posting Defaults</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Post Duration (days)</Label>
                  <Input
                    type="number"
                    value={policySettings.defaultPostDuration}
                    onChange={e => setPolicySettings(prev => ({
                      ...prev,
                      defaultPostDuration: parseInt(e.target.value) || 30
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Active Jobs Per Company</Label>
                  <Input
                    type="number"
                    value={policySettings.maxActiveJobsPerCompany}
                    onChange={e => setPolicySettings(prev => ({
                      ...prev,
                      maxActiveJobsPerCompany: parseInt(e.target.value) || 25
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Apply Mode</Label>
                <Select
                  value={policySettings.defaultApplyMode}
                  onValueChange={(value: "direct" | "external" | "both") => 
                    setPolicySettings(prev => ({ ...prev, defaultApplyMode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct Apply Only</SelectItem>
                    <SelectItem value="external">External URL Only</SelectItem>
                    <SelectItem value="both">Both Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Requirements</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Salary Required</Label>
                    <p className="text-xs text-muted-foreground">Require salary range on all postings</p>
                  </div>
                  <Switch
                    checked={policySettings.salaryRequired}
                    onCheckedChange={checked => setPolicySettings(prev => ({ ...prev, salaryRequired: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>External URL Validation</Label>
                    <p className="text-xs text-muted-foreground">Validate external apply URLs</p>
                  </div>
                  <Switch
                    checked={policySettings.externalUrlValidation}
                    onCheckedChange={checked => setPolicySettings(prev => ({ ...prev, externalUrlValidation: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Expire Jobs</Label>
                    <p className="text-xs text-muted-foreground">Automatically expire jobs after duration</p>
                  </div>
                  <Switch
                    checked={policySettings.autoExpireEnabled}
                    onCheckedChange={checked => setPolicySettings(prev => ({ ...prev, autoExpireEnabled: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Approval Rules */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Approval Rules</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval for New Companies</Label>
                    <p className="text-xs text-muted-foreground">First posting requires manual review</p>
                  </div>
                  <Switch
                    checked={policySettings.requireApprovalForNewCompanies}
                    onCheckedChange={checked => setPolicySettings(prev => ({ ...prev, requireApprovalForNewCompanies: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval for Unverified</Label>
                    <p className="text-xs text-muted-foreground">Unverified companies need approval</p>
                  </div>
                  <Switch
                    checked={policySettings.requireApprovalForUnverified}
                    onCheckedChange={checked => setPolicySettings(prev => ({ ...prev, requireApprovalForUnverified: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Prohibited Keywords */}
            <div className="space-y-2">
              <Label>Prohibited Keywords</Label>
              <p className="text-xs text-muted-foreground">Jobs containing these words will be flagged</p>
              <Textarea
                value={policySettings.prohibitedKeywords.join(", ")}
                onChange={e => setPolicySettings(prev => ({
                  ...prev,
                  prohibitedKeywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                }))}
                placeholder="crypto, mlm, pyramid..."
              />
            </div>

            {/* Allowed Categories */}
            <div className="space-y-2">
              <Label>Allowed Categories</Label>
              <p className="text-xs text-muted-foreground">Comma-separated list of job categories</p>
              <Textarea
                value={policySettings.allowedCategories.join(", ")}
                onChange={e => setPolicySettings(prev => ({
                  ...prev,
                  allowedCategories: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log("Saving policy settings:", policySettings)
              setSettingsOpen(false)
            }}>
              Save Settings
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
  index,
  selected,
  onSelect,
  visibleColumns,
  formatSalary,
  onAction,
  indented = false,
}: {
  job: Job
  index: number
  selected: boolean
  onSelect: (id: string) => void
  visibleColumns: ColumnKey[]
  formatSalary: (salary?: Job["salary"]) => string
  onAction: (action: string, job: Job) => void
  indented?: boolean
}) {
  const status = statusConfig[job.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "grid grid-cols-[auto_2fr_repeat(8,1fr)_auto] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors items-center",
        selected && "bg-primary/5",
        indented && "pl-10"
      )}
    >
      {/* Checkbox */}
      <div>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(job.id)}
        />
      </div>

      {/* Title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{job.title}</span>
          {job.featured && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
              Featured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{job.category}</span>
          {job.applyMode === "external" && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                External
              </span>
            </>
          )}
        </div>
      </div>

      {/* Company */}
      {visibleColumns.includes("company") && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm truncate">{job.company.name}</span>
            {job.company.verified && (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          {job.agency && (
            <span className="text-xs text-muted-foreground">via {job.agency.name}</span>
          )}
        </div>
      )}

      {/* Status */}
      {visibleColumns.includes("status") && (
        <div>
          <Badge className={cn("text-xs gap-1", status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
      )}

      {/* Location */}
      {visibleColumns.includes("location") && (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{job.location}</span>
          </div>
          <span className="text-xs text-muted-foreground capitalize">{job.locationType}</span>
        </div>
      )}

      {/* Salary */}
      {visibleColumns.includes("salary") && (
        <div className="text-sm">
          {job.salary ? (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              {formatSalary(job.salary)}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Not specified</span>
          )}
        </div>
      )}

      {/* Posted */}
      {visibleColumns.includes("posted") && (
        <div className="text-sm text-muted-foreground">
          {new Date(job.postedAt).toLocaleDateString()}
        </div>
      )}

      {/* Views */}
      {visibleColumns.includes("views") && (
        <div className="text-sm text-muted-foreground">
          {job.views.toLocaleString()}
        </div>
      )}

      {/* Applications */}
      {visibleColumns.includes("applications") && (
        <div className="text-sm text-muted-foreground">
          {job.applications}
        </div>
      )}

      {/* Reports */}
      {visibleColumns.includes("reports") && (
        <div>
          {job.reportCount > 0 ? (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {job.reportCount}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">0</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log("View job", job.id)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("edit", job)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Job
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {job.status === "pending" && (
              <DropdownMenuItem onClick={() => onAction("approve", job)}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </DropdownMenuItem>
            )}
            {job.status === "published" && (
              <DropdownMenuItem onClick={() => onAction("pause", job)}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            {job.status === "paused" && (
              <DropdownMenuItem onClick={() => onAction("approve", job)}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction("hide", job)}>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onAction("delete", job)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

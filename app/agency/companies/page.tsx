"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MotionWrapper } from "@/components/motion-wrapper"
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
import { Textarea } from "@/components/ui/textarea"
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Plus, X, Download, CheckCircle, Trash2 } from "lucide-react"

/**
 * Agency Companies Management
 * Spreadsheet-style list view with sorting, filtering, and bulk selection
 */

// Mock companies data
const clientCompanies = [
  {
    id: 1,
    name: "Acme Corporation",
    initials: "AC",
    website: "https://acme.com",
    industry: "Technology",
    verified: true,
    activeJobs: 5,
    totalJobs: 12,
    views: 842,
    applies: 68,
    creditsUsed: 8,
    color: "#3B5BDB",
    createdAt: "2026-01-15",
    contact: "john@acme.com",
  },
  {
    id: 2,
    name: "TechStart Inc",
    initials: "TS",
    website: "https://techstart.io",
    industry: "SaaS",
    verified: true,
    activeJobs: 3,
    totalJobs: 8,
    views: 523,
    applies: 42,
    creditsUsed: 5,
    color: "#10B981",
    createdAt: "2026-01-20",
    contact: "hr@techstart.io",
  },
  {
    id: 3,
    name: "Global Dynamics",
    initials: "GD",
    website: "https://globaldynamics.com",
    industry: "Finance",
    verified: false,
    activeJobs: 2,
    totalJobs: 3,
    views: 315,
    applies: 28,
    creditsUsed: 3,
    color: "#F59E0B",
    createdAt: "2026-01-25",
    contact: "careers@globaldynamics.com",
  },
  {
    id: 4,
    name: "Innovate Labs",
    initials: "IL",
    website: "https://innovatelabs.co",
    industry: "Research",
    verified: true,
    activeJobs: 0,
    totalJobs: 2,
    views: 0,
    applies: 0,
    creditsUsed: 0,
    color: "#8B5CF6",
    createdAt: "2026-01-28",
    contact: "team@innovatelabs.co",
  },
]

// Types
type SortField = "name" | "industry" | "activeJobs" | "views" | "applies" | "createdAt"
type SortDirection = "asc" | "desc"

// Sortable header component
function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className,
}: {
  label: string
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = field === currentField
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
          {label}
        </span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp size={14} className="text-primary" />
          ) : (
            <ArrowDown size={14} className="text-primary" />
          )
        ) : (
          <ArrowUpDown size={14} className="opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

// Get unique industries from data
const industries = [...new Set(clientCompanies.map(c => c.industry))]

export default function AgencyCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [industryFilter, setIndustryFilter] = useState("all")
  const [activityFilter, setActivityFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<typeof clientCompanies[0] | null>(null)

  // Sort state
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredCompanies = useMemo(() => {
    return clientCompanies.filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.industry.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === "all" ||
                           (filterStatus === "verified" && company.verified) ||
                           (filterStatus === "pending" && !company.verified)
      const matchesIndustry = industryFilter === "all" || company.industry === industryFilter
      const matchesActivity = activityFilter === "all" ||
                             (activityFilter === "active" && company.activeJobs > 0) ||
                             (activityFilter === "inactive" && company.activeJobs === 0)
      return matchesSearch && matchesStatus && matchesIndustry && matchesActivity
    })
  }, [searchQuery, filterStatus, industryFilter, activityFilter])

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "industry":
          comparison = a.industry.localeCompare(b.industry)
          break
        case "activeJobs":
          comparison = a.activeJobs - b.activeJobs
          break
        case "views":
          comparison = a.views - b.views
          break
        case "applies":
          comparison = a.applies - b.applies
          break
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredCompanies, sortField, sortDirection])

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedCompanies.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(sortedCompanies.map(c => c.id))
    }
  }

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Companies</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage companies you post jobs for
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Company
          </Button>
        </div>
      </MotionWrapper>

      {/* Stats Overview */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Total Companies</p>
              <p className="text-2xl font-semibold text-foreground mt-1">{clientCompanies.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Verified</p>
              <p className="text-2xl font-semibold text-emerald-600 mt-1">
                {clientCompanies.filter(c => c.verified).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Active Jobs</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {clientCompanies.reduce((sum, c) => sum + c.activeJobs, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Total Applications</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {clientCompanies.reduce((sum, c) => sum + c.applies, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Filters */}
      <MotionWrapper delay={150}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Industry Filter */}
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Activity Filter */}
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <MotionWrapper delay={0}>
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                <CheckCircle className="w-3.5 h-3.5" />
                Verify All
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-destructive border-destructive/30 hover:bg-destructive/5">
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 w-7 p-0"
              onClick={() => setSelectedIds([])}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </MotionWrapper>
      )}

      {/* Companies Table */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.length === sortedCompanies.length && sortedCompanies.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortableHeader
                  label="Company"
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="min-w-[200px]"
                />
                <SortableHeader
                  label="Industry"
                  field="industry"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[120px]"
                />
                <SortableHeader
                  label="Jobs"
                  field="activeJobs"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[80px]"
                />
                <SortableHeader
                  label="Views"
                  field="views"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[80px]"
                />
                <SortableHeader
                  label="Applications"
                  field="applies"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[100px]"
                />
                <TableHead className="w-[100px]">
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                    Status
                  </span>
                </TableHead>
                <SortableHeader
                  label="Added"
                  field="createdAt"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[100px]"
                />
                <TableHead className="w-[60px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company, index) => (
                <TableRow
                  key={company.id}
                  className={cn(
                    "group transition-colors",
                    index % 2 === 1 && "bg-muted/10",
                    selectedIds.includes(company.id) && "bg-primary/5",
                    "hover:bg-primary/5 hover:border-l-2 hover:border-l-primary"
                  )}
                  data-state={selectedIds.includes(company.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(company.id)}
                      onCheckedChange={() => toggleSelectOne(company.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${company.color}15` }}
                      >
                        <span className="text-sm font-bold" style={{ color: company.color }}>
                          {company.initials}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {company.name}
                          </span>
                          {company.verified && (
                            <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] font-normal bg-transparent">
                      {company.industry}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-medium tabular-nums">
                      {company.activeJobs}
                      <span className="text-muted-foreground font-normal"> / {company.totalJobs}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] tabular-nums">{company.views.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] tabular-nums">{company.applies.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    {company.verified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 text-[11px]">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-transparent text-[11px]">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-muted-foreground">
                      {formatDate(company.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedCompany(company); setShowEditDialog(true); }}>
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/agency/jobs?company=${company.id}`}>View Jobs</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/agency/jobs/new?company=${company.id}`}>Post Job</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/agency/analytics?company=${company.id}`}>View Analytics</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Remove Company</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedCompanies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No companies found</h3>
              <p className="text-sm text-foreground-muted mb-4">Try adjusting your search or filters</p>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                Add Company
              </Button>
            </div>
          )}
        </Card>
      </MotionWrapper>

      {/* Add Company Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Company</DialogTitle>
            <DialogDescription>
              Create a new client company profile. You can post jobs on their behalf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" placeholder="Acme Corporation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Primary Contact Email</Label>
              <Input id="contact" type="email" placeholder="hr@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief company description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company details for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input id="edit-name" defaultValue={selectedCompany?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input id="edit-website" defaultValue={selectedCompany?.website} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Select defaultValue={selectedCompany?.industry.toLowerCase()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Primary Contact</Label>
              <Input id="edit-contact" defaultValue={selectedCompany?.contact} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

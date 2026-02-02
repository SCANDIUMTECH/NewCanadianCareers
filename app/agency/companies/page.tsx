"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/**
 * Agency Companies Management
 * Full client company management with add, edit, verification status tracking
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
    createdAt: "Jan 15, 2026",
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
    createdAt: "Jan 20, 2026",
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
    createdAt: "Jan 25, 2026",
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
    createdAt: "Jan 28, 2026",
    contact: "team@innovatelabs.co",
  },
]

export default function AgencyCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<typeof clientCompanies[0] | null>(null)

  const filteredCompanies = clientCompanies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.industry.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "verified" && company.verified) ||
                         (filterStatus === "pending" && !company.verified)
    return matchesSearch && matchesStatus
  })

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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Company
          </Button>
        </div>
      </MotionWrapper>

      {/* Filters */}
      <MotionWrapper delay={100}>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">Status:</span>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Stats Overview */}
      <MotionWrapper delay={150}>
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

      {/* Companies Grid */}
      <MotionWrapper delay={200}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card 
              key={company.id} 
              className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${company.color}15` }}
                    >
                      <span className="text-lg font-bold" style={{ color: company.color }}>
                        {company.initials}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {company.name}
                        </h3>
                        {company.verified ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        ) : (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-amber-600 border-amber-500/30">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground-muted">{company.industry}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
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
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-background-secondary/50">
                    <p className="text-lg font-semibold text-foreground">{company.activeJobs}</p>
                    <p className="text-xs text-foreground-muted">Active Jobs</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background-secondary/50">
                    <p className="text-lg font-semibold text-foreground">{company.views}</p>
                    <p className="text-xs text-foreground-muted">Views</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background-secondary/50">
                    <p className="text-lg font-semibold text-foreground">{company.applies}</p>
                    <p className="text-xs text-foreground-muted">Applies</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/agency/jobs/new?company=${company.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Post Job
                    </Button>
                  </Link>
                  <Link href={`/agency/companies/${company.id}`}>
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
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
            </CardContent>
          </Card>
        )}
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

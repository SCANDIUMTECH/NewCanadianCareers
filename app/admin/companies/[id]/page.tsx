"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Admin Company Detail Page
 * View and manage company accounts
 */

// Mock company data
const mockCompany = {
  id: "CMP-001",
  name: "Acme Corporation",
  initials: "AC",
  industry: "Technology",
  website: "https://acme.com",
  description: "Acme Corporation is a leading technology company specializing in innovative software solutions.",
  location: "San Francisco, CA",
  size: "201-500 employees",
  verified: true,
  featured: false,
  status: "active", // active, suspended, pending
  createdAt: "2025-06-15",
  totalJobs: 24,
  activeJobs: 5,
  totalApplications: 1247,
  hires: 18,
  entitlements: 12,
}

const mockTeam = [
  { id: "1", name: "Jane Doe", email: "jane@acme.com", role: "Owner", lastActive: "2 hours ago" },
  { id: "2", name: "John Smith", email: "john@acme.com", role: "Admin", lastActive: "1 day ago" },
  { id: "3", name: "Alice Johnson", email: "alice@acme.com", role: "Recruiter", lastActive: "3 days ago" },
]

const mockJobs = [
  { id: "1", title: "Senior Product Designer", status: "active", applications: 42 },
  { id: "2", title: "Full Stack Engineer", status: "active", applications: 67 },
  { id: "3", title: "Product Manager", status: "paused", applications: 31 },
]

export default function AdminCompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState(mockCompany)
  const [isEditing, setIsEditing] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleSave = () => {
    setIsEditing(false)
  }

  const handleSuspend = () => {
    setCompany({ ...company, status: company.status === "suspended" ? "active" : "suspended" })
    setSuspendDialogOpen(false)
  }

  const getStatusBadge = () => {
    switch (company.status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "suspended":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Review</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-foreground-muted">
        <Link href="/admin/companies" className="hover:text-foreground transition-colors">Companies</Link>
        <span>/</span>
        <span className="text-foreground">{company.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{company.initials}</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              {company.verified && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Verified</Badge>
              )}
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span>{company.industry}</span>
              <span>·</span>
              <span>{company.location}</span>
              <span>·</span>
              <span className="font-mono">{company.id}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="bg-transparent"
              >
                Edit Company
              </Button>
              <Button
                variant="outline"
                onClick={() => setSuspendDialogOpen(true)}
                className={company.status === "suspended" ? "text-emerald-600" : "text-amber-600"}
              >
                {company.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{company.activeJobs}</p>
            <p className="text-sm text-foreground-muted">Active Jobs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{company.totalJobs}</p>
            <p className="text-sm text-foreground-muted">Total Jobs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{company.totalApplications.toLocaleString()}</p>
            <p className="text-sm text-foreground-muted">Applications</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{company.hires}</p>
            <p className="text-sm text-foreground-muted">Hires</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{company.entitlements}</p>
            <p className="text-sm text-foreground-muted">Entitlements</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-background-secondary/50 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team ({mockTeam.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({mockJobs.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={company.industry}
                    onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={company.website}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={company.location}
                    onChange={(e) => setCompany({ ...company, location: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Input
                    value={company.size}
                    onChange={(e) => setCompany({ ...company, size: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Joined</Label>
                  <Input value={company.createdAt} disabled className="font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={company.description}
                  onChange={(e) => setCompany({ ...company, description: e.target.value })}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verified Company</Label>
                    <p className="text-sm text-foreground-muted">Company has been verified</p>
                  </div>
                  <Switch
                    checked={company.verified}
                    onCheckedChange={(checked) => setCompany({ ...company, verified: checked })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Featured Company</Label>
                    <p className="text-sm text-foreground-muted">Show in featured listings</p>
                  </div>
                  <Switch
                    checked={company.featured}
                    onCheckedChange={(checked) => setCompany({ ...company, featured: checked })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50">
                {mockTeam.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-sm text-foreground-muted">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{member.role}</Badge>
                      <span className="text-sm text-foreground-muted">{member.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Job Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50">
                {mockJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-foreground">{job.title}</p>
                      <p className="text-sm text-foreground-muted">{job.applications} applications</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          job.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }
                      >
                        {job.status === "active" ? "Active" : "Paused"}
                      </Badge>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Entitlements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Job Post Entitlements</p>
                  <p className="text-sm text-foreground-muted">Number of job posts remaining</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={company.entitlements}
                    onChange={(e) => setCompany({ ...company, entitlements: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div>
                  <p className="font-medium text-foreground">
                    {company.status === "suspended" ? "Reactivate Company" : "Suspend Company"}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {company.status === "suspended"
                      ? "Allow this company to access their account again"
                      : "Temporarily prevent this company from posting jobs"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSuspendDialogOpen(true)}
                  className={company.status === "suspended" ? "text-emerald-600 border-emerald-500/20" : "text-amber-600 border-amber-500/20"}
                >
                  {company.status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="font-medium text-foreground">Delete Company</p>
                  <p className="text-sm text-foreground-muted">
                    Permanently delete this company and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Company
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {company.status === "suspended" ? "Reactivate Company" : "Suspend Company"}
            </DialogTitle>
            <DialogDescription>
              {company.status === "suspended"
                ? `Are you sure you want to reactivate ${company.name}? They will regain access to the platform.`
                : `Are you sure you want to suspend ${company.name}? All their active jobs will be paused.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              className={company.status === "suspended"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"}
            >
              {company.status === "suspended" ? "Reactivate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {company.name}?
              This action cannot be undone. All jobs, applications, and team members will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                router.push("/admin/companies")
              }}
            >
              Delete Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

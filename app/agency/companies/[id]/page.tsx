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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Agency Client Company Detail Page
 * View and manage a client company's profile, jobs, and settings
 */

// Mock company data
const mockCompany = {
  id: "1",
  name: "Acme Corporation",
  initials: "AC",
  industry: "Technology",
  website: "https://acme.com",
  description: "Acme Corporation is a leading technology company specializing in innovative software solutions for enterprise clients.",
  location: "San Francisco, CA",
  size: "201-500 employees",
  verified: true,
  activeJobs: 5,
  totalApplications: 287,
  createdAt: "2025-08-15",
  contactEmail: "hr@acme.com",
  contactPhone: "+1 (555) 123-4567",
}

const mockJobs = [
  { id: "1", title: "Senior Product Designer", status: "active", applications: 42, posted: "2 days ago" },
  { id: "2", title: "Full Stack Engineer", status: "active", applications: 67, posted: "5 days ago" },
  { id: "3", title: "Product Manager", status: "paused", applications: 31, posted: "1 week ago" },
  { id: "4", title: "DevOps Engineer", status: "active", applications: 28, posted: "2 weeks ago" },
  { id: "5", title: "UX Researcher", status: "active", applications: 19, posted: "3 weeks ago" },
]

export default function AgencyCompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState(mockCompany)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleSave = () => {
    // Save changes (would be API call)
    setIsEditing(false)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/agency/companies" className="hover:text-foreground transition-colors">Companies</Link>
          <span>/</span>
          <span className="text-foreground">{company.name}</span>
        </nav>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
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
              </div>
              <div className="flex items-center gap-4 text-sm text-foreground-muted">
                <span>{company.industry}</span>
                <span>·</span>
                <span>{company.location}</span>
                <span>·</span>
                <span>{company.size}</span>
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
                <Link href={`/agency/jobs/new?company=${params.id}`}>
                  <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Post Job
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-transparent"
                >
                  Edit Company
                </Button>
              </>
            )}
          </div>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{company.activeJobs}</p>
              <p className="text-sm text-foreground-muted">Active Jobs</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{company.totalApplications}</p>
              <p className="text-sm text-foreground-muted">Total Applications</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">4.8</p>
              <p className="text-sm text-foreground-muted">Avg. Rating</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">12</p>
              <p className="text-sm text-foreground-muted">Hires This Year</p>
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <MotionWrapper delay={150}>
          <TabsList className="w-full justify-start bg-background-secondary/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({mockJobs.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </MotionWrapper>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      value={company.contactEmail}
                      onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      value={company.contactPhone}
                      onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Job Listings</CardTitle>
                <Link href={`/agency/jobs/new?company=${params.id}`}>
                  <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    Post New Job
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/50">
                  {mockJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {job.applications} applications · Posted {job.posted}
                        </p>
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
          </MotionWrapper>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground">Remove Company</p>
                    <p className="text-sm text-foreground-muted">
                      Permanently remove this company from your client list. All associated jobs will be archived.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Remove Company
                  </Button>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {company.name} from your client list?
              All {company.activeJobs} active jobs will be archived. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                router.push("/agency/companies")
              }}
            >
              Remove Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

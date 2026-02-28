"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
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
import {
  getAgencyClient,
  getClientJobs,
  updateAgencyClient,
  removeAgencyClient,
} from "@/lib/api/agencies"
import { CompanyAvatar } from "@/components/company-avatar"
import type { AgencyClient, AgencyJob } from "@/lib/agency/types"

/**
 * Agency Client Company Detail Page
 * View and manage a client company's profile, jobs, and settings
 */

// Loading skeleton component
function PageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 animate-pulse">
      <div className="h-4 w-48 bg-foreground/10 rounded mb-6" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-foreground/10" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-foreground/10 rounded" />
          <div className="h-4 w-64 bg-foreground/10 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-foreground/10 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Failed to load client</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  )
}

export default function AgencyCompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = Number(params.id)

  // Data state
  const [client, setClient] = useState<AgencyClient | null>(null)
  const [jobs, setJobs] = useState<AgencyJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Edit form state
  const [editNotes, setEditNotes] = useState("")

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!clientId || isNaN(clientId)) {
      setError("Invalid client ID")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [clientData, jobsData] = await Promise.all([
        getAgencyClient(clientId),
        getClientJobs(clientId, { page_size: 100 }),
      ])

      setClient(clientData)
      setJobs(jobsData.results)
      setEditNotes(clientData.notes || "")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load client data"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle save
  const handleSave = async () => {
    if (!client) return

    setIsSaving(true)
    try {
      const updated = await updateAgencyClient(client.id, {
        notes: editNotes,
      })
      setClient(updated)
      setIsEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!client) return

    setIsDeleting(true)
    try {
      await removeAgencyClient(client.id)
      setDeleteDialogOpen(false)
      router.push("/agency/companies")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove client"
      toast.error(message)
      setIsDeleting(false)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditNotes(client?.notes || "")
  }

  // Loading state
  if (isLoading) {
    return <PageSkeleton />
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />
  }

  // No data state
  if (!client) {
    return <ErrorState error="Client not found" onRetry={fetchData} />
  }

  // Get company details
  const company = client.company_detail
  const companyName = company?.name || client.company_name
  const companyInitials = companyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/agency/companies" className="hover:text-foreground transition-colors">Companies</Link>
          <span>/</span>
          <span className="text-foreground">{companyName}</span>
        </nav>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <CompanyAvatar name={companyName} logo={company?.logo} size="lg" />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{companyName}</h1>
                {company?.status === "verified" && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Verified</Badge>
                )}
                {!client.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-foreground-muted">
                {company?.industry && <span>{company.industry}</span>}
                {company?.headquarters_city && (
                  <>
                    <span>·</span>
                    <span>{company.headquarters_city}{company.headquarters_country ? `, ${company.headquarters_country}` : ""}</span>
                  </>
                )}
                {company?.size && (
                  <>
                    <span>·</span>
                    <span>{company.size}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Link href={`/agency/jobs/new?company=${client.id}`}>
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
                  Edit Client
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
              <p className="text-2xl font-semibold text-foreground">{client.active_jobs_count ?? jobs.filter(j => j.status === "published").length}</p>
              <p className="text-sm text-foreground-muted">Active Jobs</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">
                {jobs.reduce((sum, j) => sum + j.applications_count, 0)}
              </p>
              <p className="text-sm text-foreground-muted">Total Applications</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{client.total_placements ?? 0}</p>
              <p className="text-sm text-foreground-muted">Placements</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{client.credits_used ?? 0}</p>
              <p className="text-sm text-foreground-muted">Credits Used</p>
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <MotionWrapper delay={150}>
          <TabsList className="w-full justify-start bg-background-secondary/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
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
                    <Input value={companyName} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={company?.industry || "-"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Input value={company?.size || "-"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={
                        company?.headquarters_city
                          ? `${company.headquarters_city}${company.headquarters_country ? `, ${company.headquarters_country}` : ""}`
                          : "-"
                      }
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={isEditing ? editNotes : client.notes || ""}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Add internal notes about this client..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client Since</Label>
                    <Input
                      value={new Date(client.created_at).toLocaleDateString()}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input value={client.is_active ? "Active" : "Inactive"} disabled />
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
                <Link href={`/agency/jobs/new?company=${client.id}`}>
                  <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    Post New Job
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-foreground-muted">
                    <p>No jobs posted yet for this client.</p>
                    <Link href={`/agency/jobs/new?company=${client.id}`}>
                      <Button variant="outline" className="mt-4">Post First Job</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div>
                          <p className="font-medium text-foreground">{job.title}</p>
                          <p className="text-sm text-foreground-muted">
                            {job.applications_count ?? 0} applications · Posted {job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "Draft"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              job.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : job.status === "paused"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                            }
                          >
                            {job.status === "published" ? "Active" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                          <Link href={`/agency/jobs/${job.job_id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                      Permanently remove this company from your client list. All {jobs.filter(j => j.status === "published").length} active jobs will be archived.
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
              Are you sure you want to remove {companyName} from your client list?
              All {jobs.filter(j => j.status === "published").length} active jobs will be archived. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { cn, getCompanyInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2 } from "lucide-react"
import { CHART, SOCIAL } from "@/lib/constants/colors"
import {
  getAgencyJob,
  updateAgencyJob,
  pauseAgencyJob,
  publishAgencyJob,
  deleteAgencyJob,
} from "@/lib/api/agencies"
import type { AgencyJobDetail } from "@/lib/agency/types"
import { toast } from "sonner"
import { SEOFields } from "@/components/ai/seo-fields"
import { SocialContentGenerator } from "@/components/ai/social-content-generator"

/**
 * Agency Job Detail/Edit Page
 * Similar to /app/company/jobs/[id]/page.tsx but with agency context
 * Shows which client company the job is for
 */

// Helper to get company color based on ID
const companyColors = [CHART.primary, CHART.success, CHART.warning, CHART.purple, CHART.pink, CHART.indigo]
function getCompanyColor(companyId: number): string {
  return companyColors[companyId % companyColors.length]
}

// Map API job to display format
interface DisplayJob {
  id: string
  job_id: string
  title: string
  department: string
  type: string
  experience: string
  status: string
  company: {
    id: number
    name: string
    initials: string
    color: string
  }
  location: {
    city: string
    state: string
    country: string
  }
  remote: string
  salary: {
    min: number
    max: number
    currency: string
    period: string
    showOnListing: boolean
  }
  description: string
  responsibilities: string[]
  requirements: string[]
  skills: string[]
  benefits: string[]
  applyMethod: string
  applyEmail: string
  applyUrl: string
  applyInstructions: string
  distribution: {
    linkedin: boolean
    twitter: boolean
    facebook: boolean
    instagram: boolean
  }
  featured: boolean
  postedDate: string
  expirationDate: string
  views: number
  applications: number
  meta_title: string
  meta_description: string
}

function mapApiJobToDisplayJob(apiJob: AgencyJobDetail): DisplayJob {
  const companyName = apiJob.company?.name || 'Unknown Company'
  const companyInitials = getCompanyInitials(companyName)
  const companyColor = getCompanyColor(apiJob.company?.id || 0)

  // Map employment type
  const typeMap: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
    internship: 'Internship',
  }

  // Map experience level
  const experienceMap: Record<string, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level (2-4 years)',
    senior: 'Senior (5+ years)',
    lead: 'Lead / Manager',
    executive: 'Director / Executive',
  }

  // Map status
  const statusMap: Record<string, string> = {
    published: 'active',
    paused: 'paused',
    draft: 'draft',
    expired: 'expired',
    hidden: 'paused',
    filled: 'expired',
    pending: 'draft',
  }

  return {
    id: `JOB-${apiJob.id}`,
    job_id: apiJob.job_id,
    title: apiJob.title,
    department: apiJob.category?.name || 'General',
    type: typeMap[apiJob.employment_type] || apiJob.employment_type,
    experience: experienceMap[apiJob.experience_level] || apiJob.experience_level,
    status: statusMap[apiJob.status] || apiJob.status,
    company: {
      id: apiJob.company?.id || 0,
      name: companyName,
      initials: companyInitials,
      color: companyColor,
    },
    location: {
      city: apiJob.city || '',
      state: apiJob.state || '',
      country: apiJob.country || 'USA',
    },
    remote: apiJob.location_type,
    salary: {
      min: apiJob.salary_min || 0,
      max: apiJob.salary_max || 0,
      currency: apiJob.salary_currency || 'USD',
      period: apiJob.salary_period || 'year',
      showOnListing: true,
    },
    description: apiJob.description || '',
    responsibilities: [],
    requirements: [],
    skills: apiJob.skills || [],
    benefits: apiJob.benefits || [],
    applyMethod: 'internal',
    applyEmail: '',
    applyUrl: '',
    applyInstructions: '',
    distribution: {
      linkedin: false,
      twitter: false,
      facebook: false,
      instagram: false,
    },
    featured: apiJob.is_featured,
    postedDate: apiJob.posted_at || apiJob.created_at,
    expirationDate: apiJob.expires_at || '',
    views: apiJob.views || 0,
    applications: apiJob.applications_count || 0,
    meta_title: apiJob.meta_title || '',
    meta_description: apiJob.meta_description || '',
  }
}

export default function AgencyJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<DisplayJob | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)

  // Fetch job on mount
  const fetchJob = useCallback(async () => {
    if (!params.id) return

    setIsLoading(true)
    setError(null)

    try {
      const jobId = params.id as string
      const data = await getAgencyJob(jobId)
      setJob(mapApiJobToDisplayJob(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  const formatSalary = (min: number, max: number) => {
    const cur = job?.salary?.currency || "CAD"
    const locale = cur === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }

  const handleSave = async () => {
    if (!job) return

    setIsSaving(true)
    try {
      const jobId = params.id as string

      // Map display format back to API format
      const employmentTypeMap: Record<string, string> = {
        'Full-time': 'full_time',
        'Part-time': 'part_time',
        'Contract': 'contract',
        'Freelance': 'freelance',
        'Internship': 'internship',
      }

      const experienceLevelMap: Record<string, string> = {
        'Entry Level': 'entry',
        'Mid Level (2-4 years)': 'mid',
        'Senior (5+ years)': 'senior',
        'Lead / Manager': 'lead',
        'Director / Executive': 'executive',
      }

      await updateAgencyJob(jobId, {
        title: job.title,
        description: job.description,
        employment_type: employmentTypeMap[job.type] || job.type,
        experience_level: experienceLevelMap[job.experience] || job.experience,
        location_type: job.remote as 'onsite' | 'remote' | 'hybrid',
        city: job.location.city || undefined,
        state: job.location.state || undefined,
        country: job.location.country || undefined,
        salary_min: job.salary.min || undefined,
        salary_max: job.salary.max || undefined,
        salary_currency: job.salary.currency,
        skills: job.skills,
        benefits: job.benefits,
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save job:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePauseResume = async () => {
    if (!job) return

    setIsSaving(true)
    try {
      const jobId = params.id as string

      if (job.status === "active") {
        await pauseAgencyJob(jobId)
        setJob(prev => prev ? { ...prev, status: "paused" } : null)
      } else {
        await publishAgencyJob(jobId)
        setJob(prev => prev ? { ...prev, status: "active" } : null)
      }
      setPauseDialogOpen(false)
    } catch (err) {
      console.error('Failed to update job status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update job status')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    try {
      const jobId = params.id as string
      await deleteAgencyJob(jobId)
      setDeleteDialogOpen(false)
      router.push("/agency/jobs")
    } catch (err) {
      console.error('Failed to delete job:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete job')
      setIsSaving(false)
    }
  }

  const handleDuplicate = () => {
    if (!job) return
    router.push(`/agency/jobs/new?duplicate=${job.job_id}&company=${job.company.id}`)
  }

  const getStatusBadge = () => {
    if (!job) return null
    switch (job.status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "paused":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Paused</Badge>
      case "expired":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Expired</Badge>
      case "draft":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Draft</Badge>
      default:
        return null
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state
  if (error || !job) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || 'Job not found'}</p>
          <Button onClick={fetchJob} variant="outline">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/agency/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-foreground">{job.title}</span>
        </nav>
      </MotionWrapper>

      {/* Company Context Banner */}
      <MotionWrapper delay={25}>
        <div
          className="flex items-center gap-3 p-3 rounded-lg mb-6 border"
          style={{
            backgroundColor: `${job.company.color}08`,
            borderColor: `${job.company.color}20`
          }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: `${job.company.color}20` }}
          >
            <span className="text-sm font-bold" style={{ color: job.company.color }}>
              {job.company.initials}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Job for <span style={{ color: job.company.color }}>{job.company.name}</span>
            </p>
            <p className="text-xs text-foreground-muted">
              This job will be posted under the client company&apos;s branding
            </p>
          </div>
          <Link href={`/agency/clients/${job.company.id}`}>
            <Button variant="ghost" size="sm" className="text-foreground-muted hover:text-foreground">
              View Client
            </Button>
          </Link>
        </div>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{job.title}</h1>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span className="font-mono">{job.job_id || job.id}</span>
              <span>·</span>
              <span>{(job.views ?? 0).toLocaleString()} views</span>
              <span>·</span>
              <span>{job.applications} applications</span>
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
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-transparent"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save as Draft'
                  )}
                </Button>
                {job.status === "draft" && (
                  <Button
                    onClick={async () => {
                      await handleSave()
                      try {
                        const jobId = params.id as string
                        await publishAgencyJob(jobId)
                        setJob(prev => prev ? { ...prev, status: "pending" } : null)
                        toast.success("Job submitted for review")
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to submit for review")
                      }
                    }}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    Save & Submit for Review
                  </Button>
                )}
                {job.status !== "draft" && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </>
            ) : (
              <>
                {job.status === "draft" && (
                  <Button
                    onClick={async () => {
                      setIsSaving(true)
                      try {
                        const jobId = params.id as string
                        await publishAgencyJob(jobId)
                        setJob(prev => prev ? { ...prev, status: "pending" } : null)
                        toast.success("Job submitted for review")
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to submit for review")
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    Submit for Review
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-transparent"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-transparent">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/jobs/${params.id}`} target="_blank">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPauseDialogOpen(true)}>
                      {job.status === "active" ? (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause Job
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Resume Job
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </MotionWrapper>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <MotionWrapper delay={100}>
          <TabsList className="w-full justify-start bg-background-secondary/50 p-1">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="location">Location & Pay</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>
        </MotionWrapper>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={job.title}
                      onChange={(e) => setJob({ ...job, title: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={job.department}
                      onValueChange={(value) => setJob({ ...job, department: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select
                      value={job.type}
                      onValueChange={(value) => setJob({ ...job, type: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Experience Level</Label>
                    <Select
                      value={job.experience}
                      onValueChange={(value) => setJob({ ...job, experience: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entry Level">Entry Level</SelectItem>
                        <SelectItem value="Mid Level (2-4 years)">Mid Level (2-4 years)</SelectItem>
                        <SelectItem value="Senior (5+ years)">Senior (5+ years)</SelectItem>
                        <SelectItem value="Lead / Manager">Lead / Manager</SelectItem>
                        <SelectItem value="Director / Executive">Director / Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={job.description}
                    onChange={(e) => setJob({ ...job, description: e.target.value })}
                    disabled={!isEditing}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsibilities (one per line)</Label>
                  <Textarea
                    value={job.responsibilities.join("\n")}
                    onChange={(e) => setJob({ ...job, responsibilities: e.target.value.split("\n").filter(Boolean) })}
                    disabled={!isEditing}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Requirements (one per line)</Label>
                  <Textarea
                    value={job.requirements.join("\n")}
                    onChange={(e) => setJob({ ...job, requirements: e.target.value.split("\n").filter(Boolean) })}
                    disabled={!isEditing}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input
                    value={job.skills.join(", ")}
                    onChange={(e) => setJob({ ...job, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Location & Pay Tab */}
        <TabsContent value="location" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={job.location.city}
                      onChange={(e) => setJob({ ...job, location: { ...job.location, city: e.target.value } })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province</Label>
                    <Input
                      value={job.location.state}
                      onChange={(e) => setJob({ ...job, location: { ...job.location, state: e.target.value } })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={job.location.country}
                      onChange={(e) => setJob({ ...job, location: { ...job.location, country: e.target.value } })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remote Policy</Label>
                  <Select
                    value={job.remote}
                    onValueChange={(value) => setJob({ ...job, remote: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onsite">On-site only</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Fully remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Salary</Label>
                    <Input
                      type="number"
                      value={job.salary.min}
                      onChange={(e) => setJob({ ...job, salary: { ...job.salary, min: parseInt(e.target.value) || 0 } })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Salary</Label>
                    <Input
                      type="number"
                      value={job.salary.max}
                      onChange={(e) => setJob({ ...job, salary: { ...job.salary, max: parseInt(e.target.value) || 0 } })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={job.salary.currency}
                      onValueChange={(value) => setJob({ ...job, salary: { ...job.salary, currency: value } })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isEditing && (
                  <p className="text-lg font-semibold text-foreground">
                    {formatSalary(job.salary.min, job.salary.max)} / {job.salary.period}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label className="text-foreground">Show Salary on Listing</Label>
                    <p className="text-sm text-foreground-muted">Display salary range publicly</p>
                  </div>
                  <Switch
                    checked={job.salary.showOnListing}
                    onCheckedChange={(checked) => setJob({ ...job, salary: { ...job.salary, showOnListing: checked } })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Benefits (comma-separated)</Label>
                  <Input
                    value={job.benefits.join(", ")}
                    onChange={(e) => setJob({ ...job, benefits: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">SEO Optimization</CardTitle>
                <p className="text-sm text-foreground-muted mt-1">
                  Optimize how this job appears in search engines and Google for Jobs
                </p>
              </CardHeader>
              <CardContent>
                <SEOFields
                  jobId={job.job_id}
                  metaTitle={job.meta_title}
                  metaDescription={job.meta_description}
                  onMetaTitleChange={(value) => setJob({ ...job, meta_title: value })}
                  onMetaDescriptionChange={(value) => setJob({ ...job, meta_description: value })}
                  defaultOpen
                />
                {(job.meta_title !== "" || job.meta_description !== "") && (
                  <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const jobId = params.id as string
                          await updateAgencyJob(jobId, {
                            meta_title: job.meta_title,
                            meta_description: job.meta_description,
                          })
                          toast.success("SEO settings saved")
                        } catch {
                          toast.error("Failed to save SEO settings")
                        }
                      }}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                    >
                      Save SEO Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Social Content Tab */}
        <TabsContent value="social" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">AI Social Content</CardTitle>
                <p className="text-sm text-foreground-muted mt-1">
                  Generate platform-specific social media posts to promote this job
                </p>
              </CardHeader>
              <CardContent>
                <SocialContentGenerator
                  jobId={job.job_id}
                  createPosts
                  onContentGenerated={() => {
                    toast.success("Social content generated and saved")
                  }}
                />
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Application Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How should candidates apply?</Label>
                  <Select
                    value={job.applyMethod}
                    onValueChange={(value) => setJob({ ...job, applyMethod: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Through Orion (Recommended)</SelectItem>
                      <SelectItem value="email">Via Email</SelectItem>
                      <SelectItem value="external">External URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {job.applyMethod === "email" && (
                  <div className="space-y-2">
                    <Label>Application Email</Label>
                    <Input
                      type="email"
                      value={job.applyEmail}
                      onChange={(e) => setJob({ ...job, applyEmail: e.target.value })}
                      disabled={!isEditing}
                      placeholder="careers@company.com"
                    />
                  </div>
                )}

                {job.applyMethod === "external" && (
                  <div className="space-y-2">
                    <Label>Application URL</Label>
                    <Input
                      type="url"
                      value={job.applyUrl}
                      onChange={(e) => setJob({ ...job, applyUrl: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://company.com/careers/apply"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Application Instructions (Optional)</Label>
                  <Textarea
                    value={job.applyInstructions}
                    onChange={(e) => setJob({ ...job, applyInstructions: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Any special instructions for applicants..."
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Social Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: `${SOCIAL.linkedin}1A` }}>
                      <span className="text-sm font-bold" style={{ color: SOCIAL.linkedin }}>in</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">LinkedIn</p>
                      <p className="text-sm text-foreground-muted">Post to company page</p>
                    </div>
                  </div>
                  <Switch
                    checked={job.distribution.linkedin}
                    onCheckedChange={(checked) => setJob({ ...job, distribution: { ...job.distribution, linkedin: checked } })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-foreground/10 flex items-center justify-center">
                      <span className="text-sm font-bold">X</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">X (Twitter)</p>
                      <p className="text-sm text-foreground-muted">Tweet from company account</p>
                    </div>
                  </div>
                  <Switch
                    checked={job.distribution.twitter}
                    onCheckedChange={(checked) => setJob({ ...job, distribution: { ...job.distribution, twitter: checked } })}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Featured Listing</Label>
                    <p className="text-sm text-foreground-muted">Highlight this job in search results</p>
                  </div>
                  <Switch
                    checked={job.featured}
                    onCheckedChange={(checked) => setJob({ ...job, featured: checked })}
                    disabled={!isEditing}
                  />
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
            <DialogTitle>Delete Job Posting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job posting? This action cannot be undone.
              All applications associated with this job will also be removed.
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
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Job'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause/Resume Confirmation Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {job.status === "active" ? "Pause Job Posting" : "Resume Job Posting"}
            </DialogTitle>
            <DialogDescription>
              {job.status === "active"
                ? "Pausing this job will temporarily hide it from search results. Candidates will not be able to apply until you resume the posting."
                : "Resuming this job will make it visible in search results again. Candidates will be able to apply."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPauseDialogOpen(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePauseResume}
              disabled={isSaving}
              className={job.status === "active"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary hover:bg-primary-hover text-primary-foreground"
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {job.status === "active" ? "Pausing..." : "Resuming..."}
                </>
              ) : (
                job.status === "active" ? "Pause Job" : "Resume Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { JOB_STATUS_STYLES } from "@/lib/constants/status-styles"
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
import { getJob, updateJob, deleteJob, publishJob, pauseJob, resumeJob, duplicateJob, toggleFeatured, extendJob, getCompanyAnalytics, getCategories } from "@/lib/api/jobs"
import type { AnalyticsTimeSeries } from "@/lib/api/jobs"
import { getCompanyApplications } from "@/lib/api/applications"
import type { Job, JobStatus, UpdateJobData, ApplicationListItem, ApplicationStatus, CategoryOption } from "@/lib/company/types"
import { useCompanyContext } from "@/hooks/use-company"
import { UserAvatar } from "@/components/user-avatar"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { SEOFields } from "@/components/ai/seo-fields"
import { SocialContentGenerator } from "@/components/ai/social-content-generator"

/**
 * Company Job Detail/Edit Page
 * Tabbed interface with view/edit modes
 * Integrated with backend API
 */

export default function CompanyJobDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <CompanyJobDetailContent />
    </Suspense>
  )
}

function CompanyJobDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshEntitlements } = useCompanyContext()
  const jobId = params.id as string

  // State
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now")
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>()
  const publishDialogRef = useRef<HTMLDivElement>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [extendDays, setExtendDays] = useState(30)

  // Applications state
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsTimeSeries[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d">("30d")

  // Categories state
  const [categories, setCategories] = useState<CategoryOption[]>([])

  // Edit state (separate from API data)
  const [editData, setEditData] = useState<UpdateJobData>({})

  // Fetch job data
  const fetchJob = useCallback(async () => {
    if (!jobId) {
      setError("Invalid job ID")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getJob(jobId)
      setJob(data)
      setEditData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job")
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Fetch categories for the category dropdown
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  // Auto-enter edit mode if URL has ?edit=true
  useEffect(() => {
    if (searchParams.get("edit") === "true" && job) {
      setIsEditing(true)
    }
  }, [searchParams, job])

  // Auto-open extend dialog if URL has ?extend=true (only for published jobs)
  useEffect(() => {
    if (searchParams.get("extend") === "true" && job && job.status === "published") {
      setExtendDialogOpen(true)
    }
  }, [searchParams, job])

  // Fetch applications when the applications tab is active
  useEffect(() => {
    if (activeTab === "applications" && job?.id) {
      setApplicationsLoading(true)
      getCompanyApplications({ job_id: job.id, page_size: 10 })
        .then((data) => setApplications(data.results))
        .catch(() => setApplications([]))
        .finally(() => setApplicationsLoading(false))
    }
  }, [activeTab, job?.id])

  // Fetch analytics when the analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics" && job?.id) {
      setAnalyticsLoading(true)
      getCompanyAnalytics({ period: analyticsPeriod, job_id: job.id })
        .then((data) => setAnalytics(data.timeseries))
        .catch(() => setAnalytics([]))
        .finally(() => setAnalyticsLoading(false))
    }
  }, [activeTab, job?.id, analyticsPeriod])

  // Share handlers
  const handleCopyLink = async () => {
    if (!job) return
    const url = `${window.location.origin}/jobs/${job.job_id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleShareSocial = (platform: string) => {
    if (!job) return
    const url = encodeURIComponent(`${window.location.origin}/jobs/${job.job_id}`)
    const text = encodeURIComponent(`${job.title} - Apply now!`)

    const shareUrls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    }

    const shareUrl = shareUrls[platform]
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400")
    }
  }

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return "Not specified"
    const cur = currency || "CAD"
    const locale = cur === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    if (max) return `Up to ${formatter.format(max)}`
    return "Not specified"
  }

  const handleSave = async () => {
    if (!job) return
    if (Object.keys(editData).length === 0) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      const updatedJob = await updateJob(job.job_id, editData)
      setJob(prev => prev ? { ...prev, ...updatedJob } : updatedJob)
      setEditData({})
      setIsEditing(false)
      toast.success("Job updated successfully")
    } catch (err: unknown) {
      const message = (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string")
        ? (err as { message: string }).message
        : "Failed to save job"
      console.error("Failed to save job:", message, err)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({})
    setIsEditing(false)
  }

  const handlePublish = async () => {
    if (!job) return
    setIsSaving(true)
    try {
      const options: { scheduled_publish_at?: string } = {}
      if (publishMode === "schedule" && scheduleDate) {
        options.scheduled_publish_at = scheduleDate.toISOString()
      }
      const updatedJob = await publishJob(job.job_id, options)
      setJob(prev => prev ? { ...prev, ...updatedJob } : updatedJob)
      setPublishDialogOpen(false)
      setPublishMode("now")
      setScheduleDate(undefined)
      refreshEntitlements()
      toast.success(publishMode === "schedule" ? "Job scheduled for publishing" : "Job published successfully")
    } catch (err: unknown) {
      const message = (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string")
        ? (err as { message: string }).message
        : "Failed to publish job"
      console.error("Failed to publish job:", message, err)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePauseResume = async () => {
    if (!job) return
    setIsSaving(true)
    try {
      const updatedJob = job.status === "published"
        ? await pauseJob(job.job_id)
        : await resumeJob(job.job_id)
      setJob(prev => prev ? { ...prev, ...updatedJob } : updatedJob)
      setPauseDialogOpen(false)
    } catch (err) {
      console.error("Failed to update job status:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!job) return
    try {
      const newJob = await duplicateJob(job.job_id)
      router.push(`/company/jobs/${newJob.job_id}`)
    } catch (err) {
      console.error("Failed to duplicate job:", err)
    }
  }

  const handleDelete = async () => {
    if (!job) return
    setIsSaving(true)
    try {
      await deleteJob(job.job_id)
      router.push("/company/jobs")
    } catch (err) {
      console.error("Failed to delete job:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExtend = async () => {
    if (!job) return
    setIsSaving(true)
    try {
      const updatedJob = await extendJob(job.job_id, extendDays)
      setJob(prev => prev ? { ...prev, ...updatedJob } : updatedJob)
      setExtendDialogOpen(false)
    } catch (err) {
      console.error("Failed to extend job:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleFeatured = async () => {
    if (!job) return
    setIsSaving(true)
    try {
      const updatedJob = await toggleFeatured(job.job_id)
      setJob(prev => prev ? { ...prev, ...updatedJob } : updatedJob)
      if (!job.is_featured) {
        refreshEntitlements()
      }
    } catch (err) {
      console.error("Failed to toggle featured:", err)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to get current value (edited or original)
  const getValue = <K extends keyof Job>(key: K): Job[K] => {
    if (key in editData) return editData[key as keyof UpdateJobData] as Job[K]
    return job?.[key] as Job[K]
  }

  // Helper to update edit data
  const updateField = <K extends keyof UpdateJobData>(key: K, value: UpdateJobData[K]) => {
    setEditData(prev => ({ ...prev, [key]: value }))
  }

  const getStatusBadge = (status: JobStatus) => {
    const style = JOB_STATUS_STYLES[status]
    return (
      <Badge variant="outline" className={cn("text-xs", style?.className)}>
        {style?.label ?? status}
      </Badge>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="h-4 w-48 bg-background-secondary rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-background-secondary rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-background-secondary rounded animate-pulse mb-8" />
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-background-secondary rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !job) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load job</h2>
          <p className="text-foreground-muted mb-6">{error || "Job not found"}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/company/jobs")}>
              Back to Jobs
            </Button>
            <Button onClick={fetchJob}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/company/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-foreground">{job.title}</span>
        </nav>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{job.title}</h1>
              {getStatusBadge(job.status)}
              {job.is_featured && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span className="font-mono">{job.job_id || `JOB-${job.id}`}</span>
              <span>·</span>
              <span>{(job.views ?? 0).toLocaleString()} views</span>
              <span>·</span>
              <span>{job.applications_count ?? 0} applications</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
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
                  {isSaving ? "Saving..." : "Save as Draft"}
                </Button>
                {job.status === "draft" && (
                  <Button
                    onClick={async () => {
                      await handleSave()
                      setPublishDialogOpen(true)
                    }}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    Save & Publish
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
                    onClick={() => setPublishDialogOpen(true)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    Publish
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

                {/* Share Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-transparent">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleShareSocial("linkedin")}>
                      <svg className="w-4 h-4 mr-2 text-social-linkedin" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      Share on LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareSocial("twitter")}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Share on X
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareSocial("facebook")}>
                      <svg className="w-4 h-4 mr-2 text-social-facebook" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Share on Facebook
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More Actions Dropdown */}
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
                      <Link href={`/jobs/${job.job_id}`} target="_blank">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </Link>
                    </DropdownMenuItem>
                    {(job.status === "published" || job.status === "paused") && (
                      <DropdownMenuItem onClick={() => setPauseDialogOpen(true)}>
                        {job.status === "published" ? (
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
                    )}
                    {job.status === "published" && (
                      <DropdownMenuItem onClick={() => setExtendDialogOpen(true)}>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Extend Duration
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleToggleFeatured}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {job.is_featured ? "Remove Featured" : "Make Featured"}
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
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                      value={getValue("title")}
                      onChange={(e) => updateField("title", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select
                      value={getValue("employment_type")}
                      onValueChange={(value) => updateField("employment_type", value as Job["employment_type"])}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Experience Level</Label>
                    <Select
                      value={getValue("experience_level")}
                      onValueChange={(value) => updateField("experience_level", value as Job["experience_level"])}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="mid">Mid Level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead / Manager</SelectItem>
                        <SelectItem value="executive">Director / Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <Select
                      value={getValue("location_type")}
                      onValueChange={(value) => updateField("location_type", value as Job["location_type"])}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">On-site</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    {categories.length > 0 ? (
                      <Select
                        value={
                          editData.category !== undefined
                            ? editData.category
                            : (job?.category ?? "")
                        }
                        onValueChange={(value) => updateField("category", value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={job?.category ?? ""}
                        disabled
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={getValue("description")}
                    onChange={(e) => updateField("description", e.target.value)}
                    disabled={!isEditing}
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsibilities (one per line)</Label>
                  <Textarea
                    value={(getValue("responsibilities") || []).join("\n")}
                    onChange={(e) => updateField("responsibilities", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Enter each responsibility on a new line"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Requirements (one per line)</Label>
                  <Textarea
                    value={(getValue("requirements") || []).join("\n")}
                    onChange={(e) => updateField("requirements", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Enter each requirement on a new line"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nice to Have (one per line)</Label>
                  <Textarea
                    value={(getValue("nice_to_have") || []).join("\n")}
                    onChange={(e) => updateField("nice_to_have", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Enter each nice-to-have qualification on a new line"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input
                    value={(getValue("skills") || []).join(", ")}
                    onChange={(e) => updateField("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Benefits (comma-separated)</Label>
                  <Input
                    value={(getValue("benefits") || []).join(", ")}
                    onChange={(e) => updateField("benefits", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Application Method Card */}
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Application Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apply Method</Label>
                    <Select
                      value={getValue("apply_method") || "internal"}
                      onValueChange={(value) => updateField("apply_method", value as Job["apply_method"])}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal (On Platform)</SelectItem>
                        <SelectItem value="email">Via Email</SelectItem>
                        <SelectItem value="external">External URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(getValue("apply_method") === "email") && (
                    <div className="space-y-2">
                      <Label>Application Email</Label>
                      <Input
                        type="email"
                        value={getValue("apply_email") || ""}
                        onChange={(e) => updateField("apply_email", e.target.value || undefined)}
                        disabled={!isEditing}
                        placeholder="applications@company.com"
                      />
                    </div>
                  )}
                  {(getValue("apply_method") === "external") && (
                    <div className="space-y-2">
                      <Label>Application URL</Label>
                      <Input
                        type="url"
                        value={getValue("apply_url") || ""}
                        onChange={(e) => updateField("apply_url", e.target.value || undefined)}
                        disabled={!isEditing}
                        placeholder="https://careers.company.com/apply"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Application Instructions</Label>
                  <Textarea
                    value={getValue("apply_instructions") || ""}
                    onChange={(e) => updateField("apply_instructions", e.target.value || undefined)}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Any special instructions for applicants..."
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
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={getValue("address") || ""}
                    onChange={(e) => updateField("address", e.target.value || undefined)}
                    disabled={!isEditing}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={getValue("city") || ""}
                      onChange={(e) => updateField("city", e.target.value || undefined)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province</Label>
                    <Input
                      value={getValue("state") || ""}
                      onChange={(e) => updateField("state", e.target.value || undefined)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={getValue("country")}
                      onChange={(e) => updateField("country", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={getValue("postal_code") || ""}
                      onChange={(e) => updateField("postal_code", e.target.value || undefined)}
                      disabled={!isEditing}
                      placeholder="A1A 1A1"
                    />
                  </div>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Salary</Label>
                    <Input
                      type="number"
                      value={getValue("salary_min") || ""}
                      onChange={(e) => updateField("salary_min", e.target.value ? parseInt(e.target.value) : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Salary</Label>
                    <Input
                      type="number"
                      value={getValue("salary_max") || ""}
                      onChange={(e) => updateField("salary_max", e.target.value ? parseInt(e.target.value) : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={getValue("salary_currency")}
                      onValueChange={(value) => updateField("salary_currency", value)}
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
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Select
                      value={getValue("salary_period")}
                      onValueChange={(value) => updateField("salary_period", value as Job["salary_period"])}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Hourly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isEditing && (
                  <p className="text-lg font-semibold text-foreground">
                    {formatSalary(job.salary_min, job.salary_max, job.salary_currency)} / {job.salary_period}
                  </p>
                )}
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
                  metaTitle={getValue("meta_title") || ""}
                  metaDescription={getValue("meta_description") || ""}
                  onMetaTitleChange={(value) => updateField("meta_title", value)}
                  onMetaDescriptionChange={(value) => updateField("meta_description", value)}
                  defaultOpen
                />
                {Object.keys(editData).some(k => k === "meta_title" || k === "meta_description") && (
                  <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const seoData: UpdateJobData = {}
                          if ("meta_title" in editData) seoData.meta_title = editData.meta_title
                          if ("meta_description" in editData) seoData.meta_description = editData.meta_description
                          const updated = await updateJob(job.job_id, seoData)
                          setJob(prev => prev ? { ...prev, ...updated } : updated)
                          setEditData((prev) => {
                            const next = { ...prev }
                            delete next.meta_title
                            delete next.meta_description
                            return next
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

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Applications</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">
                    {job.applications_count ?? 0} total application{(job.applications_count ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link href={`/company/applications?job=${job.job_id}`}>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {applicationsLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-background-secondary animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-background-secondary rounded animate-pulse" />
                          <div className="h-3 w-24 bg-background-secondary rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : applications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-background-secondary/30">
                          <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Candidate</th>
                          <th className="text-center text-xs font-medium text-foreground-muted px-4 py-3">Status</th>
                          <th className="text-center text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Rating</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Applied</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {applications.map((app) => (
                          <tr key={app.id} className="hover:bg-background-secondary/30 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  name={app.candidate_name}
                                  size="xs"
                                />
                                <div>
                                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {app.candidate_name}
                                  </p>
                                  <p className="text-xs text-foreground-muted">{app.candidate_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ApplicationStatusBadge status={app.status} />
                            </td>
                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                              {app.rating ? (
                                <div className="flex items-center justify-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className={cn(
                                        "w-3.5 h-3.5",
                                        star <= (app.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-foreground-muted/30"
                                      )}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-foreground-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-foreground-muted hidden sm:table-cell">
                              {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/company/applications?job=${job.job_id}&id=${app.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">
                                  Review
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1">No applications yet</h3>
                    <p className="text-sm text-foreground-muted">Applications will appear here when candidates apply</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">
                    Views and applications over time
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-background-secondary/50 rounded-lg p-1">
                  {(["7d", "30d", "90d"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setAnalyticsPeriod(period)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                        analyticsPeriod === period
                          ? "bg-background text-foreground shadow-sm"
                          : "text-foreground-muted hover:text-foreground"
                      )}
                    >
                      {period === "7d" ? "7 days" : period === "30d" ? "30 days" : "90 days"}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-64 bg-background-secondary/30 rounded-lg animate-pulse" />
                ) : analytics.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-background-secondary/30">
                        <p className="text-2xl font-bold text-foreground">
                          {analytics.reduce((sum, d) => sum + d.views, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">Total Views</p>
                      </div>
                      <div className="p-4 rounded-lg bg-background-secondary/30">
                        <p className="text-2xl font-bold text-foreground">
                          {analytics.reduce((sum, d) => sum + (d.unique_views || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">Unique Views</p>
                      </div>
                      <div className="p-4 rounded-lg bg-background-secondary/30">
                        <p className="text-2xl font-bold text-foreground">
                          {analytics.reduce((sum, d) => sum + d.applications, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">Applications</p>
                      </div>
                    </div>

                    {/* Simple bar visualization */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-foreground-muted mb-3">
                        <span>Daily Views</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-primary/60" />
                            <span>Views</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                            <span>Applications</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end gap-px h-32">
                        {analytics.map((point, i) => {
                          const maxViews = Math.max(...analytics.map(d => d.views), 1)
                          const viewsHeight = (point.views / maxViews) * 100
                          const appsHeight = (point.applications / maxViews) * 100
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-px justify-end h-full group relative">
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {point.views}v / {point.applications}a
                              </div>
                              <div
                                className="w-full bg-primary/60 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(viewsHeight, 2)}%` }}
                              />
                              {point.applications > 0 && (
                                <div
                                  className="w-full bg-emerald-500/60 rounded-t-sm"
                                  style={{ height: `${Math.max(appsHeight, 2)}%` }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-foreground-muted pt-1">
                        <span>{analytics.length > 0 ? new Date(analytics[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                        <span>{analytics.length > 0 ? new Date(analytics[analytics.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    {(() => {
                      const totalViews = analytics.reduce((sum, d) => sum + d.views, 0)
                      const totalApps = analytics.reduce((sum, d) => sum + d.applications, 0)
                      const conversionRate = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : "0.0"
                      return (
                        <div className="p-4 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Conversion Rate</p>
                              <p className="text-xs text-foreground-muted mt-0.5">Views to applications</p>
                            </div>
                            <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1">No analytics data yet</h3>
                    <p className="text-sm text-foreground-muted">Data will appear once your job starts receiving views</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={(open) => {
        setPublishDialogOpen(open)
        if (!open) {
          setPublishMode("now")
          setScheduleDate(undefined)
        }
      }}>
        <DialogContent>
          <div ref={publishDialogRef}>
          <DialogHeader>
            <DialogTitle>Publish Job</DialogTitle>
            <DialogDescription>
              This will use 1 job credit. Choose when to make your job publicly visible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-background-secondary/50">
              <p className="font-medium text-foreground">{job.title}</p>
              <p className="text-sm text-foreground-muted mt-1">
                {job.city ? `${job.city}, ${job.state}` : job.location_type === "remote" ? "Remote" : "Not specified"}
              </p>
            </div>

            <RadioGroup
              value={publishMode}
              onValueChange={(v) => setPublishMode(v as "now" | "schedule")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="now" id="pub-now" />
                <Label htmlFor="pub-now" className="font-normal cursor-pointer">
                  Publish now
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="schedule" id="pub-schedule" />
                <Label htmlFor="pub-schedule" className="font-normal cursor-pointer">
                  Schedule for later
                </Label>
              </div>
            </RadioGroup>

            {publishMode === "schedule" && (
              <div className="pl-7">
                <DatePicker
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  container={publishDialogRef.current}
                  placeholder="Select publish date"
                  disabled={(date) => {
                    const now = new Date()
                    now.setHours(0, 0, 0, 0)
                    return date <= now
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSaving || (publishMode === "schedule" && !scheduleDate)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSaving
                ? (publishMode === "schedule" ? "Scheduling..." : "Publishing...")
                : (publishMode === "schedule" ? "Schedule (1 Credit)" : "Publish (1 Credit)")
              }
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
              {isSaving ? "Deleting..." : "Delete Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause/Resume Confirmation Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {job.status === "published" ? "Pause Job Posting" : "Resume Job Posting"}
            </DialogTitle>
            <DialogDescription>
              {job.status === "published"
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
              className={job.status === "published"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary hover:bg-primary-hover text-primary-foreground"
              }
            >
              {isSaving ? "Updating..." : job.status === "published" ? "Pause Job" : "Resume Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Duration Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Job Duration</DialogTitle>
            <DialogDescription>
              Extend your published job listing. This will consume one job post credit. The new expiration will be calculated from today.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setExtendDays(days)}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-colors",
                  extendDays === days
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{days} days</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {days === 7 ? "Quick extension" : days === 14 ? "Standard extension" : "Full month"}
                    </p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    extendDays === days ? "border-primary" : "border-foreground-muted/30"
                  )}>
                    {extendDays === days && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleExtend}
              disabled={isSaving}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSaving ? "Extending..." : `Extend ${extendDays} Days`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    pending: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    reviewing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    shortlisted: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    interviewed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    offered: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    hired: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    withdrawn: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  }
  const labels: Record<ApplicationStatus, string> = {
    pending: "Pending",
    reviewing: "Reviewing",
    shortlisted: "Shortlisted",
    interviewed: "Interviewed",
    offered: "Offered",
    hired: "Hired",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  }
  return (
    <Badge variant="outline" className={cn("text-xs", styles[status])}>
      {labels[status]}
    </Badge>
  )
}

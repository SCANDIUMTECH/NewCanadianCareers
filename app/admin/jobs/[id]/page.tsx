"use client"

import { Suspense, useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"

import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  Mail,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  Star,
  Trash2,
  Users,
  TrendingUp,
  CalendarPlus,
  FileText,
  Activity,
  AlertTriangle,
  Globe,
  Briefcase,
  Loader2,
  RefreshCw,
  X,
  CreditCard,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, getCompanyInitials } from "@/lib/utils"
import { toast } from "sonner"
import {
  getAdminJob,
  updateAdminJob,
  deleteAdminJob,
  approveJob,
  rejectJob,
  pauseJob,
  resumeJob,
  hideJob,
  toggleJobFeatured,
  extendJobExpiration,
  getJobReports,
  dismissJobReport,
  actionJobReport,
  contactJobPoster,
} from "@/lib/api/admin-jobs"
import { SEOFields } from "@/components/ai/seo-fields"
import { SocialContentGenerator } from "@/components/ai/social-content-generator"
import type {
  AdminJobDetail,
  AdminJobApplicant,
  AdminJobReport,
  AdminJobActivity,
  AdminJobStatus,
} from "@/lib/admin/types"

const JobPerformanceChart = dynamic(() => import("@/components/charts/job-performance-chart"), { ssr: false })

// Category slug → human-readable label mapping
const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  customer_support: "Customer Support",
  finance: "Finance",
  hr: "Human Resources",
  operations: "Operations",
  product: "Product",
  data: "Data & Analytics",
  legal: "Legal",
  other: "Other",
}

function formatCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] || slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// UI display type for job
interface JobDisplay {
  id: string
  jobId: string
  title: string
  description: string
  requirements: string[]
  company: {
    id: string
    name: string
    logo: string | null
    verified: boolean
    initials: string
  }
  agency: { id: string; name: string; allowBackdatePosting: boolean } | null
  status: AdminJobStatus
  locationType: "remote" | "onsite" | "hybrid"
  location: string
  salary: { min: number; max: number; currency: string } | null
  applyMode: "direct" | "external"
  externalUrl: string | null
  createdAt: string
  postedAt: string
  expiresAt: string
  views: number
  applications: number
  reportCount: number
  featured: boolean
  category: string
  createdBy: string
  lastModified: string
  meta_title: string
  meta_description: string
}

// Transform API data to display format
function transformJobToDisplay(job: AdminJobDetail): JobDisplay {
  return {
    id: String(job.id),
    jobId: job.job_id,
    title: job.title,
    description: job.description,
    requirements: job.requirements || [],
    company: {
      id: String(job.company.id),
      name: job.company.name,
      logo: job.company.logo,
      verified: job.company.verified,
      initials: getCompanyInitials(job.company.name),
    },
    agency: job.agency ? {
      id: String(job.agency.id),
      name: job.agency.name,
      allowBackdatePosting: job.agency.allow_backdate_posting ?? false,
    } : null,
    status: job.status,
    locationType: job.location_type,
    location: job.location,
    salary: job.salary_min && job.salary_max ? {
      min: job.salary_min,
      max: job.salary_max,
      currency: job.salary_currency || "CAD",
    } : null,
    applyMode: job.apply_mode,
    externalUrl: job.external_url,
    createdAt: job.created_at,
    postedAt: job.posted_at ?? job.created_at,
    expiresAt: job.expires_at,
    views: job.views,
    applications: job.applications,
    reportCount: job.report_count,
    featured: job.featured,
    category: job.category,
    createdBy: job.created_by?.email || "Unknown",
    lastModified: job.updated_at || job.created_at,
    meta_title: job.meta_title || "",
    meta_description: job.meta_description || "",
  }
}

// Transform API applicants to display format
function transformApplicants(applicants: AdminJobApplicant[]) {
  return applicants.map((app) => ({
    id: String(app.id),
    name: app.candidate.full_name,
    email: app.candidate.email,
    appliedAt: app.applied_at,
    status: app.status,
    resume: !!app.resume_url,
  }))
}

// Transform API reports to display format
function transformReports(reports: AdminJobReport[]) {
  return reports.map((report) => ({
    id: String(report.id),
    reason: report.reason,
    reporter: report.reporter,
    date: report.reported_at,
    status: report.status,
  }))
}

// Transform API activity to display format
function transformActivity(activity: AdminJobActivity[]) {
  return activity.map((act) => ({
    id: String(act.id),
    action: act.action,
    user: act.actor,
    date: act.timestamp,
    details: act.details,
  }))
}

// Status config
const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending_payment: { label: "Pending Payment", color: "bg-orange-100 text-orange-700", icon: CreditCard },
  scheduled: { label: "Scheduled", color: "bg-primary/10 text-primary", icon: Clock },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: Check },
  paused: { label: "Paused", color: "bg-sky/10 text-sky", icon: Pause },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-600", icon: Clock },
  filled: { label: "Filled", color: "bg-teal-100 text-teal-700", icon: CheckCircle },
  hidden: { label: "Hidden", color: "bg-red-100 text-red-700", icon: EyeOff },
}

export default function AdminJobDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminJobDetailContent />
    </Suspense>
  )
}

function AdminJobDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get("edit") === "true"
  const jobId = params.id as string

  // Data state
  const [job, setJob] = useState<JobDisplay | null>(null)
  const [applications, setApplications] = useState<ReturnType<typeof transformApplicants>>([])
  const [reports, setReports] = useState<ReturnType<typeof transformReports>>([])
  const [activity, setActivity] = useState<ReturnType<typeof transformActivity>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isEditing, setIsEditing] = useState(isEditMode)

  // Dialog states
  const [hideDialogOpen, setHideDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveDateOption, setApproveDateOption] = useState<"created" | "submitted" | "today" | "custom">("today")
  const [approveCustomDate, setApproveCustomDate] = useState<Date | undefined>()
  const approveDialogRef = useRef<HTMLDivElement>(null)

  // Form states
  const [hideReason, setHideReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [contactSubject, setContactSubject] = useState("")
  const [contactMessage, setContactMessage] = useState("")
  const [newExpirationDate, setNewExpirationDate] = useState("")
  const [extendReason, setExtendReason] = useState("")

  // Fetch job data
  const fetchJob = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const jobData = await getAdminJob(jobId)
      setJob(transformJobToDisplay(jobData))
      setApplications(transformApplicants(jobData.applicants || []))
      setReports(transformReports(jobData.reports || []))
      setActivity(transformActivity(jobData.activity || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job")
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading job details...</p>
      </div>
    )
  }

  // Error state
  if (error && !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Failed to load job</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchJob} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    )
  }

  if (!job) return null

  const status = statusConfig[job.status] || statusConfig.draft
  const StatusIcon = status.icon

  // Format salary
  const formatSalary = () => {
    if (!job.salary) return "Not specified"
    const cur = job.salary.currency || "CAD"
    const locale = cur === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(job.salary.min)} - ${formatter.format(job.salary.max)}`
  }

  // Calculate days active
  const daysActive = Math.floor(
    (new Date().getTime() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate conversion rate
  const conversionRate = (job.views ?? 0) > 0 ? (((job.applications ?? 0) / job.views) * 100).toFixed(1) : "0"

  const handleSave = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await updateAdminJob(job.id, {
        title: job.title,
        category: job.category,
        location: job.location,
        location_type: job.locationType,
        featured: job.featured,
        posted_at: job.postedAt,
        expires_at: job.expiresAt,
      })
      setIsEditing(false)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveWithDate = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      let postedAt: string | undefined
      switch (approveDateOption) {
        case "created":
          postedAt = job.createdAt
          break
        case "submitted":
          postedAt = job.postedAt || job.createdAt
          break
        case "today":
          postedAt = undefined // Backend defaults to timezone.now()
          break
        case "custom":
          postedAt = approveCustomDate?.toISOString()
          break
      }
      await approveJob(job.id, { posted_at: postedAt })
      setApproveDialogOpen(false)
      setApproveDateOption("today")
      setApproveCustomDate(undefined)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!job || !rejectReason.trim()) return
    try {
      setIsSubmitting(true)
      await rejectJob(job.id, { reason: rejectReason })
      setRejectDialogOpen(false)
      setRejectReason("")
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePause = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await pauseJob(job.id)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResume = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await resumeJob(job.id)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHide = async () => {
    if (!job || !hideReason.trim()) return
    try {
      setIsSubmitting(true)
      await hideJob(job.id, hideReason)
      setHideDialogOpen(false)
      setHideReason("")
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hide job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await deleteAdminJob(job.id)
      setDeleteDialogOpen(false)
      router.push("/admin/jobs")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job")
      setIsSubmitting(false)
    }
  }

  const handleContact = async () => {
    if (!job || !contactSubject.trim() || !contactMessage.trim()) return
    try {
      setIsSubmitting(true)
      await contactJobPoster(job.id, {
        subject: contactSubject,
        message: contactMessage,
      })
      setContactDialogOpen(false)
      setContactSubject("")
      setContactMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExtendExpiration = async () => {
    if (!job || !newExpirationDate) return
    try {
      setIsSubmitting(true)
      await extendJobExpiration(job.id, {
        expires_at: newExpirationDate,
        reason: extendReason || undefined,
      })
      setExtendDialogOpen(false)
      setNewExpirationDate("")
      setExtendReason("")
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend expiration")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleFeatured = async () => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await toggleJobFeatured(job.id)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle featured")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismissReport = async (reportId: string) => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await dismissJobReport(job.id, reportId)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss report")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActionReport = async (reportId: string, action: "hide" | "delete") => {
    if (!job) return
    try {
      setIsSubmitting(true)
      await actionJobReport(job.id, reportId, action)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to take action on report")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/jobs" className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Jobs
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[300px]">{job.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{job.title}</h1>
              {job.featured && (
                <Badge className="bg-amber-100 text-amber-700 gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Featured
                </Badge>
              )}
              <Badge className={cn("gap-1", status.color)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Link href={`/admin/companies/${job.company.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Building2 className="w-4 h-4" />
                {job.company.name}
                {job.company.verified && <Check className="w-3 h-3 text-emerald-500" />}
              </Link>
              {job.agency && (
                <Link href={`/admin/agencies/${job.agency.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Users className="w-4 h-4" />
                  via {job.agency.name}
                </Link>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Posted {new Date(job.postedAt).toLocaleDateString()}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{job.jobId}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </Button>
              {(job.status === "draft" || job.status === "pending") && (
                <Button
                  onClick={async () => {
                    await handleSave()
                    setApproveDialogOpen(true)
                  }}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save & Publish
                </Button>
              )}
              {job.status !== "draft" && job.status !== "pending" && (
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" onClick={() => setExtendDialogOpen(true)}>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Extend
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isSubmitting}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleFeatured} disabled={isSubmitting}>
                    <Star className={cn("w-4 h-4 mr-2", job.featured && "fill-amber-500 text-amber-500")} />
                    {job.featured ? "Remove Featured" : "Mark as Featured"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(job.status === "pending" || job.status === "draft") && (
                    <>
                      <DropdownMenuItem onClick={() => setApproveDialogOpen(true)} disabled={isSubmitting}>
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Publish
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRejectDialogOpen(true)} className="text-red-600">
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                  {job.status === "published" && (
                    <DropdownMenuItem onClick={handlePause} disabled={isSubmitting}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Job
                    </DropdownMenuItem>
                  )}
                  {job.status === "paused" && (
                    <DropdownMenuItem onClick={handleResume} disabled={isSubmitting}>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Job
                    </DropdownMenuItem>
                  )}
                  {job.status !== "hidden" && (
                    <DropdownMenuItem onClick={() => setHideDialogOpen(true)} className="text-amber-600">
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Job
                    </DropdownMenuItem>
                  )}
                  {job.status === "hidden" && (
                    <DropdownMenuItem onClick={handleResume} disabled={isSubmitting} className="text-emerald-600">
                      <Eye className="w-4 h-4 mr-2" />
                      Unhide Job
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Job
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Performance Overview */}
      <JobPerformanceChart
        jobId={job.jobId}
        views={job.views}
        applications={job.applications}
        reportCount={job.reportCount}
        conversionRate={conversionRate}
        daysActive={daysActive}
        category={job.category}
        createdBy={job.createdBy}
        lastModified={job.lastModified}
      />

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="applications">
            Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">
            Reports ({reports.length})
            {reports.filter(r => r.status === "pending").length > 0 && (
              <span className="ml-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Job Information</CardTitle>
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
                    <Label>Category</Label>
                    <Select
                      value={job.category}
                      onValueChange={(value) => setJob({ ...job, category: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={job.location}
                      onChange={(e) => setJob({ ...job, location: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <Select
                      value={job.locationType}
                      onValueChange={(value: "remote" | "onsite" | "hybrid") => setJob({ ...job, locationType: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
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
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Featured Job</Label>
                      <p className="text-sm text-muted-foreground">Show in featured listings</p>
                    </div>
                    <Switch
                      checked={job.featured}
                      onCheckedChange={(checked) => setJob({ ...job, featured: checked })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Apply Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        {job.applyMode === "direct" ? "Direct apply on platform" : "External URL"}
                      </p>
                    </div>
                    {job.applyMode === "external" && job.externalUrl && (
                      <a
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Salary Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">Salary</CardTitle>
                </CardHeader>
                <CardContent>
                  {job.salary ? (
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{formatSalary()}</p>
                      <p className="text-xs text-muted-foreground">per year</p>
                      {isEditing && (
                        <div className="grid grid-cols-2 gap-2 pt-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Min</Label>
                            <Input
                              type="number"
                              value={job.salary.min}
                              onChange={(e) => setJob({
                                ...job,
                                salary: { ...job.salary!, min: parseInt(e.target.value) || 0 }
                              })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max</Label>
                            <Input
                              type="number"
                              value={job.salary.max}
                              onChange={(e) => setJob({
                                ...job,
                                salary: { ...job.salary!, max: parseInt(e.target.value) || 0 }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </CardContent>
              </Card>

              {/* Dates Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Posted</span>
                    {isEditing ? (
                      <DatePicker
                        className="w-48"
                        value={job.postedAt ? new Date(job.postedAt) : undefined}
                        onChange={(date) => {
                          if (date) setJob({ ...job, postedAt: date.toISOString() })
                        }}
                        placeholder="Select date"
                        disabled={(date) => {
                          const now = new Date()
                          now.setHours(23, 59, 59, 999)
                          return date > now
                        }}
                      />
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : "Not published"}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expires</span>
                    {isEditing ? (
                      <DatePicker
                        className="w-48"
                        value={job.expiresAt ? new Date(job.expiresAt) : undefined}
                        onChange={(date) => {
                          if (date) setJob({ ...job, expiresAt: date.toISOString() })
                        }}
                        placeholder="Select expiry date"
                        disabled={(date) => {
                          const now = new Date()
                          now.setHours(0, 0, 0, 0)
                          return date < now
                        }}
                      />
                    ) : (
                      <span className="text-sm font-medium text-foreground">{new Date(job.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Company Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">Posted By</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/admin/companies/${job.company.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors -mx-2.5"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {job.company.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-foreground truncate">{job.company.name}</p>
                        {job.company.verified && (
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">View company profile</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">SEO Optimization</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage search engine meta tags for this job listing
              </p>
            </CardHeader>
            <CardContent>
              <SEOFields
                jobId={jobId}
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
                        await updateAdminJob(jobId, {
                          meta_title: job.meta_title,
                          meta_description: job.meta_description,
                        })
                        toast.success("SEO settings saved")
                      } catch {
                        toast.error("Failed to save SEO settings")
                      }
                    }}
                  >
                    Save SEO Settings
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Content Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">AI Social Content</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate platform-specific social media posts for this job
              </p>
            </CardHeader>
            <CardContent>
              <SocialContentGenerator
                jobId={jobId}
                createPosts
                onContentGenerated={() => {
                  toast.success("Social content generated and saved")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Applications</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {applications.length} total applications
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {job.applyMode === "external" ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>This job uses external application.</p>
                  <p className="text-sm">Applications are tracked on the external platform.</p>
                  {job.externalUrl && (
                    <a
                      href={job.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View external page <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No applications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {app.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{app.name}</p>
                          <p className="text-sm text-muted-foreground">{app.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge
                            className={cn(
                              "text-xs",
                              app.status === "new" && "bg-sky/10 text-sky",
                              app.status === "reviewing" && "bg-amber-100 text-amber-700",
                              app.status === "shortlisted" && "bg-emerald-100 text-emerald-700",
                              app.status === "rejected" && "bg-gray-100 text-gray-700"
                            )}
                          >
                            {app.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(app.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics chart would go here</p>
                    <p className="text-sm">Showing views over the past 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Application Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Application trend chart would go here</p>
                    <p className="text-sm">Showing applications over time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-semibold">{(job.views ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                  <p className="text-2xl font-semibold">{job.applications}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-semibold text-emerald-600">{conversionRate}%</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Daily Views</p>
                  <p className="text-2xl font-semibold">
                    {daysActive > 0 ? Math.round(job.views / daysActive) : job.views}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Moderation Reports</CardTitle>
                <Badge variant="outline" className={cn(
                  reports.filter(r => r.status === "pending").length > 0
                    ? "border-red-200 text-red-700"
                    : "border-gray-200 text-gray-700"
                )}>
                  {reports.filter(r => r.status === "pending").length} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="w-12 h-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                  <p>No reports for this job</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <p className="font-medium text-foreground">{report.reason}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>Reported by: {report.reporter}</span>
                            <span>·</span>
                            <span>{new Date(report.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className={cn(
                          "text-xs",
                          report.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {report.status}
                        </Badge>
                      </div>
                      {report.status === "pending" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissReport(report.id)}
                            disabled={isSubmitting}
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleActionReport(report.id, "hide")}
                            disabled={isSubmitting}
                          >
                            Take Action
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                {activity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity recorded</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activity.map((act, index) => (
                      <div key={act.id} className="flex gap-4 relative">
                        {/* Timeline dot */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                          index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Activity className="w-4 h-4" />
                        </div>

                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium text-foreground">{act.action}</p>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {act.date}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{act.user}</p>
                          {act.details && (
                            <p className="text-sm text-muted-foreground mt-1">{act.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job</DialogTitle>
            <DialogDescription>
              Reject &quot;{job.title}&quot;. The job poster will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for rejection <span className="text-red-500">*</span></Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejecting this job..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">
              The job poster will receive an email with the rejection reason.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim() || isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hide Dialog */}
      <Dialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Job</DialogTitle>
            <DialogDescription>
              Hide &quot;{job.title}&quot; from public view. This can be reversed later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hide-reason">Reason for hiding <span className="text-red-500">*</span></Label>
              <Textarea
                id="hide-reason"
                placeholder="Enter the reason for hiding this job..."
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              Hiding this job will remove it from all public listings. The company will be notified.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleHide}
              disabled={!hideReason.trim() || isSubmitting}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hiding...
                </>
              ) : (
                "Hide Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{job.title}&quot;?
              This action cannot be undone. All applications and data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Poster Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={(open) => {
        setContactDialogOpen(open)
        if (!open) {
          setContactSubject("")
          setContactMessage("")
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Job Poster</DialogTitle>
            <DialogDescription>
              Send a message to {job.company.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">Regarding: </span>
                <span className="font-medium">{job.title}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject <span className="text-red-500">*</span></Label>
              <Input
                id="contact-subject"
                placeholder="Enter subject line..."
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="contact-message"
                placeholder="Enter your message..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleContact}
              disabled={!contactSubject.trim() || !contactMessage.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Expiration Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Job Expiration</DialogTitle>
            <DialogDescription>
              Extend the expiration date for &quot;{job.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Expiration</span>
                <span className="font-medium">{new Date(job.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-expiration">New Expiration Date <span className="text-red-500">*</span></Label>
              <Input
                id="new-expiration"
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extend-reason">Reason (optional)</Label>
              <Textarea
                id="extend-reason"
                placeholder="Enter reason for extending expiration..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendExpiration} disabled={!newExpirationDate || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Extend Expiration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve & Publish Dialog */}
      {job && (
        <Dialog open={approveDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setApproveDialogOpen(false)
            setApproveDateOption("today")
            setApproveCustomDate(undefined)
          }
        }}>
          <DialogContent>
            <div ref={approveDialogRef}>
              <DialogHeader>
                <DialogTitle>Approve & Publish</DialogTitle>
                <DialogDescription>
                  Choose when this job should appear as posted.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company.name}</p>
                </div>

                <RadioGroup
                  value={approveDateOption}
                  onValueChange={v => setApproveDateOption(v as "created" | "submitted" | "today" | "custom")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="created" id="detail-opt-created" />
                    <Label htmlFor="detail-opt-created" className="font-normal cursor-pointer">
                      Created date ({new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                    </Label>
                  </div>
                  {job.postedAt && job.postedAt !== job.createdAt && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="submitted" id="detail-opt-submitted" />
                      <Label htmlFor="detail-opt-submitted" className="font-normal cursor-pointer">
                        Submitted date ({new Date(job.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="today" id="detail-opt-today" />
                    <Label htmlFor="detail-opt-today" className="font-normal cursor-pointer">
                      Today (now)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="detail-opt-custom" />
                    <Label htmlFor="detail-opt-custom" className="font-normal cursor-pointer">
                      Custom date
                    </Label>
                  </div>
                </RadioGroup>

                {approveDateOption === "custom" && (
                  <div className="pl-6">
                    <DatePicker
                      value={approveCustomDate}
                      onChange={setApproveCustomDate}
                      container={approveDialogRef.current}
                      placeholder="Select publish date"
                      disabled={(date) => {
                        const now = new Date()
                        now.setHours(23, 59, 59, 999)
                        return date > now
                      }}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveWithDate}
                  disabled={isSubmitting || (approveDateOption === "custom" && !approveCustomDate)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Approve & Publish
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

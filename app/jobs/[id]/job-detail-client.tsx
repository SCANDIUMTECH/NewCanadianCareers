"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn, isSafeExternalUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { BannerSlot } from "@/components/banners/banner-slot"
import { AffiliateSlot } from "@/components/affiliates/affiliate-slot"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/hooks/use-auth"
import { saveJob, unsaveJob, getSavedJobs, applyToJob } from "@/lib/api/candidates"
import { reportJob } from "@/lib/api/public"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"

interface JobDetailClientProps {
  job: {
    id: string
    jobId?: string
    title: string
    company: {
      name: string
      logo: string | null
      verified: boolean
      website: string
      industry: string
      size: string
      description: string
    }
    location: {
      city: string
      state: string
      country: string
      remote: "hybrid" | "remote" | "onsite"
    }
    type: string
    experience: string
    salary: {
      min: number
      max: number
      currency: string
      period: string
    }
    postedDate: string
    expirationDate: string
    status: string
    views: number
    applications: number
    description: string
    responsibilities: string[]
    requirements: string[]
    niceToHave: string[]
    benefits: string[]
    skills: string[]
    category: string
    applyUrl: string | null
    applyEmail: string
  }
}

export function JobDetailClient({ job }: JobDetailClientProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedJobId, setSavedJobId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const { turnstileToken, setTurnstileToken, resetTurnstileToken } = useTurnstileToken()
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Check if user is a candidate
  const isCandidate = user?.role === 'candidate'

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  // Check if job is already saved when user is authenticated as candidate
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!isAuthenticated || !isCandidate) return
      try {
        const savedJobs = await getSavedJobs({ page_size: 100 })
        const savedJob = savedJobs.results.find(
          (sj) => String(sj.job.id) === job.id || sj.job.job_id === job.id
        )
        if (savedJob) {
          setIsSaved(true)
          setSavedJobId(savedJob.id)
        }
      } catch (err) {
        console.error('Failed to check saved status:', err)
      }
    }
    checkSavedStatus()
  }, [isAuthenticated, isCandidate, job.id])

  const formatSalary = (min: number, max: number, currency?: string) => {
    const cur = currency || "CAD"
    const locale = cur === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
  }

  const getDaysRemaining = () => {
    const exp = new Date(job.expirationDate)
    const now = new Date()
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available
    }
  }

  const handleSaveToggle = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname)
      router.push(`/login?returnTo=${returnUrl}`)
      return
    }

    // Only candidates can save jobs
    if (!isCandidate) {
      toast.info('Only candidates can save jobs')
      return
    }

    setIsSaving(true)
    try {
      if (isSaved && savedJobId) {
        await unsaveJob(savedJobId)
        setIsSaved(false)
        setSavedJobId(null)
      } else {
        const jobId = parseInt(job.id, 10)
        if (!isNaN(jobId)) {
          const result = await saveJob({ job_id: jobId })
          setIsSaved(true)
          setSavedJobId(result.id)
        }
      }
    } catch (err) {
      console.error('Failed to save/unsave job:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyClick = () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname)
      router.push(`/login?returnTo=${returnUrl}`)
      return
    }

    // Only candidates can apply
    if (!isCandidate) {
      toast.info('Only candidates can apply to jobs')
      return
    }

    // If external apply URL, redirect there
    if (job.applyUrl) {
      if (isSafeExternalUrl(job.applyUrl)) {
        window.open(job.applyUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }

    // If email application
    if (job.applyEmail) {
      window.location.href = `mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application for ${job.title}`)}`
      return
    }

    // Otherwise open application dialog
    setApplyDialogOpen(true)
  }

  const handleApplySubmit = async () => {
    setIsApplying(true)
    try {
      const jobId = parseInt(job.id, 10)
      if (isNaN(jobId)) throw new Error('Invalid job ID')

      await applyToJob({
        job: jobId,
        cover_letter: coverLetter || undefined,
        resume: resumeFile || undefined,
        turnstile_token: turnstileToken || undefined,
      })
      setApplyDialogOpen(false)
      setCoverLetter("")
      setResumeFile(null)
      resetTurnstileToken()
      setHasApplied(true)
    } catch (err) {
      const error = err as { message?: string; errors?: Record<string, string[]> }
      const message = error.errors?.job?.[0] || error.message || 'Failed to submit application. Please try again.'
      toast.error(message)
    } finally {
      setIsApplying(false)
    }
  }

  const handleReportSubmit = async () => {
    if (!reportReason) return

    setIsReporting(true)
    try {
      await reportJob(job.id, reportReason as import("@/lib/api/public").ReportReason, reportDetails || undefined)
      setReportDialogOpen(false)
      setReportReason("")
      setReportDetails("")
      toast.success('Thank you for your report. We will review it shortly.')
    } catch (err) {
      console.error('Failed to report job:', err)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setIsReporting(false)
    }
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : ""
  const shareText = `${job.title} at ${job.company.name}`

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Sticky Action Bar */}
        <div
          className={cn(
            "sticky top-16 md:top-20 z-40 bg-card/80 backdrop-blur-2xl border-b border-border/50 transition-all duration-700 print:hidden",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
        >
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
            <div className="flex items-center justify-between h-12">
              {/* Back to jobs */}
              <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to jobs
              </Link>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl hover:bg-foreground/5 h-8 w-8"
                      onClick={handleSaveToggle}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <svg className="w-4 h-4 animate-spin text-foreground-muted" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg
                          className={cn(
                            "w-4 h-4 transition-all duration-300",
                            isSaved ? "fill-primary text-primary" : "text-foreground-muted"
                          )}
                          fill={isSaved ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isSaved ? "Saved" : "Save job"}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl hover:bg-foreground/5 h-8 w-8"
                      onClick={() => setShareDialogOpen(true)}
                    >
                      <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-foreground/5 h-8 w-8">
                      <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handlePrint}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print / Save PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Report job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover px-5 h-8 text-sm"
                  onClick={handleApplyClick}
                  disabled={hasApplied}
                >
                  {hasApplied ? "Applied" : "Apply Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Print-Ready Section */}
        <div ref={printRef} className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-12">
          {/* Hero Section */}
          <div
            className={cn(
              "transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-8 print:hidden">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
              <span>/</span>
              <span className="text-foreground">{job.title}</span>
            </nav>

            {/* Job Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-xl shadow-black/5">
              {/* Premium gradient background */}
              <div
                className="absolute inset-0 opacity-50 print:hidden"
                style={{
                  background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(var(--primary-rgb), 0.15) 0%, transparent 50%)",
                }}
              />

              {/* Inner glow */}
              <div
                className="absolute inset-0 print:hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 30%)",
                }}
              />

              <div className="relative p-8 md:p-12">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                  {/* Left: Company & Job Info */}
                  <div className="flex-1">
                    {/* Company */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {job.company.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{job.company.name}</span>
                          {job.company.verified && (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Verified Company</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="font-secondary text-sm text-foreground-muted">{job.company.industry} · {job.company.size}</p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-6">
                      {job.title}
                    </h1>

                    {/* Key Details */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <Badge variant="secondary" className="px-4 py-2 text-sm font-medium rounded-xl bg-foreground/5">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location.city}, {job.location.state}
                        {job.location.remote === "hybrid" && " · Hybrid"}
                        {job.location.remote === "remote" && " · Remote"}
                      </Badge>
                      <Badge variant="secondary" className="px-4 py-2 text-sm font-medium rounded-xl bg-foreground/5">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {job.type}
                      </Badge>
                      <Badge variant="secondary" className="px-4 py-2 text-sm font-medium rounded-xl bg-foreground/5">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        {job.experience}
                      </Badge>
                    </div>

                    {/* Salary */}
                    <div className="mb-8">
                      <p className="font-secondary text-2xl md:text-3xl font-semibold text-foreground">
                        {formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                        <span className="text-base font-normal text-foreground-muted ml-2">/ year</span>
                      </p>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Meta Info Card */}
                  <div className="lg:w-80 shrink-0">
                    <div className="rounded-2xl bg-foreground/[0.02] border border-border/50 p-6 space-y-5">
                      {/* Job ID */}
                      <div className="flex items-center justify-between">
                        <span className="font-secondary text-sm text-foreground-muted">Job ID</span>
                        <span className="text-sm font-mono font-medium text-foreground">{job.jobId || job.id}</span>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Posted Date */}
                      <div className="flex items-center justify-between">
                        <span className="font-secondary text-sm text-foreground-muted">Posted</span>
                        <span className="text-sm font-medium text-foreground">{formatDate(job.postedDate)}</span>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Expiration */}
                      <div className="flex items-center justify-between">
                        <span className="font-secondary text-sm text-foreground-muted">Expires</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">{formatDate(job.expirationDate)}</span>
                          <p className="text-xs text-foreground-muted">{getDaysRemaining()} days left</p>
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded-xl bg-foreground/[0.02]">
                          <p className="font-secondary text-2xl font-semibold text-foreground">{(job.views ?? 0).toLocaleString()}</p>
                          <p className="font-secondary text-xs text-foreground-muted">Views</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-foreground/[0.02]">
                          <p className="font-secondary text-2xl font-semibold text-foreground">{job.applications.toLocaleString()}</p>
                          <p className="font-secondary text-xs text-foreground-muted">Applicants</p>
                        </div>
                      </div>

                      {/* Apply Button (Mobile CTA) */}
                      <Button
                        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover h-12 text-base font-medium print:hidden"
                        onClick={handleApplyClick}
                        disabled={hasApplied}
                      >
                        {hasApplied ? "Applied" : "Apply for this position"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Description */}
              <section
                className={cn(
                  "transition-all duration-700 delay-200",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  About this role
                </h2>
                <div className="prose prose-slate max-w-none">
                  {job.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-foreground-muted leading-relaxed mb-4">{para}</p>
                  ))}
                </div>
              </section>

              {/* Responsibilities */}
              <section
                className={cn(
                  "transition-all duration-700 delay-300",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Responsibilities
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span className="text-foreground-muted leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Requirements */}
              <section
                className={cn(
                  "transition-all duration-700 delay-400",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-foreground-muted leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Nice to Have */}
              <section
                className={cn(
                  "transition-all duration-700 delay-500",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-foreground/20 rounded-full" />
                  Nice to Have
                </h2>
                <ul className="space-y-3">
                  {job.niceToHave.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                      <span className="text-foreground-muted leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Benefits */}
              <section
                className={cn(
                  "transition-all duration-700 delay-600",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Benefits & Perks
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {job.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Info Card */}
              <div
                className={cn(
                  "rounded-2xl bg-card border border-border/50 p-6 transition-all duration-700 delay-300",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h3 className="font-secondary font-semibold text-foreground mb-4">About {job.company.name}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                  {job.company.description}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {job.company.website.replace("https://", "")}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-foreground-muted">{job.company.industry}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-foreground-muted">{job.company.size}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-6 rounded-xl print:hidden bg-transparent">
                  View company profile
                </Button>
              </div>

              {/* Share Card */}
              <div
                className={cn(
                  "rounded-2xl bg-card border border-border/50 p-6 print:hidden transition-all duration-700 delay-400",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h3 className="font-secondary font-semibold text-foreground mb-4">Share this job</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl flex-1 h-12 bg-transparent"
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank")}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl flex-1 h-12 bg-transparent"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank")}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl flex-1 h-12 bg-transparent"
                    onClick={() => window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`, "_blank")}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl flex-1 h-12 bg-transparent"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>

              {/* Similar Jobs Placeholder */}
              <div
                className={cn(
                  "rounded-2xl bg-card border border-border/50 p-6 print:hidden transition-all duration-700 delay-500",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h3 className="font-secondary font-semibold text-foreground mb-4">Similar jobs</h3>
                <div className="space-y-4">
                  {[
                    { title: "Product Designer", company: "Acme Corp", location: "Remote" },
                    { title: "UX Designer", company: "Nova Inc", location: "Toronto, ON" },
                    { title: "Design Lead", company: "Quantum", location: "Vancouver, BC" },
                  ].map((similarJob, i) => (
                    <Link key={i} href="#" className="block group">
                      <div className="p-3 rounded-xl hover:bg-foreground/[0.02] transition-colors">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{similarJob.title}</p>
                        <p className="font-secondary text-sm text-foreground-muted">{similarJob.company} · {similarJob.location}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-2 text-primary hover:text-primary-hover">
                  View more jobs
                </Button>
              </div>

              {/* Banner Slot */}
              <BannerSlot placement="job_detail" />

              {/* Affiliate Links */}
              <AffiliateSlot placement="job_detail" variant="card" />
            </div>
          </div>

          {/* Sticky Apply Bar (Mobile) */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border/50 lg:hidden print:hidden">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-foreground truncate">{job.title}</p>
                <p className="font-secondary text-sm text-foreground-muted">{job.company.name}</p>
              </div>
              <Button
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover px-8"
                onClick={handleApplyClick}
                disabled={hasApplied}
              >
                {hasApplied ? "Applied" : "Apply"}
              </Button>
            </div>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share this job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-foreground/[0.02] rounded-xl border border-border/50">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-foreground-muted outline-none"
                />
                <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl bg-transparent"
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank")}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-xs">LinkedIn</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl bg-transparent"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank")}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-xs">X</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl bg-transparent"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl bg-transparent"
                  onClick={() => window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`, "_blank")}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Email</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Job Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report this job</DialogTitle>
              <DialogDescription>
                Help us keep New Canadian Careers safe by reporting jobs that violate our policies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Reason for report</Label>
                <RadioGroup value={reportReason} onValueChange={setReportReason}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spam" id="spam" />
                    <Label htmlFor="spam" className="font-normal">Spam or misleading</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scam" id="scam" />
                    <Label htmlFor="scam" className="font-normal">Potential scam or fraud</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="discriminatory" id="discriminatory" />
                    <Label htmlFor="discriminatory" className="font-normal">Discriminatory content</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inappropriate" id="inappropriate" />
                    <Label htmlFor="inappropriate" className="font-normal">Inappropriate content</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expired" id="expired" />
                    <Label htmlFor="expired" className="font-normal">Job no longer available</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="font-normal">Other</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-details">Additional details (optional)</Label>
                <Textarea
                  id="report-details"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional information..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReportDialogOpen(false)}
                disabled={isReporting}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReportSubmit}
                disabled={!reportReason || isReporting}
              >
                {isReporting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply Dialog */}
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for {job.title}</DialogTitle>
              <DialogDescription>
                Submit your application to {job.company.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-foreground/[0.02] border border-border/50">
                <p className="text-sm text-foreground-muted">
                  Your profile will be shared with the employer. Make sure your profile is up to date.
                </p>
              </div>
              {/* Resume Upload */}
              <div className="space-y-2">
                <Label>Resume (optional)</Label>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
                {resumeFile ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-foreground truncate">{resumeFile.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setResumeFile(null)} className="shrink-0">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => resumeInputRef.current?.click()}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Resume (PDF, DOC)
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover-letter">Cover letter (optional)</Label>
                <Textarea
                  id="cover-letter"
                  placeholder="Add a cover letter to stand out from other applicants..."
                  rows={5}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>
            </div>
            <TurnstileGuard
              feature="applications"
              onToken={setTurnstileToken}
              className="mt-2"
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApplyDialogOpen(false)}
                disabled={isApplying}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplySubmit}
                disabled={isApplying}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {isApplying ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print\\:hidden {
              display: none !important;
            }
            main {
              padding: 20px !important;
            }
            @page {
              margin: 0.5in;
            }
          }
        `}</style>
      </div>
    </TooltipProvider>
  )
}

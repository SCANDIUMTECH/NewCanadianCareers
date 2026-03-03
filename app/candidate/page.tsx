"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatTimeAgo } from "@/lib/utils"
import { APPLICATION_STATUS_STYLES } from "@/lib/constants/status-styles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useCandidate } from "@/hooks/use-candidate"
import {
  getSavedJobs,
  getMyApplications,
  getJobAlerts,
} from "@/lib/api/candidates"
import type {
  SavedJob,
  CandidateApplicationListItem,
  JobAlert,
  CandidateProfile,
} from "@/lib/candidate/types"

interface RecentlyViewedJob {
  id: number
  title: string
  company: string
  location: string
  viewedAt: string
}

function getRecentlyViewed(): RecentlyViewedJob[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("orion_recently_viewed_jobs")
    if (stored) {
      return JSON.parse(stored).slice(0, 5)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function calculateProfileCompletion(profile: CandidateProfile | null) {
  if (!profile) {
    return { percentage: 0, items: [] }
  }

  const items = [
    { label: "Basic info", completed: !!(profile.first_name && profile.last_name && profile.email) },
    { label: "Resume uploaded", completed: !!profile.resume },
    { label: "Preferred locations", completed: profile.preferred_locations.length > 0 },
    { label: "Job preferences", completed: !!profile.remote_preference },
    { label: "Keywords added", completed: profile.preferred_keywords.length > 0 },
  ]

  const completedCount = items.filter((i) => i.completed).length
  const percentage = Math.round((completedCount / items.length) * 100)

  return { percentage, items }
}

export default function CandidateDashboard() {
  const { profile, savedJobsCount, applicationsCount, isLoading: contextLoading } = useCandidate()

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [applications, setApplications] = useState<CandidateApplicationListItem[]>([])
  const [jobAlerts, setJobAlerts] = useState<JobAlert[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [savedJobsRes, applicationsRes, alertsRes] = await Promise.all([
        getSavedJobs({ page_size: 3 }),
        getMyApplications({ page_size: 3 }),
        getJobAlerts(),
      ])
      setSavedJobs(savedJobsRes.results)
      setApplications(applicationsRes.results)
      setJobAlerts(alertsRes.results.slice(0, 2))
      setRecentlyViewed(getRecentlyViewed())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const profileCompletion = calculateProfileCompletion(profile)

  // Count applications in review
  const inReviewCount = applications.filter((app) => app.status === "reviewing").length

  // Calculate total new matches from alerts
  const totalMatches = jobAlerts.reduce((sum, alert) => sum + alert.match_count, 0)

  // Determine profile trend text
  const getProfileTrend = () => {
    if (!profile?.resume) return "Add resume"
    if (profileCompletion.percentage < 100) return "Complete profile"
    return "Profile complete"
  }

  if (isLoading || contextLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-8">
          <div className="h-16 bg-background-secondary/50 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-background-secondary/50 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-background-secondary/50 rounded-lg" />
              <div className="h-64 bg-background-secondary/50 rounded-lg" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-background-secondary/50 rounded-lg" />
              <div className="h-48 bg-background-secondary/50 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Welcome Header */}
      <MotionWrapper delay={0}>
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
            <span>{getGreeting()}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {profile?.first_name || "there"}
          </h1>
        </div>
      </MotionWrapper>

      {/* Quick Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Saved Jobs"
            value={savedJobsCount}
            href="/candidate/saved"
            trend={savedJobs.length > 0 ? `${savedJobs.length} recent` : "None yet"}
            color="primary"
          />
          <StatCard
            label="Applications"
            value={applicationsCount}
            href="/candidate/applications"
            trend={inReviewCount > 0 ? `${inReviewCount} in review` : "Track status"}
            color="blue"
          />
          <StatCard
            label="Job Alerts"
            value={jobAlerts.length}
            href="/candidate/alerts"
            trend={totalMatches > 0 ? `${totalMatches} new matches` : "Create alerts"}
            color="green"
          />
          <StatCard
            label="Profile Score"
            value={`${profileCompletion.percentage}%`}
            href="/candidate/profile"
            trend={getProfileTrend()}
            color="amber"
          />
        </div>
      </MotionWrapper>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Saved Jobs */}
          <MotionWrapper delay={200}>
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Saved Jobs</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Jobs you&apos;ve bookmarked</p>
                </div>
                <Link href="/candidate/saved">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {savedJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-foreground-muted mb-4">No saved jobs yet</p>
                    <Link href="/jobs">
                      <Button variant="outline" size="sm">
                        Browse Jobs
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {savedJobs.map((savedJob) => (
                      <JobCard key={savedJob.id} savedJob={savedJob} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Applications */}
          <MotionWrapper delay={300}>
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Your Applications</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Track your application status</p>
                </div>
                <Link href="/candidate/applications">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {applications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-foreground-muted mb-4">No applications yet</p>
                    <Link href="/jobs">
                      <Button variant="outline" size="sm">
                        Find Jobs
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {applications.map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <MotionWrapper delay={250}>
            <ProfileCompletionCard items={profileCompletion.items} percentage={profileCompletion.percentage} />
          </MotionWrapper>

          {/* Saved Searches */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Job Alerts</CardTitle>
                  <Link href="/candidate/alerts">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobAlerts.length === 0 ? (
                  <p className="text-sm text-foreground-muted text-center py-4">
                    No job alerts set up
                  </p>
                ) : (
                  jobAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50 hover:bg-background-secondary transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.name}</p>
                        <p className="text-xs text-foreground-muted mt-0.5">
                          {alert.match_count} new matches · {alert.frequency}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {alert.match_count}
                      </Badge>
                    </div>
                  ))
                )}
                <Link href="/candidate/alerts">
                  <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                    + Create new alert
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recently Viewed */}
          <MotionWrapper delay={450}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Recently Viewed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentlyViewed.length === 0 ? (
                  <p className="text-sm text-foreground-muted text-center py-4">
                    No recently viewed jobs
                  </p>
                ) : (
                  recentlyViewed.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block p-3 rounded-lg hover:bg-background-secondary/50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {job.company} · {job.location}
                      </p>
                      <p className="text-xs text-foreground-muted/60 mt-1">{job.viewedAt}</p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  trend,
  color,
}: {
  label: string
  value: string | number
  href: string
  trend: string
  color: "primary" | "blue" | "green" | "amber"
}) {
  const colorStyles = {
    primary: "bg-primary/5 text-primary border-primary/10",
    blue: "bg-blue-500/5 text-blue-600 border-blue-500/10",
    green: "bg-emerald-500/5 text-emerald-600 border-emerald-500/10",
    amber: "bg-amber-500/5 text-amber-600 border-amber-500/10",
  }

  return (
    <Link href={href}>
      <Card className={cn("border hover:shadow-md transition-all duration-300 cursor-pointer group", colorStyles[color])}>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1 group-hover:translate-x-0.5 transition-transform">{value}</p>
          <p className="text-xs text-foreground-muted/80 mt-1">{trend}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function JobCard({ savedJob }: { savedJob: SavedJob }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="flex items-start gap-4 p-4 hover:bg-background-secondary/30 transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Company Logo */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center overflow-hidden">
        {savedJob.job.company_logo ? (
          <img
            src={savedJob.job.company_logo}
            alt={savedJob.job.company_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-foreground-muted">
            {savedJob.job.company_name.charAt(0)}
          </span>
        )}
      </div>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/jobs/${savedJob.job.job_id}`}>
              <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {savedJob.job.title}
              </h3>
            </Link>
            <p className="text-sm text-foreground-muted">{savedJob.job.company_name}</p>
          </div>
          <Link href={`/jobs/${savedJob.job.job_id}`}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 transition-all duration-300",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
              )}
            >
              Apply
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {savedJob.job.location}
          </Badge>
          {savedJob.job.salary_display && (
            <Badge variant="secondary" className="text-xs font-normal">
              {savedJob.job.salary_display}
            </Badge>
          )}
          <span className="text-xs text-foreground-muted/60">
            Saved {formatTimeAgo(savedJob.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

function ApplicationCard({ application }: { application: CandidateApplicationListItem }) {
  const style = APPLICATION_STATUS_STYLES[application.status]
  const status = style
    ? { label: style.label, color: style.className }
    : { label: application.status, color: "" }

  return (
    <Link
      href={`/candidate/applications?id=${application.id}`}
      className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center overflow-hidden">
          {application.job.company_logo ? (
            <img
              src={application.job.company_logo}
              alt={application.job.company_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground-muted">
              {application.job.company_name.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {application.job.title}
          </h3>
          <p className="text-sm text-foreground-muted">{application.job.company_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-foreground-muted hidden sm:inline">
          {new Date(application.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Badge variant="outline" className={cn("text-xs", status.color)}>
          {status.label}
        </Badge>
        {application.has_unread_messages && (
          <span className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  )
}

function ProfileCompletionCard({
  items,
  percentage,
}: {
  items: Array<{ label: string; completed: boolean }>
  percentage: number
}) {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      {/* Gradient header */}
      <div
        className="h-2"
        style={{
          background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)",
          width: `${percentage}%`,
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Profile Strength</CardTitle>
          <span className="text-sm font-medium text-primary">{percentage}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={percentage} className="h-2 mb-4" />
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.completed ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border" />
              )}
              <span className={cn("text-sm", item.completed ? "text-foreground-muted" : "text-foreground")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <Link href="/candidate/profile">
          <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
            {percentage < 100 ? "Complete Profile" : "Edit Profile"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatTimeAgo } from "@/lib/utils"
import { JOB_STATUS_STYLES } from "@/lib/constants/status-styles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
import { UserAvatar } from "@/components/user-avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import dynamic from "next/dynamic"
import { CHART, STATUS } from "@/lib/constants/colors"

const CompanyPerformanceChart = dynamic(
  () => import("@/components/charts/company-performance-chart"),
  { ssr: false }
)
const CompanyStatusChart = dynamic(
  () => import("@/components/charts/company-status-chart"),
  { ssr: false }
)
import { useCompanyContext } from "@/hooks/use-company"
import { getCompanyJobs, getJobStats, getCompanyAnalytics } from "@/lib/api/jobs"
import { getCompanyMembers } from "@/lib/api/companies"
import { getNotifications } from "@/lib/api/notifications"
import type { JobListItem, JobStatus, TeamMember, Notification } from "@/lib/company/types"
import type { CompanyAnalytics } from "@/lib/api/jobs"

/**
 * Company Dashboard
 * Overview of jobs, performance, team activity, and billing
 * Integrated with backend API
 */

export default function CompanyDashboard() {
  const { company, entitlements, isLoading: contextLoading } = useCompanyContext()

  // Local state for dashboard data
  const [recentJobs, setRecentJobs] = useState<JobListItem[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [recentActivity, setRecentActivity] = useState<Notification[]>([])
  const [jobStats, setJobStats] = useState<{
    total_jobs: number
    published_jobs: number
    draft_jobs: number
    paused_jobs: number
    expired_jobs: number
    total_views: number
    total_applications: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [jobsRes, stats, members, notifications] = await Promise.all([
        getCompanyJobs({ page_size: 4 }).catch(() => ({ results: [] })),
        getJobStats().catch(() => null),
        getCompanyMembers().catch(() => []),
        getNotifications({ page_size: 5 }).catch(() => ({ results: [] })),
      ])

      setRecentJobs(jobsRes.results)
      setJobStats(stats)
      setTeamMembers(members.slice(0, 3))
      setRecentActivity(notifications.results)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const data = await getCompanyAnalytics({ period: dateRange })
      setAnalytics(data)
    } catch {
      // Silently fail - chart will show "No data" state
    } finally {
      setAnalyticsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Compute jobs by status for chart
  const jobsByStatus = [
    { status: "Published", count: jobStats?.published_jobs ?? 0, color: CHART.primary },
    { status: "Draft", count: jobStats?.draft_jobs ?? 0, color: STATUS.draft },
    { status: "Paused", count: jobStats?.paused_jobs ?? 0, color: CHART.warning },
    { status: "Expired", count: jobStats?.expired_jobs ?? 0, color: CHART.danger },
  ]

  // Chart colors
  const chartColors = {
    views: CHART.primary,
    applies: CHART.success,
    grid: CHART.grid,
  }

  const getDaysLeft = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const mapNotificationToActivity = (notification: Notification) => {
    const typeMap: Record<string, string> = {
      application_received: "application",
      job_expired: "view",
      job_expiring: "view",
      team_invite: "team",
      payment_success: "billing",
      credits_low: "billing",
      credits_expiring: "billing",
    }
    return {
      id: notification.id,
      type: typeMap[notification.type] || "application",
      message: notification.title,
      time: formatTimeAgo(notification.created_at),
    }
  }

  // Loading skeleton
  if (contextLoading || isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="h-8 w-64 bg-background-secondary rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-background-secondary rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-80 bg-background-secondary rounded animate-pulse" />
            <div className="h-64 bg-background-secondary rounded animate-pulse" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-background-secondary rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Welcome Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
              <span>Good morning</span>
              <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
              <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              {company?.name || "Company"} Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/company/jobs/new">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Post New Job
              </Button>
            </Link>
          </div>
        </div>
      </MotionWrapper>

      {/* Quick Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active Jobs"
            value={String(jobStats?.published_jobs ?? 0)}
            change={`${jobStats?.total_jobs ?? 0} total jobs`}
            trend="up"
            href="/company/jobs"
          />
          <StatCard
            label="Total Views"
            value={(analytics?.summary.total_views ?? jobStats?.total_views ?? 0).toLocaleString()}
            change={analytics?.summary.conversion_rate
              ? `${analytics.summary.conversion_rate.toFixed(1)}% conversion`
              : "All time"}
            trend="up"
            href="/company/jobs"
          />
          <StatCard
            label="Applications"
            value={String(analytics?.summary.total_applications ?? jobStats?.total_applications ?? 0)}
            change="All time"
            trend="up"
            href="/company/jobs"
          />
          <StatCard
            label="Job Credits"
            value={String(entitlements?.remaining_credits ?? 0)}
            change={entitlements?.expiring_soon?.count
              ? `${entitlements.expiring_soon.count} expiring in ${entitlements.expiring_soon.days}d`
              : "No credits expiring soon"}
            trend={entitlements?.expiring_soon?.count ? "warning" : "up"}
            href="/company/billing"
          />
        </div>
      </MotionWrapper>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Jobs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold">Job Performance</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Views and applications over time</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.views }} />
                    <span className="text-xs text-foreground-muted">Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.applies }} />
                    <span className="text-xs text-foreground-muted">Applications</span>
                  </div>
                  <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7d' | '30d' | '90d')}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[280px] animate-pulse bg-background-secondary/30 rounded" />
                ) : analytics && analytics.timeseries.length > 0 ? (
                  <div className="h-[280px] w-full">
                    <CompanyPerformanceChart data={analytics.timeseries} />
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <p className="text-sm text-foreground-muted">No data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recent Jobs */}
          <MotionWrapper delay={300}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Jobs</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Manage your job postings</p>
                </div>
                <Link href="/company/jobs">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {recentJobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-background-secondary/30">
                          <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Job Title</th>
                          <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Status</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Views</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Applies</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3 hidden sm:table-cell">Days Left</th>
                          <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {recentJobs.map((job) => {
                          const daysLeft = getDaysLeft(job.expires_at)
                          return (
                          <tr key={job.id} className="hover:bg-background-secondary/30 transition-colors group">
                            <td className="px-4 py-3">
                              <Link href={`/company/jobs/${job.job_id}`}>
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {job.title}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <JobStatusBadge status={job.status} />
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-foreground-muted">{(job.views ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.applications_count ?? 0}</td>
                            <td className="px-4 py-3 text-right text-sm text-foreground-muted hidden sm:table-cell">
                              {daysLeft !== null ? `${daysLeft}d` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/company/jobs/${job.job_id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </Button>
                              </Link>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-foreground-muted mb-4">No jobs posted yet</p>
                    <Link href="/company/jobs/new">
                      <Button size="sm">Post Your First Job</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Jobs by Status */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Jobs by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] w-full">
                  <CompanyStatusChart data={jobsByStatus} />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Traffic Sources */}
          <MotionWrapper delay={275}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.sources && analytics.sources.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.sources.slice(0, 5).map((source) => {
                      const total = analytics.sources.reduce((sum, s) => sum + s.count, 0)
                      const pct = total > 0 ? Math.round((source.count / total) * 100) : 0
                      return (
                        <div key={source.source} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-sm text-foreground capitalize">{source.source || "Direct"}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-4">No traffic data yet</p>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Billing Summary */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Billing</CardTitle>
                  <Link href="/company/billing">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Job Credits</span>
                    <span className="text-2xl font-semibold text-primary">
                      {entitlements?.remaining_credits ?? 0}
                    </span>
                  </div>
                  <Progress
                    value={entitlements?.total_credits
                      ? ((entitlements.used_credits / entitlements.total_credits) * 100)
                      : 0
                    }
                    className="h-2"
                  />
                  {entitlements?.expiring_soon?.count ? (
                    <p className="text-xs text-foreground-muted mt-2">
                      {entitlements.expiring_soon.count} credits expire in {entitlements.expiring_soon.days} days
                    </p>
                  ) : (
                    <p className="text-xs text-foreground-muted mt-2">
                      {entitlements?.used_credits ?? 0} of {entitlements?.total_credits ?? 0} used
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Featured Credits</span>
                    <span className="text-sm font-medium">{entitlements?.remaining_featured_credits ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Social Credits</span>
                    <span className="text-sm font-medium">{entitlements?.remaining_social_credits ?? 0}</span>
                  </div>
                </div>

                <Link href="/company/packages" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Buy More Credits
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Team */}
          <MotionWrapper delay={450}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Team</CardTitle>
                  <Link href="/company/team">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.length > 0 ? (
                  <>
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <UserAvatar
                          name={member.user.full_name}
                          avatar={member.user.avatar}
                          size="xs"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{member.user.full_name}</p>
                          <p className="text-xs text-foreground-muted truncate capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-2">No team members yet</p>
                )}
                <Link href="/company/team">
                  <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                    + Invite Team Member
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recent Activity */}
          <MotionWrapper delay={550}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((notification) => {
                    const activity = mapNotificationToActivity(notification)
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <ActivityIcon type={activity.type} />
                        <div>
                          <p className="text-sm text-foreground">{activity.message}</p>
                          <p className="text-xs text-foreground-muted mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  change,
  trend,
  href,
}: {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "warning"
  href: string
}) {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-500",
    warning: "text-amber-600",
  }

  return (
    <Link href={href}>
      <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 cursor-pointer group">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground group-hover:text-primary transition-colors">{value}</p>
          <p className={cn("text-xs mt-1", trendColors[trend])}>{change}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const style = JOB_STATUS_STYLES[status]
  return (
    <Badge variant="outline" className={cn("text-xs", style?.className)}>
      {style?.label ?? status}
    </Badge>
  )
}

// Activity Icon
function ActivityIcon({ type }: { type: string }) {
  const iconClass = "w-8 h-8 rounded-full flex items-center justify-center"

  switch (type) {
    case "application":
      return (
        <div className={cn(iconClass, "bg-primary/10")}>
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )
    case "view":
      return (
        <div className={cn(iconClass, "bg-blue-500/10")}>
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      )
    case "team":
      return (
        <div className={cn(iconClass, "bg-emerald-500/10")}>
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      )
    case "billing":
      return (
        <div className={cn(iconClass, "bg-amber-500/10")}>
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      )
    default:
      return null
  }
}

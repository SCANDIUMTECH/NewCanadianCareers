"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import dynamic from "next/dynamic"

const AgencyAnalyticsPerformanceChart = dynamic(
  () => import("@/components/charts/agency-analytics-performance-chart"),
  { ssr: false }
)
const AgencyTrafficChart = dynamic(
  () => import("@/components/charts/agency-traffic-chart"),
  { ssr: false }
)
const AgencyCompanyChart = dynamic(
  () => import("@/components/charts/agency-company-chart"),
  { ssr: false }
)
import { Loader2 } from "lucide-react"
import { useAgencyContext } from "@/hooks/use-agency"
import {
  getAgencyAnalytics,
  getAgencyJobs,
  getAgencyTrafficSources,
  getAgencySocialDistribution,
  type AgencyTrafficSource,
  type AgencySocialDistribution,
} from "@/lib/api/agencies"
import type { AgencyAnalytics, AgencyJob } from "@/lib/agency/types"
import { CHART, CHART_SEQUENCE } from "@/lib/constants/colors"

/**
 * Agency Analytics Dashboard
 * Aggregated performance metrics across all client companies
 */

// Company colors for consistency
const companyColors = CHART_SEQUENCE
function getClientColor(index: number): string {
  return companyColors[index % companyColors.length]
}

export default function AgencyAnalyticsPage() {
  const { clients } = useAgencyContext()
  const [dateRange, setDateRange] = useState("30d")
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [analytics, setAnalytics] = useState<AgencyAnalytics | null>(null)
  const [jobs, setJobs] = useState<AgencyJob[]>([])
  const [sourceData, setSourceData] = useState<AgencyTrafficSource[]>([])
  const [socialResults, setSocialResults] = useState<AgencySocialDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Build companies list from context
  const companies = useMemo(() => {
    const baseCompanies = [{ id: "all", name: "All Companies", color: CHART.primary }]
    const clientCompanies = clients.map((client, index) => ({
      id: String(client.company),
      name: client.company_name,
      color: getClientColor(index),
    }))
    return [...baseCompanies, ...clientCompanies]
  }, [clients])

  // Map date range to API period
  const getApiPeriod = (range: string): 'week' | 'month' | 'quarter' => {
    switch (range) {
      case '7d': return 'week'
      case '90d': return 'quarter'
      default: return 'month'
    }
  }

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const apiPeriod = getApiPeriod(dateRange)
      const [analyticsData, jobsData, trafficData, socialData] = await Promise.all([
        getAgencyAnalytics({ period: apiPeriod }),
        getAgencyJobs({ status: 'published', page_size: 10 }),
        getAgencyTrafficSources({ period: apiPeriod }).catch(() => []),
        getAgencySocialDistribution({ period: apiPeriod }).catch(() => []),
      ])
      setAnalytics(analyticsData)
      setJobs(jobsData.results)
      setSourceData(trafficData)
      setSocialResults(socialData)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Transform analytics data for charts
  const viewsData = useMemo(() => {
    if (!analytics?.trends) return []
    return analytics.trends.map(t => ({
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: t.views,
      applies: t.applications,
      conversions: t.placements,
    }))
  }, [analytics])

  const companyPerformance = useMemo(() => {
    if (!analytics?.by_client) return []
    return analytics.by_client.map((c, index) => ({
      name: c.client_name.length > 12 ? c.client_name.slice(0, 12) + '...' : c.client_name,
      views: c.views,
      applies: c.applications,
      conversion: c.applications > 0 ? parseFloat(((c.placements / c.applications) * 100).toFixed(1)) : 0,
      color: c.color || getClientColor(index),
    }))
  }, [analytics])

  const jobPerformance = useMemo(() => {
    return jobs.map((job, index) => ({
      title: job.title,
      company: job.company?.name || 'Unknown',
      companyColor: getClientColor(index),
      views: job.views ?? 0,
      applies: job.applications_count ?? 0,
      conversion: (job.views ?? 0) > 0 ? parseFloat((((job.applications_count ?? 0) / job.views) * 100).toFixed(1)) : 0,
    }))
  }, [jobs])

  // Calculate overview stats from analytics
  const overviewStats = useMemo(() => {
    if (!analytics?.overview) {
      return {
        totalViews: '0',
        totalApplications: '0',
        conversionRate: '0%',
        activeJobs: '0',
      }
    }
    const o = analytics.overview
    return {
      totalViews: o.total_views.toLocaleString(),
      totalApplications: o.total_applications.toLocaleString(),
      conversionRate: `${o.placement_rate.toFixed(1)}%`,
      activeJobs: String(o.active_jobs),
    }
  }, [analytics])

  // Chart colors
  const chartColors = {
    views: CHART.primary,
    applies: CHART.success,
    conversions: CHART.warning,
    grid: CHART.grid,
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
  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
            <p className="text-sm text-foreground-muted mt-1">Track performance across all your client companies</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      {company.id !== "all" && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: company.color }}
                        />
                      )}
                      {company.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </MotionWrapper>

      {/* Top Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Views"
            value={overviewStats.totalViews}
            change="+22%"
            trend="up"
          />
          <MetricCard
            label="Total Applications"
            value={overviewStats.totalApplications}
            change="+31%"
            trend="up"
          />
          <MetricCard
            label="Conversion Rate"
            value={overviewStats.conversionRate}
            change="+1.2%"
            trend="up"
          />
          <MetricCard
            label="Active Jobs"
            value={overviewStats.activeJobs}
            change="+4"
            trend="up"
          />
        </div>
      </MotionWrapper>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Views & Applications Over Time */}
        <MotionWrapper delay={200} className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Performance Over Time</CardTitle>
                <p className="text-sm text-foreground-muted mt-1">Aggregated views and applications trend</p>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <AgencyAnalyticsPerformanceChart data={viewsData} />
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Traffic Sources */}
        <MotionWrapper delay={250}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Traffic Sources</CardTitle>
              <p className="text-sm text-foreground-muted mt-1">Where candidates come from</p>
            </CardHeader>
            <CardContent>
              {sourceData.length === 0 ? (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-sm text-foreground-muted">No traffic data available yet</p>
                </div>
              ) : (
                <>
                  <div className="h-[200px] w-full">
                    <AgencyTrafficChart data={sourceData} />
                  </div>
                  <div className="space-y-2 mt-4">
                    {sourceData.map((source) => (
                      <div key={source.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="text-sm text-foreground">{source.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{source.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Performance by Company */}
      <MotionWrapper delay={300}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Performance by Company</CardTitle>
            <p className="text-sm text-foreground-muted mt-1">Compare metrics across your client companies</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <AgencyCompanyChart data={companyPerformance} />
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Job Performance Table */}
      <MotionWrapper delay={350}>
        <Card className="border-border/50 shadow-sm overflow-hidden mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Job Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-background-secondary/30">
                    <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Job Title</th>
                    <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Company</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Views</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Applications</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Conversion</th>
                    <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {jobPerformance.map((job, index) => (
                    <tr key={index} className="hover:bg-background-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{job.title}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: job.companyColor }}
                          />
                          <span className="text-sm text-foreground-muted">{job.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{(job.views ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.applies}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.conversion}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden ml-auto">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(job.conversion / 10) * 100}%`,
                              backgroundColor: job.companyColor
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Social Distribution Results */}
      <MotionWrapper delay={400}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Social Distribution</CardTitle>
                <p className="text-sm text-foreground-muted mt-1">Aggregated performance of social media posts</p>
              </div>
              <Button variant="outline" size="sm" className="bg-transparent">
                Manage Connections
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {socialResults.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-foreground-muted">No social accounts connected yet. Connect your social accounts to start distributing jobs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {socialResults.map((platform) => (
                  <div key={platform.platform} className="p-4 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <SocialIcon platform={platform.platform} />
                        <span className="font-medium text-foreground">{platform.platform}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          platform.status === "connected"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        )}
                      >
                        {platform.status === "connected" ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>

                    {platform.status === "connected" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-foreground-muted">Posts</p>
                          <p className="text-lg font-semibold">{platform.posts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Impressions</p>
                          <p className="text-lg font-semibold">{platform.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Clicks</p>
                          <p className="text-lg font-semibold">{platform.clicks}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Applications</p>
                          <p className="text-lg font-semibold">{platform.applies}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-sm text-foreground-muted mb-3">Connect to start distributing jobs</p>
                        <Button size="sm" variant="outline" className="bg-transparent">
                          Connect
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  trend,
}: {
  label: string
  value: string
  change: string
  trend: "up" | "down"
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
        <p className={cn("text-xs mt-1", trend === "up" ? "text-emerald-600" : "text-red-500")}>
          {change} vs previous period
        </p>
      </CardContent>
    </Card>
  )
}

function SocialIcon({ platform }: { platform: string }) {
  const iconClass = "w-6 h-6 rounded flex items-center justify-center"

  switch (platform) {
    case "LinkedIn":
      return (
        <div className={cn(iconClass, "bg-social-linkedin/10")}>
          <span className="text-xs font-bold text-social-linkedin">in</span>
        </div>
      )
    case "Twitter/X":
      return (
        <div className={cn(iconClass, "bg-foreground/10")}>
          <span className="text-xs font-bold">X</span>
        </div>
      )
    case "Facebook":
      return (
        <div className={cn(iconClass, "bg-social-facebook/10")}>
          <span className="text-xs font-bold text-social-facebook">f</span>
        </div>
      )
    default:
      return null
  }
}

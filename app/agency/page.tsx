"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

/**
 * Agency Dashboard
 * Multi-company overview with aggregated metrics, per-company breakdown,
 * pooled credit management, and recent activity across all clients
 */

// Mock aggregated data
const performanceData = [
  { date: "Jan 1", views: 1240, applies: 124 },
  { date: "Jan 8", views: 1520, applies: 165 },
  { date: "Jan 15", views: 1850, applies: 192 },
  { date: "Jan 22", views: 1680, applies: 178 },
  { date: "Jan 29", views: 2120, applies: 226 },
  { date: "Feb 2", views: 1980, applies: 212 },
]

const jobsByCompany = [
  { company: "Acme Corp", jobs: 5, views: 842, applies: 68 },
  { company: "TechStart", jobs: 3, views: 523, applies: 42 },
  { company: "Global Dyn", jobs: 2, views: 315, applies: 28 },
  { company: "Innovate", jobs: 0, views: 0, applies: 0 },
]

const clientCompanies = [
  { id: 1, name: "Acme Corporation", initials: "AC", verified: true, activeJobs: 5, views: 842, applies: 68, creditsUsed: 8, color: "#3B5BDB" },
  { id: 2, name: "TechStart Inc", initials: "TS", verified: true, activeJobs: 3, views: 523, applies: 42, creditsUsed: 5, color: "#10B981" },
  { id: 3, name: "Global Dynamics", initials: "GD", verified: false, activeJobs: 2, views: 315, applies: 28, creditsUsed: 3, color: "#F59E0B" },
  { id: 4, name: "Innovate Labs", initials: "IL", verified: true, activeJobs: 0, views: 0, applies: 0, creditsUsed: 0, color: "#8B5CF6" },
]

const recentJobs = [
  { id: 1, title: "Senior Frontend Engineer", company: "Acme Corporation", companyInitials: "AC", status: "published", views: 342, applies: 28, posted: "Jan 28" },
  { id: 2, title: "Product Designer", company: "TechStart Inc", companyInitials: "TS", status: "published", views: 215, applies: 18, posted: "Jan 25" },
  { id: 3, title: "Backend Developer", company: "Global Dynamics", companyInitials: "GD", status: "pending", views: 0, applies: 0, posted: "Feb 1" },
  { id: 4, title: "DevOps Engineer", company: "Acme Corporation", companyInitials: "AC", status: "published", views: 189, applies: 15, posted: "Jan 20" },
]

const recentActivity = [
  { id: 1, type: "application", message: "New application for Senior Frontend Engineer", company: "Acme Corporation", time: "2 hours ago" },
  { id: 2, type: "company", message: "Global Dynamics verification pending", company: null, time: "4 hours ago" },
  { id: 3, type: "view", message: "Product Designer reached 200 views", company: "TechStart Inc", time: "Yesterday" },
  { id: 4, type: "billing", message: "10 job credits purchased", company: null, time: "2 days ago" },
  { id: 5, type: "team", message: "Sarah Chen joined as Recruiter", company: null, time: "3 days ago" },
]

const teamMembers = [
  { id: 1, name: "Rachel Kim", email: "rachel@talentbridge.io", role: "Owner", avatar: null },
  { id: 2, name: "James Lee", email: "james@talentbridge.io", role: "Admin", avatar: null },
  { id: 3, name: "Sarah Chen", email: "sarah@talentbridge.io", role: "Recruiter", avatar: null },
]

export default function AgencyDashboard() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const chartColors = {
    views: "#8B5CF6",
    applies: "#10B981",
    grid: "#E5E7EB",
  }

  // Aggregate stats
  const totalActiveJobs = clientCompanies.reduce((sum, c) => sum + c.activeJobs, 0)
  const totalViews = clientCompanies.reduce((sum, c) => sum + c.views, 0)
  const totalApplies = clientCompanies.reduce((sum, c) => sum + c.applies, 0)
  const totalCreditsUsed = clientCompanies.reduce((sum, c) => sum + c.creditsUsed, 0)
  const totalCredits = 45
  const creditsRemaining = totalCredits - totalCreditsUsed

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Welcome Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
              <Badge variant="outline" className="h-5 px-2 text-[10px] font-semibold bg-violet-500/10 text-violet-600 border-violet-500/20">
                Agency
              </Badge>
              <span className="inline-block w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Agency Dashboard
            </h1>
            <p className="text-sm text-foreground-muted mt-1">
              Managing {clientCompanies.length} client companies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/agency/companies">
              <Button variant="outline" className="gap-2 bg-transparent">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manage Companies
              </Button>
            </Link>
            <Link href="/agency/jobs/new">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Client Companies"
            value={clientCompanies.length.toString()}
            change={`${clientCompanies.filter(c => c.verified).length} verified`}
            trend="neutral"
            href="/agency/companies"
            accent="violet"
          />
          <StatCard
            label="Active Jobs"
            value={totalActiveJobs.toString()}
            change="+3 this month"
            trend="up"
            href="/agency/jobs"
          />
          <StatCard
            label="Total Views"
            value={totalViews.toLocaleString()}
            change="+22% vs last week"
            trend="up"
            href="/agency/analytics"
          />
          <StatCard
            label="Applications"
            value={totalApplies.toString()}
            change="+38 this week"
            trend="up"
            href="/agency/jobs"
          />
          <StatCard
            label="Credits Remaining"
            value={creditsRemaining.toString()}
            change={`${totalCreditsUsed} used this month`}
            trend="warning"
            href="/agency/billing"
            accent="violet"
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
                  <CardTitle className="text-lg font-semibold">Aggregate Performance</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Views and applications across all companies</p>
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
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="agencyViewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.views} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={chartColors.views} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="agencyAppliesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.applies} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={chartColors.applies} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "#64748B" }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "#64748B" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke={chartColors.views}
                        strokeWidth={2}
                        fill="url(#agencyViewsGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="applies"
                        stroke={chartColors.applies}
                        strokeWidth={2}
                        fill="url(#agencyAppliesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Companies Performance Breakdown */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Performance by Company</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Jobs, views, and applications per client</p>
                </div>
                <Link href="/agency/analytics">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View details
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientCompanies.map((company) => (
                    <div key={company.id} className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${company.color}15` }}
                      >
                        <span className="text-sm font-semibold" style={{ color: company.color }}>
                          {company.initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                          {company.verified && (
                            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-foreground-muted">{company.activeJobs} jobs</span>
                          <span className="text-xs text-foreground-muted">{company.views.toLocaleString()} views</span>
                          <span className="text-xs text-foreground-muted">{company.applies} applies</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{company.creditsUsed}</p>
                        <p className="text-xs text-foreground-muted">credits</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recent Jobs Across Companies */}
          <MotionWrapper delay={300}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Jobs</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Latest job postings across all companies</p>
                </div>
                <Link href="/agency/jobs">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-background-secondary/30">
                        <th className="text-left text-xs font-medium text-foreground-muted px-4 py-3">Job / Company</th>
                        <th className="text-center text-xs font-medium text-foreground-muted px-4 py-3">Status</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Views</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3">Applies</th>
                        <th className="text-right text-xs font-medium text-foreground-muted px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {recentJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-background-secondary/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-primary">{job.companyInitials}</span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {job.title}
                                </span>
                                <p className="text-xs text-foreground-muted">{job.company}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.views.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.applies}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Pooled Credits */}
          <MotionWrapper delay={350}>
            <Card className="border-violet-500/20 shadow-sm bg-violet-500/5">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Pooled Credits</CardTitle>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                      Agency
                    </Badge>
                  </div>
                  <Link href="/agency/billing">
                    <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Available Credits</span>
                    <span className="text-2xl font-semibold text-violet-600">{creditsRemaining}</span>
                  </div>
                  <Progress value={(creditsRemaining / totalCredits) * 100} className="h-2" />
                  <p className="text-xs text-foreground-muted mt-2">
                    {totalCreditsUsed} of {totalCredits} credits used this billing cycle
                  </p>
                </div>
                
                <div className="space-y-3">
                  <p className="text-xs font-medium text-foreground-muted uppercase">Usage by Company</p>
                  {clientCompanies.filter(c => c.creditsUsed > 0).map((company) => (
                    <div key={company.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${company.color}15` }}
                        >
                          <span className="text-[10px] font-semibold" style={{ color: company.color }}>
                            {company.initials}
                          </span>
                        </div>
                        <span className="text-sm text-foreground-muted">{company.name}</span>
                      </div>
                      <span className="text-sm font-medium">{company.creditsUsed}</span>
                    </div>
                  ))}
                </div>

                <Link href="/agency/billing/packages" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-transparent border-violet-500/20 text-violet-600 hover:bg-violet-500/10">
                    Buy More Credits
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Client Companies Quick View */}
          <MotionWrapper delay={400}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Client Companies</CardTitle>
                  <Link href="/agency/companies">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {clientCompanies.map((company) => (
                  <Link 
                    key={company.id} 
                    href={`/agency/companies/${company.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-secondary/50 transition-colors"
                  >
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${company.color}15` }}
                    >
                      <span className="text-sm font-semibold" style={{ color: company.color }}>
                        {company.initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                        {company.verified ? (
                          <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        ) : (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] text-amber-600 border-amber-500/30">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted">{company.activeJobs} active jobs</p>
                    </div>
                  </Link>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  + Add Company
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Agency Team */}
          <MotionWrapper delay={450}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Agency Team</CardTitle>
                  <Link href="/agency/team">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-violet-600">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-foreground-muted truncate">{member.role}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  + Invite Team Member
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recent Activity */}
          <MotionWrapper delay={500}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <ActivityIcon type={activity.type} />
                    <div>
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.company && (
                          <>
                            <span className="text-xs text-primary">{activity.company}</span>
                            <span className="text-xs text-foreground-muted">·</span>
                          </>
                        )}
                        <span className="text-xs text-foreground-muted">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
  accent,
}: {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "warning" | "neutral"
  href: string
  accent?: "violet"
}) {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-500",
    warning: "text-amber-600",
    neutral: "text-foreground-muted",
  }

  return (
    <Link href={href}>
      <Card className={cn(
        "border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 cursor-pointer group",
        accent === "violet" && "border-violet-500/20 bg-violet-500/5"
      )}>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</p>
          <p className={cn(
            "text-2xl font-semibold mt-1 transition-colors",
            accent === "violet" ? "text-violet-600" : "text-foreground group-hover:text-primary"
          )}>
            {value}
          </p>
          <p className={cn("text-xs mt-1", trendColors[trend])}>{change}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// Job Status Badge
function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    paused: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    expired: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  const labels: Record<string, string> = {
    published: "Published",
    pending: "Pending",
    draft: "Draft",
    paused: "Paused",
    expired: "Expired",
  }

  return (
    <Badge variant="outline" className={cn("text-xs", styles[status])}>
      {labels[status]}
    </Badge>
  )
}

// Activity Icon Component
function ActivityIcon({ type }: { type: string }) {
  const baseClass = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
  
  switch (type) {
    case "application":
      return (
        <div className={cn(baseClass, "bg-emerald-500/10")}>
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    case "view":
      return (
        <div className={cn(baseClass, "bg-blue-500/10")}>
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      )
    case "company":
      return (
        <div className={cn(baseClass, "bg-violet-500/10")}>
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )
    case "billing":
      return (
        <div className={cn(baseClass, "bg-amber-500/10")}>
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      )
    case "team":
      return (
        <div className={cn(baseClass, "bg-primary/10")}>
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className={cn(baseClass, "bg-background-secondary")}>
          <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
}

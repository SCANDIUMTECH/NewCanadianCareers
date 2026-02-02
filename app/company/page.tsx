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
} from "recharts"

/**
 * Company Dashboard
 * Overview of jobs, performance, team activity, and billing
 * Premium UI with Recharts visualizations
 */

// Mock data
const performanceData = [
  { date: "Jan 1", views: 240, applies: 24 },
  { date: "Jan 8", views: 320, applies: 35 },
  { date: "Jan 15", views: 450, applies: 42 },
  { date: "Jan 22", views: 380, applies: 38 },
  { date: "Jan 29", views: 520, applies: 56 },
  { date: "Feb 2", views: 480, applies: 52 },
]

const jobsByStatus = [
  { status: "Published", count: 8, color: "#3B5BDB" },
  { status: "Draft", count: 3, color: "#94A3B8" },
  { status: "Paused", count: 2, color: "#F59E0B" },
  { status: "Expired", count: 5, color: "#EF4444" },
]

const recentJobs = [
  { id: 1, title: "Senior Frontend Engineer", status: "published", views: 342, applies: 28, posted: "Jan 28, 2026", daysLeft: 22 },
  { id: 2, title: "Product Designer", status: "published", views: 215, applies: 18, posted: "Jan 25, 2026", daysLeft: 19 },
  { id: 3, title: "Backend Developer", status: "pending", views: 0, applies: 0, posted: "Feb 1, 2026", daysLeft: 30 },
  { id: 4, title: "DevOps Engineer", status: "draft", views: 0, applies: 0, posted: "-", daysLeft: null },
]

const recentActivity = [
  { id: 1, type: "application", message: "New application for Senior Frontend Engineer", time: "2 hours ago" },
  { id: 2, type: "view", message: "Product Designer reached 200 views", time: "5 hours ago" },
  { id: 3, type: "team", message: "Sarah Chen joined as Recruiter", time: "Yesterday" },
  { id: 4, type: "billing", message: "5 job posting credits added", time: "2 days ago" },
]

const teamMembers = [
  { id: 1, name: "Jane Doe", email: "jane@acme.com", role: "Owner", avatar: null },
  { id: 2, name: "Sarah Chen", email: "sarah@acme.com", role: "Recruiter", avatar: null },
  { id: 3, name: "Mike Johnson", email: "mike@acme.com", role: "Admin", avatar: null },
]

export default function CompanyDashboard() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Chart colors (computed, not CSS vars)
  const chartColors = {
    views: "#3B5BDB",
    applies: "#10B981",
    grid: "#E5E7EB",
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
              Company Dashboard
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
            value="8"
            change="+2 this month"
            trend="up"
            href="/company/jobs"
          />
          <StatCard
            label="Total Views"
            value="2,847"
            change="+18% vs last week"
            trend="up"
            href="/company/analytics"
          />
          <StatCard
            label="Applications"
            value="142"
            change="+24 this week"
            trend="up"
            href="/company/jobs"
          />
          <StatCard
            label="Job Credits"
            value="12"
            change="8 expiring soon"
            trend="warning"
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.views} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={chartColors.views} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="appliesGradient" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#viewsGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="applies"
                        stroke={chartColors.applies}
                        strokeWidth={2}
                        fill="url(#appliesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
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
                      {recentJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-background-secondary/30 transition-colors group">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {job.title}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.views.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.applies}</td>
                          <td className="px-4 py-3 text-right text-sm text-foreground-muted hidden sm:table-cell">
                            {job.daysLeft !== null ? `${job.daysLeft}d` : "-"}
                          </td>
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
          {/* Jobs by Status */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Jobs by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobsByStatus} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="status" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[0, 4, 4, 0]}
                        fill="#3B5BDB"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                    <span className="text-2xl font-semibold text-primary">12</span>
                  </div>
                  <Progress value={60} className="h-2" />
                  <p className="text-xs text-foreground-muted mt-2">8 credits expire in 14 days</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Current Plan</span>
                    <Badge variant="secondary">Growth</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Next Billing</span>
                    <span className="text-sm font-medium">Feb 15, 2026</span>
                  </div>
                </div>

                <Link href="/company/billing/packages" className="block">
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
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
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
          <MotionWrapper delay={550}>
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
                      <p className="text-xs text-foreground-muted mt-0.5">{activity.time}</p>
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

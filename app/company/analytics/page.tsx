"use client"

import { useState } from "react"
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
 * Company Analytics Dashboard
 * Job performance metrics, conversion rates, and distribution results
 */

// Mock data
const viewsData = [
  { date: "Jan 1", views: 240, applies: 24, conversions: 2 },
  { date: "Jan 8", views: 320, applies: 35, conversions: 4 },
  { date: "Jan 15", views: 450, applies: 42, conversions: 5 },
  { date: "Jan 22", views: 380, applies: 38, conversions: 3 },
  { date: "Jan 29", views: 520, applies: 56, conversions: 6 },
  { date: "Feb 2", views: 480, applies: 52, conversions: 5 },
]

const jobPerformance = [
  { title: "Senior Frontend Engineer", views: 342, applies: 28, conversion: 8.2 },
  { title: "Product Designer", views: 215, applies: 18, conversion: 8.4 },
  { title: "Backend Developer", views: 156, applies: 12, conversion: 7.7 },
  { title: "DevOps Engineer", views: 189, applies: 15, conversion: 7.9 },
]

const sourceData = [
  { name: "Direct", value: 45, color: "#3B5BDB" },
  { name: "LinkedIn", value: 28, color: "#0077B5" },
  { name: "Google", value: 15, color: "#EA4335" },
  { name: "Twitter/X", value: 8, color: "#1DA1F2" },
  { name: "Other", value: 4, color: "#94A3B8" },
]

const socialResults = [
  { platform: "LinkedIn", posts: 8, impressions: 12400, clicks: 342, applies: 28, status: "connected" },
  { platform: "Twitter/X", posts: 5, impressions: 4200, clicks: 89, applies: 6, status: "connected" },
  { platform: "Facebook", posts: 0, impressions: 0, clicks: 0, applies: 0, status: "not_connected" },
]

export default function CompanyAnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d")

  // Chart colors
  const chartColors = {
    views: "#3B5BDB",
    applies: "#10B981",
    conversions: "#F59E0B",
    grid: "#E5E7EB",
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
            <p className="text-sm text-foreground-muted mt-1">Track your job performance and reach</p>
          </div>
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
      </MotionWrapper>

      {/* Top Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Views"
            value="2,847"
            change="+18%"
            trend="up"
          />
          <MetricCard
            label="Applications"
            value="142"
            change="+24%"
            trend="up"
          />
          <MetricCard
            label="Conversion Rate"
            value="5.0%"
            change="+0.8%"
            trend="up"
          />
          <MetricCard
            label="Avg. Time to Apply"
            value="3.2 days"
            change="-0.5 days"
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
                <p className="text-sm text-foreground-muted mt-1">Views and applications trend</p>
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
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={viewsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="views" stroke={chartColors.views} strokeWidth={2} fill="url(#viewsGradient)" />
                    <Area type="monotone" dataKey="applies" stroke={chartColors.applies} strokeWidth={2} fill="url(#appliesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
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
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Job Performance Table */}
      <MotionWrapper delay={300}>
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
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.applies}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground-muted">{job.conversion}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden ml-auto">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${(job.conversion / 10) * 100}%` }}
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
                <p className="text-sm text-foreground-muted mt-1">Performance of social media posts</p>
              </div>
              <Button variant="outline" size="sm" className="bg-transparent">
                Manage Connections
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
        <div className={cn(iconClass, "bg-[#0077B5]/10")}>
          <span className="text-xs font-bold text-[#0077B5]">in</span>
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
        <div className={cn(iconClass, "bg-[#1877F2]/10")}>
          <span className="text-xs font-bold text-[#1877F2]">f</span>
        </div>
      )
    default:
      return null
  }
}

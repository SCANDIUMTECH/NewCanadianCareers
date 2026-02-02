"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Sample data
const jobsData = [
  { date: "Jan", jobs: 145, applications: 890 },
  { date: "Feb", jobs: 178, applications: 1020 },
  { date: "Mar", jobs: 210, applications: 1340 },
  { date: "Apr", jobs: 189, applications: 1180 },
  { date: "May", jobs: 234, applications: 1560 },
  { date: "Jun", jobs: 267, applications: 1890 },
  { date: "Jul", jobs: 298, applications: 2100 },
]

const revenueData = [
  { date: "Jan", revenue: 12400 },
  { date: "Feb", revenue: 15800 },
  { date: "Mar", revenue: 18200 },
  { date: "Apr", revenue: 16900 },
  { date: "May", revenue: 21300 },
  { date: "Jun", revenue: 24800 },
  { date: "Jul", revenue: 28400 },
]

const moderationData = [
  { name: "Pending", value: 12, color: "#f59e0b" },
  { name: "Approved", value: 156, color: "#10b981" },
  { name: "Rejected", value: 8, color: "#ef4444" },
]

const recentActivity = [
  { id: 1, type: "job", action: "New job posted", company: "TechCorp", time: "2 min ago" },
  { id: 2, type: "user", action: "New company registered", company: "StartupXYZ", time: "15 min ago" },
  { id: 3, type: "moderation", action: "Job flagged for review", company: "GlobalInc", time: "32 min ago" },
  { id: 4, type: "payment", action: "Package purchased", company: "DesignCo", time: "1 hour ago" },
  { id: 5, type: "job", action: "Job expired", company: "DevStudio", time: "2 hours ago" },
]

const alerts = [
  { id: 1, severity: "warning", message: "Spike in spam reports detected", time: "10 min ago" },
  { id: 2, severity: "error", message: "3 failed social posts in queue", time: "25 min ago" },
  { id: 3, severity: "info", message: "Email bounce rate above threshold", time: "1 hour ago" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("7d")

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform overview and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList className="h-9">
              <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">30d</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between text-sm">
                      <span className={cn(
                        alert.severity === "error" && "text-red-700",
                        alert.severity === "warning" && "text-amber-700",
                        alert.severity === "info" && "text-blue-700"
                      )}>
                        {alert.message}
                      </span>
                      <span className="text-muted-foreground text-xs">{alert.time}</span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100">
                  View all
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jobs Posted"
          value="298"
          change="+12%"
          trend="up"
          subtitle="from last week"
        />
        <StatCard
          title="Active Companies"
          value="1,247"
          change="+8%"
          trend="up"
          subtitle="from last week"
        />
        <StatCard
          title="Revenue (MTD)"
          value="$28,400"
          change="+23%"
          trend="up"
          subtitle="from last month"
        />
        <StatCard
          title="Pending Reviews"
          value="12"
          change="-4"
          trend="down"
          subtitle="items in queue"
          highlight
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        {/* Jobs & Applications Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Jobs & Applications</CardTitle>
            <CardDescription>Posting and application trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={jobsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B5BDB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B5BDB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorApps)"
                    name="Applications"
                  />
                  <Area
                    type="monotone"
                    dataKey="jobs"
                    stroke="#3B5BDB"
                    strokeWidth={2}
                    fill="url(#colorJobs)"
                    name="Jobs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue</CardTitle>
            <CardDescription>Monthly revenue from packages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#3B5BDB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        {/* Moderation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Moderation Queue</CardTitle>
            <CardDescription>Jobs pending review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {moderationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <a href="/admin/moderation">Review Queue</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    activity.type === "job" && "bg-blue-100 text-blue-600",
                    activity.type === "user" && "bg-green-100 text-green-600",
                    activity.type === "moderation" && "bg-amber-100 text-amber-600",
                    activity.type === "payment" && "bg-purple-100 text-purple-600"
                  )}>
                    {activity.type === "job" && <FileTextIcon className="h-4 w-4" />}
                    {activity.type === "user" && <UserPlusIcon className="h-4 w-4" />}
                    {activity.type === "moderation" && <ShieldAlertIcon className="h-4 w-4" />}
                    {activity.type === "payment" && <CreditCardIcon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.company}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
  subtitle,
  highlight,
}: {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  subtitle: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && "border-amber-200 bg-amber-50/30")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              trend === "up" && "bg-green-100 text-green-700",
              trend === "down" && !highlight && "bg-red-100 text-red-700",
              trend === "down" && highlight && "bg-green-100 text-green-700"
            )}
          >
            {change}
          </Badge>
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// Icon components
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

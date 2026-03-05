"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useAdminContext } from "@/hooks/use-admin"
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileText,
  UserPlus,
  ShieldAlert,
  CreditCard,
  Eye,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronRight,
  CircleDot,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { CHART } from "@/lib/constants/colors"
import {
  getJobsTrend,
  getRevenueTrend,
  getRecentActivity,
  dismissAlert,
  resolveAlert,
} from "@/lib/api/admin-dashboard"
import type {
  AdminDashboardTrendPoint,
  AdminActivity,
} from "@/lib/admin/types"

const SparklineChart = dynamic(() => import("@/components/charts/sparkline-chart"), { ssr: false })
const AdminJobsTrendChart = dynamic(() => import("@/components/charts/admin-jobs-trend-chart"), { ssr: false })
const AdminRevenueBarChart = dynamic(() => import("@/components/charts/admin-revenue-bar-chart"), { ssr: false })

type TimeRange = "24h" | "7d" | "30d" | "90d"

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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")

  // Shared state from admin context (stats, moderation, alerts)
  const {
    stats,
    moderation,
    alerts,
    isLoading: isContextLoading,
    refreshStats,
    dismissAlertById,
  } = useAdminContext()

  // Page-specific state (trends, activity — dashboard-only data)
  const [jobsTrend, setJobsTrend] = useState<AdminDashboardTrendPoint[]>([])
  const [revenueTrend, setRevenueTrend] = useState<AdminDashboardTrendPoint[]>([])
  const [activities, setActivities] = useState<AdminActivity[]>([])

  // Loading states (only for page-specific data)
  const [isJobsTrendLoading, setIsJobsTrendLoading] = useState(true)
  const [isRevenueTrendLoading, setIsRevenueTrendLoading] = useState(true)
  const [isActivityLoading, setIsActivityLoading] = useState(true)

  // Error states
  const [fetchErrors, setFetchErrors] = useState<string[]>([])

  // Action states
  const [dismissingAlertId, setDismissingAlertId] = useState<number | null>(null)
  const [resolvingAlertId, setResolvingAlertId] = useState<number | null>(null)

  // Derived loading states from context
  const isStatsLoading = isContextLoading && stats === null
  const isModerationLoading = isContextLoading && moderation.length === 0
  const isAlertsLoading = isContextLoading && alerts.length === 0

  // ==========================================================================
  // Data Fetching (page-specific only — shared data comes from context)
  // ==========================================================================

  const fetchJobsTrend = useCallback(async () => {
    setIsJobsTrendLoading(true)
    try {
      const data = await getJobsTrend(timeRange)
      setJobsTrend(data)
      setFetchErrors((prev) => prev.filter((e) => !e.includes("jobs trend")))
    } catch (err) {
      console.error("Failed to fetch jobs trend:", (err as { message?: string })?.message || err)
      setFetchErrors((prev) => prev.some((e) => e.includes("jobs trend")) ? prev : [...prev, "Failed to load jobs trend data"])
    } finally {
      setIsJobsTrendLoading(false)
    }
  }, [timeRange])

  const fetchRevenueTrend = useCallback(async () => {
    setIsRevenueTrendLoading(true)
    try {
      const data = await getRevenueTrend(timeRange)
      setRevenueTrend(data)
      setFetchErrors((prev) => prev.filter((e) => !e.includes("revenue")))
    } catch (err) {
      console.error("Failed to fetch revenue trend:", (err as { message?: string })?.message || err)
      setFetchErrors((prev) => prev.some((e) => e.includes("revenue")) ? prev : [...prev, "Failed to load revenue data"])
    } finally {
      setIsRevenueTrendLoading(false)
    }
  }, [timeRange])

  const fetchActivity = useCallback(async () => {
    setIsActivityLoading(true)
    try {
      const data = await getRecentActivity(5)
      setActivities(data)
      setFetchErrors((prev) => prev.filter((e) => !e.includes("activity")))
    } catch (err) {
      console.error("Failed to fetch activity:", (err as { message?: string })?.message || err)
      setFetchErrors((prev) => prev.some((e) => e.includes("activity")) ? prev : [...prev, "Failed to load recent activity"])
    } finally {
      setIsActivityLoading(false)
    }
  }, [])

  // Fetch page-specific data + refresh context stats when time range changes
  useEffect(() => {
    refreshStats(timeRange)
    fetchJobsTrend()
    fetchRevenueTrend()
  }, [refreshStats, timeRange, fetchJobsTrend, fetchRevenueTrend])

  // Fetch activity on mount
  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleRetryAll = () => {
    setFetchErrors([])
    fetchJobsTrend()
    fetchRevenueTrend()
    fetchActivity()
    refreshStats(timeRange)
  }

  const handleDismissAlert = async (alertId: number) => {
    setDismissingAlertId(alertId)
    try {
      await dismissAlert(alertId)
      dismissAlertById(alertId)
    } catch (err) {
      console.error("Failed to dismiss alert:", (err as { message?: string })?.message || err)
    } finally {
      setDismissingAlertId(null)
    }
  }

  const handleResolveAlert = async (alertId: number) => {
    setResolvingAlertId(alertId)
    try {
      await resolveAlert(alertId)
      dismissAlertById(alertId)
    } catch (err) {
      console.error("Failed to resolve alert:", (err as { message?: string })?.message || err)
    } finally {
      setResolvingAlertId(null)
    }
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange)
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  const getModerationConfig = (name: string): { icon: React.ReactNode; bgClass: string; barClass: string } => {
    switch (name.toLowerCase()) {
      case "pending":
        return {
          icon: <Clock className="h-3 w-3 text-amber-600" />,
          bgClass: "bg-amber-100",
          barClass: "bg-gradient-to-r from-amber-400 to-amber-500",
        }
      case "approved":
        return {
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
          bgClass: "bg-emerald-100",
          barClass: "bg-gradient-to-r from-emerald-400 to-emerald-500",
        }
      case "rejected":
        return {
          icon: <XCircle className="h-3 w-3 text-red-600" />,
          bgClass: "bg-red-100",
          barClass: "bg-gradient-to-r from-red-400 to-red-500",
        }
      default:
        return {
          icon: <CircleDot className="h-3 w-3 text-gray-500" />,
          bgClass: "bg-gray-100",
          barClass: "bg-gradient-to-r from-gray-400 to-gray-500",
        }
    }
  }

  const getActivityConfig = (type: string): { icon: React.ReactNode; bgClass: string } => {
    switch (type) {
      case "job":
        return {
          icon: <FileText className="h-4 w-4 text-sky" />,
          bgClass: "bg-sky/10 text-sky border border-sky/20",
        }
      case "user":
        return {
          icon: <UserPlus className="h-4 w-4 text-emerald-600" />,
          bgClass: "bg-emerald-50 text-emerald-600 border border-emerald-100",
        }
      case "moderation":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
          bgClass: "bg-amber-50 text-amber-600 border border-amber-100",
        }
      case "payment":
        return {
          icon: <CreditCard className="h-4 w-4 text-primary" />,
          bgClass: "bg-primary/10 text-primary border border-primary/20",
        }
      default:
        return {
          icon: <Activity className="h-4 w-4 text-gray-500" />,
          bgClass: "bg-gray-50 text-gray-500 border border-gray-100",
        }
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Platform overview and key metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
            <TabsList className="h-9">
              <TabsTrigger value="24h" className="text-xs">
                24h
              </TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">
                7d
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">
                30d
              </TabsTrigger>
              <TabsTrigger value="90d" className="text-xs">
                90d
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Fetch Error Banner */}
      {fetchErrors.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  {fetchErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700">{err}</p>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-red-700 hover:text-red-800 hover:bg-red-100"
                    onClick={handleRetryAll}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={() => setFetchErrors([])}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Alerts */}
      {!isAlertsLoading && alerts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between text-sm">
                      <span
                        className={cn(
                          alert.severity === "error" && "text-red-700",
                          alert.severity === "warning" && "text-amber-700",
                          alert.severity === "info" && "text-sky"
                        )}
                      >
                        {alert.message}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{alert.time}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolvingAlertId === alert.id || dismissingAlertId === alert.id}
                        >
                          {resolvingAlertId === alert.id ? "..." : "Resolve"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDismissAlert(alert.id)}
                          disabled={dismissingAlertId === alert.id || resolvingAlertId === alert.id}
                        >
                          {dismissingAlertId === alert.id ? "..." : "Dismiss"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                  asChild
                >
                  <Link href="/admin/alerts">View all</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Jobs Posted"
              value={formatNumber(stats.jobs_posted)}
              change={stats.jobs_change}
              trend={stats.jobs_change.startsWith("-") ? "down" : "up"}
              subtitle="from last period"
              icon={<Briefcase className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              bgAccent="bg-sky"
              sparkColor={CHART.primary}
            />
            <StatCard
              title="Active Companies"
              value={formatNumber(stats.active_companies)}
              change={stats.companies_change}
              trend={stats.companies_change.startsWith("-") ? "down" : "up"}
              subtitle="from last period"
              icon={<Building2 className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
              sparkColor={CHART.success}
            />
            <StatCard
              title="Revenue (MTD)"
              value={formatCurrency(stats.revenue_mtd)}
              change={stats.revenue_change}
              trend={stats.revenue_change.startsWith("-") ? "down" : "up"}
              subtitle="from last month"
              icon={<DollarSign className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
              sparkColor={CHART.purple}
            />
            <StatCard
              title="Pending Reviews"
              value={formatNumber(stats.pending_reviews)}
              change={stats.reviews_change}
              trend={stats.reviews_change.startsWith("-") ? "down" : "up"}
              subtitle="items in queue"
              highlight={stats.pending_reviews > 10}
              icon={<Clock className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              bgAccent="bg-amber-500"
              sparkColor={CHART.warning}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Jobs Posted"
              value="--"
              change="--"
              trend="up"
              subtitle="from last period"
              icon={<Briefcase className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              bgAccent="bg-sky"
              sparkColor={CHART.primary}
            />
            <StatCard
              title="Active Companies"
              value="--"
              change="--"
              trend="up"
              subtitle="from last period"
              icon={<Building2 className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
              sparkColor={CHART.success}
            />
            <StatCard
              title="Revenue (MTD)"
              value="--"
              change="--"
              trend="up"
              subtitle="from last month"
              icon={<DollarSign className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
              sparkColor={CHART.purple}
            />
            <StatCard
              title="Pending Reviews"
              value="--"
              change="--"
              trend="up"
              subtitle="items in queue"
              icon={<Clock className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              bgAccent="bg-amber-500"
              sparkColor={CHART.warning}
            />
          </>
        )}
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
            {isJobsTrendLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : jobsTrend.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[300px]">
                <AdminJobsTrendChart data={jobsTrend} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue</CardTitle>
            <CardDescription>Revenue from packages and subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            {isRevenueTrendLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : revenueTrend.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[300px]">
                <AdminRevenueBarChart data={revenueTrend} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        {/* Moderation Status */}
        <Card className="relative overflow-hidden group">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Moderation Queue</CardTitle>
                  <CardDescription className="text-xs">Jobs pending review</CardDescription>
                </div>
              </div>
              {!isModerationLoading && moderation.length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs font-medium tabular-nums">
                  {moderation.reduce((sum, item) => sum + item.value, 0)} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isModerationLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : moderation.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-muted-foreground text-xs mt-0.5">No items pending review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const total = moderation.reduce((sum, item) => sum + item.value, 0) || 1
                  return moderation.map((item) => {
                    const percentage = Math.round((item.value / total) * 100)
                    const statusConfig = getModerationConfig(item.name)
                    return (
                      <div key={item.name} className="group/item">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-5 w-5 items-center justify-center rounded", statusConfig.bgClass)}>
                              {statusConfig.icon}
                            </div>
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700 ease-out", statusConfig.barClass)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
            <div className="mt-5 pt-4 border-t">
              <Button variant="outline" className="w-full bg-transparent group/btn hover:border-amber-300 hover:bg-amber-50/50 transition-colors" asChild>
                <Link href="/admin/jobs?status=pending">
                  <Eye className="h-4 w-4 mr-2 transition-transform group-hover/btn:scale-110" />
                  Review Queue
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 relative overflow-hidden group">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-sky opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-sky via-primary-light to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky to-sky-deep text-white shadow-sm">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                  <CardDescription className="text-xs">Latest platform events</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" asChild>
                <Link href="/admin/audit">
                  View all
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-1.5" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-muted-foreground text-xs mt-0.5">Platform events will appear here</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline connector line */}
                <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-border via-border to-transparent" />

                <div className="space-y-1">
                  {activities.map((activity, index) => {
                    const activityConfig = getActivityConfig(activity.type)
                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "group/item flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50 cursor-default",
                          index === 0 && "bg-muted/30"
                        )}
                      >
                        {/* Icon with timeline dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-shadow duration-200 group-hover/item:shadow-md",
                              activityConfig.bgClass
                            )}
                          >
                            {activityConfig.icon}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">{activity.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {activity.entity_name || activity.company}
                          </p>
                        </div>

                        {/* Time badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-[11px] font-normal bg-muted/80 text-muted-foreground px-2 py-0.5">
                            {activity.time}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ==========================================================================
// Sub Components
// ==========================================================================

function generateTrend(
  finalValue: number | string,
  points: number,
  variance: number,
  direction: "up" | "down" | "steady"
): { v: number }[] {
  const data: { v: number }[] = []
  const raw = typeof finalValue === "number" ? finalValue : parseFloat(String(finalValue).replace(/[^0-9.-]/g, "")) || 0
  const base = Math.max(raw, 10)
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    let modifier: number
    if (direction === "up") {
      modifier = 0.7 + 0.3 * progress
    } else if (direction === "down") {
      modifier = 1.3 - 0.3 * progress
    } else {
      modifier = 1
    }
    const noise = Math.sin(i * 4.7 + base * 0.01) * variance * base
    data.push({ v: Math.max(0, base * modifier + noise) })
  }
  return data
}

function StatCard({
  title,
  value,
  change,
  trend,
  subtitle,
  highlight,
  icon,
  gradient,
  bgAccent,
  sparkColor,
}: {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  subtitle: string
  highlight?: boolean
  icon?: React.ReactNode
  gradient?: string
  bgAccent?: string
  sparkColor?: string
}) {
  const isPositiveChange = !change.startsWith("-")
  const sparkData = generateTrend(value, 12, 0.08, trend)

  return (
    <Card className={cn("relative overflow-hidden group", highlight && "border-amber-200 bg-amber-50/30")}>
      {bgAccent && (
        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      )}
      {gradient && (
        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      )}
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient ? (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          ) : (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                isPositiveChange && "bg-green-100 text-green-700",
                !isPositiveChange && !highlight && "bg-red-100 text-red-700",
                !isPositiveChange && highlight && "bg-green-100 text-green-700"
              )}
            >
              {isPositiveChange ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {change}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {icon && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                isPositiveChange && "bg-green-100 text-green-700",
                !isPositiveChange && !highlight && "bg-red-100 text-red-700",
                !isPositiveChange && highlight && "bg-green-100 text-green-700"
              )}
            >
              {isPositiveChange ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {change}
            </Badge>
          )}
        </div>
        {sparkColor && (
          <div className="mt-2 h-10 -mx-1">
            <SparklineChart
              data={sparkData}
              color={sparkColor}
              type="area"
              gradientId={`dash-${title.replace(/\s/g, "")}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-24" />
        <Skeleton className="mt-2 h-10 w-full" />
      </CardContent>
    </Card>
  )
}


"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { CHART } from "@/lib/constants/colors"
import {
  getComplianceOverview,
  getConsentAuditLog,
  getDeliverabilityStats,
} from "@/lib/api/admin-marketing"
import type {
  ComplianceOverview,
  ConsentAuditResponse,
  DeliverabilityStats,
} from "@/lib/api/admin-marketing"
import {
  ShieldCheck,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const DonutChartCard = dynamic(() => import("@/components/charts/donut-chart-card"), { ssr: false })
const DailyTrendChart = dynamic(() => import("@/components/charts/daily-trend-chart"), { ssr: false })

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// ── Gradient mappings for standard stat cards ────────────────────────

const COLOR_GRADIENTS: Record<string, { gradient: string; bgAccent: string }> = {
  green: { gradient: "from-emerald-500 to-teal-600", bgAccent: "bg-emerald-500" },
  amber: { gradient: "from-amber-500 to-orange-600", bgAccent: "bg-amber-500" },
  red: { gradient: "from-red-500 to-rose-600", bgAccent: "bg-red-500" },
  blue: { gradient: "from-blue-500 to-indigo-600", bgAccent: "bg-blue-500" },
  default: { gradient: "from-slate-600 to-slate-800", bgAccent: "bg-slate-500" },
}

// ── Donut chart color maps ───────────────────────────────────────────

const CONSENT_COLORS: Record<string, string> = {
  opted_in: CHART.success,
  opted_out: CHART.slate,
  unsubscribed: CHART.warning,
  bounced: CHART.danger,
  complained: CHART.pink,
}

const SUPPRESSION_COLORS: Record<string, string> = {
  bounce_hard: CHART.danger,
  bounce_soft: CHART.warning,
  complaint: CHART.pink,
  unsubscribe: CHART.slate,
  admin: CHART.primary,
  compliance: CHART.purple,
}

const DELIVERY_COLORS = {
  delivered: CHART.success,
  bounced: CHART.warning,
  complained: CHART.danger,
}

export default function ComplianceDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Compliance & Deliverability</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Monitor consent rates, unsubscribes, bounces, and email deliverability
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="consent-log" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Consent Log
            </TabsTrigger>
            <TabsTrigger value="deliverability" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Deliverability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ComplianceOverviewTab />
          </TabsContent>
          <TabsContent value="consent-log" className="mt-6">
            <ConsentLogTab />
          </TabsContent>
          <TabsContent value="deliverability" className="mt-6">
            <DeliverabilityTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// ─── Compliance Overview Tab ──────────────────────────────────────

function ComplianceOverviewTab() {
  const [data, setData] = useState<ComplianceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getComplianceOverview()
        setData(result)
      } catch (err) {
        console.error("Failed to fetch compliance overview:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Unable to load compliance data
        </CardContent>
      </Card>
    )
  }

  // Build donut chart data
  const consentChartData = Object.entries(data.consent_breakdown).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
    color: CONSENT_COLORS[status] || CHART.slate,
  }))

  const suppressionChartData = Object.entries(data.suppression_breakdown).map(([reason, count]) => ({
    name: reason.replace(/_/g, " "),
    value: count,
    color: SUPPRESSION_COLORS[reason] || CHART.slate,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Consent Rate"
          value={`${data.consent_rate}%`}
          icon={<ShieldCheck className="h-4 w-4" />}
          color={data.consent_rate >= 80 ? "green" : data.consent_rate >= 50 ? "amber" : "red"}
        />
        <StatCard
          title="Total Suppressed"
          value={data.total_suppressed.toLocaleString()}
          icon={<XCircle className="h-4 w-4" />}
          color="red"
        />
        <StatCard
          title="Unsubscribes (30d)"
          value={data.unsubscribes_30d.toLocaleString()}
          icon={<UserMinus className="h-4 w-4" />}
          color="amber"
        />
        <StatCard
          title="Complaints (30d)"
          value={data.complaints_30d.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={data.complaints_30d > 0 ? "red" : "green"}
        />
      </div>

      {/* Donut Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <DonutChartCard
          title="Consent Status Distribution"
          data={consentChartData}
          centerLabel={data.total_consents.toLocaleString()}
          centerSublabel="Total"
        />
        <DonutChartCard
          title="Suppression Reasons"
          data={suppressionChartData}
          centerLabel={data.total_suppressed.toLocaleString()}
          centerSublabel="Suppressed"
        />
      </div>

      {/* Daily Trends — use Recharts BarChart */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Daily Unsubscribes (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.unsubscribe_daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unsubscribes in this period</p>
            ) : (
              <DailyTrendChart data={data.unsubscribe_daily} color={CHART.warning} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Daily Suppressions (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.suppression_daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suppressions in this period</p>
            ) : (
              <DailyTrendChart data={data.suppression_daily} color={CHART.danger} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Consent Log Tab ──────────────────────────────────────────────

function ConsentLogTab() {
  const [data, setData] = useState<ConsentAuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getConsentAuditLog(page, 50)
      setData(result)
    } catch (err) {
      console.error("Failed to fetch consent log:", err)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPages = data ? Math.ceil(data.count / (data.page_size || 50)) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.count} consent records` : "Loading..."}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p>No consent records found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Express Consent</TableHead>
                  <TableHead>Consented</TableHead>
                  <TableHead>Withdrawn</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{entry.user_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ConsentStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {entry.source.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      {entry.express_consent ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {entry.consented_at
                        ? new Date(entry.consented_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {entry.withdrawn_at
                        ? new Date(entry.withdrawn_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Deliverability Tab ───────────────────────────────────────────

function DeliverabilityTab() {
  const [data, setData] = useState<DeliverabilityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getDeliverabilityStats()
        setData(result)
      } catch (err) {
        console.error("Failed to fetch deliverability stats:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Unable to load deliverability data
        </CardContent>
      </Card>
    )
  }

  // Delivery breakdown donut
  const deliveryChartData = [
    { name: "Delivered", value: data.total_delivered_30d, color: DELIVERY_COLORS.delivered },
    { name: "Bounced", value: data.total_bounced_30d, color: DELIVERY_COLORS.bounced },
    { name: "Complained", value: data.total_complained_30d || 0, color: DELIVERY_COLORS.complained },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Key Rate Cards — reduced from 5+4 to 3 */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Delivery Rate"
          value={`${data.delivery_rate}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color={data.delivery_rate >= 95 ? "green" : data.delivery_rate >= 90 ? "amber" : "red"}
        />
        <StatCard
          title="Open Rate"
          value={`${data.open_rate}%`}
          icon={<Mail className="h-4 w-4" />}
          color={data.open_rate >= 20 ? "green" : data.open_rate >= 10 ? "amber" : "red"}
        />
        <StatCard
          title="Click Rate"
          value={`${data.click_rate}%`}
          icon={<MousePointerClick className="h-4 w-4" />}
          color={data.click_rate >= 3 ? "green" : data.click_rate >= 1 ? "amber" : "red"}
        />
      </div>

      {/* Delivery Breakdown + Health Indicators side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <DonutChartCard
          title="Email Volume (30d)"
          data={deliveryChartData}
          centerLabel={data.total_sent_30d.toLocaleString()}
          centerSublabel="Sent"
        />

        {/* Health Indicators */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Health Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <HealthIndicator
                label="Delivery Rate"
                value={data.delivery_rate}
                good={95}
                warning={90}
                unit="%"
                higherIsBetter
              />
              <HealthIndicator
                label="Bounce Rate"
                value={data.bounce_rate}
                good={2}
                warning={5}
                unit="%"
                higherIsBetter={false}
              />
              <HealthIndicator
                label="Complaint Rate"
                value={data.complaint_rate}
                good={0.1}
                warning={0.3}
                unit="%"
                higherIsBetter={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppression Growth */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Suppression List Growth (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.suppression_growth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new suppressions in this period</p>
          ) : (
            <DailyTrendChart data={data.suppression_growth} color={CHART.danger} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}) {
  const formattedValue = typeof value === "number"
    ? new Intl.NumberFormat("en-US").format(value)
    : value
  const { gradient, bgAccent } = COLOR_GRADIENTS[color || "default"]

  return (
    <Card className="relative overflow-hidden group">
      <div className={cn(
        "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
        bgAccent
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        gradient
      )} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            gradient
          )}>
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{formattedValue}</p>
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
      </CardContent>
    </Card>
  )
}

function ConsentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    opted_in: "bg-green-100 text-green-700",
    opted_out: "bg-gray-100 text-gray-600",
    unsubscribed: "bg-amber-100 text-amber-700",
    bounced: "bg-red-100 text-red-700",
    complained: "bg-red-100 text-red-700",
  }
  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px] capitalize", colors[status])}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

function HealthIndicator({
  label,
  value,
  good,
  warning,
  unit,
  higherIsBetter,
}: {
  label: string
  value: number
  good: number
  warning: number
  unit: string
  higherIsBetter: boolean
}) {
  let status: "good" | "warning" | "critical"
  if (higherIsBetter) {
    status = value >= good ? "good" : value >= warning ? "warning" : "critical"
  } else {
    status = value <= good ? "good" : value <= warning ? "warning" : "critical"
  }

  const colors = {
    good: "text-green-600 bg-green-50 border-green-200",
    warning: "text-amber-600 bg-amber-50 border-amber-200",
    critical: "text-red-600 bg-red-50 border-red-200",
  }

  const icons = {
    good: <CheckCircle2 className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    critical: <XCircle className="h-4 w-4" />,
  }

  const thresholdText = higherIsBetter
    ? `Target: ≥${good}${unit}`
    : `Target: ≤${good}${unit}`

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3", colors[status])}>
      {icons[status]}
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs opacity-75">{thresholdText}</p>
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {value}{unit}
      </p>
    </div>
  )
}

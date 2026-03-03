"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getCampaignReport,
  getCouponReport,
  getJourneyReport,
  getAudienceHealth,
  getRevenueAttribution,
  exportReport,
} from "@/lib/api/admin-marketing"
import type {
  CampaignReport,
  CouponReport,
  JourneyReport,
  AudienceHealth,
  RevenueAttribution,
} from "@/lib/api/admin-marketing"
import {
  Send,
  Ticket,
  GitBranchPlus,
  UsersRound,
  DollarSign,
  Download,
  BarChart3,
  Mail,
  MousePointerClick,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"

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
  purple: { gradient: "from-violet-500 to-purple-600", bgAccent: "bg-violet-500" },
  default: { gradient: "from-slate-600 to-slate-800", bgAccent: "bg-slate-500" },
}

export default function MarketingReportsPage() {
  const [activeTab, setActiveTab] = useState("campaigns")
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportReport(activeTab)
    } catch (err) {
      console.error("Failed to export report:", err)
    } finally {
      setIsExporting(false)
    }
  }

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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketing Reports</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Performance analytics across campaigns, coupons, journeys, and audience
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </motion.div>

      {/* Tabbed Dashboard */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="campaigns" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5">
              <Ticket className="h-3.5 w-3.5" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="journeys" className="gap-1.5">
              <GitBranchPlus className="h-3.5 w-3.5" />
              Journeys
            </TabsTrigger>
            <TabsTrigger value="audience-health" className="gap-1.5">
              <UsersRound className="h-3.5 w-3.5" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="revenue-attribution" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Revenue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignReportTab />
          </TabsContent>
          <TabsContent value="coupons" className="mt-6">
            <CouponReportTab />
          </TabsContent>
          <TabsContent value="journeys" className="mt-6">
            <JourneyReportTab />
          </TabsContent>
          <TabsContent value="audience-health" className="mt-6">
            <AudienceHealthTab />
          </TabsContent>
          <TabsContent value="revenue-attribution" className="mt-6">
            <RevenueAttributionTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// ─── Campaign Report Tab ──────────────────────────────────────────

function CampaignReportTab() {
  const [campaigns, setCampaigns] = useState<CampaignReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState("30")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCampaignReport(Number(days))
      setCampaigns(data)
    } catch (err) {
      console.error("Failed to fetch campaign report:", err)
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent_count,
      delivered: acc.delivered + c.delivered_count,
      opened: acc.opened + c.opened_count,
      clicked: acc.clicked + c.clicked_count,
      bounced: acc.bounced + c.bounced_count,
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
  )

  const avgOpenRate = totals.delivered > 0
    ? ((totals.opened / totals.delivered) * 100).toFixed(1)
    : "0.0"
  const avgClickRate = totals.delivered > 0
    ? ((totals.clicked / totals.delivered) * 100).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-6">
      {/* Filter + Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Sent"
              value={totals.sent.toLocaleString()}
              icon={<Send className="h-4 w-4" />}
            />
            <StatCard
              title="Delivered"
              value={totals.delivered.toLocaleString()}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="green"
            />
            <StatCard
              title="Avg Open Rate"
              value={`${avgOpenRate}%`}
              icon={<Mail className="h-4 w-4" />}
              color="blue"
            />
            <StatCard
              title="Avg Click Rate"
              value={`${avgClickRate}%`}
              icon={<MousePointerClick className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              title="Bounced"
              value={totals.bounced.toLocaleString()}
              icon={<AlertTriangle className="h-4 w-4" />}
              color="red"
            />
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Send className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p>No campaigns sent in this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Clicked</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                  <TableHead className="text-right">Bounce Rate</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/admin/marketing/campaigns/${c.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {c.name}
                        </Link>
                        <CampaignStatusBadge status={c.status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.sent_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.delivered_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.opened_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.clicked_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <RateBadge value={c.open_rate} thresholds={[15, 25]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <RateBadge value={c.click_rate} thresholds={[2, 5]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <RateBadge value={c.bounce_rate} thresholds={[5, 2]} inverted />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {c.completed_at
                        ? new Date(c.completed_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Coupon Report Tab ────────────────────────────────────────────

function CouponReportTab() {
  const [coupons, setCoupons] = useState<CouponReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCouponReport()
        setCoupons(data)
      } catch (err) {
        console.error("Failed to fetch coupon report:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalDiscount = coupons.reduce((acc, c) => acc + c.total_discount, 0)
  const totalCredits = coupons.reduce((acc, c) => acc + c.total_credits, 0)
  const totalRedemptions = coupons.reduce((acc, c) => acc + c.redemption_count, 0)
  const activeCoupons = coupons.filter((c) => c.status === "active").length

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Active Coupons"
              value={String(activeCoupons)}
              icon={<Ticket className="h-4 w-4" />}
            />
            <StatCard
              title="Total Redemptions"
              value={totalRedemptions.toLocaleString()}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="green"
            />
            <StatCard
              title="Total Discount Given"
              value={`$${totalDiscount.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              title="Credits Issued"
              value={`$${totalCredits.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Ticket className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p>No coupons found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Redemptions</TableHead>
                  <TableHead className="text-right">Unique Users</TableHead>
                  <TableHead className="text-right">Total Discount</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/marketing/coupons/${c.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {c.code}
                      </code>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {c.discount_type.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <CouponStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.redemption_count.toLocaleString()}
                      {c.max_uses_total ? (
                        <span className="text-muted-foreground">
                          /{c.max_uses_total.toLocaleString()}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.unique_users.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${c.total_discount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Journey Report Tab ───────────────────────────────────────────

function JourneyReportTab() {
  const [journeys, setJourneys] = useState<JourneyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getJourneyReport()
        setJourneys(data)
      } catch (err) {
        console.error("Failed to fetch journey report:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalEnrollments = journeys.reduce((acc, j) => acc + j.enrollment_count, 0)
  const totalActive = journeys.reduce((acc, j) => acc + j.active_count, 0)
  const totalCompleted = journeys.reduce((acc, j) => acc + j.completed_count, 0)
  const totalEmails = journeys.reduce((acc, j) => acc + j.emails_sent, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Enrollments"
              value={totalEnrollments.toLocaleString()}
              icon={<UsersRound className="h-4 w-4" />}
            />
            <StatCard
              title="Active"
              value={totalActive.toLocaleString()}
              icon={<GitBranchPlus className="h-4 w-4" />}
              color="blue"
            />
            <StatCard
              title="Completed"
              value={totalCompleted.toLocaleString()}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="green"
            />
            <StatCard
              title="Emails Sent"
              value={totalEmails.toLocaleString()}
              icon={<Send className="h-4 w-4" />}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : journeys.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <GitBranchPlus className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p>No journeys found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journey</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Completion %</TableHead>
                  <TableHead className="text-right">Emails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journeys.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      <Link
                        href={`/admin/marketing/journeys/${j.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {j.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <JourneyStatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {j.trigger_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {j.enrollment_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {j.active_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {j.completed_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {j.failed_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <RateBadge value={j.completion_rate} thresholds={[30, 60]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {j.emails_sent.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Audience Health Tab ──────────────────────────────────────────

function AudienceHealthTab() {
  const [health, setHealth] = useState<AudienceHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState("30")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAudienceHealth(Number(days))
      setHealth(data)
    } catch (err) {
      console.error("Failed to fetch audience health:", err)
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : health ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Consents"
              value={health.total_consents.toLocaleString()}
              icon={<UsersRound className="h-4 w-4" />}
            />
            <StatCard
              title="Opted In"
              value={health.total_opted_in.toLocaleString()}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="green"
            />
            <StatCard
              title="Suppressed"
              value={health.total_suppressed.toLocaleString()}
              icon={<XCircle className="h-4 w-4" />}
              color="red"
            />
          </div>

          {/* Breakdowns */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Consent Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(health.consent_breakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            status === "opted_in" && "bg-green-500",
                            status === "opted_out" && "bg-gray-400",
                            status === "unsubscribed" && "bg-amber-500",
                            status === "bounced" && "bg-red-500",
                            status === "complained" && "bg-red-700",
                          )}
                        />
                        <span className="text-sm capitalize">
                          {status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Suppression Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(health.suppression_breakdown).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            reason === "bounce_hard" && "bg-red-500",
                            reason === "bounce_soft" && "bg-amber-500",
                            reason === "complaint" && "bg-red-700",
                            reason === "unsubscribe" && "bg-gray-400",
                            reason === "admin" && "bg-blue-500",
                            reason === "compliance" && "bg-purple-500",
                          )}
                        />
                        <span className="text-sm capitalize">
                          {reason.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trends */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Daily New Consents</CardTitle>
              </CardHeader>
              <CardContent>
                {health.consent_daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data for this period</p>
                ) : (
                  <DailyBarChart data={health.consent_daily} color="green" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Daily Suppressions</CardTitle>
              </CardHeader>
              <CardContent>
                {health.suppression_daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data for this period</p>
                ) : (
                  <DailyBarChart data={health.suppression_daily} color="red" />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Unable to load audience health data
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Revenue Attribution Tab ──────────────────────────────────────

function RevenueAttributionTab() {
  const [attribution, setAttribution] = useState<RevenueAttribution | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRevenueAttribution()
        setAttribution(data)
      } catch (err) {
        console.error("Failed to fetch revenue attribution:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : attribution ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Redemptions"
              value={attribution.total_redemptions.toLocaleString()}
              icon={<Ticket className="h-4 w-4" />}
            />
            <StatCard
              title="Total Discount Given"
              value={`$${attribution.total_discount.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              title="Coupons Used"
              value={String(attribution.by_coupon.length)}
              icon={<BarChart3 className="h-4 w-4" />}
              color="blue"
            />
          </div>

          {/* Attribution Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Revenue Attribution by Coupon</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attribution.by_coupon.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <DollarSign className="mx-auto h-8 w-8 mb-3 opacity-40" />
                  <p>No coupon redemptions to attribute</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coupon</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Redemptions</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Discount Given</TableHead>
                      <TableHead className="text-right">Credits Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attribution.by_coupon.map((item) => (
                      <TableRow key={item.coupon_id}>
                        <TableCell>
                          <Link
                            href={`/admin/marketing/coupons/${item.coupon_id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {item.coupon_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.coupon_code}
                          </code>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {item.discount_type.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.redemption_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.unique_users.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${item.total_discount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${item.total_credits.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Unable to load revenue attribution data
          </CardContent>
        </Card>
      )}
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
  value: string
  icon: React.ReactNode
  color?: string
}) {
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
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
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

function RateBadge({
  value,
  thresholds,
  inverted = false,
}: {
  value: number
  thresholds: [number, number]
  inverted?: boolean
}) {
  const [low, high] = thresholds
  let variant: "default" | "destructive" | "secondary" = "secondary"

  if (inverted) {
    if (value > low) variant = "destructive"
    else if (value <= high) variant = "default"
  } else {
    if (value >= high) variant = "default"
    else if (value < low) variant = "destructive"
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        "text-xs tabular-nums",
        variant === "default" && "bg-green-100 text-green-700 hover:bg-green-100",
        variant === "destructive" && "bg-red-100 text-red-700 hover:bg-red-100",
      )}
    >
      {value.toFixed(1)}%
    </Badge>
  )
}

function CampaignStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    sent: "bg-green-100 text-green-700",
    sending: "bg-blue-100 text-blue-700",
    scheduled: "bg-amber-100 text-amber-700",
    draft: "bg-gray-100 text-gray-600",
    failed: "bg-red-100 text-red-700",
    paused: "bg-amber-100 text-amber-700",
    canceled: "bg-gray-100 text-gray-600",
  }
  return (
    <Badge
      variant="secondary"
      className={cn("ml-2 text-[10px] capitalize", colors[status])}
    >
      {status}
    </Badge>
  )
}

function CouponStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-amber-100 text-amber-700",
    expired: "bg-gray-100 text-gray-600",
    exhausted: "bg-red-100 text-red-700",
  }
  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px] capitalize", colors[status])}
    >
      {status}
    </Badge>
  )
}

function JourneyStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-600",
    paused: "bg-amber-100 text-amber-700",
    archived: "bg-gray-100 text-gray-600",
  }
  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px] capitalize", colors[status])}
    >
      {status}
    </Badge>
  )
}

function DailyBarChart({
  data,
  color,
}: {
  data: Array<{ date: string; count: number }>
  color: "green" | "red" | "blue" | "amber"
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const barColor = {
    green: "bg-green-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  }[color]

  return (
    <div className="space-y-1.5">
      {data.slice(-14).map((d) => (
        <div key={d.date} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0 tabular-nums">
            {new Date(d.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
            <div
              className={cn("h-full rounded-sm transition-all", barColor)}
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}

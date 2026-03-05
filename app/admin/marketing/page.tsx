"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CHART, STATUS } from "@/lib/constants/colors"
import { getMarketingOverview } from "@/lib/api/admin-marketing"
import type { MarketingOverview } from "@/lib/api/admin-marketing"
import dynamic from "next/dynamic"
import {
  UsersRound,
  Send,
  Ticket,
  GitBranchPlus,
  ArrowRight,
  TrendingUp,
  Users,
  Mail,
  MousePointerClick,
  BarChart3,
  Megaphone,
  Zap,
  Target,
  Gift,
} from "lucide-react"

const SparklineChart = dynamic(() => import("@/components/charts/sparkline-chart"), { ssr: false })

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

const cardHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
}

export default function MarketingOverviewPage() {
  const [overview, setOverview] = useState<MarketingOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getMarketingOverview()
      setOverview(data)
    } catch (err) {
      console.error("Failed to fetch marketing overview:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-destructive to-destructive-deep flex items-center justify-center shadow-lg shadow-destructive/20">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Audiences, campaigns, journeys, and promotions
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/admin/marketing/reports">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : overview ? (
          <>
            <StatCard
              title="Total Contacts"
              value={overview.total_contacts}
              icon={<Users className="h-4 w-4" />}
              gradient="from-slate-600 to-slate-800"
              bgAccent="bg-slate-500"
              sparkColor={CHART.slate}
              sparkData={generateTrend(overview.total_contacts, 12, 0.06, "up")}
              chartType="area"
            />
            <StatCard
              title="Consent Rate"
              value={`${overview.consent_rate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              bgAccent="bg-sky"
              sparkColor={STATUS.info}
              sparkData={generateTrend(overview.consent_rate, 8, 0.03, "up")}
              chartType="area"
              isPercentage
            />
            <StatCard
              title="Avg Open Rate"
              value={`${overview.avg_open_rate}%`}
              icon={<Mail className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
              sparkColor={CHART.success}
              sparkData={generateTrend(overview.avg_open_rate, 8, 0.05, "steady")}
              chartType="bar"
              isPercentage
            />
            <StatCard
              title="Avg Click Rate"
              value={`${overview.avg_click_rate}%`}
              icon={<MousePointerClick className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              bgAccent="bg-amber-500"
              sparkColor={CHART.warning}
              sparkData={generateTrend(overview.avg_click_rate, 8, 0.08, "up")}
              chartType="bar"
              isPercentage
            />
            <StatCard
              title="Redemptions (30d)"
              value={overview.redemptions_30d}
              icon={<Ticket className="h-4 w-4" />}
              gradient="from-primary to-primary-hover"
              bgAccent="bg-primary"
              sparkColor={CHART.purple}
              sparkData={generateTrend(overview.redemptions_30d, 12, 0.1, "up")}
              chartType="area"
            />
          </>
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              Unable to load marketing data
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Channel Summary Cards */}
      {overview && !isLoading && (
        <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <ChannelCard
            title="Campaigns"
            icon={<Send className="h-4 w-4" />}
            color="blue"
            metrics={[
              { label: "Total", value: String(overview.campaigns_total) },
              { label: "Sent", value: String(overview.campaigns_sent) },
              { label: "Emails Sent", value: overview.total_emails_sent.toLocaleString() },
              { label: "Delivered", value: overview.total_emails_delivered.toLocaleString() },
            ]}
          />
          <ChannelCard
            title="Coupons"
            icon={<Ticket className="h-4 w-4" />}
            color="emerald"
            metrics={[
              { label: "Active", value: String(overview.coupons_active) },
              { label: "Redemptions", value: String(overview.total_redemptions) },
              { label: "Total Discount Given", value: `$${overview.total_discount_given.toLocaleString()}`, span: true },
            ]}
          />
          <ChannelCard
            title="Journeys"
            icon={<GitBranchPlus className="h-4 w-4" />}
            color="violet"
            metrics={[
              { label: "Active", value: String(overview.journeys_active) },
              { label: "Enrollments", value: String(overview.active_enrollments) },
              { label: "Completed", value: String(overview.completed_enrollments), span: true },
            ]}
          />
          <ChannelCard
            title="Audience"
            icon={<UsersRound className="h-4 w-4" />}
            color="amber"
            metrics={[
              { label: "Opted In", value: String(overview.opted_in) },
              { label: "Suppressed", value: String(overview.suppressed) },
              { label: "Segments", value: String(overview.segments_count), span: true },
            ]}
          />
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <p className="text-xs font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Quick Actions</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Audiences"
            description="Segments, consents & suppression lists"
            href="/admin/marketing/audiences"
            icon={<Target className="h-5 w-5" />}
            stats={overview ? `${overview.segments_count} segments` : undefined}
            accentColor="from-amber-500 to-orange-500"
          />
          <QuickActionCard
            title="Campaigns"
            description="Email campaigns to targeted segments"
            href="/admin/marketing/campaigns"
            icon={<Send className="h-5 w-5" />}
            stats={overview ? `${overview.campaigns_sent} sent` : undefined}
            accentColor="from-sky to-sky-deep"
          />
          <QuickActionCard
            title="Journeys"
            description="Automated marketing workflows"
            href="/admin/marketing/journeys"
            icon={<Zap className="h-5 w-5" />}
            stats={overview ? `${overview.journeys_active} active` : undefined}
            accentColor="from-primary-light to-primary"
          />
          <QuickActionCard
            title="Coupons & Credits"
            description="Discount codes & store credits"
            href="/admin/marketing/coupons"
            icon={<Gift className="h-5 w-5" />}
            stats={overview ? `${overview.coupons_active} active` : undefined}
            accentColor="from-emerald-500 to-teal-500"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Generate deterministic sparkline trend data from a final value */
function generateTrend(
  finalValue: number,
  points: number,
  variance: number,
  direction: "up" | "down" | "steady"
): { v: number }[] {
  const data: { v: number }[] = []
  // Use a minimum base so sparklines are visible even when value is 0
  const raw = typeof finalValue === "number" ? finalValue : 0
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
    // Use sine-based pseudo-random for consistent renders
    const noise = Math.sin(i * 4.7 + base * 0.01) * variance * base
    data.push({ v: Math.max(0, base * modifier + noise) })
  }
  return data
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  bgAccent,
  sparkColor,
  sparkData,
  chartType = "area",
  isPercentage,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  gradient: string
  bgAccent: string
  sparkColor: string
  sparkData: { v: number }[]
  chartType?: "area" | "bar"
  isPercentage?: boolean
}) {
  const formattedValue = isPercentage
    ? value
    : typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value

  return (
    <Card className="relative overflow-hidden group">
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{formattedValue}</p>
        <div className="mt-2 h-10 -mx-1">
          <SparklineChart
            data={sparkData}
            color={sparkColor}
            type={chartType}
            gradientId={`spark-${title.replace(/\s/g, "")}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ChannelCard({
  title,
  icon,
  color,
  metrics,
}: {
  title: string
  icon: React.ReactNode
  color: "blue" | "emerald" | "violet" | "amber"
  metrics: { label: string; value: string; span?: boolean }[]
}) {
  const colorMap = {
    blue: {
      gradient: "from-sky to-sky-deep",
      bg: "bg-sky/10 dark:bg-sky/10",
      text: "text-sky dark:text-sky",
      border: "border-sky/20 dark:border-sky/20",
      bar: "from-sky via-sky to-sky-deep",
    },
    emerald: {
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-900/50",
      bar: "from-emerald-400 via-emerald-500 to-teal-600",
    },
    violet: {
      gradient: "from-primary-light to-primary",
      bg: "bg-primary/10 dark:bg-primary/10",
      text: "text-primary dark:text-primary",
      border: "border-primary/20 dark:border-primary/20",
      bar: "from-primary-light via-primary to-primary-hover",
    },
    amber: {
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-900/50",
      bar: "from-amber-400 via-amber-500 to-orange-500",
    },
  }

  const c = colorMap[color]

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", c.bar)} />
      <CardContent className="p-5 pt-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.bg, c.text)}>
            {icon}
          </div>
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {metrics.map((m) => (
            <div key={m.label} className={m.span ? "col-span-2" : ""}>
              <p className="text-muted-foreground text-xs">{m.label}</p>
              <p className="font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  stats,
  accentColor,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  stats?: string
  accentColor: string
}) {
  return (
    <Link href={href}>
      <motion.div
        initial="rest"
        whileHover="hover"
        variants={cardHoverVariants}
      >
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/5 cursor-pointer border-transparent hover:border-primary/15">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="p-5 relative">
            <div className="flex items-start justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md", accentColor)}>
                {icon}
              </div>
              {stats && (
                <Badge variant="secondary" className="text-xs font-medium tabular-nums">
                  {stats}
                </Badge>
              )}
            </div>
            <div className="mt-3.5">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
            <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1.5 group-hover:gap-2.5 transition-all duration-300">
              Manage
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}

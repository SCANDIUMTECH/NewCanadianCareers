"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"
import {
  FileText,
  Eye,
  Users,
  TrendingUp,
  Clock,
  Briefcase,
  Flag,
  Mail,
  Calendar,
} from "lucide-react"

const DONUT_PALETTE = [CHART.primary, CHART.success, CHART.warning, CHART.purple, CHART.danger, CHART.cyan] as const

const RADIAN = Math.PI / 180

const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  customer_support: "Customer Support",
  finance: "Finance",
  hr: "Human Resources",
  operations: "Operations",
  product: "Product",
  data: "Data & Analytics",
  legal: "Legal",
  other: "Other",
}

function formatCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] || slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function renderSliceLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function renderOuterLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  outerRadius: number
  name: string
  percent: number
}) {
  if (percent < 0.03) return null
  const sin = Math.sin(-midAngle * RADIAN)
  const cos = Math.cos(-midAngle * RADIAN)
  const sx = cx + (outerRadius + 4) * cos
  const sy = cy + (outerRadius + 4) * sin
  const mx = cx + (outerRadius + 18) * cos
  const my = cy + (outerRadius + 18) * sin
  const ex = mx + (cos >= 0 ? 8 : -8)
  const ey = my
  const textAnchor = cos >= 0 ? "start" : "end"

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="#94A3B8"
        fill="none"
        strokeWidth={1}
      />
      <circle cx={sx} cy={sy} r={2} fill="#94A3B8" />
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="fill-foreground"
        fontSize={12}
        fontWeight={500}
      >
        {name}
      </text>
    </g>
  )
}

interface JobPerformanceChartProps {
  jobId: string
  views: number
  applications: number
  reportCount: number
  conversionRate: string
  daysActive: number
  category: string
  createdBy: string
  lastModified: string
}

export default function JobPerformanceChart({
  jobId,
  views,
  applications,
  reportCount,
  conversionRate,
  daysActive,
  category,
  createdBy,
  lastModified,
}: JobPerformanceChartProps) {
  const total = views || 1
  const viewsOnly = Math.max(views - applications - reportCount, 0)

  const chartData = useMemo(() => {
    return [
      { name: "Views", value: viewsOnly || 1 },
      { name: "Applied", value: applications || 0 },
      { name: "Reports", value: reportCount || 0 },
    ].filter((d) => d.value > 0)
  }, [viewsOnly, applications, reportCount])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="w-[200px] h-[200px] flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="var(--card)"
                    label={renderOuterLabel}
                    labelLine={false}
                    isAnimationActive={true}
                    animationBegin={100}
                    animationDuration={600}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={entry.name} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
                    ))}
                  </Pie>
                  {/* inner label layer (percentage on slice) */}
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    fill="transparent"
                    label={renderSliceLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={`inner-${entry.name}`} fill="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold leading-none">{total.toLocaleString()}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">total views</span>
              </div>
            </div>

            {/* Right-side metrics grid — 3 columns to densify */}
            <div className="flex-1 grid grid-cols-3 gap-x-6 gap-y-3.5">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Job ID
                </p>
                <p className="text-lg font-semibold mt-0.5 font-mono">#{jobId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Views
                </p>
                <p className="text-lg font-semibold mt-0.5">{views.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Applications
                </p>
                <p className="text-lg font-semibold mt-0.5">{applications}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  Conversion
                </p>
                <p className="text-lg font-semibold text-emerald-600 mt-0.5">{conversionRate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Days Active
                </p>
                <p className="text-lg font-semibold mt-0.5">{daysActive}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  Category
                </p>
                <p className="text-sm font-medium text-primary mt-0.5">{formatCategoryLabel(category)}</p>
              </div>
              {reportCount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-red-500" />
                    Reports
                  </p>
                  <p className="text-lg font-semibold text-red-600 mt-0.5">{reportCount}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Last Modified
                </p>
                <p className="text-sm font-medium mt-0.5">{new Date(lastModified).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Created By
                </p>
                <p className="text-sm font-medium mt-0.5 truncate">{createdBy}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

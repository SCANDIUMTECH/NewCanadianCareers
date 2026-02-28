"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"
import type { AdminDashboardTrendPoint } from "@/lib/admin/types"

interface AdminJobsTrendChartProps {
  data: AdminDashboardTrendPoint[]
}

export default function AdminJobsTrendChart({ data }: AdminJobsTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART.success} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART.success} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: CHART.tick }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.tick }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="applications"
          stroke={CHART.success}
          strokeWidth={2}
          fill="url(#colorApps)"
          name="Applications"
        />
        <Area
          type="monotone"
          dataKey="jobs"
          stroke={CHART.primary}
          strokeWidth={2}
          fill="url(#colorJobs)"
          name="Jobs"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

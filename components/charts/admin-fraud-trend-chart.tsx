"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"
import type { FraudTrend } from "@/lib/admin/types"

interface AdminFraudTrendChartProps {
  data: FraudTrend[]
}

export default function AdminFraudTrendChart({ data }: AdminFraudTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.danger} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART.danger} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.success} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART.success} stopOpacity={0} />
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
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
        />
        <Area
          type="monotone"
          dataKey="alerts"
          stroke={CHART.danger}
          strokeWidth={2}
          fill="url(#alertGradient)"
          name="Alerts"
        />
        <Area
          type="monotone"
          dataKey="blocked"
          stroke={CHART.success}
          strokeWidth={2}
          fill="url(#blockedGradient)"
          name="Blocked"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

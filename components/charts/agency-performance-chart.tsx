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

interface AgencyPerformanceChartProps {
  data: { date: string; views: number; applies: number }[]
  colors: { views: string; applies: string; grid: string }
}

export default function AgencyPerformanceChart({ data, colors }: AgencyPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="agencyViewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.views} stopOpacity={0.2} />
            <stop offset="95%" stopColor={colors.views} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="agencyAppliesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.applies} stopOpacity={0.2} />
            <stop offset="95%" stopColor={colors.applies} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: CHART.tick }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: CHART.tick }}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke={colors.views}
          strokeWidth={2}
          fill="url(#agencyViewsGradient)"
        />
        <Area
          type="monotone"
          dataKey="applies"
          stroke={colors.applies}
          strokeWidth={2}
          fill="url(#agencyAppliesGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

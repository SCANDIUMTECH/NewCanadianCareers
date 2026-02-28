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

interface ViewsDataPoint {
  date: string
  views: number
  applies: number
  conversions: number
}

interface AgencyAnalyticsPerformanceChartProps {
  data: ViewsDataPoint[]
}

const chartColors = {
  views: CHART.primary,
  applies: CHART.success,
  grid: CHART.grid,
}

export default function AgencyAnalyticsPerformanceChart({ data }: AgencyAnalyticsPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.tick }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.tick }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="views" stroke={chartColors.views} strokeWidth={2} fill="url(#viewsGradient)" />
        <Area type="monotone" dataKey="applies" stroke={chartColors.applies} strokeWidth={2} fill="url(#appliesGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

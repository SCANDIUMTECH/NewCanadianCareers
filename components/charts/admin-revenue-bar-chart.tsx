"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"
import type { AdminDashboardTrendPoint } from "@/lib/admin/types"

interface AdminRevenueBarChartProps {
  data: AdminDashboardTrendPoint[]
}

export default function AdminRevenueBarChart({ data }: AdminRevenueBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
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
          tickFormatter={(value) => `$${value / 1000}k`}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill={CHART.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

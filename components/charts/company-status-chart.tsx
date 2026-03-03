"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"

interface StatusDataPoint {
  status: string
  count: number
  color: string
}

interface CompanyStatusChartProps {
  data: StatusDataPoint[]
}

export default function CompanyStatusChart({ data }: CompanyStatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="status"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: CHART.tick }}
          width={80}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          fill={CHART.primary}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

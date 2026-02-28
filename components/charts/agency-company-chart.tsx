"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CHART, CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"

interface CompanyPerformancePoint {
  name: string
  views: number
  applies: number
  conversion: number
  color: string
}

interface AgencyCompanyChartProps {
  data: CompanyPerformancePoint[]
}

const chartColors = {
  views: CHART.primary,
  applies: CHART.success,
  grid: CHART.grid,
}

export default function AgencyCompanyChart({ data }: AgencyCompanyChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.tick }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.tick }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend />
        <Bar dataKey="views" name="Views" fill={chartColors.views} radius={[4, 4, 0, 0]} />
        <Bar dataKey="applies" name="Applications" fill={chartColors.applies} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

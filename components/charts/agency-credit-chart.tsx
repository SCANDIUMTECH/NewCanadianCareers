"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"

interface AgencyCreditChartProps {
  data: { name: string; value: number; color: string }[]
}

export default function AgencyCreditChart({ data }: AgencyCreditChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

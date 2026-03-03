"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
} from "recharts"

interface SparklineChartProps {
  data: { v: number }[]
  color: string
  type?: "area" | "bar"
  gradientId: string
}

export default function SparklineChart({
  data,
  color,
  type = "area",
  gradientId,
}: SparklineChartProps) {
  if (!data || data.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "bar" ? (
        <BarChart data={data} barCategoryGap="15%">
          <Bar dataKey="v" fill={color} opacity={0.3} radius={[2, 2, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}

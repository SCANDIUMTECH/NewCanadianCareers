"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CHART_TOOLTIP_STYLE } from "@/lib/constants/colors"

interface DonutChartCardProps {
  title: string
  data: Array<{ name: string; value: number; color: string }>
  centerLabel: string
  centerSublabel: string
}

export default function DonutChartCard({
  title,
  data,
  centerLabel,
  centerSublabel,
}: DonutChartCardProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data available</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) => [value.toLocaleString(), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold tabular-nums">{centerLabel}</span>
                <span className="text-xs text-muted-foreground">{centerSublabel}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-2">
              {data.map((entry) => {
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"
                return (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm capitalize">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {entry.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

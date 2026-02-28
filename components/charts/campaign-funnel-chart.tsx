"use client"

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"
import { CHART, STATUS } from "@/lib/constants/colors"

export interface CampaignFunnelData {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
}

interface CampaignFunnelChartProps {
  data: CampaignFunnelData
}

export default function CampaignFunnelChart({ data }: CampaignFunnelChartProps) {
  const bars = [
    { name: "Sent", value: data.sent, fill: CHART.indigo },
    { name: "Delivered", value: data.delivered, fill: CHART.success },
    { name: "Opened", value: data.opened, fill: CHART.warning },
    { name: "Clicked", value: data.clicked, fill: CHART.purple },
    { name: "Bounced", value: data.bounced, fill: CHART.danger },
    { name: "Unsub", value: data.unsubscribed, fill: STATUS.draft },
  ]

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
          layout="horizontal"
          barCategoryGap="18%"
        >
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
            formatter={(value: number) => [value.toLocaleString(), "Count"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {bars.map((entry, index) => (
              <Cell key={index} fill={entry.fill} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// Mock fraud data
const fraudAlerts = [
  {
    id: "FRD-001",
    type: "multiple_accounts",
    severity: "high",
    description: "Same device fingerprint across 12 accounts",
    ip: "192.168.1.45",
    timestamp: "2024-01-15T10:30:00",
    status: "open",
    accounts: ["user_a1b2c3", "user_d4e5f6", "user_g7h8i9"],
  },
  {
    id: "FRD-002",
    type: "suspicious_activity",
    severity: "critical",
    description: "Bot-like application pattern - 200+ applications in 1 hour",
    ip: "10.0.0.123",
    timestamp: "2024-01-15T09:15:00",
    status: "investigating",
    accounts: ["mass_applier_01"],
  },
  {
    id: "FRD-003",
    type: "payment_fraud",
    severity: "critical",
    description: "Chargeback pattern detected - 5 chargebacks in 7 days",
    ip: "172.16.0.89",
    timestamp: "2024-01-15T08:45:00",
    status: "open",
    accounts: ["company_xyz"],
  },
  {
    id: "FRD-004",
    type: "fake_listings",
    severity: "medium",
    description: "Job posting matches known scam template",
    ip: "192.168.2.100",
    timestamp: "2024-01-14T22:30:00",
    status: "resolved",
    accounts: ["recruiter_fake01"],
  },
  {
    id: "FRD-005",
    type: "credential_stuffing",
    severity: "high",
    description: "500+ failed login attempts from single IP range",
    ip: "203.0.113.0/24",
    timestamp: "2024-01-14T18:00:00",
    status: "blocked",
    accounts: [],
  },
]

const fraudTrendData = [
  { date: "Jan 9", alerts: 12, blocked: 8 },
  { date: "Jan 10", alerts: 18, blocked: 15 },
  { date: "Jan 11", alerts: 8, blocked: 6 },
  { date: "Jan 12", alerts: 24, blocked: 20 },
  { date: "Jan 13", alerts: 15, blocked: 12 },
  { date: "Jan 14", alerts: 20, blocked: 18 },
  { date: "Jan 15", alerts: 28, blocked: 22 },
]

const severityColors = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

const statusColors = {
  open: "bg-red-500/10 text-red-600",
  investigating: "bg-yellow-500/10 text-yellow-600",
  resolved: "bg-green-500/10 text-green-600",
  blocked: "bg-foreground/10 text-foreground",
}

const typeLabels: Record<string, string> = {
  multiple_accounts: "Multiple Accounts",
  suspicious_activity: "Suspicious Activity",
  payment_fraud: "Payment Fraud",
  fake_listings: "Fake Listings",
  credential_stuffing: "Credential Stuffing",
}

export default function FraudPage() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredAlerts = fraudAlerts.filter((alert) => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false
    if (filterStatus !== "all" && alert.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: fraudAlerts.length,
    critical: fraudAlerts.filter((a) => a.severity === "critical").length,
    open: fraudAlerts.filter((a) => a.status === "open").length,
    blocked: fraudAlerts.filter((a) => a.status === "blocked").length,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fraud Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Real-time fraud detection and prevention
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export Report
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground">
            Configure Rules
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Alerts", value: stats.total, color: "text-foreground" },
          { label: "Critical", value: stats.critical, color: "text-red-600" },
          { label: "Open Cases", value: stats.open, color: "text-orange-600" },
          { label: "Blocked", value: stats.blocked, color: "text-green-600" },
        ].map((stat, i) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-semibold mt-1", stat.color)}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">7-Day Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fraudTrendData}>
                  <defs>
                    <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#alertGradient)"
                    name="Alerts"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fill="url(#blockedGradient)"
                    name="Blocked"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-3"
      >
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Alerts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredAlerts.map((alert, index) => (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "border-border/50 cursor-pointer transition-colors",
                        selectedAlert === alert.id 
                          ? "bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedAlert(
                        selectedAlert === alert.id ? null : alert.id
                      )}
                    >
                      <TableCell className="font-mono text-sm">{alert.id}</TableCell>
                      <TableCell>
                        <span className="text-sm">{typeLabels[alert.type]}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {alert.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {alert.ip}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs capitalize",
                            severityColors[alert.severity as keyof typeof severityColors]
                          )}
                        >
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs capitalize",
                            statusColors[alert.status as keyof typeof statusColors]
                          )}
                        >
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Alert Detail */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-border/50 border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Alert Details - {selectedAlert}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const alert = fraudAlerts.find((a) => a.id === selectedAlert)
                  if (!alert) return null
                  return (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm font-medium mt-1">{alert.description}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Timestamp</p>
                          <p className="text-sm font-medium mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Affected Accounts</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {alert.accounts.length > 0 ? (
                              alert.accounts.map((acc) => (
                                <code 
                                  key={acc}
                                  className="text-xs bg-muted px-2 py-1 rounded"
                                >
                                  {acc}
                                </code>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None identified</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline">
                            Block IP
                          </Button>
                          <Button size="sm" variant="outline">
                            Suspend Accounts
                          </Button>
                          <Button size="sm" className="bg-primary text-primary-foreground">
                            Mark Resolved
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// Sample audit log data
const auditLogs = [
  {
    id: 1,
    actor: "Sarah Admin",
    actorRole: "Super Admin",
    action: "job.approve",
    targetType: "Job",
    targetId: "job_123",
    targetName: "Senior Software Engineer",
    timestamp: "2024-03-15 14:32:45",
    reason: "Content verified",
    changes: { status: { from: "pending", to: "published" } },
  },
  {
    id: 2,
    actor: "Mike Ops",
    actorRole: "Ops Admin",
    action: "company.suspend",
    targetType: "Company",
    targetId: "company_456",
    targetName: "QuickHire Solutions",
    timestamp: "2024-03-15 13:18:22",
    reason: "Repeated policy violations",
    changes: { status: { from: "active", to: "suspended" } },
  },
  {
    id: 3,
    actor: "System",
    actorRole: "Automated",
    action: "entitlement.expire",
    targetType: "Entitlement",
    targetId: "ent_789",
    targetName: "Premium Package - TechCorp",
    timestamp: "2024-03-15 12:00:00",
    reason: "Subscription ended",
    changes: { status: { from: "active", to: "expired" }, credits: { from: 5, to: 0 } },
  },
  {
    id: 4,
    actor: "Sarah Admin",
    actorRole: "Super Admin",
    action: "feature_flag.toggle",
    targetType: "Feature Flag",
    targetId: "flag_social_dist",
    targetName: "Social Distribution",
    timestamp: "2024-03-15 11:45:00",
    reason: "Enabling for all users",
    changes: { enabled: { from: false, to: true } },
  },
  {
    id: 5,
    actor: "Jane Billing",
    actorRole: "Billing Admin",
    action: "entitlement.grant",
    targetType: "Entitlement",
    targetId: "ent_012",
    targetName: "Starter Package - DesignCo",
    timestamp: "2024-03-15 10:22:15",
    reason: "Promotional credit",
    changes: { credits: { from: 0, to: 3 } },
  },
  {
    id: 6,
    actor: "Mike Ops",
    actorRole: "Ops Admin",
    action: "user.password_reset",
    targetType: "User",
    targetId: "user_345",
    targetName: "john.doe@example.com",
    timestamp: "2024-03-15 09:15:00",
    reason: "User request via support ticket #1234",
    changes: null,
  },
]

const actionColors: Record<string, string> = {
  approve: "bg-green-100 text-green-700",
  suspend: "bg-red-100 text-red-700",
  expire: "bg-gray-100 text-gray-700",
  toggle: "bg-blue-100 text-blue-700",
  grant: "bg-purple-100 text-purple-700",
  password_reset: "bg-amber-100 text-amber-700",
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function AuditPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null)

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = actionFilter === "all" || log.action.includes(actionFilter)
    return matchesSearch && matchesAction
  })

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of all administrative actions
          </p>
        </div>
        <Button variant="outline">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={itemVariants}>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              Audit logs are immutable and cannot be modified or deleted. All sensitive actions require a reason.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by actor, target, or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="approve">Approvals</SelectItem>
                  <SelectItem value="suspend">Suspensions</SelectItem>
                  <SelectItem value="grant">Grants</SelectItem>
                  <SelectItem value="toggle">Toggles</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="today">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={cn(
                          "text-[10px]",
                          log.actorRole === "Automated" ? "bg-gray-100 text-gray-600" : "bg-primary/10 text-primary"
                        )}>
                          {log.actor === "System" ? "SYS" : log.actor.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{log.actor}</p>
                        <p className="text-xs text-muted-foreground">{log.actorRole}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-mono text-xs",
                        Object.entries(actionColors).find(([key]) => log.action.includes(key))?.[1] || "bg-gray-100"
                      )}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{log.targetName}</p>
                      <p className="text-xs text-muted-foreground">{log.targetType} • {log.targetId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {log.reason}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog?.timestamp}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedLog.actor}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.actorRole}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge variant="secondary" className="font-mono mt-1">
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-medium">{selectedLog.targetName}</p>
                <p className="text-xs text-muted-foreground">{selectedLog.targetType} • {selectedLog.targetId}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm mt-1">{selectedLog.reason}</p>
              </div>

              {selectedLog.changes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Changes</p>
                  <ScrollArea className="h-[120px] rounded-lg border bg-muted/30 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

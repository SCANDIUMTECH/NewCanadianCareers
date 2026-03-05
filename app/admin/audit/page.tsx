"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Download,
  ScrollText,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Building2,
  Briefcase,
  Package,
  ToggleLeft,
  CreditCard,
  Bot,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { getAuditLogs, exportAuditLogs } from "@/lib/api/admin-audit"
import type {
  AuditLog,
  AuditLogAction,
  AuditLogFilters,
  PaginatedResponse,
} from "@/lib/admin/types"

// =============================================================================
// Constants
// =============================================================================

const actionConfig: Record<string, { label: string; color: string }> = {
  create: { label: "Create", color: "bg-green-100 text-green-700" },
  update: { label: "Update", color: "bg-sky/10 text-sky" },
  delete: { label: "Delete", color: "bg-red-100 text-red-700" },
  suspend: { label: "Suspend", color: "bg-red-100 text-red-700" },
  activate: { label: "Activate", color: "bg-green-100 text-green-700" },
  verify: { label: "Verify", color: "bg-emerald-100 text-emerald-700" },
  approve: { label: "Approve", color: "bg-green-100 text-green-700" },
  reject: { label: "Reject", color: "bg-red-100 text-red-700" },
  grant: { label: "Grant", color: "bg-primary/10 text-primary" },
  revoke: { label: "Revoke", color: "bg-orange-100 text-orange-700" },
  login: { label: "Login", color: "bg-gray-100 text-gray-700" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-700" },
  impersonate: { label: "Impersonate", color: "bg-amber-100 text-amber-700" },
}

const targetTypeIcons: Record<string, typeof User> = {
  user: User,
  company: Building2,
  agency: Building2,
  job: Briefcase,
  entitlement: Package,
  package: Package,
  featureflag: ToggleLeft,
  banner: CreditCard,
}

const PAGE_SIZE = 20

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// =============================================================================
// Component
// =============================================================================

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<AuditLogAction | "all">("all")
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [exporting, setExporting] = useState(false)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, actionFilter, targetTypeFilter])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const filters: AuditLogFilters = {
        page: currentPage,
        page_size: PAGE_SIZE,
        ordering: '-created_at',
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (actionFilter !== 'all') filters.action = actionFilter
      if (targetTypeFilter !== 'all') filters.target_type = targetTypeFilter

      const data: PaginatedResponse<AuditLog> = await getAuditLogs(filters)
      setLogs(data.results)
      setTotalCount(data.count)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, actionFilter, targetTypeFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleExport = async () => {
    setExporting(true)
    try {
      const filters: AuditLogFilters = {}
      if (debouncedSearch) filters.search = debouncedSearch
      if (actionFilter !== 'all') filters.action = actionFilter
      if (targetTypeFilter !== 'all') filters.target_type = targetTypeFilter

      const blob = await exportAuditLogs(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export audit logs:', error)
    } finally {
      setExporting(false)
    }
  }

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getRelativeTime = (ts: string) => {
    const now = Date.now()
    const diff = now - new Date(ts).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return undefined
  }

  const getActorInitials = (log: AuditLog) => {
    if (!log.actor_name || log.actor_name === 'None') return 'SYS'
    return log.actor_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getActorDisplay = (log: AuditLog) => {
    if (!log.actor) return 'System'
    return log.actor_name || log.actor_email || `User #${log.actor}`
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ScrollText className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Immutable record of all administrative actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={itemVariants}>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="text-sm text-amber-800">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by target, actor, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditLogAction | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="suspend">Suspend</SelectItem>
                  <SelectItem value="activate">Activate</SelectItem>
                  <SelectItem value="verify">Verify</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="revoke">Revoke</SelectItem>
                  <SelectItem value="impersonate">Impersonate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Target Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="company">Companies</SelectItem>
                  <SelectItem value="agency">Agencies</SelectItem>
                  <SelectItem value="job">Jobs</SelectItem>
                  <SelectItem value="entitlement">Entitlements</SelectItem>
                  <SelectItem value="package">Packages</SelectItem>
                  <SelectItem value="featureflag">Feature Flags</SelectItem>
                  <SelectItem value="banner">Banners</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[140px]" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-5 w-[80px] rounded-full" />
                  <Skeleton className="h-4 w-[160px]" />
                  <Skeleton className="h-4 w-[120px] ml-auto" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 mx-auto mb-4">
                <ScrollText className="h-7 w-7 text-amber-500/50" />
              </div>
              <h3 className="text-lg font-medium">No audit logs found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {debouncedSearch || actionFilter !== 'all' || targetTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Audit logs will appear here as admin actions are performed'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="w-[110px]">Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right w-[80px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const TargetIcon = targetTypeIcons[log.target_type] || Briefcase
                    const actionCfg = actionConfig[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' }
                    const relTime = getRelativeTime(log.created_at)
                    const isSensitive = ['delete', 'suspend', 'impersonate', 'revoke'].includes(log.action)

                    return (
                      <TableRow
                        key={log.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSensitive && "bg-red-50/30 hover:bg-red-50/50",
                          !isSensitive && "hover:bg-muted/50",
                        )}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">
                              {formatTimestamp(log.created_at)}
                            </p>
                            {relTime && (
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{relTime}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback
                                className={cn(
                                  "text-[10px] font-medium",
                                  !log.actor
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-gradient-to-br from-primary/10 to-sky/10 text-primary"
                                )}
                              >
                                {!log.actor ? (
                                  <Bot className="h-3.5 w-3.5" />
                                ) : (
                                  getActorInitials(log)
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{getActorDisplay(log)}</p>
                              {log.actor_email && log.actor_name && (
                                <p className="text-[11px] text-muted-foreground truncate">{log.actor_email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[11px] font-medium", actionCfg.color)}
                          >
                            {isSensitive && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {actionCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                              "bg-muted/80 text-muted-foreground"
                            )}>
                              <TargetIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm truncate">{log.target_repr || log.target_id}</p>
                              <p className="text-[11px] text-muted-foreground capitalize">
                                {log.target_type}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {log.reason || <span className="text-muted-foreground/40">—</span>}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} logs
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatTimestamp(selectedLog.created_at)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Actor + Action row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actor</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn(
                        "text-[9px] font-medium",
                        !selectedLog.actor
                          ? "bg-gray-100 text-gray-500"
                          : "bg-gradient-to-br from-primary/10 to-sky/10 text-primary"
                      )}>
                        {!selectedLog.actor ? <Bot className="h-3 w-3" /> : getActorInitials(selectedLog)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{getActorDisplay(selectedLog)}</p>
                      {selectedLog.actor_email && (
                        <p className="text-[11px] text-muted-foreground">{selectedLog.actor_email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium mt-1",
                      actionConfig[selectedLog.action]?.color || "bg-gray-100"
                    )}
                  >
                    {actionConfig[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
              </div>

              {/* Target */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
                    {(() => {
                      const Icon = targetTypeIcons[selectedLog.target_type] || Briefcase
                      return <Icon className="h-3.5 w-3.5" />
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedLog.target_repr || selectedLog.target_id}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {selectedLog.target_type} &middot; ID {selectedLog.target_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</p>
                <p className="text-sm">{selectedLog.reason || 'No reason provided'}</p>
              </div>

              {/* IP Address */}
              {selectedLog.ip_address && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ip_address}</p>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Changes</p>
                  <ScrollArea className="max-h-[200px] rounded-lg border bg-muted/30 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
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

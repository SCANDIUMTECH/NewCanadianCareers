"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  Search,
  Download,
  Settings2,
  Plus,
  ArrowLeft,
  ShieldAlert,
  AlertCircle,
  Ban,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import {
  getFraudAlerts,
  getFraudStats,
  getFraudTrends,
  investigateFraudAlert,
  resolveFraudAlert,
  takeFraudAction,
  exportFraudAlerts,
  getFraudRules,
  createFraudRule,
  updateFraudRule,
  deleteFraudRule,
  toggleFraudRule,
} from "@/lib/api/admin-fraud"
import type {
  FraudAlert,
  FraudStats,
  FraudTrend,
  FraudFilters,
  FraudRule,
  FraudRuleConditions,
  FraudAlertType,
  FraudAlertSeverity,
  CreateFraudRuleData,
  PaginatedResponse,
} from "@/lib/admin/types"

const AdminFraudTrendChart = dynamic(
  () => import("@/components/charts/admin-fraud-trend-chart"),
  { ssr: false }
)

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

const statusColors: Record<string, string> = {
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
  fake_job: "Fake Job",
  spam: "Spam",
  identity_fraud: "Identity Fraud",
  disposable_email: "Disposable Email",
}

const checkTypeConditionFields: Record<string, Array<{ key: string; label: string; type: "number" | "keywords"; placeholder: string }>> = {
  multiple_accounts: [
    { key: "max_accounts_per_ip", label: "Max Accounts per IP", type: "number", placeholder: "e.g. 3" },
    { key: "time_window_hours", label: "Time Window (hours)", type: "number", placeholder: "e.g. 24" },
  ],
  suspicious_activity: [
    { key: "failed_login_attempts", label: "Failed Login Attempts", type: "number", placeholder: "e.g. 5" },
    { key: "time_window_minutes", label: "Time Window (minutes)", type: "number", placeholder: "e.g. 30" },
  ],
  payment_fraud: [
    { key: "velocity_threshold", label: "Max Transactions per Hour", type: "number", placeholder: "e.g. 10" },
    { key: "amount_threshold", label: "Amount Threshold ($)", type: "number", placeholder: "e.g. 1000" },
  ],
  credential_stuffing: [
    { key: "failed_login_attempts", label: "Failed Login Attempts", type: "number", placeholder: "e.g. 10" },
    { key: "time_window_minutes", label: "Time Window (minutes)", type: "number", placeholder: "e.g. 15" },
  ],
  fake_listings: [
    { key: "blocked_keywords", label: "Blocked Keywords", type: "keywords", placeholder: "Type keyword and press Enter" },
    { key: "match_threshold", label: "Match Threshold", type: "number", placeholder: "e.g. 2" },
  ],
  fake_job: [
    { key: "blocked_keywords", label: "Blocked Keywords", type: "keywords", placeholder: "Type keyword and press Enter" },
    { key: "match_threshold", label: "Match Threshold", type: "number", placeholder: "e.g. 2" },
  ],
  spam: [
    { key: "blocked_keywords", label: "Blocked Keywords", type: "keywords", placeholder: "Type keyword and press Enter" },
    { key: "match_threshold", label: "Match Threshold", type: "number", placeholder: "e.g. 2" },
  ],
  identity_fraud: [
    { key: "threshold", label: "Similarity Threshold", type: "number", placeholder: "e.g. 85" },
    { key: "time_window_hours", label: "Time Window (hours)", type: "number", placeholder: "e.g. 48" },
  ],
  disposable_email: [
    { key: "blocked_domains", label: "Additional Blocked Domains", type: "keywords", placeholder: "Type domain and press Enter (e.g. tempmail.com)" },
    { key: "time_window_hours", label: "Time Window (hours)", type: "number", placeholder: "e.g. 24" },
  ],
}

const defaultRuleForm: CreateFraudRuleData = {
  name: "",
  description: "",
  severity: "medium",
  enabled: true,
  conditions: {},
}

export default function FraudPage() {
  // ==========================================================================
  // View mode: "alerts" or "rules"
  // ==========================================================================
  const [view, setView] = useState<"alerts" | "rules">("alerts")

  // ==========================================================================
  // Alert data state
  // ==========================================================================
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [stats, setStats] = useState<FraudStats | null>(null)
  const [trends, setTrends] = useState<FraudTrend[]>([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, count: 0 })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isTrendsLoading, setIsTrendsLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<FraudFilters>({
    severity: "all",
    status: "all",
    page: 1,
    page_size: 20,
  })

  // Selection state
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)

  // Alert dialog states
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)

  // Alert action states
  const [isInvestigating, setIsInvestigating] = useState<number | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isTakingAction, setIsTakingAction] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Alert form state
  const [resolveResolution, setResolveResolution] = useState("")
  const [resolveNotes, setResolveNotes] = useState("")
  const [actionType, setActionType] = useState<"suspend" | "delete" | "warn">("warn")
  const [actionNotes, setActionNotes] = useState("")

  // ==========================================================================
  // Rules state
  // ==========================================================================
  const [rules, setRules] = useState<FraudRule[]>([])
  const [isRulesLoading, setIsRulesLoading] = useState(false)
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null)
  const [rulesSearch, setRulesSearch] = useState("")

  // Rule form dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<FraudRule | null>(null)
  const [ruleForm, setRuleForm] = useState<CreateFraudRuleData>({ ...defaultRuleForm })
  const [isSavingRule, setIsSavingRule] = useState(false)
  const [ruleFormError, setRuleFormError] = useState("")

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRule, setDeletingRule] = useState<FraudRule | null>(null)
  const [isDeletingRule, setIsDeletingRule] = useState(false)

  // Keyword input
  const [keywordInput, setKeywordInput] = useState("")

  // ==========================================================================
  // Data Fetching — Alerts
  // ==========================================================================

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response: PaginatedResponse<FraudAlert> = await getFraudAlerts(filters)
      setAlerts(response.results)
      setPagination({
        page: filters.page || 1,
        total_pages: Math.ceil(response.count / (filters.page_size || 20)),
        count: response.count,
      })
    } catch (err) {
      console.error("Failed to fetch fraud alerts:", err)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getFraudStats()
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  const fetchTrends = useCallback(async () => {
    setIsTrendsLoading(true)
    try {
      const data = await getFraudTrends("7d")
      setTrends(data)
    } catch (err) {
      console.error("Failed to fetch trends:", err)
    } finally {
      setIsTrendsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    fetchStats()
    fetchTrends()
  }, [fetchStats, fetchTrends])

  // ==========================================================================
  // Data Fetching — Rules
  // ==========================================================================

  const fetchRules = useCallback(async () => {
    setIsRulesLoading(true)
    try {
      const data = await getFraudRules()
      setRules(data)
    } catch (err) {
      console.error("Failed to fetch rules:", err)
    } finally {
      setIsRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === "rules") {
      fetchRules()
    }
  }, [view, fetchRules])

  // ==========================================================================
  // Alert Action Handlers
  // ==========================================================================

  const handleInvestigate = async (alertId: number) => {
    setIsInvestigating(alertId)
    try {
      await investigateFraudAlert(alertId)
      fetchAlerts()
      fetchStats()
    } catch (err) {
      console.error("Failed to start investigation:", err)
      toast.error("Failed to start investigation. Please try again.")
    } finally {
      setIsInvestigating(null)
    }
  }

  const handleResolve = async () => {
    if (!selectedAlert) return
    setIsResolving(true)
    try {
      await resolveFraudAlert(selectedAlert.id, {
        resolution: resolveResolution,
        notes: resolveNotes || undefined,
      })
      setResolveDialogOpen(false)
      setSelectedAlert(null)
      setResolveResolution("")
      setResolveNotes("")
      fetchAlerts()
      fetchStats()
    } catch (err) {
      console.error("Failed to resolve alert:", err)
      toast.error("Failed to resolve alert. Please try again.")
    } finally {
      setIsResolving(false)
    }
  }

  const handleAction = async () => {
    if (!selectedAlert) return
    setIsTakingAction(true)
    try {
      await takeFraudAction(selectedAlert.id, actionType, actionNotes || undefined)
      setActionDialogOpen(false)
      setActionNotes("")
      fetchAlerts()
    } catch (err) {
      console.error("Failed to take action:", err)
      toast.error("Failed to take action. Please try again.")
    } finally {
      setIsTakingAction(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportFraudAlerts(filters, "csv")
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "fraud-alerts-export.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to export:", err)
      toast.error("Failed to export fraud alerts. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // ==========================================================================
  // Rules Handlers
  // ==========================================================================

  const handleToggleRule = async (rule: FraudRule) => {
    setTogglingRuleId(rule.id)
    try {
      const updated = await toggleFraudRule(rule.id)
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
    } catch (err) {
      console.error("Failed to toggle rule:", err)
    } finally {
      setTogglingRuleId(null)
    }
  }

  const handleOpenCreateRule = () => {
    setEditingRule(null)
    setRuleForm({ ...defaultRuleForm })
    setRuleFormError("")
    setKeywordInput("")
    setRuleDialogOpen(true)
  }

  const handleOpenEditRule = (rule: FraudRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      enabled: rule.enabled,
      conditions: { ...rule.conditions },
    })
    setRuleFormError("")
    setKeywordInput("")
    setRuleDialogOpen(true)
  }

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      setRuleFormError("Rule name is required.")
      return
    }
    if (!ruleForm.description.trim()) {
      setRuleFormError("Description is required.")
      return
    }
    setIsSavingRule(true)
    setRuleFormError("")
    try {
      if (editingRule) {
        const updated = await updateFraudRule(editingRule.id, ruleForm)
        setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)))
      } else {
        const created = await createFraudRule(ruleForm)
        setRules((prev) => [created, ...prev])
      }
      setRuleDialogOpen(false)
    } catch (err) {
      console.error("Failed to save rule:", err)
      setRuleFormError("Failed to save rule. Please try again.")
    } finally {
      setIsSavingRule(false)
    }
  }

  const handleConfirmDelete = (rule: FraudRule) => {
    setDeletingRule(rule)
    setDeleteDialogOpen(true)
  }

  const handleDeleteRule = async () => {
    if (!deletingRule) return
    setIsDeletingRule(true)
    try {
      await deleteFraudRule(deletingRule.id)
      setRules((prev) => prev.filter((r) => r.id !== deletingRule.id))
      setDeleteDialogOpen(false)
      setDeletingRule(null)
    } catch (err) {
      console.error("Failed to delete rule:", err)
      toast.error("Failed to delete rule. Please try again.")
    } finally {
      setIsDeletingRule(false)
    }
  }

  // Condition form helpers
  const updateCondition = (key: string, value: unknown) => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: value },
    }))
  }

  const addKeyword = (key: string) => {
    const word = keywordInput.trim()
    if (!word) return
    const existing = (ruleForm.conditions[key] as string[] | undefined) || []
    if (!existing.includes(word)) {
      updateCondition(key, [...existing, word])
    }
    setKeywordInput("")
  }

  const removeKeyword = (key: string, word: string) => {
    const existing = (ruleForm.conditions[key] as string[] | undefined) || []
    updateCondition(key, existing.filter((w) => w !== word))
  }

  // ==========================================================================
  // Alert filter handlers
  // ==========================================================================

  const handleSeverityFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, severity: value as FraudFilters["severity"], page: 1 }))
  }

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value as FraudFilters["status"], page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredRules = rules.filter((rule) => {
    if (!rulesSearch) return true
    const q = rulesSearch.toLowerCase()
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q)
    )
  })

  const activeCheckType = ruleForm.conditions.check_type as FraudAlertType | undefined
  const conditionFields = activeCheckType ? checkTypeConditionFields[activeCheckType] || [] : []

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fraud Monitoring</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Real-time fraud detection and prevention</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === "alerts" ? (
            <>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Report"}
              </Button>
              <Button size="sm" onClick={() => setView("rules")}>
                <Settings2 className="mr-2 h-4 w-4" />
                Configure Rules
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setView("alerts")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Alerts
              </Button>
              <Button size="sm" onClick={handleOpenCreateRule}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* ALERTS VIEW */}
      {/* ================================================================== */}
      {view === "alerts" && (
        <>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {isStatsLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : stats ? (
              <>
                <Card className="relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-red-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-sm">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{stats.total_alerts}</p>
                  </CardContent>
                </Card>
                <Card className="relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-red-600 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Critical</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-red-600">{stats.critical_count}</p>
                  </CardContent>
                </Card>
                <Card className="relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-orange-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Open Cases</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-orange-600">{stats.open_count}</p>
                  </CardContent>
                </Card>
                <Card className="relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-green-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Blocked</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm">
                        <Ban className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-green-600">{stats.blocked_count}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
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
                {isTrendsLoading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : trends.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <AdminFraudTrendChart data={trends} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={filters.severity || "all"} onValueChange={handleSeverityFilter}>
                    <SelectTrigger className="w-[150px] h-9">
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
                  <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-[150px] h-9">
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
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alerts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 mx-auto mb-4">
                      <AlertTriangle className="h-7 w-7 text-red-500/50" />
                    </div>
                    <h3 className="text-lg font-medium">No fraud alerts found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      Fraud alerts will appear here when suspicious activity is detected
                    </p>
                  </div>
                ) : (
                  <>
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
                          {alerts.map((a, index) => (
                            <motion.tr
                              key={a.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                "border-border/50 cursor-pointer transition-colors",
                                selectedAlert?.id === a.id ? "bg-primary/5" : "hover:bg-muted/50"
                              )}
                              onClick={() => setSelectedAlert(selectedAlert?.id === a.id ? null : a)}
                            >
                              <TableCell className="font-mono text-sm">FRD-{String(a.id).padStart(3, "0")}</TableCell>
                              <TableCell>
                                <span className="text-sm">{typeLabels[a.type] || a.type}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground line-clamp-1">
                                  {a.description}
                                </span>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.ip_address}</code>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs capitalize", severityColors[a.severity] || "")}
                                >
                                  {a.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs capitalize", statusColors[a.status] || "")}
                                >
                                  {a.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {a.status === "open" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleInvestigate(a.id)
                                    }}
                                    disabled={isInvestigating === a.id}
                                  >
                                    {isInvestigating === a.id ? "..." : "Investigate"}
                                  </Button>
                                )}
                                {a.status === "investigating" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedAlert(a)
                                      setResolveDialogOpen(true)
                                    }}
                                  >
                                    Resolve
                                  </Button>
                                )}
                                {(a.status === "resolved" || a.status === "blocked") && (
                                  <span className="text-xs text-muted-foreground">Closed</span>
                                )}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination.total_pages > 1 && (
                      <div className="flex items-center justify-between border-t px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          Page {pagination.page} of {pagination.total_pages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page === 1}
                            onClick={() => handlePageChange(pagination.page - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page === pagination.total_pages}
                            onClick={() => handlePageChange(pagination.page + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Selected Alert Detail */}
          <AnimatePresence>
            {selectedAlert && !resolveDialogOpen && !actionDialogOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-border/50 border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      Alert Details - FRD-{String(selectedAlert.id).padStart(3, "0")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm font-medium mt-1">{selectedAlert.description}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Timestamp</p>
                          <p className="text-sm font-medium mt-1">{formatDate(selectedAlert.created_at)}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Affected Accounts</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedAlert.affected_accounts && selectedAlert.affected_accounts.length > 0 ? (
                              selectedAlert.affected_accounts.map((acc) => (
                                <code key={acc} className="text-xs bg-muted px-2 py-1 rounded">
                                  {acc}
                                </code>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None identified</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionType("suspend")
                              setActionDialogOpen(true)
                            }}
                          >
                            Suspend Accounts
                          </Button>
                          {selectedAlert.status === "investigating" && (
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground"
                              onClick={() => setResolveDialogOpen(true)}
                            >
                              Mark Resolved
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ================================================================== */}
      {/* RULES VIEW */}
      {/* ================================================================== */}
      {view === "rules" && (
        <>
          {/* Rules Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={rulesSearch}
                    onChange={(e) => setRulesSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rules List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {isRulesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-72" />
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-11" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRules.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {rulesSearch ? "No rules match your search." : "No fraud detection rules configured yet."}
                  </p>
                  {!rulesSearch && (
                    <Button size="sm" className="mt-4" onClick={handleOpenCreateRule}>
                      Create First Rule
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredRules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn(
                      "border-border/50 transition-colors",
                      !rule.enabled && "opacity-60"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Rule name + severity + type */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{rule.name}</span>
                              <Badge variant="outline" className={cn("text-xs capitalize", severityColors[rule.severity] || "")}>
                                {rule.severity}
                              </Badge>
                              {rule.conditions.check_type && (
                                <Badge variant="secondary" className="text-xs">
                                  {typeLabels[rule.conditions.check_type as string] || rule.conditions.check_type}
                                </Badge>
                              )}
                              {!rule.enabled && (
                                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                                  Disabled
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>

                            {/* Metrics + Actions */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Triggers: <span className="font-medium text-foreground">{rule.triggers_count}</span></span>
                              <span>False Positives: <span className="font-medium text-foreground">{rule.false_positives_count}</span></span>
                              {rule.triggers_count > 0 && (
                                <span>
                                  Accuracy:{" "}
                                  <span className="font-medium text-foreground">
                                    {Math.round(((rule.triggers_count - rule.false_positives_count) / rule.triggers_count) * 100)}%
                                  </span>
                                </span>
                              )}
                              <span className="text-muted-foreground/60">|</span>
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => handleOpenEditRule(rule)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-red-500 hover:underline"
                                onClick={() => handleConfirmDelete(rule)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* Toggle */}
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggleRule(rule)}
                            disabled={togglingRuleId === rule.id}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </>
      )}

      {/* ================================================================== */}
      {/* DIALOGS */}
      {/* ================================================================== */}

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onOpenChange={(open) => {
          setResolveDialogOpen(open)
          if (!open) {
            setResolveResolution("")
            setResolveNotes("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Mark FRD-{selectedAlert && String(selectedAlert.id).padStart(3, "0")} as resolved
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution *</Label>
              <Select value={resolveResolution} onValueChange={setResolveResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="action_taken">Action Taken</SelectItem>
                  <SelectItem value="no_action_needed">No Action Needed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Add any notes about this resolution..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} disabled={isResolving}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!resolveResolution || isResolving}>
              {isResolving ? "Resolving..." : "Resolve Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open)
          if (!open) setActionNotes("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Action</DialogTitle>
            <DialogDescription>
              Take action on accounts related to FRD-{selectedAlert && String(selectedAlert.id).padStart(3, "0")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as typeof actionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Warn User</SelectItem>
                  <SelectItem value="suspend">Suspend Account</SelectItem>
                  <SelectItem value="delete">Delete Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes (Optional)</Label>
              <Textarea
                id="action-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add notes for this action..."
                rows={3}
              />
            </div>
            {actionType === "delete" && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">
                  Deleting accounts is permanent and cannot be undone. All data will be lost.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isTakingAction}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isTakingAction}
              variant={actionType === "delete" ? "destructive" : "default"}
            >
              {isTakingAction ? "Processing..." : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Account`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Rule Dialog */}
      <Dialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open)
          if (!open) {
            setRuleFormError("")
            setKeywordInput("")
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the fraud detection rule configuration."
                : "Define a new fraud detection rule with conditions."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name *</Label>
              <Input
                id="rule-name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Multiple Account Detection"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="rule-desc">Description *</Label>
              <Textarea
                id="rule-desc"
                value={ruleForm.description}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule detects..."
                rows={2}
              />
            </div>

            {/* Severity + Enabled row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={ruleForm.severity}
                  onValueChange={(v) => setRuleForm((prev) => ({ ...prev, severity: v as FraudAlertSeverity }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Enabled</Label>
                <div className="flex items-center h-9 gap-2">
                  <Switch
                    checked={ruleForm.enabled}
                    onCheckedChange={(checked) => setRuleForm((prev) => ({ ...prev, enabled: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {ruleForm.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            {/* Conditions Section */}
            <div className="space-y-3 border-t pt-4">
              <Label>Conditions</Label>

              {/* Check Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Detection Type</Label>
                <Select
                  value={(ruleForm.conditions.check_type as string) || "none"}
                  onValueChange={(v) => {
                    const newConditions: FraudRuleConditions = v === "none" ? {} : { check_type: v as FraudAlertType }
                    setRuleForm((prev) => ({ ...prev, conditions: newConditions }))
                    setKeywordInput("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select detection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific type</SelectItem>
                    <SelectItem value="multiple_accounts">Multiple Accounts</SelectItem>
                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                    <SelectItem value="payment_fraud">Payment Fraud</SelectItem>
                    <SelectItem value="credential_stuffing">Credential Stuffing</SelectItem>
                    <SelectItem value="fake_listings">Fake Listings</SelectItem>
                    <SelectItem value="fake_job">Fake Job</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="identity_fraud">Identity Fraud</SelectItem>
                    <SelectItem value="disposable_email">Disposable Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic condition fields */}
              {conditionFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  {field.type === "number" ? (
                    <Input
                      type="number"
                      min={0}
                      value={(ruleForm.conditions[field.key] as number) ?? ""}
                      onChange={(e) => updateCondition(field.key, e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "keywords" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addKeyword(field.key)
                            }
                          }}
                          placeholder={field.placeholder}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addKeyword(field.key)}
                          className="shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                      {((ruleForm.conditions[field.key] as string[]) || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {((ruleForm.conditions[field.key] as string[]) || []).map((kw) => (
                            <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
                              {kw}
                              <button
                                type="button"
                                className="ml-1 hover:text-red-500"
                                onClick={() => removeKeyword(field.key, kw)}
                              >
                                &times;
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}

              {!activeCheckType && (
                <p className="text-xs text-muted-foreground">
                  Select a detection type above to configure specific conditions.
                </p>
              )}
            </div>

            {/* Error */}
            {ruleFormError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{ruleFormError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)} disabled={isSavingRule}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={isSavingRule}>
              {isSavingRule ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingRule?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingRule && deletingRule.triggers_count > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">
                This rule has triggered {deletingRule.triggers_count} time{deletingRule.triggers_count !== 1 ? "s" : ""}. Deleting it will stop future detection for this pattern.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingRule}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={isDeletingRule}>
              {isDeletingRule ? "Deleting..." : "Delete Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-12" />
      </CardContent>
    </Card>
  )
}

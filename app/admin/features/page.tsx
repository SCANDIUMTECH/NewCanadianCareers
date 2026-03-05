"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  ToggleLeft,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Zap,
  FlaskConical,
  Code2,
  MoreHorizontal,
  Pencil,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  getAdminFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
} from "@/lib/api/admin-features"
import type { FeatureFlag, CreateFeatureFlagData, FeatureEnvironment } from "@/lib/api/admin-features"

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

const envConfig: Record<string, { label: string; icon: React.ReactNode; bgClass: string; badgeClass: string }> = {
  production: {
    label: "Production",
    icon: <Zap className="h-3 w-3" />,
    bgClass: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  staging: {
    label: "Staging",
    icon: <FlaskConical className="h-3 w-3" />,
    bgClass: "bg-amber-50 text-amber-600 border border-amber-100",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  development: {
    label: "Development",
    icon: <Code2 className="h-3 w-3" />,
    bgClass: "bg-sky/10 text-sky border border-sky/20",
    badgeClass: "border-sky/20 bg-sky/10 text-sky",
  },
  all: {
    label: "All",
    icon: <ToggleLeft className="h-3 w-3" />,
    bgClass: "bg-gray-50 text-gray-600 border border-gray-100",
    badgeClass: "border-gray-200 bg-gray-50 text-gray-700",
  },
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [envFilter, setEnvFilter] = useState<FeatureEnvironment | "all">("all")
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formKey, setFormKey] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formEnvironment, setFormEnvironment] = useState<FeatureEnvironment>("staging")
  const [formRollout, setFormRollout] = useState(0)
  const [formEnabled, setFormEnabled] = useState(false)

  const fetchFlags = useCallback(async () => {
    setLoading(true)
    try {
      const env = envFilter === "all" ? undefined : envFilter
      const data = await getAdminFeatureFlags(env)
      setFlags(data)
    } catch (error) {
      console.error("Failed to fetch feature flags:", error)
      setFlags([])
    } finally {
      setLoading(false)
    }
  }, [envFilter])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const filteredFlags = flags.filter((flag) =>
    flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.key.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: flags.length,
    enabled: flags.filter((f) => f.enabled).length,
    staging: flags.filter((f) => f.environment === "staging").length,
    partialRollout: flags.filter((f) => f.rollout_percentage > 0 && f.rollout_percentage < 100).length,
  }

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const updated = await toggleFeatureFlag(flag.id)
      setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
    } catch (error) {
      console.error("Failed to toggle flag:", error)
    }
  }

  const openEditDialog = (flag: FeatureFlag) => {
    setEditingFlag(flag)
    setFormName(flag.name)
    setFormKey(flag.key)
    setFormDescription(flag.description)
    setFormEnvironment(flag.environment)
    setFormRollout(flag.rollout_percentage)
    setFormEnabled(flag.enabled)
  }

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true)
    setFormName("")
    setFormKey("")
    setFormDescription("")
    setFormEnvironment("staging")
    setFormRollout(0)
    setFormEnabled(false)
  }

  const closeDialog = () => {
    setEditingFlag(null)
    setIsCreateDialogOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: CreateFeatureFlagData = {
        name: formName,
        key: formKey,
        description: formDescription,
        environment: formEnvironment,
        rollout_percentage: formRollout,
        enabled: formEnabled,
      }

      if (editingFlag) {
        const updated = await updateFeatureFlag(editingFlag.id, data)
        setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
      } else {
        const created = await createFeatureFlag(data)
        setFlags((prev) => [...prev, created])
      }
      closeDialog()
    } catch (error) {
      console.error("Failed to save feature flag:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingFlag) return
    try {
      await deleteFeatureFlag(deletingFlag.id)
      setFlags((prev) => prev.filter((f) => f.id !== deletingFlag.id))
      setDeletingFlag(null)
    } catch (error) {
      console.error("Failed to delete feature flag:", error)
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
      .then(() => toast.success("Key copied"))
      .catch(() => toast.error("Failed to copy"))
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ToggleLeft className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Control feature rollouts and A/B testing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Flag
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Flags"
              value={stats.total}
              icon={<ToggleLeft className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
            />
            <StatCard
              title="Enabled"
              value={stats.enabled}
              icon={<CheckCircle2 className="h-4 w-4" />}
              gradient="from-green-500 to-emerald-600"
              bgAccent="bg-green-500"
              valueColor="text-green-600"
            />
            <StatCard
              title="In Staging"
              value={stats.staging}
              icon={<FlaskConical className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              bgAccent="bg-amber-500"
              valueColor="text-amber-600"
            />
            <StatCard
              title="Partial Rollout"
              value={stats.partialRollout}
              icon={<Zap className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
              valueColor="text-primary"
            />
          </>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or key..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as FeatureEnvironment | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Flags List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredFlags.length === 0 ? (
          <Card className="relative overflow-hidden">
            <CardContent className="p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 mx-auto mb-4">
                <ToggleLeft className="h-7 w-7 text-emerald-500/50" />
              </div>
              <h3 className="text-lg font-medium">No feature flags found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery ? "Try adjusting your search or filters" : "Create your first feature flag to control rollouts across environments"}
              </p>
              {!searchQuery && (
                <Button onClick={openCreateDialog} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flag
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFlags.map((flag) => {
            const env = envConfig[flag.environment] || envConfig.all
            return (
              <Card key={flag.id} className="relative overflow-hidden group">
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full rounded-l transition-opacity duration-200",
                  flag.enabled ? "bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-100" : "bg-gray-200 opacity-50"
                )} />
                <div className={cn(
                  "absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]",
                  flag.enabled ? "bg-emerald-500" : "bg-gray-400"
                )} />
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5 pl-6">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="font-medium">{flag.name}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-medium", env.badgeClass)}
                        >
                          {env.label}
                        </Badge>
                        {flag.enabled && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] font-medium">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{flag.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          onClick={() => handleCopyKey(flag.key)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/key"
                        >
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{flag.key}</code>
                          <Copy className="h-3 w-3 opacity-0 group-hover/key:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      {/* Rollout gauge */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-sm font-semibold tabular-nums">{flag.rollout_percentage}%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">rollout</p>
                        <div className="w-20 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              flag.rollout_percentage === 100
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                : flag.rollout_percentage === 0
                                ? "bg-gray-300"
                                : "bg-gradient-to-r from-amber-400 to-amber-500"
                            )}
                            style={{ width: `${flag.rollout_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditDialog(flag)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit Flag
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyKey(flag.key)} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingFlag(flag)}
                            className="text-destructive gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Flag
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </motion.div>

      {/* Summary footer */}
      {!loading && filteredFlags.length > 0 && (
        <motion.div variants={itemVariants}>
          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredFlags.length} of {flags.length} feature flags
          </p>
        </motion.div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog
        open={!!editingFlag || isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? "Edit Feature Flag" : "Create Feature Flag"}
            </DialogTitle>
            <DialogDescription>
              {editingFlag ? "Update the feature flag configuration" : "Set up a new feature flag for controlled rollout"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., New Dashboard UI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="e.g., new_dashboard_ui"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Used in code to check flag status. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-description">Description</Label>
              <Textarea
                id="flag-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe what this flag controls..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={formEnvironment} onValueChange={(v) => setFormEnvironment(v as FeatureEnvironment)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollout">Rollout %</Label>
                <Input
                  id="rollout"
                  type="number"
                  min="0"
                  max="100"
                  value={formRollout}
                  onChange={(e) => setFormRollout(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 p-3 rounded-lg bg-muted/50">
              <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
              <div>
                <Label className="cursor-pointer">Enabled</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Flag will be active immediately when enabled
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formKey}>
              {saving ? "Saving..." : editingFlag ? "Save Changes" : "Create Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFlag} onOpenChange={(open) => !open && setDeletingFlag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingFlag?.name}&quot;? This will immediately
              disable the flag across all environments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ==========================================================================
// Sub Components
// ==========================================================================

function StatCard({
  title,
  value,
  icon,
  gradient,
  bgAccent,
  valueColor,
}: {
  title: string
  value: number
  icon?: React.ReactNode
  gradient?: string
  bgAccent?: string
  valueColor?: string
}) {
  return (
    <Card className="relative overflow-hidden group">
      {bgAccent && (
        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      )}
      {gradient && (
        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      )}
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p className={cn("mt-2 text-2xl font-bold tracking-tight tabular-nums", valueColor)}>
          {value}
        </p>
      </CardContent>
    </Card>
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

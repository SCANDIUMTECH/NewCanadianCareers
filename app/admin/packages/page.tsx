"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Check,
  RefreshCw,
  Package,
  Star,
  ShieldCheck,
  Tag,
  Percent,
  Loader2,
  CreditCard,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, getCurrencySymbol, CURRENCY_OPTIONS } from "@/lib/utils"
import {
  getAdminJobPackages,
  createJobPackage,
  updateJobPackage,
  deleteJobPackage,
  duplicateJobPackage,
  syncPackageToStripe,
} from "@/lib/api/admin-packages"
import type { JobPackage, CreateJobPackageData, PaymentType } from "@/lib/api/admin-packages"

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

const ALL_FEATURES = [
  "Basic job posting",
  "Featured job posting",
  "Social distribution",
  "Newsletter inclusion",
  "Analytics",
  "Priority support",
]

interface PackageFormState {
  name: string
  description: string
  credits: number
  validity_days: number
  package_validity_days: number | null
  price: number
  sale_price: number | null
  monthly_price: number | null
  yearly_price: number | null
  tax_rate: number
  currency: string
  payment_type: PaymentType
  features: string[]
  is_active: boolean
  is_popular: boolean
  disable_repeat_purchase: boolean
  sort_order: number
}

const DEFAULT_FORM: PackageFormState = {
  name: "",
  description: "",
  credits: 1,
  validity_days: 30,
  package_validity_days: null,
  price: 99,
  sale_price: null,
  monthly_price: null,
  yearly_price: null,
  tax_rate: 0,
  currency: "CAD",
  payment_type: "one_time",
  features: [],
  is_active: true,
  is_popular: false,
  disable_repeat_purchase: false,
  sort_order: 0,
}

function formFromPackage(pkg: JobPackage): PackageFormState {
  return {
    name: pkg.name,
    description: pkg.description || "",
    credits: pkg.credits,
    validity_days: pkg.validity_days,
    package_validity_days: pkg.package_validity_days,
    price: pkg.price,
    sale_price: pkg.sale_price,
    monthly_price: pkg.monthly_price,
    yearly_price: pkg.yearly_price,
    tax_rate: pkg.tax_rate,
    currency: pkg.currency || "CAD",
    payment_type: pkg.payment_type,
    features: pkg.features,
    is_active: pkg.is_active,
    is_popular: pkg.is_popular,
    disable_repeat_purchase: pkg.disable_repeat_purchase,
    sort_order: pkg.sort_order,
  }
}

function formToData(form: PackageFormState): CreateJobPackageData {
  return {
    name: form.name,
    description: form.description || undefined,
    credits: form.credits,
    validity_days: form.validity_days,
    package_validity_days: form.package_validity_days,
    price: form.price,
    sale_price: form.payment_type !== "subscription" ? form.sale_price : null,
    monthly_price: form.payment_type === "subscription" ? form.monthly_price : null,
    yearly_price: form.payment_type === "subscription" ? form.yearly_price : null,
    tax_rate: form.tax_rate,
    currency: form.currency,
    payment_type: form.payment_type,
    features: form.features,
    is_active: form.is_active,
    is_popular: form.is_popular,
    disable_repeat_purchase: form.disable_repeat_purchase,
    sort_order: form.sort_order,
  }
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<JobPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<JobPackage | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingPackage, setDeletingPackage] = useState<JobPackage | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PackageFormState>(DEFAULT_FORM)

  const updateForm = useCallback(<K extends keyof PackageFormState>(key: K, value: PackageFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminJobPackages()
      setPackages(data)
    } catch (error) {
      const err = error as { message?: string; status?: number }
      console.error("Failed to fetch packages:", err.message ?? error, err.status ? `(status: ${err.status})` : "")
      setPackages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  const stats = useMemo(() => ({
    active: packages.filter((p) => p.is_active).length,
    total: packages.length,
    avgPrice: packages.length > 0
      ? Math.round(packages.reduce((sum, p) => sum + p.price, 0) / packages.length)
      : 0,
    mostPopular: packages.reduce((best, p) => (p.sort_order < (best?.sort_order ?? Infinity) ? p : best), packages[0]),
  }), [packages])

  const openEditDialog = (pkg: JobPackage) => {
    setEditingPackage(pkg)
    setForm(formFromPackage(pkg))
  }

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true)
    setForm({ ...DEFAULT_FORM, sort_order: packages.length })
  }

  const closeDialog = () => {
    setEditingPackage(null)
    setIsCreateDialogOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = formToData(form)
      if (editingPackage) {
        const updated = await updateJobPackage(editingPackage.id, data)
        setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await createJobPackage(data)
        setPackages((prev) => [...prev, created])
      }
      closeDialog()
    } catch (error) {
      console.error("Failed to save package:", error)
      toast.error("Failed to save package. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (pkg: JobPackage) => {
    try {
      const duplicated = await duplicateJobPackage(pkg.id)
      setPackages((prev) => [...prev, duplicated])
    } catch (error) {
      console.error("Failed to duplicate package:", error)
    }
  }

  const handleDelete = async () => {
    if (!deletingPackage) return
    try {
      await deleteJobPackage(deletingPackage.id)
      setPackages((prev) => prev.filter((p) => p.id !== deletingPackage.id))
      setDeletingPackage(null)
    } catch (error) {
      console.error("Failed to delete package:", error)
    }
  }

  const toggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  // Computed subscription savings preview
  const yearlySavingsPercent = form.monthly_price && form.yearly_price && form.monthly_price > 0
    ? Math.round(((form.monthly_price * 12 - form.yearly_price) / (form.monthly_price * 12)) * 100)
    : 0
  const yearlySavingsAmount = form.monthly_price && form.yearly_price
    ? (form.monthly_price * 12 - form.yearly_price)
    : 0
  const yearlyPerMonth = form.yearly_price ? +(form.yearly_price / 12).toFixed(2) : 0

  // One-time pricing preview
  const effectivePrice = form.sale_price !== null && form.sale_price >= 0 ? form.sale_price : form.price
  const taxAmount = form.tax_rate > 0 ? Math.round(effectivePrice * form.tax_rate) / 100 : 0
  const totalPrice = effectivePrice + taxAmount

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Job Packages</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Configure job posting packages and pricing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPackages} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Package
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {[
              { label: "Active Packages", value: stats.active.toString(), icon: Zap, gradient: "from-emerald-500 to-teal-600", bgAccent: "bg-emerald-500" },
              { label: "Total Packages", value: stats.total.toString(), icon: Package, gradient: "from-blue-500 to-indigo-600", bgAccent: "bg-blue-500" },
              { label: "Most Popular", value: stats.mostPopular?.name || "—", icon: Star, gradient: "from-amber-500 to-orange-600", bgAccent: "bg-amber-500" },
              { label: "Avg. Price", value: `$${stats.avgPrice}`, icon: CreditCard, gradient: "from-violet-500 to-purple-600", bgAccent: "bg-violet-500" },
            ].map((stat) => (
              <Card key={stat.label} className="relative overflow-hidden group">
                <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", stat.bgAccent)} />
                <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} />
                <CardContent className="p-5 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", stat.gradient)}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums truncate">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </motion.div>

      {/* Packages Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-40 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-24" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : packages.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-muted-foreground/25">
              <CardContent className="p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No packages yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Create your first job package to get started</p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Package
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={openEditDialog}
              onDuplicate={handleDuplicate}
              onDelete={setDeletingPackage}
              onSync={(updated) => setPackages(prev => prev.map(p => p.id === updated.id ? updated : p))}
            />
          ))
        )}
      </motion.div>

      {/* ── Package Editor Dialog ── */}
      <Dialog open={!!editingPackage || isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) closeDialog()
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              Configure the package details, pricing, and purchase rules
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable form body — fixed container, content scrolls */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-1">
            <div className="space-y-6">

              {/* ─── Section: Basic Info ─── */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Package Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Package Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="e.g., Professional Plan"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Describe what this package offers to customers..."
                      className="min-h-[72px] resize-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credits">Job Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={form.credits}
                      onChange={(e) => updateForm("credits", Number(e.target.value))}
                      placeholder="-1 for unlimited"
                    />
                    <p className="text-xs text-muted-foreground">-1 = unlimited</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validity">Job Duration (days)</Label>
                    <Input
                      id="validity"
                      type="number"
                      value={form.validity_days}
                      onChange={(e) => updateForm("validity_days", Number(e.target.value))}
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground">Active + visible to candidates</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort Order</Label>
                    <Input
                      id="sort"
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => updateForm("sort_order", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Lower = shown first</p>
                  </div>
                </div>
              </div>

              {/* ─── Section: Pricing ─── */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Pricing
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={form.payment_type} onValueChange={(v) => updateForm("payment_type", v as PaymentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-time Purchase</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="bundle">Credit Bundle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => updateForm("currency", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.symbol} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Subscription pricing: monthly + yearly with savings */}
                {form.payment_type === "subscription" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly_price">Monthly Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getCurrencySymbol(form.currency)}
                          </span>
                          <Input
                            id="monthly_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.monthly_price ?? ""}
                            onChange={(e) => updateForm("monthly_price", e.target.value === "" ? null : Number(e.target.value))}
                            className="pl-8"
                            placeholder="29.00"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Per month, billed monthly</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="yearly_price">Yearly Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getCurrencySymbol(form.currency)}
                          </span>
                          <Input
                            id="yearly_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.yearly_price ?? ""}
                            onChange={(e) => updateForm("yearly_price", e.target.value === "" ? null : Number(e.target.value))}
                            className="pl-8"
                            placeholder="290.00"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Total per year, billed annually</p>
                      </div>
                    </div>

                    {/* Savings preview card */}
                    {form.monthly_price && form.yearly_price ? (
                      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Pricing Preview
                          </span>
                          {yearlySavingsPercent > 0 && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Save {yearlySavingsPercent}%
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border border-border/50 bg-background p-3">
                            <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                            <p className="text-lg font-semibold">
                              {getCurrencySymbol(form.currency)}{form.monthly_price.toFixed(2)}
                              <span className="text-xs font-normal text-muted-foreground">/mo</span>
                            </p>
                          </div>
                          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 relative">
                            <p className="text-xs text-muted-foreground mb-1">Yearly</p>
                            <p className="text-lg font-semibold">
                              {getCurrencySymbol(form.currency)}{yearlyPerMonth.toFixed(2)}
                              <span className="text-xs font-normal text-muted-foreground">/mo</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getCurrencySymbol(form.currency)}{form.yearly_price.toFixed(2)}/yr
                            </p>
                            {yearlySavingsAmount > 0 && (
                              <p className="text-xs text-emerald-600 font-medium mt-1">
                                Save {getCurrencySymbol(form.currency)}{yearlySavingsAmount.toFixed(2)}/yr
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Base price for subscriptions — used as display/reference price */}
                    <div className="space-y-2">
                      <Label htmlFor="price">
                        Display Price
                        <span className="text-muted-foreground font-normal ml-1">(reference)</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {getCurrencySymbol(form.currency)}
                        </span>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.price}
                          onChange={(e) => updateForm("price", Number(e.target.value))}
                          className="pl-8"
                          placeholder="29.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Shown on package cards when no billing toggle is visible (e.g., admin lists)
                      </p>
                    </div>
                  </div>
                ) : (
                  /* One-time / bundle pricing */
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Regular Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getCurrencySymbol(form.currency)}
                          </span>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.price}
                            onChange={(e) => updateForm("price", Number(e.target.value))}
                            className="pl-8"
                            placeholder="99.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sale_price">
                          Sale Price
                          <span className="text-muted-foreground font-normal ml-1">(opt.)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getCurrencySymbol(form.currency)}
                          </span>
                          <Input
                            id="sale_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.sale_price ?? ""}
                            onChange={(e) => updateForm("sale_price", e.target.value === "" ? null : Number(e.target.value))}
                            className="pl-8"
                            placeholder="—"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_rate">
                          Tax Rate
                          <span className="text-muted-foreground font-normal ml-1">(%)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="tax_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={form.tax_rate}
                            onChange={(e) => updateForm("tax_rate", Number(e.target.value))}
                            className="pr-8"
                            placeholder="0"
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* One-time pricing preview */}
                    {(form.sale_price !== null || form.tax_rate > 0) && (
                      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Pricing Preview
                        </span>
                        <div className="mt-2 space-y-1 text-sm">
                          {form.sale_price !== null && form.sale_price >= 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Regular</span>
                              <span className="line-through text-muted-foreground">
                                {getCurrencySymbol(form.currency)}{form.price.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {form.sale_price !== null && form.sale_price >= 0 ? "Sale" : "Price"}
                            </span>
                            <span className="font-medium">
                              {getCurrencySymbol(form.currency)}{effectivePrice.toFixed(2)}
                            </span>
                          </div>
                          {form.tax_rate > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax ({form.tax_rate}%)</span>
                              <span>{getCurrencySymbol(form.currency)}{taxAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1.5 mt-1.5 font-semibold">
                            <span>Total</span>
                            <span>{getCurrencySymbol(form.currency)}{totalPrice.toFixed(2)}</span>
                          </div>
                          {form.sale_price !== null && form.sale_price >= 0 && form.price > 0 && (
                            <div className="flex justify-end pt-1">
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                <Tag className="h-3 w-3 mr-1" />
                                {Math.round(((form.price - form.sale_price) / form.price) * 100)}% off
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tax rate for subscriptions */}
                {form.payment_type === "subscription" && (
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate_sub">
                      Tax Rate
                      <span className="text-muted-foreground font-normal ml-1">(%)</span>
                    </Label>
                    <div className="relative w-40">
                      <Input
                        id="tax_rate_sub"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.tax_rate}
                        onChange={(e) => updateForm("tax_rate", Number(e.target.value))}
                        className="pr-8"
                        placeholder="0"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied to both monthly and yearly prices. 0 = tax-exempt.
                    </p>
                  </div>
                )}
              </div>

              {/* ─── Section: Features ─── */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Included Features
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {ALL_FEATURES.map((feature) => (
                    <div
                      key={feature}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                        form.features.includes(feature)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 hover:border-border"
                      )}
                      onClick={() => toggleFeature(feature)}
                    >
                      <Switch
                        checked={form.features.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Section: Rules ─── */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Purchase Rules
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="package_validity">Credit Expiry (days)</Label>
                    <Input
                      id="package_validity"
                      type="number"
                      min="1"
                      value={form.package_validity_days ?? ""}
                      onChange={(e) => updateForm("package_validity_days", e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="Never expires"
                    />
                    <p className="text-xs text-muted-foreground">
                      Days to use credits after purchase. Empty = no expiry.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat Purchase</Label>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all h-9 box-content",
                        form.disable_repeat_purchase
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border/50"
                      )}
                      onClick={() => updateForm("disable_repeat_purchase", !form.disable_repeat_purchase)}
                    >
                      <Switch
                        checked={form.disable_repeat_purchase}
                        onCheckedChange={(v) => updateForm("disable_repeat_purchase", v)}
                      />
                      <span className="text-sm">
                        {form.disable_repeat_purchase ? "One-time only" : "Allow repeat"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Disable for trials, welcome offers, free plans.
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── Section: Display Flags ─── */}
              <div className="flex items-center gap-6 pb-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => updateForm("is_active", v)} />
                  <Label className="font-normal cursor-pointer">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_popular} onCheckedChange={(v) => updateForm("is_popular", v)} />
                  <Label className="font-normal cursor-pointer">Popular Badge</Label>
                </div>
              </div>

              {/* Stripe IDs (read-only, auto-managed) */}
              {editingPackage && (editingPackage.stripe_product_id || editingPackage.stripe_price_id) && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">Stripe Integration (auto-managed)</Label>
                  {editingPackage.stripe_product_id && (
                    <p className="text-xs font-mono text-muted-foreground">
                      Product: {editingPackage.stripe_product_id}
                    </p>
                  )}
                  {editingPackage.stripe_price_id && (
                    <p className="text-xs font-mono text-muted-foreground">
                      Price: {editingPackage.stripe_price_id}
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPackage} onOpenChange={(open) => !open && setDeletingPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPackage?.name}&quot;? This action cannot be undone.
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

// ─── Package Card Component ───────────────────────────────────────────────────

function getPackageGradient(paymentType: string, isPopular: boolean): { gradient: string; bgAccent: string } {
  if (isPopular) return { gradient: "from-amber-500 via-orange-500 to-red-500", bgAccent: "bg-amber-500" }
  switch (paymentType) {
    case "subscription":
      return { gradient: "from-violet-500 to-purple-600", bgAccent: "bg-violet-500" }
    case "bundle":
      return { gradient: "from-blue-500 to-indigo-600", bgAccent: "bg-blue-500" }
    default:
      return { gradient: "from-emerald-500 to-teal-600", bgAccent: "bg-emerald-500" }
  }
}

function PackageCard({
  pkg,
  onEdit,
  onDuplicate,
  onDelete,
  onSync,
}: {
  pkg: JobPackage
  onEdit: (pkg: JobPackage) => void
  onDuplicate: (pkg: JobPackage) => void
  onDelete: (pkg: JobPackage) => void
  onSync: (updated: JobPackage) => void
}) {
  const cs = getCurrencySymbol(pkg.currency)
  const isSubscription = pkg.payment_type === "subscription"
  const { gradient, bgAccent } = getPackageGradient(pkg.payment_type, pkg.is_popular)

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md group",
        !pkg.is_active && "opacity-60"
      )}
    >
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      {/* Top badges */}
      {(pkg.is_popular || pkg.disable_repeat_purchase) && (
        <div className="absolute top-3 right-12 flex items-center gap-1.5">
          {pkg.is_popular && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
              <Star className="h-3 w-3 mr-0.5" />
              Popular
            </Badge>
          )}
          {pkg.disable_repeat_purchase && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <ShieldCheck className="h-3 w-3 mr-0.5" />
              One-time only
            </Badge>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{pkg.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(pkg)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Package
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(pkg)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const updated = await syncPackageToStripe(pkg.id)
                    onSync(updated)
                    toast.success("Package synced to Stripe")
                  } catch {
                    toast.error("Failed to sync package to Stripe")
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync to Stripe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(pkg)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {pkg.description && (
          <CardDescription className="line-clamp-2">{pkg.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price display */}
        {isSubscription && pkg.monthly_price && pkg.yearly_price ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {cs}{pkg.monthly_price}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                or {cs}{pkg.yearly_monthly_equivalent}/mo billed yearly
              </span>
              {pkg.yearly_savings_percent > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                  Save {pkg.yearly_savings_percent}%
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              {pkg.sale_price !== null ? (
                <>
                  <span className="text-3xl font-bold text-emerald-600">
                    {cs}{pkg.sale_price}
                  </span>
                  <span className="text-lg text-muted-foreground line-through">
                    {cs}{pkg.price}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold">
                  {cs}{pkg.price}
                </span>
              )}
              <span className="text-sm text-muted-foreground">/pkg</span>
            </div>
            {pkg.tax_rate > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                +{pkg.tax_rate}% tax
              </p>
            )}
          </div>
        )}

        {/* Detail badges */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary" className="font-normal">
            {pkg.credits === -1 ? "Unlimited" : `${pkg.credits} credits`}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {pkg.validity_days}d job duration
          </Badge>
          {pkg.package_validity_days ? (
            <Badge variant="secondary" className="font-normal">
              {pkg.package_validity_days}d credit expiry
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">No expiry</Badge>
          )}
        </div>

        {/* Features */}
        {pkg.features.length > 0 && (
          <ul className="space-y-1">
            {pkg.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {feature}
              </li>
            ))}
            {pkg.features.length > 3 && (
              <li className="text-xs text-muted-foreground pl-5">
                +{pkg.features.length - 3} more
              </li>
            )}
          </ul>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground capitalize">
            {pkg.payment_type.replace("_", " ")}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Stripe Sync Status */}
            {pkg.stripe_product_id && pkg.stripe_price_id ? (
              <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                <CheckCircle2 className="h-3 w-3" />
                Stripe Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3" />
                Not Synced
              </Badge>
            )}
            <Badge variant={pkg.is_active ? "secondary" : "outline"} className="text-xs">
              {pkg.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

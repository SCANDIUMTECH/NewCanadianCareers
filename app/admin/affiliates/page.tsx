"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  Trash2,
  RefreshCw,
  Link2,
} from "lucide-react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { cn, formatCurrency } from "@/lib/utils"
import { CHART, STATUS } from "@/lib/constants/colors"
import {
  getAdminAffiliateLinks,
  createAffiliateLink,
  updateAffiliateLink,
  deleteAffiliateLink,
  toggleAffiliateLinkStatus,
} from "@/lib/api/admin-affiliates"
import type { AffiliateLink, AffiliatePlacement, CreateAffiliateLinkData } from "@/lib/api/admin-affiliates"

const SparklineChart = dynamic(() => import("@/components/charts/sparkline-chart"), { ssr: false })

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

const placementLabels: Record<AffiliatePlacement, string> = {
  job_detail: "Job Detail",
  search_results: "Search Results",
  email: "Email",
  footer: "Footer",
}

const placementColors: Record<AffiliatePlacement, string> = {
  job_detail: "bg-blue-100 text-blue-700",
  search_results: "bg-amber-100 text-amber-700",
  email: "bg-green-100 text-green-700",
  footer: "bg-purple-100 text-purple-700",
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [placementFilter, setPlacementFilter] = useState<AffiliatePlacement | "all">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateLink | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingAffiliate, setDeletingAffiliate] = useState<AffiliateLink | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formCompany, setFormCompany] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formPlacement, setFormPlacement] = useState<AffiliatePlacement>("job_detail")
  const [formDisclosure, setFormDisclosure] = useState("Sponsored")
  const [formActive, setFormActive] = useState(true)

  const fetchAffiliates = useCallback(async () => {
    setLoading(true)
    try {
      const placement = placementFilter === "all" ? undefined : placementFilter
      const isActive = statusFilter === "all" ? undefined : statusFilter === "active"
      const data = await getAdminAffiliateLinks(placement, isActive)
      setAffiliates(data)
    } catch (error) {
      console.error("Failed to fetch affiliates:", error)
      setAffiliates([])
    } finally {
      setLoading(false)
    }
  }, [placementFilter, statusFilter])

  useEffect(() => {
    fetchAffiliates()
  }, [fetchAffiliates])

  const filteredAffiliates = useMemo(() => {
    if (!searchQuery) return affiliates
    return affiliates.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [affiliates, searchQuery])

  const stats = useMemo(() => {
    let totalClicks = 0
    let totalConversions = 0
    let totalRevenue = 0
    let activeCount = 0

    affiliates.forEach((a) => {
      totalClicks += a.clicks
      totalConversions += a.conversions
      totalRevenue += a.revenue
      if (a.is_active) activeCount++
    })

    return {
      total: affiliates.length,
      active: activeCount,
      clicks: totalClicks,
      conversions: totalConversions,
      revenue: totalRevenue,
    }
  }, [affiliates])

  const handleToggleStatus = async (affiliate: AffiliateLink) => {
    try {
      const updated = await toggleAffiliateLinkStatus(affiliate.id)
      setAffiliates((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (error) {
      console.error("Failed to toggle affiliate status:", error)
    }
  }

  const openEditDialog = (affiliate: AffiliateLink) => {
    setEditingAffiliate(affiliate)
    setFormName(affiliate.name)
    setFormCompany(affiliate.company)
    setFormUrl(affiliate.url)
    setFormPlacement(affiliate.placement)
    setFormDisclosure(affiliate.disclosure_label)
    setFormActive(affiliate.is_active)
  }

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true)
    setFormName("")
    setFormCompany("")
    setFormUrl("")
    setFormPlacement("job_detail")
    setFormDisclosure("Sponsored")
    setFormActive(true)
  }

  const closeDialog = () => {
    setEditingAffiliate(null)
    setIsCreateDialogOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: CreateAffiliateLinkData = {
        name: formName,
        company: formCompany,
        url: formUrl,
        placement: formPlacement,
        disclosure_label: formDisclosure,
        is_active: formActive,
      }

      if (editingAffiliate) {
        const updated = await updateAffiliateLink(editingAffiliate.id, data)
        setAffiliates((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      } else {
        const created = await createAffiliateLink(data)
        setAffiliates((prev) => [...prev, created])
      }
      closeDialog()
    } catch (error) {
      console.error("Failed to save affiliate:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAffiliate) return
    try {
      await deleteAffiliateLink(deletingAffiliate.id)
      setAffiliates((prev) => prev.filter((a) => a.id !== deletingAffiliate.id))
      setDeletingAffiliate(null)
    } catch (error) {
      console.error("Failed to delete affiliate:", error)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Affiliate Management</h1>
            <p className="text-muted-foreground text-sm">
              Manage affiliate placements, tracking, and disclosure settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAffiliates} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Affiliate
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <AffiliateStatCard title="Total Affiliates" value={stats.total} color={CHART.slate} />
            <AffiliateStatCard title="Active" value={stats.active} color={STATUS.success} valueClass="text-green-600" />
            <AffiliateStatCard
              title="Total Clicks"
              value={stats.clicks}
              color={CHART.cyan}
              chartType="area"
              sparkData={affiliates.map((a) => ({ v: a.clicks }))}
            />
            <AffiliateStatCard
              title="Conversions"
              value={stats.conversions}
              color={STATUS.info}
              valueClass="text-blue-600"
              chartType="bar"
              sparkData={affiliates.map((a) => ({ v: a.conversions }))}
            />
            <AffiliateStatCard
              title="Revenue"
              value={stats.revenue}
              color={CHART.indigo}
              valueClass="text-primary"
              isCurrency
              chartType="area"
              sparkData={affiliates.map((a) => ({ v: a.revenue }))}
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
                  placeholder="Search affiliates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={placementFilter} onValueChange={(v) => setPlacementFilter(v as AffiliatePlacement | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="job_detail">Job Detail</SelectItem>
                  <SelectItem value="search_results">Search Results</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-5 w-[80px] rounded-full" />
                    <Skeleton className="h-5 w-[60px] rounded-full" />
                    <Skeleton className="h-4 w-[80px] ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="p-12 text-center">
                <Link2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No affiliates found</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery ? "Try adjusting your search" : "Create your first affiliate to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Affiliate</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Placement</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Disclosure</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Clicks</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Conversions</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Conv. Rate</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Revenue</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAffiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-foreground">{affiliate.name}</p>
                            <p className="text-sm text-muted-foreground">{affiliate.company}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="secondary" className={placementColors[affiliate.placement]}>
                            {placementLabels[affiliate.placement]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="font-normal">
                            {affiliate.disclosure_label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant="secondary"
                            className={affiliate.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                          >
                            {affiliate.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">{affiliate.clicks.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-sm">{affiliate.conversions.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-sm">
                          {(affiliate.conversion_rate * 100).toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-primary">
                          ${affiliate.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(affiliate)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(affiliate)}>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                {affiliate.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingAffiliate(affiliate)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingAffiliate || isCreateDialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAffiliate ? "Edit Affiliate" : "Create Affiliate"}</DialogTitle>
            <DialogDescription>
              {editingAffiliate
                ? "Update affiliate settings and disclosure text"
                : "Configure a new affiliate placement"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., LinkedIn Jobs Integration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="e.g., LinkedIn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Affiliate URL</Label>
              <Input
                id="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Placement</Label>
                <Select value={formPlacement} onValueChange={(v) => setFormPlacement(v as AffiliatePlacement)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job_detail">Job Detail</SelectItem>
                    <SelectItem value="search_results">Search Results</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Disclosure Label</Label>
                <Select value={formDisclosure} onValueChange={setFormDisclosure}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sponsored">Sponsored</SelectItem>
                    <SelectItem value="Partner">Partner</SelectItem>
                    <SelectItem value="Affiliate">Affiliate</SelectItem>
                    <SelectItem value="Ad">Ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>

            {editingAffiliate && (
              <div className="pt-4 border-t">
                <Label className="mb-3 block">Performance</Label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-lg font-semibold">{editingAffiliate.clicks.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Conversions</p>
                    <p className="text-lg font-semibold">{editingAffiliate.conversions.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Conv. Rate</p>
                    <p className="text-lg font-semibold">{(editingAffiliate.conversion_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-semibold">{formatCurrency(editingAffiliate.revenue)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formUrl}>
              {saving ? "Saving..." : editingAffiliate ? "Save Changes" : "Create Affiliate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAffiliate} onOpenChange={(open) => !open && setDeletingAffiliate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAffiliate?.name}&quot;? This action cannot be undone.
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

function AffiliateStatCard({
  title,
  value,
  color,
  valueClass,
  isCurrency,
  chartType = "none",
  sparkData,
}: {
  title: string
  value: number
  color: string
  valueClass?: string
  isCurrency?: boolean
  chartType?: "area" | "bar" | "none"
  sparkData?: { v: number }[]
}) {
  const hasChart = chartType !== "none" && sparkData && sparkData.length > 1

  return (
    <Card className="relative overflow-hidden group">
      <div
        className="absolute bottom-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, ${color}, ${color}88)` }}
      />
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueClass)}>
          {isCurrency ? formatCurrency(value) : value.toLocaleString()}
        </p>
        {hasChart && (
          <div className="mt-2 h-8 -mx-1">
            <SparklineChart
              data={sparkData!}
              color={color}
              type={chartType as "area" | "bar"}
              gradientId={`astat-${title.replace(/\s/g, "")}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

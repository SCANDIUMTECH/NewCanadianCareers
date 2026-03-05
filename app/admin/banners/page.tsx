"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  Trash2,
  RefreshCw,
  Calendar,
  Eye,
  MousePointer,
  ImageIcon,
  Layout,
  Zap,
  Clock,
  Power,
} from "lucide-react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { cn } from "@/lib/utils"
import { CHART, STATUS } from "@/lib/constants/colors"
import {
  getAdminBanners,
  deleteBanner,
  toggleBannerStatus,
} from "@/lib/api/admin-banners"
import type { SponsoredBanner, BannerPlacement } from "@/lib/api/admin-banners"
import { searchJobs } from "@/lib/api/public"

const SparklineChart = dynamic(() => import("@/components/charts/sparkline-chart"), { ssr: false })

// ── Animation Variants ──────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// ── Placement Config ────────────────────────────────────────────────────
/** Open the public page where a banner's placement is visible. */
async function openPlacementPreview(placement: BannerPlacement) {
  if (placement === "homepage") {
    window.open("/", "_blank", "noopener,noreferrer")
    return
  }
  if (placement === "search_top" || placement === "search_sidebar") {
    window.open("/jobs", "_blank", "noopener,noreferrer")
    return
  }
  // job_detail — fetch a real job to preview on
  try {
    const { results } = await searchJobs({ page_size: 1 })
    if (results.length > 0) {
      window.open(`/jobs/${results[0].job_id}`, "_blank", "noopener,noreferrer")
    } else {
      window.open("/jobs", "_blank", "noopener,noreferrer")
    }
  } catch {
    window.open("/jobs", "_blank", "noopener,noreferrer")
  }
}

const placementLabels: Record<BannerPlacement, string> = {
  search_top: "Search Top",
  search_sidebar: "Search Sidebar",
  job_detail: "Job Detail",
  homepage: "Homepage",
}

const placementColors: Record<BannerPlacement, string> = {
  search_top: "bg-sky/10 text-sky",
  search_sidebar: "bg-primary/10 text-primary",
  job_detail: "bg-amber-100 text-amber-700",
  homepage: "bg-green-100 text-green-700",
}

// ── Status Config ───────────────────────────────────────────────────────
type BannerStatus = "active" | "scheduled" | "expired" | "inactive"

function getBannerStatus(banner: SponsoredBanner): BannerStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!banner.is_active) return "inactive"
  if (banner.end_date && new Date(banner.end_date) < today) return "expired"
  if (banner.start_date && new Date(banner.start_date) > today) return "scheduled"
  return "active"
}

const statusColors: Record<BannerStatus, string> = {
  active: "bg-green-100 text-green-700",
  scheduled: "bg-sky/10 text-sky",
  expired: "bg-gray-100 text-gray-700",
  inactive: "bg-red-100 text-red-700",
}

// ═════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═════════════════════════════════════════════════════════════════════════
export default function BannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<SponsoredBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [placementFilter, setPlacementFilter] = useState<BannerPlacement | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deletingBanner, setDeletingBanner] = useState<SponsoredBanner | null>(null)

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const placement = placementFilter === "all" ? undefined : placementFilter
      const data = await getAdminBanners(placement)
      setBanners(data)
    } catch (error) {
      console.error("Failed to fetch banners:", error)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [placementFilter])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const filteredBanners = useMemo(() => {
    return banners.filter((banner) => {
      const matchesSearch =
        !searchQuery ||
        banner.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banner.sponsor.toLowerCase().includes(searchQuery.toLowerCase())
      const status = getBannerStatus(banner)
      const matchesStatus = statusFilter === "all" || status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [banners, searchQuery, statusFilter])

  const stats = useMemo(() => {
    let activeCount = 0
    let scheduledCount = 0
    let totalImpressions = 0
    let totalClicks = 0

    banners.forEach((banner) => {
      const status = getBannerStatus(banner)
      if (status === "active") activeCount++
      if (status === "scheduled") scheduledCount++
      totalImpressions += banner.impressions
      totalClicks += banner.clicks
    })

    return { total: banners.length, active: activeCount, scheduled: scheduledCount, impressions: totalImpressions, clicks: totalClicks }
  }, [banners])

  const handleToggleStatus = async (banner: SponsoredBanner) => {
    try {
      const updated = await toggleBannerStatus(banner.id)
      setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    } catch (error) {
      console.error("Failed to toggle banner status:", error)
      toast.error("Failed to toggle banner status")
    }
  }

  const handleDelete = async () => {
    if (!deletingBanner) return
    try {
      await deleteBanner(deletingBanner.id)
      setBanners((prev) => prev.filter((b) => b.id !== deletingBanner.id))
      setDeletingBanner(null)
      toast.success("Banner deleted")
    } catch (error) {
      console.error("Failed to delete banner:", error)
      toast.error("Failed to delete banner")
    }
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Banner Management</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage sponsored banners and placements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBanners} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/admin/banners/new")} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Banner
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Banners"
              value={stats.total}
              icon={<Layout className="h-4 w-4" />}
              gradient="from-slate-600 to-slate-800"
              bgAccent="bg-slate-500"
            />
            <StatCard
              title="Active Now"
              value={stats.active}
              color="green"
              icon={<Zap className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
              sparkColor={STATUS.success}
              sparkData={banners.filter(b => getBannerStatus(b) === "active").map((b) => ({ v: b.impressions }))}
            />
            <StatCard
              title="Scheduled"
              value={stats.scheduled}
              color="primary"
              icon={<Clock className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              bgAccent="bg-sky"
            />
            <StatCard
              title="Total Impressions"
              value={stats.impressions}
              icon={<Eye className="h-4 w-4" />}
              gradient="from-destructive to-destructive-deep"
              bgAccent="bg-destructive"
              sparkColor={CHART.pink}
              sparkData={banners.map((b) => ({ v: b.impressions }))}
            />
            <StatCard
              title="Total Clicks"
              value={stats.clicks}
              icon={<MousePointer className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
              sparkColor={CHART.purple}
              sparkData={banners.map((b) => ({ v: b.clicks }))}
              chartType="bar"
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
                  placeholder="Search by title or sponsor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={placementFilter} onValueChange={(v) => setPlacementFilter(v as BannerPlacement | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="homepage">Homepage</SelectItem>
                  <SelectItem value="search_top">Search Top</SelectItem>
                  <SelectItem value="search_sidebar">Search Sidebar</SelectItem>
                  <SelectItem value="job_detail">Job Detail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Banner Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/1]" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : filteredBanners.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <Layout className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No banners found</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery ? "Try adjusting your filters" : "Create your first banner to get started"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredBanners.map((banner) => {
            const status = getBannerStatus(banner)
            const ctr = banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : "0.00"

            return (
              <Card key={banner.id} className="overflow-hidden transition-all hover:shadow-md">
                <div className="relative aspect-[4/1] bg-muted">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className={placementColors[banner.placement]}>
                      {placementLabels[banner.placement]}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className={statusColors[status]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{banner.title}</p>
                      <p className="text-sm text-muted-foreground">{banner.sponsor || "No sponsor"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/banners/${banner.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(banner)}>
                          <Power className="mr-2 h-4 w-4" />
                          {banner.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPlacementPreview(banner.placement)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview on Site
                        </DropdownMenuItem>
                        {banner.target_url && (
                          <DropdownMenuItem asChild>
                            <a href={banner.target_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit Target URL
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingBanner(banner)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {(banner.start_date || banner.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {banner.start_date ? new Date(banner.start_date).toLocaleDateString() : "—"}
                        {" - "}
                        {banner.end_date ? new Date(banner.end_date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{banner.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span>{banner.clicks.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{ctr}% CTR</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </motion.div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBanner} onOpenChange={(open) => !open && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingBanner?.title}&quot;? This action cannot be undone.
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

// ═════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════

function StatCard({
  title,
  value,
  color,
  icon,
  gradient,
  bgAccent,
  sparkColor,
  sparkData,
  chartType = "area",
}: {
  title: string
  value: number
  color?: string
  icon?: React.ReactNode
  gradient?: string
  bgAccent?: string
  sparkColor?: string
  sparkData?: { v: number }[]
  chartType?: "area" | "bar"
}) {
  const hasChart = sparkColor && sparkData && sparkData.length > 1

  return (
    <Card className="relative overflow-hidden group">
      {bgAccent && (
        <div className={cn(
          "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
          bgAccent
        )} />
      )}
      {gradient && (
        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          color === "green" && "text-green-600",
          color === "amber" && "text-amber-600",
          color === "red" && "text-red-600",
          color === "primary" && "text-primary"
        )}>
          {value.toLocaleString()}
        </p>
        {hasChart && (
          <div className="mt-2 h-10 -mx-1">
            <SparklineChart
              data={sparkData!}
              color={sparkColor!}
              type={chartType}
              gradientId={`bstat-${title.replace(/\s/g, "")}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-1 h-8 w-16" />
      </CardContent>
    </Card>
  )
}

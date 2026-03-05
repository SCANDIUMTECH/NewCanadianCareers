"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getCoupon,
  updateCoupon,
  getCouponStats,
  getCouponRedemptions,
  pauseCoupon,
  activateCoupon,
  duplicateCoupon,
  deleteCoupon,
} from "@/lib/api/admin-marketing"
import type {
  Coupon,
  CouponStats,
  CouponRedemption,
  CouponStatus,
} from "@/lib/api/admin-marketing"
import {
  ArrowLeft,
  Copy,
  Pause,
  Play,
  Trash2,
  Save,
  Users,
  DollarSign,
  BarChart3,
  Tag,
  Calendar,
  Shield,
} from "lucide-react"

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

const STATUS_COLORS: Record<CouponStatus, string> = {
  active: "border-green-200 text-green-600 bg-green-50",
  paused: "border-amber-200 text-amber-600 bg-amber-50",
  expired: "border-gray-200 text-gray-500 bg-gray-50",
  exhausted: "border-red-200 text-red-600 bg-red-50",
}

export default function CouponDetailPage() {
  const params = useParams()
  const router = useRouter()
  const couponId = Number(params.id)

  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [stats, setStats] = useState<CouponStats | null>(null)
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Editable fields
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editMaxUsesTotal, setEditMaxUsesTotal] = useState("")
  const [editMaxUsesPerCustomer, setEditMaxUsesPerCustomer] = useState("")
  const [editExpiresAt, setEditExpiresAt] = useState("")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [couponData, statsData, redemptionsData] = await Promise.all([
        getCoupon(couponId),
        getCouponStats(couponId),
        getCouponRedemptions(couponId),
      ])
      setCoupon(couponData)
      setStats(statsData)
      setRedemptions(redemptionsData.results)

      // Populate edit fields
      setEditName(couponData.name)
      setEditDescription(couponData.description)
      setEditMaxUsesTotal(couponData.max_uses_total ? String(couponData.max_uses_total) : "")
      setEditMaxUsesPerCustomer(String(couponData.max_uses_per_customer))
      setEditExpiresAt(couponData.expires_at ? couponData.expires_at.slice(0, 16) : "")
    } catch (err) {
      console.error("Failed to fetch coupon:", err)
    } finally {
      setIsLoading(false)
    }
  }, [couponId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!coupon) return
    setIsSaving(true)
    try {
      const updated = await updateCoupon(coupon.id, {
        name: editName,
        description: editDescription,
        max_uses_total: editMaxUsesTotal ? Number(editMaxUsesTotal) : undefined,
        max_uses_per_customer: Number(editMaxUsesPerCustomer),
        expires_at: editExpiresAt || null,
      })
      setCoupon(updated)
    } catch (err) {
      console.error("Failed to update:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePause = async () => {
    if (!coupon) return
    try {
      const updated = await pauseCoupon(coupon.id)
      setCoupon(updated)
    } catch (err) {
      console.error("Failed to pause:", err)
    }
  }

  const handleActivate = async () => {
    if (!coupon) return
    try {
      const updated = await activateCoupon(coupon.id)
      setCoupon(updated)
    } catch (err) {
      console.error("Failed to activate:", err)
    }
  }

  const handleDuplicate = async () => {
    if (!coupon) return
    try {
      const newCoupon = await duplicateCoupon(coupon.id)
      router.push(`/admin/marketing/coupons/${newCoupon.id}`)
    } catch (err) {
      console.error("Failed to duplicate:", err)
    }
  }

  const handleDelete = async () => {
    if (!coupon) return
    try {
      await deleteCoupon(coupon.id)
      router.push("/admin/marketing/coupons")
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Coupon not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/marketing/coupons">Back to Coupons</Link>
        </Button>
      </div>
    )
  }

  const formatDiscount = () => {
    switch (coupon.discount_type) {
      case "percentage":
        return `${coupon.discount_value}% off${coupon.max_discount_amount ? ` (max $${coupon.max_discount_amount})` : ""}`
      case "fixed":
        return `$${coupon.discount_value} off`
      case "credits":
        return `${coupon.discount_value} bonus credits`
      case "free_trial":
        return `${coupon.discount_value} day free trial`
      default:
        return String(coupon.discount_value)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Breadcrumb + Header */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3">
          <Link href="/admin/marketing/coupons">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Coupons
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0 mt-0.5">
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight font-mono">
                  {coupon.code}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("text-xs capitalize", STATUS_COLORS[coupon.status])}
                >
                  {coupon.status}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {coupon.distribution}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {coupon.name} — {formatDiscount()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="mr-1 h-4 w-4" />
              Duplicate
            </Button>
            {coupon.status === "active" && (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="mr-1 h-4 w-4" />
                Pause
              </Button>
            )}
            {(coupon.status === "paused" || coupon.status === "expired") && (
              <Button variant="outline" size="sm" onClick={handleActivate}>
                <Play className="mr-1 h-4 w-4" />
                Activate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">Redemptions</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total_redemptions}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-sky to-sky-deep -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">Unique Users</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.unique_users}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">Total Discount</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                ${Number(stats.total_discount_given).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-destructive -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-destructive flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">Remaining</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {stats.remaining_uses !== null ? stats.remaining_uses : "Unlimited"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="redemptions">
              Redemptions ({stats?.total_redemptions || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Edit Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coupon Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Uses (Total)</Label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={editMaxUsesTotal}
                        onChange={(e) => setEditMaxUsesTotal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Per Customer</Label>
                      <Input
                        type="number"
                        value={editMaxUsesPerCustomer}
                        onChange={(e) => setEditMaxUsesPerCustomer(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Date</Label>
                    <Input
                      type="datetime-local"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-1 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Info Card */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Discount Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium capitalize">{coupon.discount_type.replace("_", " ")}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Value</dt>
                        <dd className="font-medium">{formatDiscount()}</dd>
                      </div>
                      {coupon.min_purchase && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Min Purchase</dt>
                          <dd className="font-medium">${coupon.min_purchase}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Distribution</dt>
                        <dd className="font-medium capitalize">{coupon.distribution}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security & Restrictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">One Per IP</dt>
                        <dd>{coupon.one_per_ip ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Verified Email Required</dt>
                        <dd>{coupon.require_verified_email ? "Yes" : "No"}</dd>
                      </div>
                      {coupon.starts_at && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Starts</dt>
                          <dd>{new Date(coupon.starts_at).toLocaleString()}</dd>
                        </div>
                      )}
                      {coupon.expires_at && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Expires</dt>
                          <dd>{new Date(coupon.expires_at).toLocaleString()}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{new Date(coupon.created_at).toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Last Updated</dt>
                        <dd>{new Date(coupon.updated_at).toLocaleString()}</dd>
                      </div>
                      {coupon.created_by_email && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Created By</dt>
                          <dd>{coupon.created_by_email}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="redemptions" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No redemptions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    redemptions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.user_name}</p>
                            <p className="text-xs text-muted-foreground">{r.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {Number(r.discount_amount) > 0 ? `$${Number(r.discount_amount).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.credits_granted > 0 ? r.credits_granted : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.ip_address || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete coupon <strong>{coupon.code}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  getCoupons,
  deleteCoupon,
  duplicateCoupon,
  pauseCoupon,
  activateCoupon,
  getWallets,
} from "@/lib/api/admin-marketing"
import type {
  Coupon,
  CouponStatus,
  StoreCreditWallet,
} from "@/lib/api/admin-marketing"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Trash2,
  Ticket,
  Wallet,
} from "lucide-react"

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

const STATUS_COLORS: Record<CouponStatus, string> = {
  active: "border-green-200 text-green-600 bg-green-50",
  paused: "border-amber-200 text-amber-600 bg-amber-50",
  expired: "border-gray-200 text-gray-500 bg-gray-50",
  exhausted: "border-red-200 text-red-600 bg-red-50",
}

function formatDiscount(coupon: Coupon): string {
  switch (coupon.discount_type) {
    case "percentage":
      return `${coupon.discount_value}%`
    case "fixed":
      return `$${coupon.discount_value}`
    case "credits":
      return `${coupon.discount_value} credits`
    case "free_trial":
      return `${coupon.discount_value} days`
    default:
      return String(coupon.discount_value)
  }
}

export default function CouponsPage() {
  const [tab, setTab] = useState("coupons")
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [wallets, setWallets] = useState<StoreCreditWallet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getCoupons({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as CouponStatus) : undefined,
      })
      setCoupons(res.results)
    } catch (err) {
      console.error("Failed to fetch coupons:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  const fetchWallets = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getWallets({ search: search || undefined })
      setWallets(res.results)
    } catch (err) {
      console.error("Failed to fetch wallets:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (tab === "coupons") {
      fetchCoupons()
    } else {
      fetchWallets()
    }
  }, [tab, fetchCoupons, fetchWallets])

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateCoupon(id)
      fetchCoupons()
    } catch (err) {
      console.error("Failed to duplicate:", err)
    }
  }

  const handlePause = async (id: number) => {
    try {
      await pauseCoupon(id)
      fetchCoupons()
    } catch (err) {
      console.error("Failed to pause:", err)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await activateCoupon(id)
      fetchCoupons()
    } catch (err) {
      console.error("Failed to activate:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this coupon? This action cannot be undone.")) return
    try {
      await deleteCoupon(id)
      fetchCoupons()
    } catch (err) {
      console.error("Failed to delete:", err)
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Ticket className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Coupons & Credits</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage discount coupons and store credit wallets
            </p>
          </div>
        </div>
        <Button asChild className="gap-1.5 shadow-sm">
          <Link href="/admin/marketing/coupons/new">
            <Plus className="h-4 w-4" />
            Create Coupon
          </Link>
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="coupons" className="gap-1.5">
              <Ticket className="h-4 w-4" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="wallets" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              Store Credit Wallets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coupons" className="space-y-4 mt-6">
            {/* Toolbar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search coupons..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="exhausted">Exhausted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Coupon Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead className="text-right">Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
                            <Ticket className="h-8 w-8 text-emerald-400" />
                          </div>
                          <p className="font-semibold text-foreground text-lg">No coupons yet</p>
                          <p className="text-sm mt-1 mb-6 max-w-sm">Create your first discount coupon to start offering promotions</p>
                          <Button asChild size="sm" className="gap-1.5">
                            <Link href="/admin/marketing/coupons/new">
                              <Plus className="h-4 w-4" />
                              Create Coupon
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
                      <TableRow key={coupon.id} className="group">
                        <TableCell>
                          <Link
                            href={`/admin/marketing/coupons/${coupon.id}`}
                            className="font-mono font-medium text-sm hover:text-primary transition-colors"
                          >
                            {coupon.code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {coupon.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs capitalize", STATUS_COLORS[coupon.status])}
                          >
                            {coupon.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDiscount(coupon)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {coupon.distribution}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium">{coupon.uses_count}</span>
                          {coupon.max_uses_total && (
                            <span className="text-muted-foreground">
                              /{coupon.max_uses_total}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coupon.expires_at
                            ? new Date(coupon.expires_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/marketing/coupons/${coupon.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(coupon.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {coupon.status === "active" && (
                                <DropdownMenuItem onClick={() => handlePause(coupon.id)}>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              {(coupon.status === "paused" || coupon.status === "expired") && (
                                <DropdownMenuItem onClick={() => handleActivate(coupon.id)}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(coupon.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4 mt-6">
            {/* Wallet Toolbar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search wallets..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallets Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : wallets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-gray-100 mb-4">
                            <Wallet className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="font-semibold text-foreground text-lg">No wallets yet</p>
                          <p className="text-sm mt-1 max-w-sm">
                            Wallets are created when store credits are issued
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    wallets.map((wallet) => (
                      <TableRow key={wallet.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/marketing/coupons/wallets/${wallet.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {wallet.owner_name || "Unknown"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {wallet.owner_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ${Number(wallet.balance).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(wallet.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/marketing/coupons/wallets/${wallet.id}`}>
                              View
                            </Link>
                          </Button>
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
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn, getCompanyInitials } from "@/lib/utils"
import {
  Search,
  Plus,
  Minus,
  MoreHorizontal,
  History,
  RefreshCw,
  CreditCard,
  Building2,
  Users,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  getAdminEntitlements,
  createAdminEntitlement,
  deleteAdminEntitlement,
} from "@/lib/api/admin-entitlements"
import { applyCreditAdjustment } from "@/lib/api/admin-payments"
import type {
  AdminEntitlement,
  AdminEntitlementFilters,
  CreateEntitlementData,
} from "@/lib/admin/types"

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

export default function EntitlementsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entitlement: AdminEntitlement | null }>({ open: false, entitlement: null })
  const [selectedEntitlement, setSelectedEntitlement] = useState<AdminEntitlement | null>(null)

  // Data state
  const [entitlements, setEntitlements] = useState<AdminEntitlement[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Fetch entitlements
  const fetchEntitlements = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: AdminEntitlementFilters = {
        page,
        page_size: 20,
        ordering: '-created_at',
      }
      if (searchQuery) filters.search = searchQuery
      if (sourceFilter !== 'all') filters.source = sourceFilter

      const response = await getAdminEntitlements(filters)
      setEntitlements(response.results)
      setTotalCount(response.count)
    } catch (err) {
      console.error('Failed to fetch entitlements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load entitlements')
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, sourceFilter])

  useEffect(() => {
    fetchEntitlements()
  }, [fetchEntitlements])

  // Debounced search
  const [searchInput, setSearchInput] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Computed stats from real data
  const stats = useMemo(() => {
    let totalCredits = 0
    let totalUsed = 0
    let lowCreditAccounts = 0
    const ownerSet = new Set<string>()

    entitlements.forEach((e) => {
      const remaining = e.credits_total - e.credits_used
      totalCredits += remaining
      totalUsed += e.credits_used

      const ownerKey = e.company ? `c-${e.company}` : `a-${e.agency}`
      ownerSet.add(ownerKey)

      if (remaining > 0 && remaining < 5) lowCreditAccounts++
    })

    return {
      totalAccounts: ownerSet.size,
      totalCredits,
      usedCredits: totalUsed,
      lowCreditAccounts,
    }
  }, [entitlements])

  const handleAdjust = (entitlement: AdminEntitlement) => {
    setSelectedEntitlement(entitlement)
    setAdjustDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteDialog.entitlement) return
    try {
      await deleteAdminEntitlement(deleteDialog.entitlement.id)
      setDeleteDialog({ open: false, entitlement: null })
      fetchEntitlements()
    } catch (err) {
      console.error('Failed to delete entitlement:', err)
    }
  }

  const totalPages = Math.ceil(totalCount / 20)

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
          <h1 className="text-2xl font-semibold tracking-tight">Entitlements</h1>
          <p className="text-muted-foreground mt-1">
            Manage job posting credits across companies and agencies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntitlements} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setGrantDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Grant Credits
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Total Accounts</span>
                </div>
                <p className="mt-1 text-2xl font-semibold">{stats.totalAccounts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Remaining Credits</span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-primary">{stats.totalCredits}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>Credits Used</span>
                </div>
                <p className="mt-1 text-2xl font-semibold">{stats.usedCredits}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Low Credit Alerts</span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.lowCreditAccounts}</p>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchEntitlements} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company or agency name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="package_purchase">Package Purchase</SelectItem>
                  <SelectItem value="admin_grant">Admin Grant</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Entitlements Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : entitlements.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-medium text-lg">No entitlements found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchInput || sourceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Grant credits to get started'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entitlements.map((entitlement) => {
                    const accountName = entitlement.company_name || entitlement.agency_name || 'Unknown'
                    const accountType = entitlement.company ? 'company' : 'agency'
                    const remaining = entitlement.credits_total - entitlement.credits_used

                    return (
                      <TableRow key={entitlement.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={cn(
                                "text-xs",
                                accountType === "company" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                              )}>
                                {getCompanyInitials(accountName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{accountName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {accountType === 'company' ? (
                              <><Building2 className="mr-1 h-3 w-3" />{accountType}</>
                            ) : (
                              <><Users className="mr-1 h-3 w-3" />{accountType}</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entitlement.credits_total}
                        </TableCell>
                        <TableCell className="text-right">
                          {entitlement.credits_used}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-semibold",
                            remaining < 5 && remaining > 0 && "text-amber-600",
                            remaining === 0 && "text-red-600"
                          )}>
                            {remaining}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              entitlement.source === "admin_grant" && "bg-green-100 text-green-700",
                              entitlement.source === "package_purchase" && "bg-blue-100 text-blue-700",
                              entitlement.source === "subscription" && "bg-purple-100 text-purple-700",
                              entitlement.source === "promotion" && "bg-amber-100 text-amber-700",
                              entitlement.source === "refund" && "bg-gray-100 text-gray-700"
                            )}
                          >
                            {entitlement.source.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entitlement.expires_at
                            ? new Date(entitlement.expires_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entitlement.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAdjust(entitlement)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Adjust Credits
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteDialog({ open: true, entitlement })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Adjust Credits Dialog */}
      <AdjustCreditsDialog
        entitlement={selectedEntitlement}
        open={adjustDialogOpen}
        onOpenChange={(open) => {
          setAdjustDialogOpen(open)
          if (!open) setSelectedEntitlement(null)
        }}
        onSuccess={fetchEntitlements}
      />

      {/* Grant Credits Dialog */}
      <GrantCreditsDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        onSuccess={fetchEntitlements}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, entitlement: open ? deleteDialog.entitlement : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entitlement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entitlement for{' '}
              <strong>{deleteDialog.entitlement?.company_name || deleteDialog.entitlement?.agency_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// =============================================================================
// Adjust Credits Dialog
// =============================================================================

function AdjustCreditsDialog({
  entitlement,
  open,
  onOpenChange,
  onSuccess,
}: {
  entitlement: AdminEntitlement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [adjustmentType, setAdjustmentType] = useState<"grant" | "revoke">("grant")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setAdjustmentType("grant")
      setAmount("")
      setReason("")
      setSubmitError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!entitlement || !amount || !reason) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await applyCreditAdjustment({
        ...(entitlement.company ? { company_id: entitlement.company } : { agency_id: entitlement.agency! }),
        amount: parseInt(amount, 10),
        reason,
        type: adjustmentType === "grant" ? "credit" : "debit",
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to adjust credits"
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const accountName = entitlement?.company_name || entitlement?.agency_name || 'Unknown'
  const remaining = entitlement ? entitlement.credits_total - entitlement.credits_used : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Credits</DialogTitle>
          <DialogDescription>
            Grant or revoke job posting credits for <strong>{accountName}</strong>.
            Current balance: <strong>{remaining} credits</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === "grant" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  adjustmentType === "grant" && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setAdjustmentType("grant")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Grant
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "revoke" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  adjustmentType === "revoke" && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setAdjustmentType("revoke")}
              >
                <Minus className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Number of credits"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Textarea
              id="reason"
              placeholder="Explain the reason for this adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the audit log
            </p>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || !reason || isSubmitting}
            className={adjustmentType === "grant" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {adjustmentType === "grant" ? "Grant" : "Revoke"} Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Grant Credits Dialog (new entitlement)
// =============================================================================

function GrantCreditsDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [targetType, setTargetType] = useState<"company" | "agency">("company")
  const [targetId, setTargetId] = useState("")
  const [credits, setCredits] = useState("")
  const [featuredCredits, setFeaturedCredits] = useState("")
  const [socialCredits, setSocialCredits] = useState("")
  const [durationDays, setDurationDays] = useState("30")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTargetType("company")
      setTargetId("")
      setCredits("")
      setFeaturedCredits("")
      setSocialCredits("")
      setDurationDays("30")
      setSubmitError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!targetId || !credits) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const data: CreateEntitlementData = {
        credits_total: parseInt(credits, 10),
        post_duration_days: parseInt(durationDays, 10) || 30,
      }

      if (targetType === "company") {
        data.company = parseInt(targetId, 10)
      } else {
        data.agency = parseInt(targetId, 10)
      }

      if (featuredCredits) data.featured_credits_total = parseInt(featuredCredits, 10)
      if (socialCredits) data.social_credits_total = parseInt(socialCredits, 10)

      await createAdminEntitlement(data)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to grant credits"
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Grant New Entitlement</DialogTitle>
          <DialogDescription>
            Create a new credit entitlement for a company or agency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={targetType === "company" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTargetType("company")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Company
              </Button>
              <Button
                type="button"
                variant={targetType === "agency" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTargetType("agency")}
              >
                <Users className="mr-2 h-4 w-4" />
                Agency
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetId">{targetType === "company" ? "Company" : "Agency"} ID</Label>
            <Input
              id="targetId"
              type="number"
              min="1"
              placeholder={`Enter ${targetType} ID`}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="credits">Job Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                placeholder="10"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featured">Featured</Label>
              <Input
                id="featured"
                type="number"
                min="0"
                placeholder="0"
                value={featuredCredits}
                onChange={(e) => setFeaturedCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social">Social</Label>
              <Input
                id="social"
                type="number"
                min="0"
                placeholder="0"
                value={socialCredits}
                onChange={(e) => setSocialCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Post Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="30"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetId || !credits || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Grant Entitlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { cn } from "@/lib/utils"
import { getPackages } from "@/lib/api/billing"
import { changeCompanyPlan } from "@/lib/api/admin-companies"
import { changeAgencyPlan } from "@/lib/api/admin-agencies"
import { toast } from "sonner"
import { Loader2, Check, ArrowRight } from "lucide-react"
import type { Package } from "@/lib/company/types"

interface ChangePlanDialogProps {
  /** @deprecated Use `entity` instead */
  company?: { id: string | number; name: string; currentPlan: string }
  entity?: { id: string | number; name: string; currentPlan: string }
  entityType?: "company" | "agency"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ChangePlanDialog({
  company,
  entity: entityProp,
  entityType = "company",
  open,
  onOpenChange,
  onSuccess,
}: ChangePlanDialogProps) {
  const entity = entityProp ?? company ?? { id: 0, name: "", currentPlan: "" }

  const [packages, setPackages] = useState<Package[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("stored_card")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const entityLabel = entityType === "agency" ? "agency" : "company"

  // Fetch packages when dialog opens
  useEffect(() => {
    if (!open) return
    setIsLoadingPackages(true)
    getPackages()
      .then((pkgs) => {
        setPackages(pkgs)
        // Pre-select current plan
        const current = pkgs.find(
          (p) => p.name.toLowerCase() === entity.currentPlan.toLowerCase()
        )
        if (current) setSelectedPackageId(current.id)
      })
      .catch(() => {
        toast.error("Failed to load packages")
      })
      .finally(() => setIsLoadingPackages(false))
  }, [open, entity.currentPlan])

  const resetForm = () => {
    setSelectedPackageId(null)
    setPaymentMethod("stored_card")
    setNotes("")
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  const selectedPackage = packages.find((p) => p.id === selectedPackageId)
  const isCurrentPlan =
    selectedPackage?.name.toLowerCase() === entity.currentPlan.toLowerCase()

  const handleSubmit = async () => {
    if (!selectedPackageId || isCurrentPlan) return
    setIsSubmitting(true)
    try {
      const payload = {
        plan_id: String(selectedPackageId),
        payment_method: paymentMethod,
        notes: notes || undefined,
      }
      if (entityType === "agency") {
        await changeAgencyPlan(entity.id, payload)
      } else {
        await changeCompanyPlan(entity.id, payload)
      }
      toast.success(`Plan changed to ${selectedPackage?.name}`)
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change plan"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Plan</DialogTitle>
          <DialogDescription>
            Select a new subscription plan for {entity.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Grid */}
          <div className="space-y-2">
            <Label>Select Plan</Label>
            {isLoadingPackages ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No packages available
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packages.map((pkg) => {
                  const isCurrent =
                    pkg.name.toLowerCase() ===
                    entity.currentPlan.toLowerCase()
                  const isSelected = selectedPackageId === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={cn(
                        "relative text-left rounded-lg border-2 p-4 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                        isCurrent && "opacity-70"
                      )}
                    >
                      {isCurrent && (
                        <Badge className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px]">
                          Current
                        </Badge>
                      )}
                      {pkg.is_popular && !isCurrent && (
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px]">
                          Popular
                        </Badge>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 left-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="pt-1">
                        <p className="font-semibold">{pkg.name}</p>
                        <p className="text-lg font-bold mt-1">
                          ${pkg.price}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{pkg.billing_period === "yearly" ? "yr" : "mo"}
                          </span>
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>{pkg.job_credits} job credits</p>
                          {pkg.featured_credits > 0 && (
                            <p>{pkg.featured_credits} featured credits</p>
                          )}
                          {pkg.social_credits > 0 && (
                            <p>{pkg.social_credits} social credits</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stored_card">
                  Use stored card on file
                </SelectItem>
                <SelectItem value="etransfer">E-Transfer received</SelectItem>
                <SelectItem value="invoice">Send invoice to {entityLabel}</SelectItem>
                <SelectItem value="phone_payment">
                  Card payment (phone/manual)
                </SelectItem>
                <SelectItem value="complimentary">
                  Complimentary (no charge)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label>Admin Notes (optional)</Label>
            <Textarea
              placeholder="Internal notes about this plan change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedPackage && !isCurrentPlan && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Summary</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {entity.currentPlan}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{selectedPackage.name}</span>
                <span className="text-muted-foreground ml-auto">
                  ${selectedPackage.price}/{selectedPackage.billing_period === "yearly" ? "yr" : "mo"}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPackageId || isCurrentPlan || isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirm Plan Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

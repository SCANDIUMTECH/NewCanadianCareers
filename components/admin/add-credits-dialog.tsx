"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { addCompanyCredits, adjustCompanyCredits } from "@/lib/api/admin-companies"
import { addAgencyCredits, adjustAgencyCredits } from "@/lib/api/admin-agencies"
import { getAdminPaymentMethods } from "@/lib/api/admin-billing"
import type { AdminPaymentMethod } from "@/lib/api/admin-billing"
import { getPackages, validatePromoCode } from "@/lib/api/billing"
import type { PromoValidation } from "@/lib/api/billing"
import { getPlatformSettings } from "@/lib/api/admin-settings"
import type { Package } from "@/lib/company/types"
import { toast } from "sonner"
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

type CreditType = "job" | "featured" | "social"

interface EntitlementTarget {
  id: string | number
  credit_type: CreditType
  credits_remaining: number
}

interface AddCreditsDialogProps {
  /** @deprecated Use `entity` instead */
  company?: { id: string | number; name: string }
  entity?: { id: string | number; name: string }
  entityType?: "company" | "agency"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mode?: "add" | "adjust"
  entitlement?: EntitlementTarget
}

const creditTypeLabels: Record<CreditType, string> = {
  job: "Job Credits",
  featured: "Featured Credits",
  social: "Social Credits",
}

export function AddCreditsDialog({
  company,
  entity: entityProp,
  entityType = "company",
  open,
  onOpenChange,
  onSuccess,
  mode = "add",
  entitlement,
}: AddCreditsDialogProps) {
  const entity = entityProp ?? company ?? { id: 0, name: "" }

  // --- Form state ---
  const [creditType, setCreditType] = useState<CreditType>("job")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)

  // --- Complimentary workflow state ---
  const [postDuration, setPostDuration] = useState("")

  // --- Package workflow state ---
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponValidation, setCouponValidation] = useState<PromoValidation | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)

  // --- Data from backend ---
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethod[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [defaultDuration, setDefaultDuration] = useState(30)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const isAdjust = mode === "adjust"

  // --- Derived state ---
  const selectedMethodConfig = useMemo(
    () => paymentMethods.find((m) => m.value === paymentMethod),
    [paymentMethods, paymentMethod]
  )
  const isComplimentary = selectedMethodConfig?.workflow_type === "complimentary"
  const requiresPackage = selectedMethodConfig?.requires_package === true

  // Filter packages by selected credit type
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (creditType === "job") return (pkg.credits || pkg.job_credits) > 0
      if (creditType === "featured") return pkg.featured_credits > 0
      if (creditType === "social") return pkg.social_credits > 0
      return false
    })
  }, [packages, creditType])

  // Get selected package object
  const selectedPackage = useMemo(
    () => packages.find((p) => String(p.id) === selectedPackageId),
    [packages, selectedPackageId]
  )

  // Get credits count from selected package
  const packageCredits = useMemo(() => {
    if (!selectedPackage) return 0
    if (creditType === "job") return selectedPackage.credits || selectedPackage.job_credits || 0
    if (creditType === "featured") return selectedPackage.featured_credits || 0
    if (creditType === "social") return selectedPackage.social_credits || 0
    return 0
  }, [selectedPackage, creditType])

  // --- Fetch data on open ---
  useEffect(() => {
    if (!open || isAdjust) return

    let cancelled = false
    setIsLoadingData(true)

    Promise.all([
      getAdminPaymentMethods(),
      getPackages(),
      getPlatformSettings(),
    ])
      .then(([methods, pkgs, settings]) => {
        if (cancelled) return
        setPaymentMethods(methods)
        setPackages(pkgs)
        const dur = settings.job_default_duration_days || 30
        setDefaultDuration(dur)
        setPostDuration(String(dur))
        // Set default payment method to first one if none selected
        if (methods.length > 0) {
          setPaymentMethod(prev => prev || methods[0].value)
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load payment methods")
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false)
      })

    return () => { cancelled = true }
  }, [open, isAdjust])

  // --- Auto-fill from package ---
  useEffect(() => {
    if (requiresPackage && selectedPackage) {
      setAmount(String(packageCredits))
      setPostDuration(String(selectedPackage.post_duration_days || defaultDuration))
    }
  }, [selectedPackage, packageCredits, requiresPackage, defaultDuration])

  // --- Debounced coupon validation ---
  useEffect(() => {
    if (!couponCode || isComplimentary || !selectedPackageId) {
      setCouponValidation(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsValidatingCoupon(true)
      try {
        const validation = await validatePromoCode(couponCode, {
          cart_total: selectedPackage?.price,
          package_ids: selectedPackage ? [selectedPackage.id] : [],
        })
        setCouponValidation(validation)
      } catch {
        setCouponValidation({
          valid: false,
          source: "promo_code",
          code: couponCode,
          discount_type: "percentage",
          discount_value: 0,
          message: "Invalid coupon code",
        })
      } finally {
        setIsValidatingCoupon(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [couponCode, selectedPackageId, isComplimentary, selectedPackage])

  // --- Reset ---
  const resetForm = useCallback(() => {
    setCreditType("job")
    setAmount("")
    setReason("")
    setPaymentMethod(paymentMethods.length > 0 ? paymentMethods[0].value : "")
    setExpiresAt(undefined)
    setShowConfirmation(false)
    setPostDuration(String(defaultDuration))
    setSelectedPackageId("")
    setCouponCode("")
    setCouponValidation(null)
  }, [paymentMethods, defaultDuration])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  // --- Validation ---
  const parsedAmount = parseInt(amount, 10)
  const parsedDuration = parseInt(postDuration, 10)

  const isValid = useMemo(() => {
    if (isAdjust) {
      return (
        !isNaN(parsedAmount) &&
        parsedAmount > 0 &&
        parsedAmount <= (entitlement?.credits_remaining ?? 0) &&
        reason.trim().length > 0
      )
    }

    const hasReason = reason.trim().length > 0

    if (isComplimentary) {
      return (
        paymentMethod !== "" &&
        !isNaN(parsedAmount) &&
        parsedAmount > 0 &&
        !isNaN(parsedDuration) &&
        parsedDuration > 0 &&
        hasReason
      )
    }

    if (requiresPackage) {
      const couponOk = !couponCode || (couponValidation?.valid === true)
      return paymentMethod !== "" && !!selectedPackageId && hasReason && couponOk
    }

    return false
  }, [
    isAdjust, parsedAmount, parsedDuration, reason, entitlement,
    isComplimentary, requiresPackage, selectedPackageId,
    couponCode, couponValidation, paymentMethod,
  ])

  // --- Submit ---
  const handleSubmit = async () => {
    if (!isValid) return

    if (isAdjust && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setIsSubmitting(true)
    try {
      if (isAdjust && entitlement) {
        const adjustPayload = {
          entitlement_id: entitlement.id,
          adjustment: -parsedAmount,
          credit_type: entitlement.credit_type,
          reason,
        }
        if (entityType === "agency") {
          await adjustAgencyCredits(entity.id, adjustPayload)
        } else {
          await adjustCompanyCredits(entity.id, adjustPayload)
        }
        toast.success(
          `${parsedAmount} ${creditTypeLabels[entitlement.credit_type].toLowerCase()} removed from ${entity.name}`
        )
      } else {
        // Build add payload based on workflow
        const basePayload = {
          credit_type: creditType,
          payment_method: paymentMethod,
          reason,
          expires_at: expiresAt?.toISOString(),
        }

        const addPayload = isComplimentary
          ? {
              ...basePayload,
              credits: parsedAmount,
              post_duration_days: parsedDuration,
            }
          : {
              ...basePayload,
              package_id: Number(selectedPackageId),
              ...(couponCode ? { coupon_code: couponCode } : {}),
            }

        if (entityType === "agency") {
          await addAgencyCredits(entity.id, addPayload)
        } else {
          await addCompanyCredits(entity.id, addPayload)
        }
        toast.success(
          `${creditTypeLabels[creditType]} added to ${entity.name}`
        )
      }
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isAdjust
            ? "Failed to adjust credits"
            : "Failed to add credits"
      )
      setShowConfirmation(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Helpers ---
  const handleCreditTypeChange = (type: CreditType) => {
    setCreditType(type)
    setSelectedPackageId("")
    setAmount("")
    setCouponCode("")
    setCouponValidation(null)
  }

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value)
    setSelectedPackageId("")
    setAmount("")
    setCouponCode("")
    setCouponValidation(null)
    // Reset post duration to default for complimentary
    const method = paymentMethods.find((m) => m.value === value)
    if (method?.workflow_type === "complimentary") {
      setPostDuration(String(defaultDuration))
    }
  }

  // Calculate discount display
  const discountDisplay = useMemo(() => {
    if (!couponValidation?.valid || !selectedPackage) return null
    const discount = couponValidation.calculated_discount
      ?? (couponValidation.discount_type === "percentage"
        ? (selectedPackage.price * couponValidation.discount_value) / 100
        : couponValidation.discount_value)
    const final = Math.max(selectedPackage.price - discount, 0)
    return {
      original: selectedPackage.price,
      discount,
      final,
      type: couponValidation.discount_type,
      value: couponValidation.discount_value,
    }
  }, [couponValidation, selectedPackage])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <div ref={setContainerElement}>
          <DialogHeader>
            <DialogTitle>{isAdjust ? "Adjust Credits" : "Add Credits"}</DialogTitle>
            <DialogDescription>
              {isAdjust
                ? `Remove credits from ${entity.name}'s entitlement`
                : `Add credits to ${entity.name}'s account`}
            </DialogDescription>
          </DialogHeader>

          {/* Confirmation overlay for adjust mode */}
          {isAdjust && showConfirmation ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">Confirm Credit Removal</p>
                    <p className="text-sm text-foreground-muted">
                      This will remove <span className="font-semibold text-foreground">{parsedAmount}</span>{" "}
                      {creditTypeLabels[entitlement?.credit_type ?? "job"].toLowerCase()} from {entity.name}.
                      This action is recorded in the audit ledger.
                    </p>
                    <p className="text-sm text-foreground-muted mt-2">
                      Reason: <span className="italic">{reason}</span>
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="bg-transparent"
                >
                  Go Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Remove {parsedAmount} Credits
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Current Balance (adjust mode only) */}
                {isAdjust && entitlement && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm text-foreground-muted">Current Balance</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {entitlement.credits_remaining}{" "}
                      <span className="text-sm font-normal text-foreground-muted">
                        {creditTypeLabels[entitlement.credit_type].toLowerCase()} remaining
                      </span>
                    </p>
                  </div>
                )}

                {/* Credit Type Toggle (add mode only) */}
                {!isAdjust && (
                  <div className="space-y-2">
                    <Label>Credit Type</Label>
                    <div className="flex gap-2">
                      {(["job", "featured", "social"] as CreditType[]).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={creditType === type ? "default" : "outline"}
                          className={cn(
                            "flex-1",
                            creditType === type
                              ? "bg-primary hover:bg-primary/90"
                              : "bg-transparent"
                          )}
                          onClick={() => handleCreditTypeChange(type)}
                        >
                          {creditTypeLabels[type]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Method (add mode only) */}
                {!isAdjust && (
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={handlePaymentMethodChange}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingData ? "Loading..." : "Select payment method"} />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* === COMPLIMENTARY WORKFLOW === */}
                {!isAdjust && isComplimentary && (
                  <>
                    {/* Amount (manual entry) */}
                    <div className="space-y-2">
                      <Label htmlFor="credit-amount">Number of Credits</Label>
                      <Input
                        id="credit-amount"
                        type="number"
                        min="1"
                        placeholder="Number of credits"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>

                    {/* Post Duration */}
                    <div className="space-y-2">
                      <Label htmlFor="post-duration">Post Duration (days)</Label>
                      <Input
                        id="post-duration"
                        type="number"
                        min="1"
                        value={postDuration}
                        onChange={(e) => setPostDuration(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Platform default: {defaultDuration} days
                      </p>
                    </div>
                  </>
                )}

                {/* === PACKAGE WORKFLOW === */}
                {!isAdjust && requiresPackage && (
                  <>
                    {/* Package Selection */}
                    <div className="space-y-2">
                      <Label>Package *</Label>
                      <Select
                        value={selectedPackageId}
                        onValueChange={setSelectedPackageId}
                        disabled={isLoadingData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                        <SelectContent container={containerElement}>
                          {filteredPackages.map((pkg) => {
                            const credits =
                              creditType === "job"
                                ? pkg.credits || pkg.job_credits
                                : creditType === "featured"
                                  ? pkg.featured_credits
                                  : pkg.social_credits
                            return (
                              <SelectItem key={pkg.id} value={String(pkg.id)}>
                                {pkg.name} — ${pkg.price} ({credits} credits, {pkg.post_duration_days || defaultDuration}d)
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {filteredPackages.length === 0 && !isLoadingData && (
                        <p className="text-xs text-destructive">
                          No packages with {creditTypeLabels[creditType].toLowerCase()} available
                        </p>
                      )}
                    </div>

                    {/* Read-only credits from package */}
                    {selectedPackage && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Credits</Label>
                          <div className="px-3 py-2 rounded-md bg-muted/50 border border-border/50 text-sm font-medium">
                            {packageCredits}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Post Duration</Label>
                          <div className="px-3 py-2 rounded-md bg-muted/50 border border-border/50 text-sm font-medium">
                            {selectedPackage.post_duration_days || defaultDuration} days
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Coupon Code */}
                    <div className="space-y-2">
                      <Label htmlFor="coupon-code">Discount / Coupon Code (optional)</Label>
                      <Input
                        id="coupon-code"
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      {isValidatingCoupon && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Validating...
                        </p>
                      )}
                      {!isValidatingCoupon && couponValidation && couponCode && (
                        <p
                          className={cn(
                            "text-xs flex items-center gap-1",
                            couponValidation.valid ? "text-green-600" : "text-destructive"
                          )}
                        >
                          {couponValidation.valid ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              {couponValidation.discount_type === "percentage"
                                ? `${couponValidation.discount_value}% discount applied`
                                : `$${couponValidation.discount_value} discount applied`}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              {couponValidation.message || "Invalid coupon code"}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Pricing summary */}
                    {selectedPackage && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Package price</span>
                          <span>${selectedPackage.price.toFixed(2)}</span>
                        </div>
                        {discountDisplay && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-${discountDisplay.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-1 mt-1">
                          <span>Total</span>
                          <span>
                            ${discountDisplay ? discountDisplay.final.toFixed(2) : selectedPackage.price.toFixed(2)}
                          </span>
                        </div>
                        {selectedMethodConfig?.invoice_status === "open" && (
                          <p className="text-xs text-amber-600 mt-1">
                            Invoice will be sent as unpaid to client
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Amount (adjust mode only) */}
                {isAdjust && (
                  <div className="space-y-2">
                    <Label htmlFor="credit-amount">Credits to Remove</Label>
                    <Input
                      id="credit-amount"
                      type="number"
                      min="1"
                      max={entitlement?.credits_remaining}
                      placeholder={`Max ${entitlement?.credits_remaining ?? 0}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {isAdjust && parsedAmount > (entitlement?.credits_remaining ?? 0) && (
                      <p className="text-xs text-destructive">
                        Cannot exceed available balance of {entitlement?.credits_remaining}
                      </p>
                    )}
                  </div>
                )}

                {/* Reason (always shown) */}
                <div className="space-y-2">
                  <Label htmlFor="credit-reason">Reason *</Label>
                  <Textarea
                    id="credit-reason"
                    placeholder={
                      isAdjust
                        ? "Explain the reason for removing credits..."
                        : "Explain the reason for adding credits..."
                    }
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be recorded in the audit ledger
                  </p>
                </div>

                {/* Expiration (add mode only) */}
                {!isAdjust && (
                  <div className="space-y-2">
                    <Label>Expiration (optional)</Label>
                    <DatePicker
                      value={expiresAt}
                      onChange={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      placeholder="Pick expiration date"
                      container={containerElement}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiration
                    </p>
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
                {isAdjust ? (
                  <Button
                    variant="destructive"
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Remove Credits
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add {creditTypeLabels[creditType]}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

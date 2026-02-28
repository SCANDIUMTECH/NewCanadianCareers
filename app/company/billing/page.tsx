"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatCents } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
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
  CreditCard,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useCompanyContext } from "@/hooks/use-company"
import {
  getPackages,
  getPaymentMethods,
  getInvoices,
  getSubscription,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  createCheckoutSession,
  changeSubscriptionPlan,
  downloadInvoicePdf,
  cancelSubscription,
  reactivateSubscription,
} from "@/lib/api/billing"
import type {
  Package,
  PaymentMethod,
  Invoice,
  Subscription,
} from "@/lib/company/types"

/**
 * Company Billing Dashboard
 * Manage packages, entitlements, subscriptions, and invoices
 * Integrated with backend API
 */

export default function CompanyBillingPage() {
  const { entitlements, refreshEntitlements } = useCompanyContext()

  // API data state
  const [packages, setPackages] = useState<Package[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showBuyCreditsDialog, setShowBuyCreditsDialog] = useState(false)
  const [showDeleteCardDialog, setShowDeleteCardDialog] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUpgradePreview, setShowUpgradePreview] = useState<Package | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null)

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [pkgs, methods, invs, sub] = await Promise.all([
        getPackages().catch(() => []),
        getPaymentMethods().catch(() => []),
        getInvoices({ page_size: 5 }).then(r => r.results).catch(() => []),
        getSubscription().catch(() => null),
      ])
      setPackages(pkgs)
      setPaymentMethods(methods)
      setInvoices(invs)
      setSubscription(sub)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  const handleSetDefaultCard = async (id: string) => {
    setIsActionLoading(true)
    try {
      await setDefaultPaymentMethod(id)
      setPaymentMethods(prev =>
        prev.map(pm => ({ ...pm, is_default: pm.id === id }))
      )
    } catch (err) {
      console.error("Failed to set default card:", err)
      toast.error("Failed to set default card. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteCard = async (id: string) => {
    setIsActionLoading(true)
    try {
      await deletePaymentMethod(id)
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
      setShowDeleteCardDialog(null)
    } catch (err) {
      console.error("Failed to delete card:", err)
      toast.error("Failed to delete card. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingInvoiceId(invoiceId)
    try {
      const blob = await downloadInvoicePdf(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch {
      toast.error('Failed to download invoice. Please try again.')
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  const handlePurchasePackage = async (packageId: number) => {
    // If user has an active subscription and is changing plan, show upgrade preview
    const targetPkg = packages.find(p => p.id === packageId)
    if (subscription && subscription.status === "active" && !subscription.cancel_at_period_end && targetPkg) {
      setShowUpgradePreview(targetPkg)
      return
    }

    // Otherwise go straight to checkout
    setIsActionLoading(true)
    try {
      const session = await createCheckoutSession([{ package_id: packageId }])
      window.location.href = session.url
    } catch (err) {
      console.error("Failed to create checkout session:", err)
      toast.error("Failed to start checkout. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirmPlanChange = async () => {
    if (!showUpgradePreview) return
    setIsActionLoading(true)
    try {
      const updatedSub = await changeSubscriptionPlan(showUpgradePreview.id)
      setSubscription(updatedSub)
      setShowUpgradePreview(null)
      setShowUpgradeDialog(false)
      await refreshEntitlements()
      toast.success("Plan updated successfully!")
    } catch (err) {
      console.error("Failed to change plan:", err)
      toast.error("Failed to change plan. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setIsActionLoading(true)
    try {
      const updatedSub = await cancelSubscription()
      setSubscription(updatedSub)
      setShowCancelDialog(false)
      toast.success("Subscription will cancel at the end of the billing period")
    } catch (err) {
      toast.error("Failed to cancel subscription. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsActionLoading(true)
    try {
      const updatedSub = await reactivateSubscription()
      setSubscription(updatedSub)
      toast.success("Subscription reactivated successfully")
    } catch (err) {
      toast.error("Failed to reactivate subscription. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const getCardBrandStyles = (type: PaymentMethod["type"]) => {
    switch (type) {
      case "visa":
        return { bg: "from-blue-600 to-blue-400", label: "VISA" }
      case "mastercard":
        return { bg: "from-orange-600 to-red-500", label: "MC" }
      case "amex":
        return { bg: "from-blue-800 to-blue-600", label: "AMEX" }
      default:
        return { bg: "from-gray-600 to-gray-400", label: "CARD" }
    }
  }

  // Use shared formatCents for Stripe amounts (in smallest currency unit)
  const formatBilling = (amount: number, currency: string = "CAD") =>
    formatCents(amount, currency)

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="h-8 w-32 bg-background-secondary rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="h-64 bg-background-secondary rounded animate-pulse" />
          <div className="h-64 bg-background-secondary rounded animate-pulse" />
        </div>
        <div className="h-48 bg-background-secondary rounded animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load billing</h2>
          <p className="text-foreground-muted mb-6">{error}</p>
          <Button onClick={fetchBillingData}>Try Again</Button>
        </div>
      </div>
    )
  }

  const currentPlan = subscription?.plan

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
            <p className="text-sm text-foreground-muted mt-1">Manage your subscription and job credits</p>
          </div>
        </div>
      </MotionWrapper>

      {subscription?.status === 'past_due' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Payment Failed</p>
            <p className="text-sm text-red-700 mt-1">
              Your subscription payment failed. Please update your payment method to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan & Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Plan */}
        <MotionWrapper delay={100}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Current Plan</CardTitle>
                {subscription && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {subscription.status === "active" ? "Active" : subscription.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground">{currentPlan.name}</h3>
                      <p className="text-foreground-muted">
                        {formatBilling(currentPlan.price, currentPlan.currency)}/{currentPlan.billing_period}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowUpgradeDialog(true)} className="bg-transparent">
                      Change Plan
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {subscription && (
                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <p className="text-sm text-foreground-muted">
                        {subscription.cancel_at_period_end ? (
                          <>Cancels on: <span className="text-foreground font-medium">{formatDate(subscription.current_period_end)}</span></>
                        ) : (
                          <>Next billing date: <span className="text-foreground font-medium">{formatDate(subscription.current_period_end)}</span></>
                        )}
                      </p>

                      {subscription.cancel_at_period_end ? (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-700">Subscription canceling</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  Your plan will end on {formatDate(subscription.current_period_end)}. You&apos;ll keep access until then.
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={handleReactivateSubscription}
                              disabled={isActionLoading}
                              className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0 ml-3"
                            >
                              {isActionLoading ? "Reactivating..." : "Reactivate"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCancelDialog(true)}
                          className="text-foreground-muted hover:text-destructive"
                        >
                          Cancel subscription
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-foreground-muted mb-4">No active subscription</p>
                  <Button onClick={() => setShowUpgradeDialog(true)}>Choose a Plan</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Job Credits */}
        <MotionWrapper delay={150}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Job Credits</CardTitle>
                <Button size="sm" onClick={() => setShowBuyCreditsDialog(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  Buy Credits
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-semibold text-primary">
                    {entitlements?.remaining_credits ?? 0}
                  </span>
                  <span className="text-foreground-muted ml-1">
                    / {entitlements?.total_credits ?? 0} credits
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">Usage</span>
                  <span className="text-foreground font-medium">{entitlements?.used_credits ?? 0} used</span>
                </div>
                <Progress
                  value={entitlements?.total_credits
                    ? ((entitlements.used_credits / entitlements.total_credits) * 100)
                    : 0
                  }
                  className="h-2"
                />
              </div>

              {entitlements?.expiring_soon && entitlements.expiring_soon.count > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        {entitlements.expiring_soon.count} credits expiring soon
                      </p>
                      <p className="text-xs text-amber-600/80 mt-0.5">
                        Expires in {entitlements.expiring_soon.days} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Featured Credits</span>
                  <span className="text-foreground">{entitlements?.remaining_featured_credits ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Social Credits</span>
                  <span className="text-foreground">{entitlements?.remaining_social_credits ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Credit Packs */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Buy Additional Credits</CardTitle>
            <CardDescription>One-time credit packs that never expire</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.filter(p => p.billing_period === "one_time").map((pack) => (
                <div
                  key={pack.id}
                  className={cn(
                    "relative p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                    pack.is_popular
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  )}
                >
                  {pack.is_popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Best Value
                    </Badge>
                  )}
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-foreground">{pack.job_credits}</p>
                    <p className="text-sm text-foreground-muted">credits</p>
                    <p className="text-xl font-semibold text-primary mt-2">
                      {formatBilling(pack.price, pack.currency)}
                    </p>
                    <Button
                      variant={pack.is_popular ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePurchasePackage(pack.id)}
                      disabled={isActionLoading}
                      className={cn("w-full mt-4", pack.is_popular ? "bg-primary hover:bg-primary-hover text-primary-foreground" : "bg-transparent")}
                    >
                      Purchase
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Payment Methods Section */}
      <MotionWrapper delay={250}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
                <CardDescription>Manage your cards and billing preferences</CardDescription>
              </div>
              <Link href="/company/billing/add-card">
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">No payment methods</p>
                <p className="text-sm text-foreground-muted mb-4">Add a card to continue with your subscription</p>
                <Link href="/company/billing/add-card">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((card) => {
                  const brandStyles = getCardBrandStyles(card.type)
                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                        card.is_default
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-9 rounded-lg bg-gradient-to-r flex items-center justify-center shrink-0",
                        brandStyles.bg
                      )}>
                        <span className="text-xs font-bold text-white">{brandStyles.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            •••• •••• •••• {card.last4}
                          </p>
                          {card.is_default && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted">
                          {card.cardholder_name || "Cardholder"} · Expires {card.exp_month}/{card.exp_year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!card.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultCard(card.id)}
                            disabled={isActionLoading}
                            className="text-foreground-muted hover:text-foreground"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDeleteCardDialog(card.id)}
                          className="text-foreground-muted hover:text-red-600"
                          disabled={card.is_default && paymentMethods.length > 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {paymentMethods.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your default card will be charged automatically for subscription renewals and credit purchases.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Invoices Section */}
      <MotionWrapper delay={300}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
              <Link href="/company/billing/invoices">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length > 0 ? (
              <div className="divide-y divide-border/50">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{invoice.description}</p>
                        <p className="text-xs text-foreground-muted">{formatDate(invoice.created_at)} · {invoice.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-foreground">
                        {formatBilling(invoice.amount, invoice.currency)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          invoice.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : invoice.status === "open"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        )}
                      >
                        {invoice.status}
                      </Badge>
                      {invoice.pdf_status === 'generating' ? (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled title="PDF is being generated...">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownloadInvoice(invoice.id, invoice.number)}
                          disabled={invoice.pdf_status !== 'available' || downloadingInvoiceId === invoice.id}
                          title={invoice.pdf_status === 'available' ? "Download PDF" : "PDF not available"}
                        >
                          {downloadingInvoiceId === invoice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-foreground-muted">No invoices yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your hiring needs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.filter(p => p.billing_period !== "one_time").map((pkg) => (
                <div
                  key={pkg.id}
                  className={cn(
                    "relative p-4 rounded-lg border transition-all cursor-pointer",
                    pkg.is_popular
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50",
                    currentPlan?.id === pkg.id && "ring-2 ring-primary"
                  )}
                >
                  {pkg.is_popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    <p className="text-sm text-foreground-muted">{pkg.description}</p>
                    <p className="text-2xl font-semibold text-primary mt-2">
                      {formatBilling(pkg.price, pkg.currency)}
                    </p>
                    <p className="text-sm text-foreground-muted">{pkg.job_credits} credits/{pkg.billing_period}</p>
                    <Button
                      variant={currentPlan?.id === pkg.id ? "outline" : "default"}
                      size="sm"
                      onClick={() => handlePurchasePackage(pkg.id)}
                      disabled={isActionLoading || currentPlan?.id === pkg.id}
                      className={cn(
                        "w-full mt-4",
                        currentPlan?.id === pkg.id
                          ? "bg-transparent"
                          : "bg-primary hover:bg-primary-hover text-primary-foreground"
                      )}
                    >
                      {currentPlan?.id === pkg.id ? "Current Plan" : "Select"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Credits Dialog */}
      <Dialog open={showBuyCreditsDialog} onOpenChange={setShowBuyCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Purchase additional job posting credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {packages.filter(p => p.billing_period === "one_time").map((pack) => (
              <div
                key={pack.id}
                onClick={() => handlePurchasePackage(pack.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                  pack.is_popular ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{pack.job_credits} Credits</span>
                    {pack.is_popular && <Badge className="bg-primary/10 text-primary text-xs">Best Value</Badge>}
                  </div>
                  <p className="text-sm text-foreground-muted">{pack.description}</p>
                </div>
                <span className="text-lg font-semibold text-primary">
                  {formatBilling(pack.price, pack.currency)}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyCreditsDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation */}
      <AlertDialog open={!!showDeleteCardDialog} onOpenChange={() => setShowDeleteCardDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteCardDialog && handleDeleteCard(showDeleteCardDialog)}
              disabled={isActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActionLoading ? "Removing..." : "Remove Card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Preview Dialog */}
      <Dialog open={!!showUpgradePreview} onOpenChange={(open) => !open && setShowUpgradePreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
            <DialogDescription>
              Review the details before switching your plan.
            </DialogDescription>
          </DialogHeader>
          {showUpgradePreview && (
            <div className="py-4 space-y-4">
              {/* Current → New */}
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                <div className="p-4 rounded-lg border border-border/50 text-center">
                  <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Current</p>
                  <p className="font-semibold text-foreground">{currentPlan?.name || "No plan"}</p>
                  <p className="text-sm text-foreground-muted">
                    {currentPlan ? `${formatBilling(currentPlan.price, currentPlan.currency)}/${currentPlan.billing_period}` : "Free"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-foreground-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div className="p-4 rounded-lg border border-primary bg-primary/5 text-center">
                  <p className="text-xs text-primary uppercase tracking-wide mb-1">New Plan</p>
                  <p className="font-semibold text-foreground">{showUpgradePreview.name}</p>
                  <p className="text-sm text-primary font-medium">
                    {formatBilling(showUpgradePreview.price, showUpgradePreview.currency)}/{showUpgradePreview.billing_period}
                  </p>
                </div>
              </div>

              {/* What changes */}
              <div className="rounded-lg bg-background-secondary/50 border border-border/50 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">What happens next</p>
                <ul className="text-sm text-foreground-muted space-y-2">
                  {currentPlan && showUpgradePreview.price > currentPlan.price ? (
                    <>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        You&apos;ll be charged a prorated amount for the remainder of this billing period
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Additional credits will be added to your account immediately
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Your new plan takes effect at the next billing cycle
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        You&apos;ll receive a prorated credit for unused time on your current plan
                      </li>
                    </>
                  )}
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Future billing will be at {formatBilling(showUpgradePreview.price, showUpgradePreview.currency)}/{showUpgradePreview.billing_period}
                  </li>
                </ul>
              </div>

              {/* Credit comparison */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <span className="text-sm text-foreground-muted">Credits per period</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground-muted line-through">{currentPlan?.job_credits || 0}</span>
                  <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="font-semibold text-primary">{showUpgradePreview.job_credits}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradePreview(null)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPlanChange}
              disabled={isActionLoading}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to cancel your subscription?</p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-700">What happens when you cancel:</p>
                <ul className="text-sm text-amber-600 space-y-1 ml-4 list-disc">
                  <li>Your plan stays active until {formatDate(subscription?.current_period_end)}</li>
                  <li>Unused job credits will remain available until that date</li>
                  <li>You won&apos;t be charged again after cancellation</li>
                  <li>You can reactivate anytime before the period ends</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActionLoading ? "Canceling..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

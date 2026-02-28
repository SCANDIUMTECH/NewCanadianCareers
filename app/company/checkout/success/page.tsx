"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn, formatCents } from "@/lib/utils"
import { CHART } from "@/lib/constants/colors"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import { getCheckoutSessionResult, getEntitlementSummary } from "@/lib/api/billing"
import { publishJob } from "@/lib/api/jobs"
import type { CheckoutSessionResult } from "@/lib/company/types"
import { useCompanyContext } from "@/hooks/use-company"
import {
  Check,
  ChevronRight,
  Sparkles,
  Mail,
  Receipt,
  CreditCard,
  ArrowRight,
  Calendar,
  AlertCircle,
  RefreshCw,
  Briefcase,
} from "lucide-react"

/**
 * Checkout Success Page
 * Order confirmation after successful payment
 * Fetches real order data from Stripe session ID
 * Handles pending-publish flow: auto-publishes draft jobs from the wizard
 */

const PENDING_PUBLISH_KEY = "orion-pending-publish"

interface PendingPublish {
  jobId: string
  socialPlatforms: string[]
  turnstileToken?: string
  savedAt: string
}

// Progress steps (all completed)
const steps = [
  { id: 1, name: "Cart", href: "/company/cart" },
  { id: 2, name: "Checkout", href: "/company/checkout" },
  { id: 3, name: "Confirmation", href: "/company/checkout/success" },
]

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
          <div className="animate-pulse py-24">
            <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-6" />
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-4" />
            <div className="h-4 bg-muted rounded w-48 mx-auto" />
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { refreshEntitlements } = useCompanyContext()

  const [order, setOrder] = useState<CheckoutSessionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Pending publish state
  const [publishedJobId, setPublishedJobId] = useState<string | null>(null)
  const [pendingPublish, setPendingPublish] = useState<PendingPublish | null>(null)
  const [isAutoPublishing, setIsAutoPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Auto-publish a pending draft job after payment succeeds
  const tryAutoPublish = useCallback(async () => {
    try {
      const raw = localStorage.getItem(PENDING_PUBLISH_KEY)
      if (!raw) return

      const pending: PendingPublish = JSON.parse(raw)
      // Validate the pending publish is recent (within 24 hours)
      const savedAt = new Date(pending.savedAt).getTime()
      if (Date.now() - savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PENDING_PUBLISH_KEY)
        return
      }

      setIsAutoPublishing(true)

      await publishJob(pending.jobId, {
        social_platforms: pending.socialPlatforms?.length > 0 ? pending.socialPlatforms : undefined,
        turnstile_token: pending.turnstileToken,
      })

      localStorage.removeItem(PENDING_PUBLISH_KEY)
      setPublishedJobId(pending.jobId)

      // Refresh entitlements again after publishing (consumed 1 credit)
      await refreshEntitlements()
    } catch (err) {
      console.error("Auto-publish failed:", err)
      // Store the pending publish for manual retry
      try {
        const raw = localStorage.getItem(PENDING_PUBLISH_KEY)
        if (raw) setPendingPublish(JSON.parse(raw))
      } catch {
        // ignore parse error
      }
      setPublishError(
        err instanceof Error ? err.message : "Failed to auto-publish your job. You can publish it manually."
      )
    } finally {
      setIsAutoPublishing(false)
    }
  }, [refreshEntitlements])

  // Manual publish retry
  const handleManualPublish = async () => {
    if (!pendingPublish) return

    setIsAutoPublishing(true)
    setPublishError(null)

    try {
      await publishJob(pendingPublish.jobId, {
        social_platforms: pendingPublish.socialPlatforms?.length > 0 ? pendingPublish.socialPlatforms : undefined,
        turnstile_token: pendingPublish.turnstileToken,
      })

      localStorage.removeItem(PENDING_PUBLISH_KEY)
      setPublishedJobId(pendingPublish.jobId)
      setPendingPublish(null)
      await refreshEntitlements()
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Failed to publish. Please try from your jobs list."
      )
    } finally {
      setIsAutoPublishing(false)
    }
  }

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError("No session ID found. Please check your email for order confirmation.")
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getCheckoutSessionResult(sessionId)
        setOrder(result)

        // Refresh entitlements with retry — Stripe webhook may not have
        // credited the account yet when we reach this point
        for (let attempt = 0; attempt < 3; attempt++) {
          const summary = await getEntitlementSummary().catch(() => null)
          if (summary && summary.remaining_credits > 0) {
            await refreshEntitlements()
            break
          }
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
          } else {
            await refreshEntitlements()
          }
        }

        // Try auto-publishing any pending draft job
        await tryAutoPublish()

        // Trigger confetti animation
        setShowConfetti(true)
        const timer = setTimeout(() => setShowConfetti(false), 3000)
        return () => clearTimeout(timer)
      } catch (err) {
        console.error("Failed to fetch order:", err)
        setError("Unable to load order details. Please check your email for confirmation.")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [sessionId, tryAutoPublish])

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
        <div className="animate-pulse py-24">
          <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-6" />
          <div className="h-8 bg-muted rounded w-64 mx-auto mb-4" />
          <div className="h-4 bg-muted rounded w-48 mx-auto" />
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
        <MotionWrapper delay={0}>
          <div className="pt-4 mb-8">
            <ProgressSteps />
          </div>
        </MotionWrapper>

        <MotionWrapper delay={100}>
          <div className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-6">
              <div className="w-full h-full rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-amber-500" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
              Order Confirmation
            </h1>
            <p className="text-lg text-foreground-muted mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {sessionId && (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              <Link href="/company/billing">
                <Button>
                  <Receipt className="w-4 h-4 mr-2" />
                  View Billing
                </Button>
              </Link>
            </div>
          </div>
        </MotionWrapper>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8 pb-16 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && <ConfettiEffect />}

      {/* Progress Steps */}
      <MotionWrapper delay={0}>
        <div className="pt-4 mb-8">
          <ProgressSteps />
        </div>
      </MotionWrapper>

      {/* Success Header */}
      <MotionWrapper delay={100}>
        <div className="text-center mb-10">
          {/* Success Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
            {publishedJobId ? "Payment Successful — Job Published!" : "Payment Successful!"}
          </h1>
          <p className="text-lg text-foreground-muted">
            {publishedJobId
              ? "Your credits have been added and your job is now live."
              : "Thank you for your purchase. Your credits are now available."}
          </p>
        </div>
      </MotionWrapper>

      {/* Auto-publishing indicator */}
      {isAutoPublishing && (
        <MotionWrapper delay={150}>
          <div className="flex items-center justify-center gap-3 mb-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-primary">Publishing your job...</span>
          </div>
        </MotionWrapper>
      )}

      {/* Published job success banner */}
      {publishedJobId && !isAutoPublishing && (
        <MotionWrapper delay={150}>
          <Card className="border-emerald-500/20 bg-emerald-500/5 rounded-2xl shadow-sm mb-8">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Your job is live!</p>
                  <p className="text-sm text-foreground-muted">
                    Your draft job has been published and is now visible to candidates.
                  </p>
                </div>
                <Link href={`/company/jobs/${publishedJobId}`}>
                  <Button size="sm" className="shrink-0">
                    View Job
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}

      {/* Pending publish failed — manual retry */}
      {pendingPublish && publishError && !publishedJobId && (
        <MotionWrapper delay={150}>
          <Card className="border-amber-500/20 bg-amber-500/5 rounded-2xl shadow-sm mb-8">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Job saved as draft</p>
                  <p className="text-sm text-foreground-muted mt-0.5">
                    {publishError}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleManualPublish}
                  disabled={isAutoPublishing}
                  className="shrink-0"
                >
                  {isAutoPublishing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Publishing...
                    </span>
                  ) : (
                    <>
                      Publish Now
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}

      {/* Order Details Card */}
      {order && (
        <MotionWrapper delay={200}>
          <Card className="border-border/50 rounded-2xl shadow-sm mb-8">
            <CardContent className="p-6 md:p-8">
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-foreground-muted mb-1">Order ID</p>
                  <p className="font-mono text-lg font-semibold text-foreground">
                    {order.order_id}
                  </p>
                </div>
                <div className="text-sm text-foreground-muted flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-foreground-muted">
                          {item.credits} credits × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground">
                      {formatCents(item.amount)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="mb-6" />

              {/* Summary */}
              <div className="space-y-4">
                {/* Credits Added */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-600">
                      Credits Added
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    +{order.credits_added}
                  </span>
                </div>

                {/* Total Paid */}
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Total Paid</span>
                  <span className="text-xl font-bold text-primary">
                    ${(order.amount_total / 100).toFixed(2)}
                  </span>
                </div>

                {/* Receipt Info */}
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Mail className="w-4 h-4" />
                  <span>
                    A receipt has been sent to{" "}
                    <span className="text-foreground">{order.customer_email}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}

      {/* Action Buttons */}
      <MotionWrapper delay={300}>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {publishedJobId ? (
            <>
              <Link href={`/company/jobs/${publishedJobId}`}>
                <Button size="lg" className="w-full sm:w-auto">
                  View Published Job
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/company/jobs">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Briefcase className="w-4 h-4 mr-2" />
                  All Jobs
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/company/jobs/new">
                <Button size="lg" className="w-full sm:w-auto">
                  Post a Job
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/company/billing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Receipt className="w-4 h-4 mr-2" />
                  View Billing
                </Button>
              </Link>
            </>
          )}
        </div>
      </MotionWrapper>

      {/* Help Text */}
      <MotionWrapper delay={400}>
        <p className="text-center text-sm text-foreground-muted mt-8">
          Need help?{" "}
          <Link
            href="/company/settings"
            className="text-primary hover:underline"
          >
            Contact support
          </Link>
        </p>
      </MotionWrapper>
    </div>
  )
}

// Progress Steps Component (all completed)
function ProgressSteps() {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step (all completed) */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-foreground-muted">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {step.name}
            </span>
          </div>

          {/* Connector */}
          {index < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 mx-2 text-emerald-500" />
          )}
        </div>
      ))}
    </div>
  )
}

// Confetti Effect Component — pre-compute random values to avoid hydration mismatches
const CONFETTI_COLORS = [CHART.primary, CHART.success, CHART.warning, CHART.pink, CHART.purple]

function ConfettiEffect() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
    }))
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: p.left,
            top: "-10px",
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}

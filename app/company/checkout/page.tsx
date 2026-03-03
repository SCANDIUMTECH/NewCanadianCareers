"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js"
import { cn, getCurrencySymbol, DEFAULT_CURRENCY } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useCart } from "@/hooks/use-cart"
import { createCheckoutSession } from "@/lib/api/billing"
import type { CheckoutItem } from "@/lib/company/types"
import type { Stripe } from "@stripe/stripe-js"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingCart,
  CreditCard,
  Shield,
  RefreshCcw,
  AlertCircle,
} from "lucide-react"

/**
 * Checkout Page
 * Stripe Embedded Checkout integration for secure payments
 * "Cosmic Professional" design with progress steps and trust indicators
 */

// Stripe promise — resolved dynamically from API or env var
let _stripePromise: Promise<Stripe | null> | null = null

function getStripePromise(): Promise<Stripe | null> {
  if (_stripePromise) return _stripePromise

  // Try env var first (instant, no API call)
  const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (envKey) {
    _stripePromise = loadStripe(envKey)
    return _stripePromise
  }

  // Fall back to API fetch
  _stripePromise = fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/settings/stripe/publishable-key/`
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.publishable_key) return loadStripe(data.publishable_key)
      console.warn('Stripe publishable key not found. Payment features will be limited.')
      return null
    })
    .catch(() => {
      console.warn('Failed to fetch Stripe publishable key')
      return null
    })

  return _stripePromise
}

// Progress steps
const steps = [
  { id: 1, name: "Cart", href: "/company/cart" },
  { id: 2, name: "Checkout", href: "/company/checkout" },
  { id: 3, name: "Confirmation", href: "/company/checkout/success" },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { items, promoCode, subtotal, discount, total, totalCredits, isHydrated, clearCart } =
    useCart()

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const hasCreatedSession = useRef(false)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)

  // Initialize Stripe on mount
  useEffect(() => {
    setStripePromise(getStripePromise())
  }, [])

  // Redirect to cart if empty
  useEffect(() => {
    if (isHydrated && items.length === 0) {
      router.push("/company/cart")
    }
  }, [isHydrated, items.length, router])

  // Map cart items to checkout items for backend
  const mapCartToCheckoutItems = useCallback((): CheckoutItem[] => {
    return items.map((item) => {
      if (item.type === "package") {
        // Extract numeric ID from "pkg-123"
        const pkgId = parseInt(item.id.replace("pkg-", ""), 10)
        return { package_id: pkgId, quantity: item.quantity }
      } else {
        // credit-pack: Use the stored backend ID directly
        const packId = parseInt(item.id.replace("credit-", ""), 10)
        return { credit_pack_id: packId, quantity: item.quantity }
      }
    })
  }, [items])

  // Fetch client secret from backend for Stripe Embedded Checkout
  const fetchClientSecret = useCallback(async () => {
    try {
      hasCreatedSession.current = true
      const checkoutItems = mapCartToCheckoutItems()
      const session = await createCheckoutSession(
        checkoutItems,
        promoCode?.code
      )
      return session.client_secret
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize checkout."
      setCheckoutError(message)
      throw new Error(message, { cause: err })
    }
  }, [mapCartToCheckoutItems, promoCode?.code])

  // Handle Stripe checkout completion
  const handleComplete = useCallback(() => {
    clearCart()
  }, [clearCart])

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <div className="h-96 bg-muted rounded-xl" />
            </div>
            <div className="lg:col-span-2">
              <div className="h-80 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    return null
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="pt-4 mb-8">
          {/* Back Link */}
          <Link
            href="/company/cart"
            className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cart
          </Link>

          {/* Progress Steps */}
          <ProgressSteps currentStep={2} />
        </div>
      </MotionWrapper>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Stripe Checkout */}
        <div className="lg:col-span-3">
          <MotionWrapper delay={100}>
            <Card className="border-border/50 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {checkoutError ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Checkout Error
                    </h3>
                    <p className="text-foreground-muted mb-6">{checkoutError}</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCheckoutError(null)
                        hasCreatedSession.current = false
                        setRetryKey((k) => k + 1)
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : !stripePromise ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Payment Not Available
                    </h3>
                    <p className="text-foreground-muted mb-6">
                      Stripe is not configured. Please contact support or try again later.
                    </p>
                    <Link href="/company/cart">
                      <Button variant="outline">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to Cart
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="min-h-[400px]" key={retryKey}>
                    <EmbeddedCheckoutProvider
                      stripe={stripePromise}
                      options={{ fetchClientSecret, onComplete: handleComplete }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Order Summary (Read-only) */}
        <div className="lg:col-span-2">
          <MotionWrapper delay={200}>
            <div className="sticky top-24">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground-muted">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium">
                          {getCurrencySymbol(DEFAULT_CURRENCY)}{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Promo Code Display */}
                  {promoCode && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-sm font-medium text-emerald-600">
                          {promoCode.code} applied
                        </span>
                        <span className="text-sm font-medium text-emerald-600">
                          -{getCurrencySymbol(DEFAULT_CURRENCY)}{discount.toFixed(2)}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-muted">Subtotal</span>
                      <span>{getCurrencySymbol(DEFAULT_CURRENCY)}{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount</span>
                        <span>-{getCurrencySymbol(DEFAULT_CURRENCY)}{discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold pt-2">
                      <span>Total</span>
                      <span className="text-primary">{getCurrencySymbol(DEFAULT_CURRENCY)}{total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      {totalCredits} credits will be added to your account
                    </p>
                  </div>

                  <Separator />

                  {/* Trust Indicators */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      <RefreshCcw className="w-3.5 h-3.5 text-emerald-500" />
                      <span>14-day money-back guarantee</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </div>
  )
}

// Progress Steps Component
function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep

        return (
          <div key={step.id} className="flex items-center">
            {/* Step */}
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                isCurrent && "bg-primary/10 text-primary",
                isCompleted && "text-foreground-muted",
                !isCurrent && !isCompleted && "text-foreground-muted/50"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  isCurrent && "bg-primary text-primary-foreground",
                  isCompleted && "bg-emerald-500 text-white",
                  !isCurrent && !isCompleted && "bg-muted text-foreground-muted"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  step.id
                )}
              </div>
              <span className="text-sm font-medium hidden sm:inline">
                {step.name}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 mx-2",
                  step.id < currentStep
                    ? "text-emerald-500"
                    : "text-foreground-muted/30"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

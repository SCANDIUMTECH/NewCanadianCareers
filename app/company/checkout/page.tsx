"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useCart } from "@/hooks/use-cart"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingCart,
  CreditCard,
  Shield,
  RefreshCcw,
  AlertCircle,
  ArrowRight,
} from "lucide-react"

/**
 * Checkout Page
 * Stripe Embedded Checkout integration for secure payments
 * "Cosmic Professional" design with progress steps and trust indicators
 */

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripeKey) {
  console.warn("Stripe publishable key not found. Payment features will be limited.")
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

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
  const [isLoading, setIsLoading] = useState(true)

  // Redirect to cart if empty
  useEffect(() => {
    if (isHydrated && items.length === 0) {
      router.push("/company/cart")
    }
  }, [isHydrated, items.length, router])

  // Mock fetch client secret for Stripe Embedded Checkout
  // In production, this would call your backend API
  const fetchClientSecret = useCallback(async () => {
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In production, this would be:
      // const response = await fetch('/api/checkout/session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ items, promoCode }),
      // })
      // const data = await response.json()
      // return data.clientSecret

      // For demo purposes, we'll simulate success
      // In a real app, you'd return the actual client secret
      // Since we don't have a backend, we'll show a demo state
      setIsLoading(false)

      // Return a placeholder that will fail gracefully
      // This allows the UI to render without a real Stripe session
      return "demo_mode_no_client_secret"
    } catch {
      setCheckoutError("Failed to initialize checkout. Please try again.")
      setIsLoading(false)
      throw new Error("Failed to fetch client secret")
    }
  }, [])

  // Handle checkout completion (for demo)
  const handleDemoComplete = () => {
    clearCart()
    router.push("/company/checkout/success")
  }

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
                        setIsLoading(true)
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="min-h-[400px]">
                    {/* Demo Mode Notice */}
                    <div className="p-6 bg-primary/5 border-b border-border/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground mb-1">
                            Demo Mode
                          </h4>
                          <p className="text-sm text-foreground-muted">
                            This is a preview of the checkout experience. In
                            production, Stripe&apos;s secure embedded checkout will
                            appear here for real payments.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Demo Checkout Form */}
                    <div className="p-6 space-y-6">
                      {isLoading ? (
                        <div className="space-y-4">
                          <div className="h-12 bg-muted rounded-lg animate-pulse" />
                          <div className="h-12 bg-muted rounded-lg animate-pulse" />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="h-12 bg-muted rounded-lg animate-pulse" />
                            <div className="h-12 bg-muted rounded-lg animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Card Preview */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20">
                            <div className="flex items-center justify-between mb-8">
                              <div className="w-12 h-8 rounded bg-gradient-to-r from-yellow-400 to-yellow-500" />
                              <span className="text-xs text-foreground-muted">
                                DEMO CARD
                              </span>
                            </div>
                            <div className="font-mono text-lg tracking-wider text-foreground mb-4">
                              4242 4242 4242 4242
                            </div>
                            <div className="flex justify-between text-sm text-foreground-muted">
                              <span>Demo User</span>
                              <span>12/28</span>
                            </div>
                          </div>

                          {/* Demo Complete Button */}
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={handleDemoComplete}
                          >
                            Complete Demo Purchase
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>

                          <p className="text-xs text-center text-foreground-muted">
                            In production, you would enter your real payment
                            details securely via Stripe.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hidden Stripe Embedded Checkout (would be shown in production) */}
                    {/*
                    <EmbeddedCheckoutProvider
                      stripe={stripePromise}
                      options={{ fetchClientSecret }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                    */}
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
                          ${(item.unitPrice * item.quantity).toFixed(2)}
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
                          -${discount.toFixed(2)}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-muted">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold pt-2">
                      <span>Total</span>
                      <span className="text-primary">${total.toFixed(2)}</span>
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

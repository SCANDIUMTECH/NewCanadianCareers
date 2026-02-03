"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Check,
  ChevronRight,
  Sparkles,
  Mail,
  Receipt,
  CreditCard,
  ArrowRight,
  Calendar,
} from "lucide-react"

/**
 * Checkout Success Page
 * Order confirmation after successful payment
 * "Cosmic Professional" design with celebratory animations
 */

// Progress steps (all completed)
const steps = [
  { id: 1, name: "Cart", href: "/company/cart" },
  { id: 2, name: "Checkout", href: "/company/checkout" },
  { id: 3, name: "Confirmation", href: "/company/checkout/success" },
]

// Mock order data (in production, this would come from URL params or API)
function generateMockOrder() {
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`
  return {
    orderId,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: "company@example.com",
    creditsAdded: 10,
    total: 249.0,
    items: [
      {
        name: "Professional Package",
        quantity: 1,
        credits: 10,
        price: 249.0,
      },
    ],
  }
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<ReturnType<typeof generateMockOrder> | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Generate mock order on client side
    setOrder(generateMockOrder())
    // Trigger confetti animation
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!order) {
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
            Payment Successful!
          </h1>
          <p className="text-lg text-foreground-muted">
            Thank you for your purchase. Your credits are now available.
          </p>
        </div>
      </MotionWrapper>

      {/* Order Details Card */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 rounded-2xl shadow-sm mb-8">
          <CardContent className="p-6 md:p-8">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Order ID</p>
                <p className="font-mono text-lg font-semibold text-foreground">
                  {order.orderId}
                </p>
              </div>
              <div className="text-sm text-foreground-muted flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {order.date}
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
                    ${item.price.toFixed(2)}
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
                  +{order.creditsAdded}
                </span>
              </div>

              {/* Total Paid */}
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Total Paid</span>
                <span className="text-xl font-bold text-primary">
                  ${order.total.toFixed(2)}
                </span>
              </div>

              {/* Receipt Info */}
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Mail className="w-4 h-4" />
                <span>
                  A receipt has been sent to{" "}
                  <span className="text-foreground">{order.email}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Action Buttons */}
      <MotionWrapper delay={300}>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

// Confetti Effect Component
function ConfettiEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            backgroundColor: [
              "#3B5BDB",
              "#22C55E",
              "#F59E0B",
              "#EC4899",
              "#8B5CF6",
            ][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

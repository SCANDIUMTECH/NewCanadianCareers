"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  createSetupIntent,
  confirmPaymentMethod,
} from "@/lib/api/billing"
import {
  ChevronLeft,
  CreditCard,
  Shield,
  AlertCircle,
  Check,
} from "lucide-react"

/**
 * Add Card Page
 * Stripe Elements integration for secure card setup
 */

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

// Card input styles
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#32325d",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
}

// Inner form component with Stripe hooks
function AddCardForm() {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardholderName, setCardholderName] = useState("")

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!stripe || !elements) {
        setError("Stripe is not loaded yet")
        return
      }

      if (!cardholderName.trim()) {
        setError("Please enter the cardholder name")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // 1. Create setup intent
        const { client_secret } = await createSetupIntent()

        // 2. Confirm card setup
        const { error: stripeError, setupIntent } =
          await stripe.confirmCardSetup(client_secret, {
            payment_method: {
              card: elements.getElement(CardElement)!,
              billing_details: {
                name: cardholderName,
              },
            },
          })

        if (stripeError) {
          setError(stripeError.message || "Failed to setup card")
          return
        }

        if (setupIntent?.payment_method) {
          // 3. Confirm payment method with backend
          await confirmPaymentMethod(setupIntent.payment_method as string)

          // Success - redirect to billing
          router.push("/company/billing")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add card")
      } finally {
        setIsLoading(false)
      }
    },
    [stripe, elements, cardholderName, router]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cardholder Name */}
      <div className="space-y-2">
        <label
          htmlFor="cardholderName"
          className="text-sm font-medium text-foreground"
        >
          Cardholder Name
        </label>
        <input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className={cn(
            "w-full px-4 py-3 rounded-lg border bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            "placeholder:text-muted-foreground"
          )}
          disabled={isLoading}
        />
      </div>

      {/* Card Element */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Card Details
        </label>
        <div
          className={cn(
            "px-4 py-4 rounded-lg border bg-background",
            "focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <CardElement
            options={cardElementOptions}
            onChange={(event) => {
              if (event.error) {
                setError(event.error.message)
              } else {
                setError(null)
              }
            }}
          />
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Secure card storage
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your card details are securely stored by Stripe. We never store your
            full card number.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Link href="/company/billing" className="flex-1">
          <Button type="button" variant="outline" className="w-full bg-transparent">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
          disabled={!stripe || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Adding...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Add Card
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

// Main page component
export default function AddCardPage() {
  if (!stripePromise) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-8">
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Stripe Not Configured
          </h3>
          <p className="text-muted-foreground mb-6">
            Payment processing is not available. Please try again later.
          </p>
          <Link href="/company/billing">
            <Button variant="outline" className="bg-transparent">
              Go Back
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="mb-8">
          <Link
            href="/company/billing"
            className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Billing
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Add Payment Method
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Add a new card for subscription and credit purchases
          </p>
        </div>
      </MotionWrapper>

      {/* Form */}
      <MotionWrapper delay={100}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Card Details
                </CardTitle>
                <CardDescription>
                  Enter your card information securely
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <AddCardForm />
            </Elements>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  )
}

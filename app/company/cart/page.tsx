"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useCart, type CartItem } from "@/hooks/use-cart"
import {
  ShoppingCart,
  CreditCard,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ChevronRight,
  Tag,
  AlertCircle,
  Shield,
  RefreshCcw,
  Package,
} from "lucide-react"

/**
 * Cart Page
 * Premium shopping cart for job posting packages and credits
 * "Cosmic Professional" design with glassmorphism and staggered animations
 */

export default function CartPage() {
  const router = useRouter()
  const {
    items,
    promoCode,
    isHydrated,
    updateQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
    subtotal,
    discount,
    total,
    itemCount,
    totalCredits,
  } = useCart()

  const [promoInput, setPromoInput] = useState("")
  const [promoError, setPromoError] = useState("")

  const handleApplyPromo = () => {
    setPromoError("")
    if (!promoInput.trim()) return

    const success = applyPromoCode(promoInput)
    if (success) {
      setPromoInput("")
    } else {
      setPromoError("Invalid promo code")
    }
  }

  const handleContinueToCheckout = () => {
    router.push("/company/checkout")
  }

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="h-80 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
        <MotionWrapper delay={0}>
          <Breadcrumb />
        </MotionWrapper>

        <MotionWrapper delay={100}>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShoppingCart className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Your cart is empty
            </h2>
            <p className="text-foreground-muted mb-8 max-w-md">
              Explore our job posting packages and credit packs to start hiring
              top talent.
            </p>
            <Link href="/company/packages">
              <Button size="lg">
                Browse Packages
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </MotionWrapper>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Header */}
      <MotionWrapper delay={0}>
        <Breadcrumb />
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Shopping Cart
          </h1>
          <Badge variant="secondary" className="text-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </div>
      </MotionWrapper>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-3 space-y-4">
          {items.map((item, index) => (
            <MotionWrapper key={item.id} delay={100 + index * 50}>
              <CartItemCard
                item={item}
                onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                onRemove={() => removeItem(item.id)}
              />
            </MotionWrapper>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <MotionWrapper delay={200}>
            <div className="sticky top-24">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Items Summary */}
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

                  {/* Promo Code */}
                  <div className="space-y-3">
                    {promoCode ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-600">
                            {promoCode.code}
                          </span>
                          <span className="text-xs text-emerald-600/80">
                            (
                            {promoCode.discountType === "percentage"
                              ? `${promoCode.discountValue}% off`
                              : `$${promoCode.discountValue} off`}
                            )
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          onClick={removePromoCode}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Promo code"
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value)
                              setPromoError("")
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleApplyPromo()
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            onClick={handleApplyPromo}
                            className="shrink-0"
                          >
                            Apply
                          </Button>
                        </div>
                        {promoError && (
                          <div className="flex items-center gap-1.5 text-sm text-destructive">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {promoError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

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
                      {totalCredits} credits included
                    </p>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleContinueToCheckout}
                  >
                    Continue to Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  {/* Trust Indicators */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Secure checkout powered by Stripe</span>
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

// Breadcrumb Component
function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6 pt-4">
      <Link href="/company/packages" className="hover:text-foreground transition-colors">
        Packages
      </Link>
      <ChevronRight className="w-4 h-4" />
      <span className="text-foreground font-medium">Cart</span>
    </nav>
  )
}

// Cart Item Card Component
function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const Icon = item.type === "package" ? Sparkles : CreditCard

  return (
    <Card
      className={cn(
        "border-border/50 rounded-xl transition-all duration-300",
        "hover:border-primary/30 hover:shadow-md"
      )}
    >
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Icon */}
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
              item.popular
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="w-7 h-7" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  {item.popular && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted mt-0.5">
                  {item.description}
                </p>
                <p className="text-sm text-foreground-muted mt-1">
                  <Package className="w-3.5 h-3.5 inline mr-1" />
                  {item.credits} credits
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </p>
                <p className="text-xs text-foreground-muted">
                  ${item.unitPrice.toFixed(2)} each
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              {/* Quantity Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onUpdateQuantity(item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="h-8 w-8"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="w-10 text-center font-medium text-sm">
                  {item.quantity}
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onUpdateQuantity(item.quantity + 1)}
                  disabled={item.quantity >= 10}
                  className="h-8 w-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-foreground-muted hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

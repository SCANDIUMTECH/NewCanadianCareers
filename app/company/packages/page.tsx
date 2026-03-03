"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn, formatCurrency, getCurrencySymbol } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Check, ChevronDown, Sparkles, Zap, Building2, CreditCard, ShoppingCart, AlertCircle, RefreshCw } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { getPackages } from "@/lib/api/billing"
import type { Package } from "@/lib/company/types"
import type { LucideIcon } from "lucide-react"

/**
 * Job Packages Page
 * Premium package selection for companies to purchase job posting credits
 * "Cosmic Professional" design with elevated recommended card
 */

interface PackageWithIcon extends Package {
  icon: LucideIcon
  perCredit: number
}

const creditPacks = [
  { id: 1, credits: 5, price: 75, perCredit: 15, popular: false },
  { id: 2, credits: 10, price: 120, perCredit: 12, popular: true },
  { id: 3, credits: 25, price: 250, perCredit: 10, popular: false },
]

const faqs = [
  {
    q: "How long do credits last?",
    a: "Job posting credits never expire. Once purchased, they remain in your account until you use them. This gives you complete flexibility to post jobs whenever you need to hire.",
  },
  {
    q: "Can I upgrade my plan?",
    a: "Yes, you can upgrade your plan at any time. When you upgrade, you'll receive the additional credits immediately and your billing cycle will be adjusted accordingly. Any unused credits from your previous plan will carry over.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express), as well as wire transfers for Enterprise plans. All payments are processed securely through Stripe.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 14-day money-back guarantee on all packages. If you're not satisfied with our service, contact our support team within 14 days of purchase for a full refund of unused credits.",
  },
]

const trustStats = [
  { label: "Jobs Posted", value: "10,000+" },
  { label: "Companies", value: "2,500+" },
  { label: "Satisfaction", value: "98%" },
]

export default function PackagesPage() {
  const router = useRouter()
  const { addItem, itemCount } = useCart()

  const [packages, setPackages] = useState<PackageWithIcon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPackages()

      // Map packages to UI format with icons
      const packagesWithIcons: PackageWithIcon[] = data.map((pkg, index) => ({
        ...pkg,
        icon: pkg.is_popular ? Sparkles : index === 0 ? Zap : Building2,
        perCredit: pkg.job_credits > 0 ? pkg.price / pkg.job_credits : 0,
      }))

      setPackages(packagesWithIcons)
    } catch (err) {
      console.error('Failed to fetch packages:', err)
      setError('Failed to load packages. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  const handleAddPackage = (pkg: PackageWithIcon) => {
    addItem({
      id: `pkg-${pkg.id}`,
      type: "package",
      name: `${pkg.name} Package`,
      description: `${pkg.job_credits} job posting credits`,
      credits: pkg.job_credits,
      unitPrice: pkg.price,
      popular: pkg.is_popular,
    })
    router.push("/company/cart")
  }

  const handleAddCredits = (pack: typeof creditPacks[number]) => {
    addItem({
      id: `credit-${pack.id}`,
      type: "credit-pack",
      name: `${pack.credits} Credits Pack`,
      description: `Additional posting credits at ${getCurrencySymbol("USD")}${pack.perCredit}/credit`,
      credits: pack.credits,
      unitPrice: pack.price,
      popular: pack.popular,
    })
    router.push("/company/cart")
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Header Section */}
      <MotionWrapper delay={0}>
        <div className="text-center mb-12 pt-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
            Scale your hiring with flexible job posting packages
          </p>
        </div>
      </MotionWrapper>

      {/* Cart Link */}
      {itemCount > 0 && (
        <MotionWrapper delay={50}>
          <Link
            href="/company/cart"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">{itemCount} in cart</span>
          </Link>
        </MotionWrapper>
      )}

      {/* Package Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[500px] bg-background-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <MotionWrapper delay={100}>
          <div className="flex flex-col items-center justify-center py-16 mb-16">
            <Card className="max-w-md w-full border-border/50 rounded-2xl">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Failed to Load Packages</h3>
                  <p className="text-sm text-foreground-muted">{error}</p>
                </div>
                <Button onClick={fetchPackages} variant="outline" className="bg-transparent">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </MotionWrapper>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-center">
          {packages.map((pkg, index) => (
            <MotionWrapper key={pkg.id} delay={100 + index * 50}>
              <PackageCard package={pkg} onSelect={() => handleAddPackage(pkg)} />
            </MotionWrapper>
          ))}
        </div>
      )}

      {/* Trust Stats Bar */}
      <MotionWrapper delay={300}>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16 py-8 border-y border-border/50">
          {trustStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-foreground-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </MotionWrapper>

      {/* Add-on Credits Section */}
      <MotionWrapper delay={400}>
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Need More Credits?
            </h2>
            <p className="text-foreground-muted">
              Top up your account with additional posting credits
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {creditPacks.map((pack, index) => (
              <MotionWrapper key={pack.credits} delay={400 + index * 50}>
                <CreditPackCard pack={pack} onSelect={() => handleAddCredits(pack)} />
              </MotionWrapper>
            ))}
          </div>
        </div>
      </MotionWrapper>

      {/* FAQ Section */}
      <MotionWrapper delay={550}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-foreground-muted">
              Everything you need to know about our packages
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </MotionWrapper>

      {/* Bottom CTA */}
      <MotionWrapper delay={650}>
        <div className="text-center mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/10">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Need a custom solution?
          </h3>
          <p className="text-foreground-muted mb-4">
            Contact us for volume discounts and enterprise features
          </p>
          <Link href="/company/settings">
            <Button variant="outline" className="bg-transparent">
              Contact Sales
            </Button>
          </Link>
        </div>
      </MotionWrapper>
    </div>
  )
}

// Package Card Component
function PackageCard({
  package: pkg,
  onSelect,
}: {
  package: PackageWithIcon
  onSelect: () => void
}) {
  const Icon = pkg.icon

  return (
    <Card
      className={cn(
        "relative border-border/50 rounded-2xl transition-all duration-500 h-full",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-1",
        pkg.is_popular && [
          "md:scale-105 z-10 border-primary ring-2 ring-primary/20",
          "shadow-[0_0_60px_rgba(var(--primary-rgb),0.15)]",
        ]
      )}
    >
      {/* Popular Badge with Shimmer */}
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="relative overflow-hidden bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            <span className="relative z-10">Most Popular</span>
            {/* Shimmer effect */}
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-badge"
            />
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4 pt-8">
        <div
          className={cn(
            "w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center",
            pkg.is_popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <CardTitle className="text-xl font-semibold">{pkg.name}</CardTitle>
      </CardHeader>

      <CardContent className="text-center space-y-6">
        {/* Price */}
        <div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-lg text-foreground-muted">{getCurrencySymbol(pkg.currency)}</span>
            <span className="text-4xl font-bold text-primary">{pkg.price}</span>
          </div>
          <p className="text-sm text-foreground-muted mt-1">
            {pkg.job_credits} credits &middot; {getCurrencySymbol(pkg.currency)}{pkg.perCredit.toFixed(2)}/credit
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 text-left">
          {pkg.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          className={cn(
            "w-full",
            pkg.is_popular
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-transparent"
          )}
          variant={pkg.is_popular ? "default" : "outline"}
          size="lg"
          onClick={onSelect}
        >
          Get Started
        </Button>
      </CardContent>
    </Card>
  )
}

// Credit Pack Card Component
function CreditPackCard({
  pack,
  onSelect,
}: {
  pack: (typeof creditPacks)[number]
  onSelect: () => void
}) {
  return (
    <Card
      className={cn(
        "border-border/50 rounded-xl transition-all duration-300",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-1",
        pack.popular && "border-primary/50 ring-1 ring-primary/20"
      )}
    >
      <CardContent className="p-5 text-center">
        {pack.popular && (
          <Badge variant="secondary" className="mb-3 text-xs">
            Best Value
          </Badge>
        )}
        <div className="flex items-center justify-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">{pack.credits}</span>
          <span className="text-foreground-muted">credits</span>
        </div>
        <p className="text-lg font-semibold text-primary mb-1">{formatCurrency(pack.price, "USD")}</p>
        <p className="text-xs text-foreground-muted mb-4">{getCurrencySymbol("USD")}{pack.perCredit}/credit</p>
        <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={onSelect}>
          Add Credits
        </Button>
      </CardContent>
    </Card>
  )
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50 rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 text-left hover:bg-background-secondary/30 transition-colors">
            <span className="font-medium text-foreground pr-4">{question}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-foreground-muted shrink-0 transition-transform duration-300",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 text-sm text-foreground-muted leading-relaxed">
            {answer}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

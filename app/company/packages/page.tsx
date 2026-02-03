"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Check, ChevronDown, Sparkles, Zap, Building2, CreditCard, ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"

/**
 * Job Packages Page
 * Premium package selection for companies to purchase job posting credits
 * "Cosmic Professional" design with elevated recommended card
 */

// Mock data
const packages = [
  {
    id: 1,
    name: "Starter",
    price: 99,
    credits: 3,
    perCredit: 33,
    features: [
      "3 job posting credits",
      "30-day listing duration",
      "Basic analytics",
      "Email support",
    ],
    popular: false,
    icon: Zap,
  },
  {
    id: 2,
    name: "Professional",
    price: 249,
    credits: 10,
    perCredit: 24.9,
    features: [
      "10 job posting credits",
      "60-day listing duration",
      "Social media distribution",
      "Advanced analytics",
      "Priority support",
      "Featured badge",
    ],
    popular: true,
    icon: Sparkles,
  },
  {
    id: 3,
    name: "Enterprise",
    price: 599,
    credits: 30,
    perCredit: 19.97,
    features: [
      "30 job posting credits",
      "90-day listing duration",
      "Premium placement",
      "Social + newsletter distribution",
      "Dedicated account manager",
      "Custom branding",
      "API access",
    ],
    popular: false,
    icon: Building2,
  },
]

const creditPacks = [
  { credits: 5, price: 75, perCredit: 15, popular: false },
  { credits: 10, price: 120, perCredit: 12, popular: true },
  { credits: 25, price: 250, perCredit: 10, popular: false },
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

  const handleAddPackage = (pkg: typeof packages[number]) => {
    addItem({
      id: `pkg-${pkg.id}`,
      type: "package",
      name: `${pkg.name} Package`,
      description: `${pkg.credits} job posting credits with ${pkg.features[1]}`,
      credits: pkg.credits,
      unitPrice: pkg.price,
      popular: pkg.popular,
    })
    router.push("/company/cart")
  }

  const handleAddCredits = (pack: typeof creditPacks[number]) => {
    addItem({
      id: `credit-${pack.credits}`,
      type: "credit-pack",
      name: `${pack.credits} Credits Pack`,
      description: `Additional posting credits at $${pack.perCredit}/credit`,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-center">
        {packages.map((pkg, index) => (
          <MotionWrapper key={pkg.id} delay={100 + index * 50}>
            <PackageCard package={pkg} onSelect={() => handleAddPackage(pkg)} />
          </MotionWrapper>
        ))}
      </div>

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
  package: (typeof packages)[number]
  onSelect: () => void
}) {
  const Icon = pkg.icon

  return (
    <Card
      className={cn(
        "relative border-border/50 rounded-2xl transition-all duration-500 h-full",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-1",
        pkg.popular && [
          "md:scale-105 z-10 border-primary ring-2 ring-primary/20",
          "shadow-[0_0_60px_rgba(59,91,219,0.15)]",
        ]
      )}
    >
      {/* Popular Badge with Shimmer */}
      {pkg.popular && (
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
            pkg.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
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
            <span className="text-lg text-foreground-muted">$</span>
            <span className="text-4xl font-bold text-primary">{pkg.price}</span>
          </div>
          <p className="text-sm text-foreground-muted mt-1">
            {pkg.credits} credits &middot; ${pkg.perCredit.toFixed(2)}/credit
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 text-left">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          className={cn(
            "w-full",
            pkg.popular
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-transparent"
          )}
          variant={pkg.popular ? "default" : "outline"}
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
        <p className="text-lg font-semibold text-primary mb-1">${pack.price}</p>
        <p className="text-xs text-foreground-muted mb-4">${pack.perCredit}/credit</p>
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

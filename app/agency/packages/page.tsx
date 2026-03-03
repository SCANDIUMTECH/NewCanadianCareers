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
import { Check, ChevronDown, Sparkles, Zap, Building2, CreditCard, Users, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { getAgencyEntitlements, purchasePackage, getAvailableAgencyPackages, getAgencyCreditPacks } from "@/lib/api/agencies"
import type { AvailableAgencyPackage, AgencyCreditPack } from "@/lib/agency/types"

/**
 * Agency Packages Page
 * View/purchase packages for agency pool
 * Similar to /app/company/packages/page.tsx but for agency pool-based credits
 */

// Package icon mapping based on name/type
function getPackageIcon(name: string, isEnterprise: boolean) {
  if (isEnterprise) return Building2
  if (name.toLowerCase().includes('pro') || name.toLowerCase().includes('growth')) return Sparkles
  return Zap
}

// Fallback data for when API is unavailable
const fallbackPackages: AvailableAgencyPackage[] = [
  {
    id: 1,
    name: "Agency Starter",
    description: "Perfect for small agencies",
    price: 199,
    currency: "CAD",
    credits: 10,
    per_credit: 19.9,
    features: [
      "10 pooled job posting credits",
      "Use across any client company",
      "30-day listing duration",
      "Basic analytics",
      "Email support",
    ],
    is_popular: false,
    is_enterprise: false,
    listing_duration_days: 30,
  },
  {
    id: 2,
    name: "Agency Pro",
    description: "Best for growing agencies",
    price: 499,
    currency: "CAD",
    credits: 30,
    per_credit: 16.63,
    features: [
      "30 pooled job posting credits",
      "Use across any client company",
      "60-day listing duration",
      "Social media distribution",
      "Advanced analytics",
      "Priority support",
      "Client management dashboard",
    ],
    is_popular: true,
    is_enterprise: false,
    listing_duration_days: 60,
  },
  {
    id: 3,
    name: "Agency Enterprise",
    description: "For large agencies",
    price: 999,
    currency: "CAD",
    credits: 75,
    per_credit: 13.32,
    features: [
      "75 pooled job posting credits",
      "Use across any client company",
      "90-day listing duration",
      "Premium placement",
      "Full distribution suite",
      "Dedicated account manager",
      "Custom branding per client",
      "API access",
      "White-label options",
    ],
    is_popular: false,
    is_enterprise: true,
    listing_duration_days: 90,
  },
]

const fallbackCreditPacks: AgencyCreditPack[] = [
  { id: 1, credits: 10, price: 150, currency: "CAD", per_credit: 15, is_popular: false },
  { id: 2, credits: 25, price: 325, currency: "CAD", per_credit: 13, is_popular: true },
  { id: 3, credits: 50, price: 600, currency: "CAD", per_credit: 12, is_popular: false },
]

const faqs = [
  {
    q: "How do pooled credits work?",
    a: "Pooled credits can be used to post jobs for any of your client companies. When you post a job, it uses credits from your agency pool regardless of which client the job is for. This gives you flexibility to allocate resources based on client needs.",
  },
  {
    q: "Can clients have their own credits?",
    a: "Yes, you can configure billing models per client. Some clients may pay directly for their job posts, while others use your pooled credits. This is configured in the client settings within your agency dashboard.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Yes, all credits in your agency pool remain valid until used. There's no monthly expiration, giving you complete flexibility in how you allocate posting credits across your client portfolio.",
  },
  {
    q: "Can I track credit usage per client?",
    a: "Absolutely. Your agency dashboard provides detailed reporting on credit usage broken down by client, time period, and job type. This helps with internal billing and resource planning.",
  },
]

const trustStats = [
  { label: "Agencies Trust Us", value: "500+" },
  { label: "Jobs Posted", value: "25,000+" },
  { label: "Client Companies", value: "3,000+" },
]

// Pool state type
interface PoolState {
  available: number
  total: number
  usedThisMonth: number
  expiring: { count: number; days: number }
}

export default function AgencyPackagesPage() {
  const router = useRouter()
  const [pool, setPool] = useState<PoolState>({
    available: 0,
    total: 0,
    usedThisMonth: 0,
    expiring: { count: 0, days: 0 },
  })
  const [packages, setPackages] = useState<AvailableAgencyPackage[]>(fallbackPackages)
  const [creditPacks, setCreditPacks] = useState<AgencyCreditPack[]>(fallbackCreditPacks)
  const [isLoading, setIsLoading] = useState(true)
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null)

  // Fetch entitlements
  const fetchEntitlements = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getAgencyEntitlements()
      setPool({
        available: data.remaining_credits,
        total: data.total_credits,
        usedThisMonth: data.used_credits,
        expiring: data.expiring_soon,
      })
    } catch (err) {
      console.error('Failed to fetch entitlements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load package info')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch available packages and credit packs
  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    try {
      const [packagesData, creditPacksData] = await Promise.all([
        getAvailableAgencyPackages(),
        getAgencyCreditPacks(),
      ])
      if (packagesData.length > 0) {
        setPackages(packagesData)
      }
      if (creditPacksData.length > 0) {
        setCreditPacks(creditPacksData)
      }
    } catch (err) {
      // Use fallback data on error - already set as initial state
      console.error('Failed to fetch packages, using fallback:', err)
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntitlements()
    fetchPackages()
  }, [fetchEntitlements, fetchPackages])

  const handleSelectPackage = async (pkg: AvailableAgencyPackage) => {
    setPurchaseLoading(pkg.id)
    try {
      const { checkout_url } = await purchasePackage({ package_id: pkg.id })
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to initiate purchase:', err)
      // Could show an error toast here
    } finally {
      setPurchaseLoading(null)
    }
  }

  const handleAddCredits = async (pack: AgencyCreditPack) => {
    setPurchaseLoading(pack.id)
    try {
      const { checkout_url } = await purchasePackage({ package_id: pack.id, quantity: 1 })
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to initiate purchase:', err)
    } finally {
      setPurchaseLoading(null)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Header Section */}
      <MotionWrapper delay={0}>
        <div className="text-center mb-8 pt-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Agency Packages
          </h1>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
            Pooled credits for your entire client portfolio
          </p>
        </div>
      </MotionWrapper>

      {/* Current Pool Status */}
      <MotionWrapper delay={50}>
        <Card className="border-primary/20 bg-primary/5 mb-8">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button onClick={fetchEntitlements} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your Agency Pool</h3>
                    <p className="text-sm text-foreground-muted">
                      {pool.available} credits available · {pool.usedThisMonth} used this month
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary">{pool.available}</span>
                    <span className="text-foreground-muted ml-1">/ {pool.total}</span>
                  </div>
                  <Link href="/agency/billing">
                    <Button variant="outline" className="bg-transparent">
                      View Usage
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-center">
        {packagesLoading ? (
          // Loading skeleton
          <>
            {[1, 2, 3].map((i) => (
              <MotionWrapper key={i} delay={100 + i * 50}>
                <Card className="border-border/50 rounded-2xl h-[500px] animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-background-secondary mx-auto" />
                    <div className="h-6 bg-background-secondary rounded mx-auto w-32" />
                    <div className="h-10 bg-background-secondary rounded mx-auto w-24" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-4 bg-background-secondary rounded" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </MotionWrapper>
            ))}
          </>
        ) : (
          packages.map((pkg, index) => (
            <MotionWrapper key={pkg.id} delay={100 + index * 50}>
              <PackageCard package={pkg} onSelect={() => handleSelectPackage(pkg)} isLoading={purchaseLoading === pkg.id} />
            </MotionWrapper>
          ))
        )}
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
              Top up your agency pool with additional posting credits
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {creditPacks.map((pack, index) => (
              <MotionWrapper key={pack.id} delay={400 + index * 50}>
                <CreditPackCard pack={pack} onSelect={() => handleAddCredits(pack)} isLoading={purchaseLoading === pack.id} />
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
              Everything you need to know about agency packages
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
            Managing a large agency?
          </h3>
          <p className="text-foreground-muted mb-4">
            Contact us for custom enterprise pricing and dedicated support
          </p>
          <Link href="/agency/settings">
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
  isLoading,
}: {
  package: AvailableAgencyPackage
  onSelect: () => void
  isLoading?: boolean
}) {
  const Icon = getPackageIcon(pkg.name, pkg.is_enterprise)

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
      {/* Popular Badge */}
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="relative overflow-hidden bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            <span className="relative z-10">Best for Agencies</span>
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
            {pkg.credits} pooled credits &middot; {getCurrencySymbol(pkg.currency)}{pkg.per_credit.toFixed(2)}/credit
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
            pkg.is_popular
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-transparent"
          )}
          variant={pkg.is_popular ? "default" : "outline"}
          size="lg"
          onClick={onSelect}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Get Started'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// Credit Pack Card Component
function CreditPackCard({
  pack,
  onSelect,
  isLoading,
}: {
  pack: AgencyCreditPack
  onSelect: () => void
  isLoading?: boolean
}) {
  return (
    <Card
      className={cn(
        "border-border/50 rounded-xl transition-all duration-300",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-1",
        pack.is_popular && "border-primary/50 ring-1 ring-primary/20"
      )}
    >
      <CardContent className="p-5 text-center">
        {pack.is_popular && (
          <Badge variant="secondary" className="mb-3 text-xs">
            Best Value
          </Badge>
        )}
        <div className="flex items-center justify-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">{pack.credits}</span>
          <span className="text-foreground-muted">credits</span>
        </div>
        <p className="text-lg font-semibold text-primary mb-1">{formatCurrency(pack.price, pack.currency)}</p>
        <p className="text-xs text-foreground-muted mb-4">{getCurrencySymbol(pack.currency)}{pack.per_credit}/credit</p>
        <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={onSelect} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Add to Pool'
          )}
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

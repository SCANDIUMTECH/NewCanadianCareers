"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Check,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FileText,
  Users,
  Star,
  ArrowRight,
  Briefcase,
  Quote,
} from "lucide-react"
import { getPackages } from "@/lib/api/billing"
import { useAuth } from "@/hooks/use-auth"
import type { Package } from "@/lib/company/types"

// =============================================================================
// Data
// =============================================================================

const howItWorks = [
  {
    step: 1,
    icon: FileText,
    title: "Create Your Job Post",
    description:
      "Describe your role in minutes with our guided wizard. Add requirements, salary, and benefits.",
  },
  {
    step: 2,
    icon: Users,
    title: "Reach Qualified Candidates",
    description:
      "Your job goes live to thousands of newcomers across Canada who match your criteria.",
  },
  {
    step: 3,
    icon: Briefcase,
    title: "Hire the Best",
    description:
      "Review applications, shortlist candidates, interview, and make your offer — all in one place.",
  },
]

const employerTestimonials = [
  {
    name: "Sarah Thompson",
    title: "HR Director",
    company: "MapleLeaf Foods",
    quote:
      "We filled 3 critical positions in our first week on the platform. The quality of candidates exceeded our expectations.",
  },
  {
    name: "James Park",
    title: "Hiring Manager",
    company: "Northland Construction",
    quote:
      "NCC gave us access to a talent pool we never knew existed. Newcomers bring incredible skills and work ethic.",
  },
  {
    name: "Lisa Chen",
    title: "COO",
    company: "Pacific Care Health",
    quote:
      "The hiring process is seamless. Post a job, get matched, and hire — all within days, not weeks.",
  },
]

const trustStats = [
  {
    value: "85%",
    label: "of employers receive applications within 24 hours",
    highlight: true,
  },
  {
    value: "2,500+",
    label: "Canadian employers trust NCC",
    highlight: false,
  },
  {
    value: "4.8/5",
    label: "average employer satisfaction rating",
    highlight: false,
  },
]

const faqs = [
  {
    q: "How long do credits last?",
    a: "Job posting credits never expire. Once purchased, they remain in your account until you use them. This gives you complete flexibility to post jobs whenever you need to hire.",
  },
  {
    q: "Can I upgrade my plan?",
    a: "Yes, you can upgrade your plan at any time. When you upgrade, you\u2019ll receive the additional credits immediately and your billing cycle will be adjusted accordingly. Any unused credits from your previous plan will carry over.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express), as well as wire transfers for Enterprise plans. All payments are processed securely through Stripe.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 14-day money-back guarantee on all packages. If you\u2019re not satisfied with our service, contact our support team within 14 days of purchase for a full refund of unused credits.",
  },
]

// =============================================================================
// Main Component
// =============================================================================

export function PricingClient() {
  const { user, isAuthenticated } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ctaHref =
    isAuthenticated && user?.role === "employer" ? "/company/packages" : "/signup"
  const ctaLabel =
    isAuthenticated && user?.role === "employer" ? "Select Plan" : "Get Started"

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPackages()
      setPackages(data)
    } catch {
      setError("Failed to load packages. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Hero Header */}
      <MotionWrapper delay={0}>
        <div className="text-center mb-16 pt-4">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
            Start Hiring{" "}
            <span className="text-primary">in Minutes</span>
          </h1>
          <p className="font-secondary text-foreground-muted text-lg md:text-xl max-w-2xl mx-auto">
            Post your jobs and reach thousands of qualified newcomers to Canada.
            No hidden fees, cancel anytime.
          </p>
        </div>
      </MotionWrapper>

      {/* How It Works */}
      <MotionWrapper delay={50}>
        <div className="mb-16">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-border/60" />

            {howItWorks.map((step, index) => (
              <MotionWrapper key={step.step} delay={100 + index * 80}>
                <div className="text-center relative">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                    <step.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="font-secondary text-sm text-foreground-muted leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </MotionWrapper>

      {/* Trust Logo Bar */}
      <MotionWrapper delay={200}>
        <div className="text-center mb-16">
          <p className="font-secondary text-sm text-foreground-muted mb-6 uppercase tracking-widest">
            Trusted by leading Canadian employers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40">
            {["MapleLeaf Foods", "Northland Group", "Pacific Care", "Metro Inc", "Canfor"].map(
              (name) => (
                <span
                  key={name}
                  className="font-secondary text-lg font-semibold text-foreground whitespace-nowrap"
                >
                  {name}
                </span>
              )
            )}
          </div>
        </div>
      </MotionWrapper>

      {/* Package Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[500px] bg-background-secondary rounded-2xl animate-pulse"
            />
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
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Failed to Load Packages
                  </h3>
                  <p className="text-sm text-foreground-muted">{error}</p>
                </div>
                <Button
                  onClick={fetchPackages}
                  variant="outline"
                  className="bg-transparent"
                >
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
            <MotionWrapper key={pkg.id} delay={250 + index * 50}>
              <PricingCard pkg={pkg} ctaHref={ctaHref} ctaLabel={ctaLabel} />
            </MotionWrapper>
          ))}
        </div>
      )}

      {/* Employer Testimonials */}
      <MotionWrapper delay={350}>
        <div className="mb-16">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground mb-10">
            What Employers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {employerTestimonials.map((t, index) => (
              <MotionWrapper key={t.name} delay={400 + index * 80}>
                <div className="relative p-6 rounded-2xl border border-border/50 bg-card h-full flex flex-col">
                  <Quote className="w-8 h-8 text-primary/20 mb-3" />
                  <p className="font-secondary text-foreground/80 text-sm leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="font-secondary text-sm font-medium text-foreground">
                      {t.name}
                    </p>
                    <p className="font-secondary text-xs text-foreground-muted">
                      {t.title}, {t.company}
                    </p>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </MotionWrapper>

      {/* Outcome Stats */}
      <MotionWrapper delay={500}>
        <div className="mb-16 py-10 border-y border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className={cn(
                    "font-secondary font-bold text-primary",
                    stat.highlight ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"
                  )}
                >
                  {stat.value}
                </p>
                <p className="font-secondary text-sm text-foreground-muted mt-2 max-w-[200px] mx-auto">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </MotionWrapper>

      {/* FAQ */}
      <MotionWrapper delay={550}>
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Frequently Asked Questions
            </h2>
            <p className="font-secondary text-foreground-muted">
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
      <MotionWrapper delay={600}>
        <div className="text-center p-10 rounded-2xl bg-primary/5 border border-primary/10">
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Start Posting Jobs Today
          </h3>
          <p className="font-secondary text-foreground-muted mb-6 max-w-md mx-auto">
            Join 2,500+ employers who trust NCC to connect them with top newcomer talent
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={ctaHref}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                {ctaLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="lg" className="text-foreground-muted hover:text-foreground">
                or Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </MotionWrapper>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function PricingCard({
  pkg,
  ctaHref,
  ctaLabel,
}: {
  pkg: Package
  ctaHref: string
  ctaLabel: string
}) {
  const perCredit = pkg.job_credits > 0 ? pkg.price / pkg.job_credits : 0

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
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="relative overflow-hidden bg-primary text-primary-foreground px-4 py-1 shadow-lg font-secondary">
            <span className="relative z-10">Most Popular</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-badge" />
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4 pt-8">
        <CardTitle className="text-xl font-semibold">{pkg.name}</CardTitle>
        {pkg.description && (
          <p className="text-sm text-foreground-muted mt-1">{pkg.description}</p>
        )}
      </CardHeader>

      <CardContent className="text-center space-y-6">
        <div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-secondary text-lg text-foreground-muted">
              {getCurrencySymbol(pkg.currency)}
            </span>
            <span className="font-secondary text-4xl font-bold text-primary">
              {pkg.price}
            </span>
          </div>
          <p className="font-secondary text-sm text-foreground-muted mt-1">
            {pkg.job_credits} credits &middot;{" "}
            {getCurrencySymbol(pkg.currency)}
            {perCredit.toFixed(2)}/credit
          </p>
        </div>

        <ul className="space-y-3 text-left">
          {pkg.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Link href={ctaHref}>
          <Button
            className={cn(
              "w-full",
              pkg.is_popular
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-transparent"
            )}
            variant={pkg.is_popular ? "default" : "outline"}
            size="lg"
          >
            {ctaLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50 rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 text-left hover:bg-background-secondary/30 transition-colors">
            <span className="font-secondary font-medium text-foreground pr-4">
              {question}
            </span>
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

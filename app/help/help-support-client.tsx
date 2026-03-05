"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Compass,
  Building2,
  CreditCard,
  Shield,
  MessageCircle,
  Briefcase,
  HelpCircle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TextReveal } from "@/components/text-reveal"
import { FloatingMapleLeaves } from "@/components/floating-maple-leaves"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type FAQCategory =
  | "getting-started"
  | "finding-jobs"
  | "for-employers"
  | "billing"
  | "privacy-security"

interface FAQItem {
  question: string
  answer: string
  category: FAQCategory
}

const categories: { key: FAQCategory; label: string; icon: React.ReactNode }[] = [
  { key: "getting-started", label: "Getting Started", icon: <Compass className="w-4 h-4" /> },
  { key: "finding-jobs", label: "Finding Jobs", icon: <Search className="w-4 h-4" /> },
  { key: "for-employers", label: "For Employers", icon: <Building2 className="w-4 h-4" /> },
  { key: "billing", label: "Billing & Plans", icon: <CreditCard className="w-4 h-4" /> },
  { key: "privacy-security", label: "Privacy & Security", icon: <Shield className="w-4 h-4" /> },
]

const helpCards = [
  {
    icon: <Compass className="w-6 h-6" />,
    title: "Getting Started",
    description: "New to NCC? Learn how to create your profile and start your job search.",
    href: "#faq",
    category: "getting-started" as FAQCategory,
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "Finding Jobs",
    description: "Tips for searching, filtering, and applying to jobs across Canada.",
    href: "#faq",
    category: "finding-jobs" as FAQCategory,
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    title: "For Employers",
    description: "Post jobs, manage applications, and find the right candidates.",
    href: "#faq",
    category: "for-employers" as FAQCategory,
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: "Billing & Plans",
    description: "Packages, payments, credits, and subscription management.",
    href: "#faq",
    category: "billing" as FAQCategory,
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Privacy & Security",
    description: "Your data protection, GDPR rights, and account security.",
    href: "#faq",
    category: "privacy-security" as FAQCategory,
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Contact Support",
    description: "Can't find what you need? Reach out to our team directly.",
    href: "/contact",
    category: null as unknown as FAQCategory,
  },
]

const faqItems: FAQItem[] = [
  // Getting Started
  {
    category: "getting-started",
    question: "How do I create an account on New Canadian Careers?",
    answer:
      "Click the \"Sign Up\" button in the top right corner. You can register as a candidate looking for work or as an employer looking to hire. Fill in your email and create a password to get started — it only takes a minute.",
  },
  {
    category: "getting-started",
    question: "Is New Canadian Careers free for job seekers?",
    answer:
      "Yes! Creating a candidate account, searching for jobs, and applying to positions is completely free. There are no hidden fees for job seekers.",
  },
  {
    category: "getting-started",
    question: "What documents do I need to apply for jobs in Canada?",
    answer:
      "Most employers require a Canadian-format resume and cover letter. Depending on the role, you may also need proof of work authorization (work permit, PR card, or citizenship), educational credential assessments (ECA), and professional certifications or licences.",
  },
  {
    category: "getting-started",
    question: "How do I complete my candidate profile?",
    answer:
      "After signing up, navigate to your candidate dashboard. Fill in your work experience, education, skills, and upload your resume. A complete profile helps employers find you and increases your chances of getting noticed.",
  },
  {
    category: "getting-started",
    question: "Can I use NCC if I'm still outside Canada?",
    answer:
      "Absolutely. Many newcomers start their job search before arriving in Canada. You can create your profile, browse jobs, and apply from anywhere in the world. Some employers specifically look for candidates who are in the process of immigrating.",
  },
  // Finding Jobs
  {
    category: "finding-jobs",
    question: "How do I search for jobs on the platform?",
    answer:
      "Use the search bar on the Jobs page to search by keyword, job title, or company name. You can also browse by category or use the location filter to find opportunities near you.",
  },
  {
    category: "finding-jobs",
    question: "Can I filter jobs by location, salary, or remote work?",
    answer:
      "Yes. The jobs page includes filters for location (city and province), employment type (full-time, part-time, contract), work arrangement (on-site, hybrid, remote), experience level, and salary range.",
  },
  {
    category: "finding-jobs",
    question: "How do I apply to a job posting?",
    answer:
      "Click on any job listing to view the full details. Then click the \"Apply Now\" button. You may be directed to apply through our platform or redirected to the employer's application page, depending on how the job was posted.",
  },
  {
    category: "finding-jobs",
    question: "How can I track my job applications?",
    answer:
      "Log in to your candidate dashboard to see all your submitted applications, their current status, and any updates from employers. You'll also receive email notifications when there are changes to your application status.",
  },
  {
    category: "finding-jobs",
    question: "What does \"featured job\" mean?",
    answer:
      "Featured jobs are premium listings from employers who want their positions to stand out. They appear at the top of search results and are highlighted with a special badge. Featured jobs often receive more visibility and faster responses.",
  },
  // For Employers
  {
    category: "for-employers",
    question: "How do I post a job on New Canadian Careers?",
    answer:
      "Sign up for an employer account, set up your company profile, then click \"Post a Job\" from your dashboard. Fill in the job details, preview your listing, and publish. You'll need an active job posting package or credits to publish.",
  },
  {
    category: "for-employers",
    question: "What job posting packages are available?",
    answer:
      "We offer flexible packages including single job posts, credit bundles, and monthly subscriptions. Each package includes different features like featured listings, social media promotion, and analytics. Visit our Pricing page for current options.",
  },
  {
    category: "for-employers",
    question: "How do I manage applications from candidates?",
    answer:
      "Your employer dashboard shows all incoming applications organized by job posting. You can review candidate profiles, download resumes, update application statuses, and communicate with applicants directly through the platform.",
  },
  {
    category: "for-employers",
    question: "Can I feature or promote my job listing?",
    answer:
      "Yes. Featured jobs appear prominently in search results and category pages. You can add featured status when posting a job or upgrade an existing listing from your dashboard. Featured and urgent badges significantly increase visibility.",
  },
  {
    category: "for-employers",
    question: "How do I set up my company profile?",
    answer:
      "Navigate to your company dashboard and click \"Edit Profile.\" Add your company logo, description, industry, location, website, and social links. A complete company profile builds trust with candidates and appears in our public company directory.",
  },
  // Billing & Plans
  {
    category: "billing",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe. All transactions are encrypted and PCI-compliant.",
  },
  {
    category: "billing",
    question: "How do job posting credits work?",
    answer:
      "Credits are consumed when you publish a job posting. One standard job post uses one credit. Featured listings or urgent postings may use additional credits. Unused credits remain in your account and don't expire within your billing period.",
  },
  {
    category: "billing",
    question: "Can I upgrade or change my plan?",
    answer:
      "Yes. You can upgrade, downgrade, or switch your plan at any time from the Billing section of your dashboard. When upgrading, you'll be prorated for the remaining time on your current plan.",
  },
  {
    category: "billing",
    question: "Do you offer refunds?",
    answer:
      "We offer refunds on unused credits within 14 days of purchase. If you've already used credits to post jobs, those are non-refundable. For subscription plans, you can cancel anytime and your access continues until the end of your billing period.",
  },
  {
    category: "billing",
    question: "How do I view my billing history and invoices?",
    answer:
      "Go to your dashboard and navigate to the Billing section. You'll find a complete history of all transactions, downloadable invoices, and your current plan details.",
  },
  // Privacy & Security
  {
    category: "privacy-security",
    question: "How is my personal data protected?",
    answer:
      "We use industry-standard encryption (TLS/SSL) for all data in transit, and encrypt sensitive data at rest. Our infrastructure is hosted on secure, SOC 2-compliant servers. We follow GDPR and Canadian PIPEDA privacy regulations.",
  },
  {
    category: "privacy-security",
    question: "What are my GDPR rights on this platform?",
    answer:
      "You have the right to access, correct, delete, and export your personal data at any time. You can also restrict processing and object to certain uses of your data. Visit our Privacy Policy or contact our privacy team for data requests.",
  },
  {
    category: "privacy-security",
    question: "How do I delete my account and data?",
    answer:
      "You can request account deletion from your account settings or by contacting support. We'll process your request within 30 days and permanently remove your personal data from our systems, except where retention is required by law.",
  },
  {
    category: "privacy-security",
    question: "Is my payment information secure?",
    answer:
      "Yes. We never store your full credit card details on our servers. All payment processing is handled by Stripe, a PCI Level 1 certified payment processor — the highest level of security certification available.",
  },
  {
    category: "privacy-security",
    question: "How do I report a suspicious job posting?",
    answer:
      "If you see a job posting that looks fraudulent or suspicious, click the \"Report\" button on the job detail page or contact us at support@newcanadian.careers. Our moderation team reviews all reports within 24 hours.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HelpSupportClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<FAQCategory | "all">("all")

  const filteredFAQ = useMemo(() => {
    let items = faqItems

    if (activeCategory !== "all") {
      items = items.filter((item) => item.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      )
    }

    return items
  }, [searchQuery, activeCategory])

  const handleCategoryCardClick = (category: FAQCategory | null) => {
    if (!category) return
    setActiveCategory(category)
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Section                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-24 md:py-32">
        <FloatingMapleLeaves />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <MotionWrapper delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 font-secondary">
              <HelpCircle className="w-4 h-4" />
              Help & Support
            </div>
          </MotionWrapper>

          <TextReveal as="h1" className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4" delay={50}>
            How can we help you?
          </TextReveal>

          <MotionWrapper delay={100}>
            <p className="font-secondary text-lg text-foreground-muted max-w-xl mx-auto mb-8">
              Find answers, get support, and make the most of your career journey in Canada.
            </p>
          </MotionWrapper>

          <MotionWrapper delay={150}>
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 rounded-xl text-base bg-card border-border/50 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </MotionWrapper>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Help Categories Grid                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <MotionWrapper delay={0}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Browse by Topic
          </h2>
          <p className="text-foreground-muted text-center max-w-lg mx-auto mb-12">
            Choose a category to quickly find what you&apos;re looking for.
          </p>
        </MotionWrapper>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {helpCards.map((card, i) => {
            const cardInner = (
              <Card className="h-full border-border/50 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {card.icon}
                  </div>
                  <h3 className="font-secondary font-semibold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            )

            return (
              <MotionWrapper key={card.title} delay={i * 50}>
                {card.href === "/contact" ? (
                  <Link href={card.href} className="block">
                    {cardInner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCategoryCardClick(card.category)}
                    className="block w-full text-left"
                  >
                    {cardInner}
                  </button>
                )}
              </MotionWrapper>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ Section                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-24 scroll-mt-28">
        <MotionWrapper delay={0}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-foreground-muted text-center max-w-lg mx-auto mb-8">
            Quick answers to the questions we hear most often.
          </p>
        </MotionWrapper>

        {/* Category filter pills */}
        <MotionWrapper delay={50}>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button onClick={() => setActiveCategory("all")}>
              <Badge
                variant={activeCategory === "all" ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-foreground/5"
                )}
              >
                All
              </Badge>
            </button>
            {categories.map((cat) => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}>
                <Badge
                  variant={activeCategory === cat.key ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-sm transition-colors inline-flex items-center gap-1.5",
                    activeCategory === cat.key
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-foreground/5"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </Badge>
              </button>
            ))}
          </div>
        </MotionWrapper>

        {/* Accordion */}
        <MotionWrapper delay={100}>
          {filteredFAQ.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-3">
              {filteredFAQ.map((item, i) => (
                <AccordionItem
                  key={`${item.category}-${i}`}
                  value={`${item.category}-${i}`}
                  className="border border-border/50 rounded-xl px-4 overflow-hidden data-[state=open]:shadow-sm transition-shadow"
                >
                  <AccordionTrigger className="text-left text-[15px] font-medium font-secondary hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground-muted leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
              <p className="text-foreground-muted font-medium">No results found</p>
              <p className="text-sm text-foreground-muted/70 mt-1">
                Try a different search term or{" "}
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setActiveCategory("all")
                  }}
                  className="text-primary hover:underline"
                >
                  clear filters
                </button>
              </p>
            </div>
          )}
        </MotionWrapper>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Still Need Help CTA                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gradient-to-b from-background to-primary/5 py-16 md:py-24">
        <MotionWrapper delay={0}>
          <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-7 h-7" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Still need help?
            </h2>
            <p className="font-secondary text-foreground-muted mb-8">
              Our support team is here to help you succeed in your Canadian career journey.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/contact">Contact Support</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          </div>
        </MotionWrapper>
      </section>
    </div>
  )
}

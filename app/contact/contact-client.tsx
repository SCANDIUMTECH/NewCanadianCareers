"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { Mail, MapPin, Clock, Send, CheckCircle2, ArrowRight } from "lucide-react"

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    detail: "hello@newcanadian.careers",
    subtitle: "We'll respond within 24 hours",
    href: "mailto:hello@newcanadian.careers",
  },
  {
    icon: MapPin,
    title: "Location",
    detail: "Toronto, Ontario",
    subtitle: "Canada",
    href: null,
  },
  {
    icon: Clock,
    title: "Business Hours",
    detail: "Mon – Fri, 9am – 6pm EST",
    subtitle: "Excluding Canadian holidays",
    href: null,
  },
]

const subjectOptions = [
  "General Inquiry",
  "Employer / Job Posting",
  "Candidate Support",
  "Billing & Packages",
  "Partnership Opportunity",
  "Report an Issue",
]

export function ContactClient() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    // TODO: Wire to backend contact endpoint when available
    // await apiClient('/api/contact/', { method: 'POST', body: JSON.stringify(formState) })
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setSending(false)
    setSubmitted(true)
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 lg:px-8 pb-16">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="text-center mb-12 pt-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Get in Touch
          </h1>
          <p className="font-secondary text-foreground-muted text-lg max-w-xl mx-auto">
            Have a question or need help? We&apos;d love to hear from you.
          </p>
        </div>
      </MotionWrapper>

      {/* Contact Info Cards */}
      <MotionWrapper delay={50}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {contactInfo.map((item) => {
            const Icon = item.icon
            const content = (
              <Card
                className={cn(
                  "border-border/50 rounded-xl transition-all duration-300 h-full",
                  "hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5",
                  item.href && "cursor-pointer"
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-secondary text-xs font-medium text-foreground-muted/60 uppercase tracking-wide mb-0.5">
                      {item.title}
                    </p>
                    <p className="font-secondary text-sm font-semibold text-foreground">{item.detail}</p>
                    <p className="text-xs text-foreground-muted/60 mt-0.5">{item.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            )

            return item.href ? (
              <a key={item.title} href={item.href} className="block">
                {content}
              </a>
            ) : (
              <div key={item.title}>{content}</div>
            )
          })}
        </div>
      </MotionWrapper>

      {/* Form + Side info */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Contact Form */}
        <MotionWrapper delay={100} className="lg:col-span-3">
          <Card className="border-border/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6 md:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      Message Sent
                    </h3>
                    <p className="font-secondary text-sm text-foreground-muted max-w-sm">
                      Thanks for reaching out! We&apos;ll get back to you within 24 hours.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent mt-2"
                    onClick={() => {
                      setSubmitted(false)
                      setFormState({ name: "", email: "", subject: "", message: "" })
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      Send us a message
                    </h2>
                    <p className="font-secondary text-sm text-foreground-muted">
                      Fill out the form and we&apos;ll be in touch shortly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="font-secondary text-sm font-medium text-foreground">
                        Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        required
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="font-secondary text-sm font-medium text-foreground">
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="font-secondary text-sm font-medium text-foreground">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formState.subject}
                      onChange={handleChange}
                      required
                      className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        !formState.subject && "text-muted-foreground"
                      )}
                    >
                      <option value="" disabled>
                        Select a topic
                      </option>
                      {subjectOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="font-secondary text-sm font-medium text-foreground">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      required
                      rows={5}
                      className={cn(
                        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        "placeholder:text-muted-foreground resize-none"
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Message
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Side Info */}
        <MotionWrapper delay={150} className="lg:col-span-2 space-y-6">
          {/* Quick Links */}
          <Card className="border-border/50 rounded-xl">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-secondary text-sm font-semibold text-foreground">Quick Links</h3>
              <div className="space-y-3">
                <QuickLink href="/pricing" label="View Pricing" description="Explore our job posting packages" />
                <QuickLink href="/jobs" label="Browse Jobs" description="Search open positions across Canada" />
                <QuickLink href="/companies" label="Company Directory" description="Find employers hiring newcomers" />
                <QuickLink href="/privacy" label="Privacy Policy" description="How we handle your data" />
              </div>
            </CardContent>
          </Card>

          {/* FAQ Teaser */}
          <Card className="border-border/50 rounded-xl bg-primary/5 border-primary/10">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Looking for answers?
              </h3>
              <p className="text-sm text-foreground-muted mb-3">
                Check our pricing FAQ for common questions about packages, billing, and credits.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm font-secondary font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View FAQ
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-0.5 px-3 py-2 -mx-3 rounded-lg hover:bg-foreground/5 transition-colors duration-150"
    >
      <span className="font-secondary text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-150">
        {label}
      </span>
      <span className="text-xs text-foreground-muted/60">{description}</span>
    </Link>
  )
}

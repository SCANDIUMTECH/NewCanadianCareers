"use client"

import { useState, useRef, type ReactNode, type FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "./motion-wrapper"
import { AffiliateSlot } from "@/components/affiliates/affiliate-slot"

const jobSeekerLinks = [
  { label: "Find Jobs", href: "/jobs" },
  { label: "Companies", href: "/companies" },
  { label: "News & Insights", href: "/news" },
  { label: "Help & Support", href: "/help" },
]

const employerLinks = [
  { label: "Post a Job", href: "/pricing" },
  { label: "Pricing", href: "/pricing" },
  { label: "Employer Dashboard", href: "/company" },
  { label: "Help & Support", href: "/help" },
]

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "#" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
]

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/50">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/[0.02] pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">

        {/* Newsletter CTA Section */}
        <MotionWrapper delay={0}>
          <div className="py-8 md:py-10">
            <NewsletterCTA />
          </div>
        </MotionWrapper>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Main Footer Grid */}
        <div className="py-6 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-8">

            {/* Brand Column */}
            <MotionWrapper delay={50} className="col-span-2 md:col-span-4">
              <div className="space-y-4">
                <Link href="/" className="inline-block group">
                  <Image
                    src="/logos/ncc-logo.svg"
                    alt="New Canadian Careers"
                    width={180}
                    height={54}
                    className="h-12 w-auto transition-all duration-500 group-hover:opacity-80"
                  />
                </Link>
                <p className="text-sm text-foreground-muted/70 leading-relaxed max-w-sm">
                  Empowering newcomers to Canada with meaningful career opportunities.
                  Your journey to a new career starts here.
                </p>

                {/* Social Icons */}
                <div className="flex items-center gap-1">
                  {socialLinks.map((social) => (
                    <SocialIcon key={social.label} {...social} />
                  ))}
                </div>
              </div>
            </MotionWrapper>

            {/* For Job Seekers */}
            <MotionWrapper delay={100} className="md:col-span-3">
              <FooterColumn title="For Job Seekers">
                {jobSeekerLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </FooterColumn>
            </MotionWrapper>

            {/* For Employers */}
            <MotionWrapper delay={150} className="md:col-span-2">
              <FooterColumn title="For Employers">
                {employerLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </FooterColumn>
            </MotionWrapper>

            {/* Company */}
            <MotionWrapper delay={200} className="col-span-2 md:col-span-3">
              <FooterColumn title="Company">
                {companyLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </FooterColumn>
            </MotionWrapper>

          </div>
        </div>

        {/* Affiliate Slot */}
        <MotionWrapper delay={250}>
          <AffiliateSlot placement="footer" variant="footer" />
        </MotionWrapper>

        {/* Bottom Bar — no MotionWrapper so it's always visible */}
        <div className="py-4 border-t border-border/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-foreground-muted/50">
              &copy; {new Date().getFullYear()} New Canadian Careers. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-foreground-muted/50">All systems operational</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  )
}

function NewsletterCTA() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    // TODO: Wire to newsletter API
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setEmail("")
    }, 3000)
  }

  return (
    <div className="relative">
      {/* Glow behind CTA */}
      <div
        className={cn(
          "absolute -inset-4 rounded-3xl transition-all duration-700 pointer-events-none",
          isFocused ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: "radial-gradient(600px at 50% 50%, rgba(255, 69, 0, 0.04), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            Stay ahead of the curve
          </h3>
          <p className="text-sm text-foreground-muted/70 leading-relaxed">
            Get weekly job market insights, career tips, and new opportunities delivered to your inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full md:w-auto">
          <div
            className={cn(
              "relative flex items-center rounded-xl border transition-all duration-500",
              isFocused
                ? "border-primary/30 shadow-lg shadow-primary/5 bg-card"
                : "border-border/60 bg-card/50"
            )}
          >
            {/* Email icon */}
            <div className="pl-4 text-foreground-muted/40">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter your email"
              className="w-full md:w-64 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-foreground-muted/40"
              required
            />

            <button
              type="submit"
              disabled={isSubmitted}
              className={cn(
                "relative overflow-hidden mr-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
                isSubmitted
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
              )}
            >
              {/* Shine effect */}
              <div
                className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                }}
              />
              <span className="relative">
                {isSubmitted ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Subscribed
                  </span>
                ) : (
                  "Subscribe"
                )}
              </span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-foreground-muted/40">
            No spam. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted/50">
        {title}
      </h4>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative text-sm text-foreground-muted/70 transition-colors duration-300 hover:text-foreground w-fit"
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary/60 transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  )
}

function SocialIcon({ label, href, icon }: { label: string; href: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300",
        "text-foreground-muted/50 hover:text-foreground hover:bg-foreground/5",
        "active:scale-95"
      )}
    >
      {icon}
    </a>
  )
}

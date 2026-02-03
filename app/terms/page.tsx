"use client"

import React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "@/components/motion-wrapper"

/**
 * Terms of Service Page
 * Clean, professional legal page with table of contents navigation
 * Matches the privacy page layout for consistency
 */

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "accounts", title: "User Accounts" },
  { id: "conduct", title: "User Conduct" },
  { id: "content", title: "Content Ownership" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "payment", title: "Payment Terms" },
  { id: "termination", title: "Termination" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "governing-law", title: "Governing Law" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact Information" },
]

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("acceptance")
  const [isTocOpen, setIsTocOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: "-20% 0px -60% 0px" }
    )

    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setIsTocOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center group">
              <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                Orion
              </span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all duration-500 group-hover:bg-primary" />
            </Link>
            <Link
              href="/"
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile TOC Toggle */}
      <div className="lg:hidden sticky top-16 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50">
        <button
          onClick={() => setIsTocOpen(!isTocOpen)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-foreground"
        >
          <span>Table of Contents</span>
          <svg
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              isTocOpen && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isTocOpen && (
          <nav className="px-6 pb-4 space-y-1">
            {sections.map(({ id, title }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={cn(
                  "block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                  activeSection === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {title}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-12">
        <div className="flex gap-12">
          {/* Desktop Sidebar TOC */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <MotionWrapper delay={0}>
                <h2 className="text-sm font-semibold text-foreground mb-4">Table of Contents</h2>
                <nav className="space-y-1">
                  {sections.map(({ id, title }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={cn(
                        "block w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200",
                        activeSection === id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      {title}
                    </button>
                  ))}
                </nav>
              </MotionWrapper>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <MotionWrapper delay={100}>
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  Terms of Service
                </h1>
                <p className="mt-2 text-foreground-muted">
                  Last updated: February 1, 2026
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={200}>
              <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-8 md:p-10">
                <div className="prose prose-slate max-w-none">
                  <section id="acceptance" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Acceptance of Terms
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      By accessing or using Orion (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      These Terms apply to all visitors, users, and others who access or use the Service, including candidates, employers, recruitment agencies, and administrators.
                    </p>
                  </section>

                  <section id="description" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Description of Service
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      Orion is a hiring platform that connects job seekers with employers and recruitment agencies. Our services include:
                    </p>
                    <ul className="space-y-2 mb-8">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Job posting and management for employers</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Job search and application tools for candidates</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Candidate sourcing and management for recruitment agencies</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Analytics and reporting tools</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Communication tools between parties</span>
                      </li>
                    </ul>
                  </section>

                  <section id="accounts" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      User Accounts
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      To access certain features of the Service, you must register for an account. When you register, you agree to:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Provide accurate, current, and complete information</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Maintain and promptly update your account information</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Maintain the security of your password and account</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Accept responsibility for all activities under your account</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Immediately notify us of any unauthorized use</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      You must be at least 16 years old to create an account and use our services.
                    </p>
                  </section>

                  <section id="conduct" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      User Conduct
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      You agree not to use the Service to:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Post false, misleading, or fraudulent job listings or applications</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Discriminate against any person based on protected characteristics</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Harass, abuse, or harm other users</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Collect or harvest user data without consent</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Interfere with or disrupt the Service or servers</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Violate any applicable laws or regulations</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Post content that infringes on intellectual property rights</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We reserve the right to remove any content and suspend or terminate accounts that violate these Terms.
                    </p>
                  </section>

                  <section id="content" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Content Ownership
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      <strong className="text-foreground">Your Content:</strong> You retain ownership of all content you submit to the Service, including resumes, job listings, and profile information. By posting content, you grant Orion a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with the Service.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      <strong className="text-foreground">Our Content:</strong> The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Orion and its licensors. The Service is protected by copyright, trademark, and other laws.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      You may not copy, modify, distribute, sell, or lease any part of our Services without permission.
                    </p>
                  </section>

                  <section id="privacy" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Privacy Policy
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      Your use of the Service is also governed by our Privacy Policy, which describes how we collect, use, and share your personal information. By using the Service, you consent to our collection and use of personal data as outlined in the Privacy Policy.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      Please review our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> to understand our practices.
                    </p>
                  </section>

                  <section id="payment" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Payment Terms
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      Certain features of the Service require payment. By purchasing a subscription or credits:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">You agree to pay all applicable fees and charges</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Payments are processed securely through our payment provider</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Subscriptions automatically renew unless cancelled</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Refunds are subject to our refund policy</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We reserve the right to change our pricing at any time. Price changes will be communicated in advance and will not affect existing subscriptions until renewal.
                    </p>
                  </section>

                  <section id="termination" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Termination
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Breach of these Terms</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Fraudulent or illegal activity</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Harmful conduct toward other users</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      You may terminate your account at any time by contacting us or using the account deletion feature in your settings. Upon termination, your right to use the Service will immediately cease.
                    </p>
                  </section>

                  <section id="disclaimers" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Disclaimers
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Implied warranties of merchantability and fitness for a particular purpose</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Warranties that the Service will be uninterrupted or error-free</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Warranties regarding the accuracy of job listings or user content</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We do not guarantee employment outcomes or the accuracy of information provided by users. We are not responsible for employment decisions made by employers or candidates.
                    </p>
                  </section>

                  <section id="liability" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Limitation of Liability
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, ORION AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, AND PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Loss of profits, revenue, or data</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Loss of employment opportunities</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Damages arising from unauthorized access to your account</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      Our total liability shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
                    </p>
                  </section>

                  <section id="governing-law" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Governing Law
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in San Francisco County, California. You consent to the personal jurisdiction of such courts.
                    </p>
                  </section>

                  <section id="changes" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Changes to Terms
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
                    </p>
                  </section>

                  <section id="contact" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Contact Information
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      If you have any questions about these Terms, please contact us:
                    </p>
                    <div className="rounded-xl bg-foreground/[0.02] border border-border/50 p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-foreground">legal@orion.com</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-foreground">Orion Inc., 123 Innovation Way, San Francisco, CA 94102</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </MotionWrapper>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground-muted">
              &copy; {new Date().getFullYear()} Orion. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-primary font-medium">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

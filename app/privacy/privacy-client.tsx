"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "@/components/motion-wrapper"

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "information-sharing", title: "Information Sharing" },
  { id: "data-security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "cookies", title: "Cookies and Tracking" },
  { id: "data-retention", title: "Data Retention" },
  { id: "children", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
]

export function PrivacyPolicyClient() {
  const [activeSection, setActiveSection] = useState("introduction")
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
                  Privacy Policy
                </h1>
                <p className="mt-2 text-foreground-muted">
                  Last updated: February 1, 2026
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={200}>
              <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-8 md:p-10">
                <div className="prose prose-slate max-w-none">
                  <section id="introduction" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Introduction
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      Welcome to Orion (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our hiring platform.
                    </p>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      By accessing or using Orion, you agree to the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
                    </p>
                  </section>

                  <section id="information-we-collect" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Information We Collect
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We collect information that you provide directly to us, including:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Account Information:</strong> Name, email address, password, phone number, and profile photo.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Professional Information:</strong> Resume, work history, education, skills, and certifications.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Company Information:</strong> Company name, size, industry, website, and job listings.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Payment Information:</strong> Billing address and payment method details (processed securely by our payment provider).</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Communications:</strong> Messages sent through our platform, support requests, and feedback.</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We also automatically collect certain information when you use our platform, including device information, IP address, browser type, operating system, and usage data through cookies and similar technologies.
                    </p>
                  </section>

                  <section id="how-we-use" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      How We Use Your Information
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We use the information we collect to:
                    </p>
                    <ul className="space-y-2 mb-8">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Provide, maintain, and improve our services</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Match candidates with relevant job opportunities</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Process transactions and send related information</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Send notifications, updates, and marketing communications (with your consent)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Respond to your comments, questions, and support requests</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Detect, prevent, and address technical issues and security threats</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Comply with legal obligations</span>
                      </li>
                    </ul>
                  </section>

                  <section id="information-sharing" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Information Sharing
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We may share your information in the following circumstances:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">With Employers:</strong> When you apply for jobs, your application information is shared with the hiring company.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">With Agencies:</strong> If you opt in to agency services, your profile may be shared with recruitment agencies.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Service Providers:</strong> We share information with vendors who help us operate our platform.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Legal Requirements:</strong> We may disclose information when required by law or to protect our rights.</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We do not sell your personal information to third parties for marketing purposes.
                    </p>
                  </section>

                  <section id="data-security" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Data Security
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We implement appropriate technical and organizational security measures to protect your personal information, including:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Encryption of data in transit and at rest</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Regular security assessments and penetration testing</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Access controls and authentication mechanisms</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Employee training on data protection practices</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                    </p>
                  </section>

                  <section id="your-rights" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Your Rights
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      Depending on your location, you may have certain rights regarding your personal information under GDPR, CCPA, or other privacy laws:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Access:</strong> Request a copy of your personal data we hold.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate information.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Erasure:</strong> Request deletion of your personal data.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Portability:</strong> Request transfer of your data to another service.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing communications at any time.</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      To exercise these rights, please contact us at privacy@orion.com. We will respond to your request within 30 days.
                    </p>
                  </section>

                  <section id="cookies" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Cookies and Tracking
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We use cookies and similar tracking technologies to enhance your experience on our platform. These include:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Essential Cookies:</strong> Required for basic platform functionality.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how users interact with our platform.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted"><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences.</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      You can manage cookie preferences through your browser settings. Note that disabling certain cookies may affect platform functionality.
                    </p>
                  </section>

                  <section id="data-retention" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Data Retention
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      We retain your personal information for as long as your account is active or as needed to provide you services. We will also retain and use your information as necessary to:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Comply with legal obligations</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Resolve disputes and enforce agreements</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-foreground-muted">Maintain business records for auditing purposes</span>
                      </li>
                    </ul>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
                    </p>
                  </section>

                  <section id="children" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Children&apos;s Privacy
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      Our platform is not intended for users under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information. If you believe a child has provided us with personal information, please contact us immediately.
                    </p>
                  </section>

                  <section id="changes" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Changes to This Policy
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-8">
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For significant changes, we will provide additional notice (such as adding a statement to our homepage or sending you a notification). We encourage you to review this Privacy Policy periodically for any changes.
                    </p>
                  </section>

                  <section id="contact" className="scroll-mt-32">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                      <span className="w-1 h-6 bg-primary rounded-full" />
                      Contact Us
                    </h2>
                    <p className="text-foreground-muted leading-relaxed mb-4">
                      If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                    </p>
                    <div className="rounded-xl bg-foreground/[0.02] border border-border/50 p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-foreground">privacy@orion.com</span>
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
              <Link href="/terms" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-primary font-medium">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

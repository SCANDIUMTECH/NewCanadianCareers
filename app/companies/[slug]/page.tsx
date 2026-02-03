"use client"

import React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Public Company Profile Page
 * View a company's public profile and open positions
 */

// Mock company data
const mockCompany = {
  slug: "acme-corporation",
  name: "Acme Corporation",
  initials: "AC",
  industry: "Technology",
  website: "https://acme.com",
  description: `Acme Corporation is a leading technology company specializing in innovative software solutions for enterprise clients worldwide.

We believe in building products that make a real difference in people's lives. Our team of talented engineers, designers, and product managers work together to create cutting-edge solutions that solve complex problems.

Join us and be part of a company that values innovation, collaboration, and continuous learning.`,
  location: "San Francisco, CA",
  size: "201-500 employees",
  founded: "2015",
  verified: true,
  culture: [
    "Remote-friendly",
    "Learning & development",
    "Diverse & inclusive",
    "Work-life balance",
  ],
  benefits: [
    "Comprehensive health insurance",
    "401(k) with company match",
    "Unlimited PTO",
    "Home office stipend",
    "Professional development budget",
    "Wellness programs",
  ],
  socialLinks: {
    linkedin: "https://linkedin.com/company/acme",
    twitter: "https://twitter.com/acme",
  },
}

const mockJobs = [
  {
    id: "1",
    title: "Senior Product Designer",
    department: "Design",
    location: "San Francisco, CA",
    type: "Full-time",
    remote: "Hybrid",
    posted: "2 days ago",
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "Full-time",
    remote: "Remote",
    posted: "5 days ago",
  },
  {
    id: "3",
    title: "Product Manager",
    department: "Product",
    location: "San Francisco, CA",
    type: "Full-time",
    remote: "Hybrid",
    posted: "1 week ago",
  },
  {
    id: "4",
    title: "DevOps Engineer",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "Full-time",
    remote: "Remote",
    posted: "2 weeks ago",
  },
]

export default function PublicCompanyProfilePage() {
  const params = useParams()
  const company = mockCompany

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <span className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              Orion
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all group-hover:bg-primary" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost">Browse Jobs</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Company Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-primary">{company.initials}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              {company.verified && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-foreground-muted mb-4">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {company.industry}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {company.location}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {company.size}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Founded {company.founded}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Website
              </a>
              {company.socialLinks.linkedin && (
                <a
                  href={company.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              {company.socialLinks.twitter && (
                <a
                  href={company.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">About {company.name}</h2>
              <div className="prose prose-foreground-muted max-w-none">
                {company.description.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-foreground-muted mb-4 last:mb-0">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Open Positions */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Open Positions ({mockJobs.length})
              </h2>
              <div className="space-y-3">
                {mockJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-foreground mb-1">{job.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
                              <span>{job.department}</span>
                              <span>·</span>
                              <span>{job.location}</span>
                              <span>·</span>
                              <span>{job.type}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{job.remote}</Badge>
                            <span className="text-sm text-foreground-muted">{job.posted}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Culture */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Culture & Values</h3>
                <div className="flex flex-wrap gap-2">
                  {company.culture.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-primary/5 text-foreground">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Benefits & Perks</h3>
                <ul className="space-y-2">
                  {company.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-foreground-muted">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-foreground-muted text-sm">
              <Link href="/" className="flex items-center">
                <span className="font-semibold text-foreground">Orion</span>
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary/50" />
              </Link>
              <span>·</span>
              <span>© 2026 Orion. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

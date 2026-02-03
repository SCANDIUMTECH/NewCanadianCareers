"use client"

import React from "react"
import Link from "next/link"
import { DashboardHeader, DashboardContent, NavItem } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

/**
 * Company Dashboard Layout
 * Premium glassmorphism design matching Orion's visual language
 * Uses shared DashboardHeader with company-specific extensions
 */

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/company" },
  { name: "Jobs", href: "/company/jobs" },
  { name: "Analytics", href: "/company/analytics" },
  { name: "Team", href: "/company/team" },
]

// Mock user and company data
const user = {
  name: "Jane Doe",
  email: "jane@acme.com",
  initials: "JD",
  avatarUrl: "/avatars/employer.jpg",
}

const company = {
  name: "Acme Corporation",
  logo: null,
  verified: true,
  role: "Owner",
  entitlements: 12,
}

const profileMenuItems = [
  { label: "Company", separator: true },
  { label: "Company Profile", href: "/company/profile" },
  { label: "Billing & Packages", href: "/company/billing" },
  { label: "Settings", href: "/company/settings" },
  { separator: true, label: "" },
  { label: "Account", separator: true },
  { label: "Personal Settings" },
  { separator: true, label: "" },
  { label: "Sign out", variant: "destructive" as const },
]

function CompanySelector() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hidden md:flex items-center gap-2 h-9 px-3">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">A</span>
          </div>
          <span className="text-sm font-medium">{company.name}</span>
          {company.verified && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Verified
            </Badge>
          )}
          <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-foreground-muted">Switch Company</DropdownMenuLabel>
        <DropdownMenuItem className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">A</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Acme Corporation</p>
            <p className="text-xs text-foreground-muted">Owner</p>
          </div>
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create new company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CompanyActions() {
  return (
    <>
      {/* Entitlements Badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-secondary/50">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-sm font-medium">{company.entitlements} posts</span>
      </div>

      {/* Post Job CTA */}
      <Link href="/company/jobs/new">
        <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Post Job</span>
        </Button>
      </Link>
    </>
  )
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        navigation={navigation}
        user={user}
        profileMenuItems={profileMenuItems}
        leftContent={<CompanySelector />}
        actions={<CompanyActions />}
      />

      <DashboardContent>
        {children}
      </DashboardContent>
    </div>
  )
}

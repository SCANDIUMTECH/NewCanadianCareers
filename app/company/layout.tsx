"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn, getInitials, getCompanyInitials } from "@/lib/utils"
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
import { useAuth } from "@/hooks/use-auth"
import { CompanyProvider, useCompanyContext } from "@/hooks/use-company"
import { RequireRole } from "@/lib/auth/require-role"
import { CompanyOnboarding } from "@/components/company-onboarding"

/**
 * Company Dashboard Layout
 * Premium glassmorphism design matching NCC's visual language
 * Uses shared DashboardHeader with company-specific extensions
 * Integrated with CompanyProvider for real API data
 */

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/company" },
  { name: "Jobs", href: "/company/jobs" },
  { name: "Applications", href: "/company/applications" },
]

function CompanySelector() {
  const { company, isLoading } = useCompanyContext()

  if (isLoading || !company) {
    return (
      <div className="hidden md:flex items-center gap-2 h-9 px-3">
        <div className="w-6 h-6 rounded bg-background-secondary animate-pulse" />
        <div className="w-24 h-4 rounded bg-background-secondary animate-pulse" />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hidden md:flex items-center gap-2 h-9 px-3">
          {company.logo ? (
            <Image
              src={company.logo}
              alt={company.name}
              width={24}
              height={24}
              className="w-6 h-6 rounded object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {getCompanyInitials(company.name)}
              </span>
            </div>
          )}
          <span className="text-sm font-medium">{company.name}</span>
          {company.is_verified && (
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
          {company.logo ? (
            <Image
              src={company.logo}
              alt={company.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {getCompanyInitials(company.name)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{company.name}</p>
            <p className="text-xs text-foreground-muted">Employer</p>
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
  const { entitlements, unreadNotifications, isLoading } = useCompanyContext()

  const remainingCredits = entitlements?.remaining_credits ?? 0
  const hasCredits = remainingCredits > 0

  return (
    <>
      {/* Credits indicator — links to post job when you have credits, buy packages when you don't */}
      <Link
        href={hasCredits ? "/company/jobs/new" : "/company/packages"}
        className={cn(
          "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          hasCredits
            ? "bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20"
            : "bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20"
        )}
      >
        {hasCredits ? (
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
        {isLoading ? (
          <div className="w-12 h-4 rounded bg-background-secondary animate-pulse" />
        ) : (
          <span className={cn(
            "text-sm font-medium",
            hasCredits ? "text-primary" : "text-amber-600"
          )}>
            {hasCredits ? `${remainingCredits} credits` : "Get credits"}
          </span>
        )}
      </Link>

      {/* Notification Bell */}
      <Link href="/company/notifications" className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-background-secondary/50 transition-colors">
        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </Link>
    </>
  )
}

function CompanyLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user: authUser, isLoading: authLoading, logout, refreshUser } = useAuth()
  const { company, isLoading: companyLoading, error: companyError } = useCompanyContext()

  // Show loading state while auth is hydrating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show onboarding for users who haven't completed it
  if (authUser && !authUser.onboarding_completed && company) {
    return (
      <CompanyOnboarding
        user={authUser}
        companyName={company.name}
        onComplete={() => {
          refreshUser()
        }}
      />
    )
  }

  // Build user object from auth state
  const user = authUser ? {
    name: authUser.full_name || `${authUser.first_name} ${authUser.last_name}`,
    email: authUser.email,
    initials: getInitials(authUser.first_name, authUser.last_name),
    avatarUrl: authUser.avatar || undefined,
  } : {
    name: "Guest",
    email: "",
    initials: "??",
    avatarUrl: undefined,
  }

  const handleSignOut = async () => {
    await logout()
    router.push("/login")
  }

  const profileMenuItems = [
    { label: "Company", separator: true },
    { label: "Company Profile", href: "/company/profile" },
    { label: "Billing & Packages", href: "/company/billing" },
    { label: "Settings", href: "/company/settings" },
    { separator: true, label: "" },
    { label: "Sign out", variant: "destructive" as const, onClick: handleSignOut },
  ]

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
        {companyError ? (
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load company</h2>
              <p className="text-foreground-muted mb-6">{companyError.message}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </DashboardContent>
    </div>
  )
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireRole allowedRoles={['employer']}>
      <CompanyProvider>
        <CompanyLayoutContent>{children}</CompanyLayoutContent>
      </CompanyProvider>
    </RequireRole>
  )
}

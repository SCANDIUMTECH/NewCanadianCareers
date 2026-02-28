"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardHeader, DashboardContent, NavItem } from "@/components/dashboard-header"
import { useAuth } from "@/hooks/use-auth"
import { CandidateProvider } from "@/lib/candidate/context"
import { RequireRole } from "@/lib/auth/require-role"
import { getInitials } from "@/lib/utils"

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/candidate" },
  { name: "Saved Jobs", href: "/candidate/saved" },
  { name: "Applications", href: "/candidate/applications" },
  { name: "Job Alerts", href: "/candidate/alerts" },
]

function CandidateLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user: authUser, isLoading, logout } = useAuth()

  // Show loading state while auth is hydrating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
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
    { label: "Profile & Resume", href: "/candidate/profile" },
    { label: "Settings", href: "/candidate/settings" },
    { separator: true, label: "" },
    { label: "Sign out", variant: "destructive" as const, onClick: handleSignOut },
  ]

  return (
    <CandidateProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader
          navigation={navigation}
          user={user}
          profileMenuItems={profileMenuItems}
          actions={
            <Link
              href="/jobs"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Jobs
            </Link>
          }
        />

        <DashboardContent>
          {children}
        </DashboardContent>
      </div>
    </CandidateProvider>
  )
}

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireRole allowedRoles={['candidate']}>
      <CandidateLayoutContent>{children}</CandidateLayoutContent>
    </RequireRole>
  )
}

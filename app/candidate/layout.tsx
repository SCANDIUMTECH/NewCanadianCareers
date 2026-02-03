"use client"

import React from "react"
import Link from "next/link"
import { DashboardHeader, DashboardContent, NavItem } from "@/components/dashboard-header"

/**
 * Candidate Dashboard Layout
 * Clean, minimal navigation with the Orion design language
 * Uses shared DashboardHeader component
 */

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/candidate" },
  { name: "Saved Jobs", href: "/candidate/saved" },
  { name: "Applications", href: "/candidate/applications" },
  { name: "Job Alerts", href: "/candidate/alerts" },
]

// Mock user data
const user = {
  name: "John Doe",
  email: "john@example.com",
  initials: "JD",
  avatarUrl: "/avatars/candidate.jpg",
}

const profileMenuItems = [
  { label: "Profile & Resume", href: "/candidate/profile" },
  { label: "Settings", href: "/candidate/settings" },
  { separator: true, label: "" },
  { label: "Sign out", variant: "destructive" as const },
]

export default function CandidateLayout({
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
  )
}

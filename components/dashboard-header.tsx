"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface NavItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface DashboardHeaderProps {
  /**
   * Navigation items to display in center of header
   */
  navigation: NavItem[]
  /**
   * User profile data
   */
  user: {
    name: string
    email: string
    initials: string
    avatarUrl?: string
  }
  /**
   * Profile menu items
   */
  profileMenuItems?: {
    label: string
    href?: string
    onClick?: () => void
    variant?: "default" | "destructive"
    separator?: boolean
  }[]
  /**
   * Optional right-side actions (before profile)
   */
  actions?: React.ReactNode
  /**
   * Optional left-side content (after logo)
   */
  leftContent?: React.ReactNode
  /**
   * Optional mobile navigation icon renderer
   */
  renderMobileIcon?: (name: string, isActive: boolean) => React.ReactNode
}

/**
 * Shared floating glassmorphism header for dashboard layouts
 * Used by Company, Candidate, and Agency dashboards
 */
export function DashboardHeader({
  navigation,
  user,
  profileMenuItems = [],
  actions,
  leftContent,
  renderMobileIcon,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isActive = (href: string, basePath?: string) => {
    if (pathname === href) return true
    // Check if we're in a sub-route of this nav item
    // Ensure startsWith match is at a path boundary (e.g. /company/jobs matches /company/jobs/123 but not /company/jobsettings)
    if (basePath && href !== basePath && pathname.startsWith(href + '/')) return true
    return false
  }

  // Find base path from navigation (first item is usually the dashboard home)
  const basePath = navigation[0]?.href

  return (
    <>
      {/* Floating Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-4 md:px-6 transition-all duration-500",
          isScrolled ? "pt-3" : "pt-4"
        )}
      >
        <div
          className={cn(
            "relative max-w-[1400px] mx-auto rounded-2xl transition-all duration-500",
            isScrolled
              ? "bg-card/80 backdrop-blur-2xl shadow-lg shadow-black/5 border border-white/20"
              : "bg-transparent"
          )}
        >
          {/* Inner glow */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none",
              isScrolled ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
            }}
          />

          <nav className="relative flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
            {/* Logo + Optional left content */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center group">
                <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                  Orion
                </span>
                <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all duration-500 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/50" />
              </Link>

              {leftContent && (
                <>
                  <div className="hidden md:block h-6 w-px bg-border/50" />
                  {leftContent}
                </>
              )}
            </div>

            {/* Center Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const active = isActive(item.href, basePath)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                      active
                        ? "text-foreground bg-foreground/5"
                        : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    {item.name}
                    {active && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 md:gap-3">
              {actions}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <UserAvatar
                      name={user.name}
                      avatar={user.avatarUrl}
                      size="sm"
                      className="border-2 border-transparent hover:border-primary/20 transition-colors"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-3 p-3">
                    <UserAvatar
                      name={user.name}
                      avatar={user.avatarUrl}
                      size="md"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-foreground-muted">{user.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {profileMenuItems.map((item, index) =>
                    item.separator ? (
                      <DropdownMenuSeparator key={`sep-${index}`} />
                    ) : item.href ? (
                      <DropdownMenuItem
                        key={item.label}
                        asChild
                        className={cn(item.variant === "destructive" && "text-destructive")}
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={item.label}
                        onClick={item.onClick}
                        className={cn(item.variant === "destructive" && "text-destructive")}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/90 backdrop-blur-xl border-t border-border">
        <nav className="flex items-center justify-around h-16 px-2">
          {navigation.slice(0, 4).map((item) => {
            const active = isActive(item.href, basePath)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-foreground-muted"
                )}
              >
                {renderMobileIcon ? (
                  renderMobileIcon(item.name, active)
                ) : (
                  <DefaultMobileIcon name={item.name} isActive={active} />
                )}
                <span className="truncate max-w-[60px]">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}

function DefaultMobileIcon({ name, isActive }: { name: string; isActive: boolean }) {
  const className = cn("w-5 h-5", isActive ? "text-primary" : "text-foreground-muted")

  // Default icon based on common nav item names
  switch (name.toLowerCase()) {
    case "dashboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    case "jobs":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case "saved jobs":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    case "applications":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case "job alerts":
    case "alerts":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    case "analytics":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    case "team":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case "companies":
    case "clients":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case "billing":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

/**
 * Simple wrapper for dashboard content with proper padding
 */
export function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-24 md:pt-28 pb-24 lg:pb-12">
      {children}
    </main>
  )
}

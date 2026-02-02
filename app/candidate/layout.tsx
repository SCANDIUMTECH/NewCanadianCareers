"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Candidate Dashboard Layout
 * Clean, minimal navigation with the Orion design language
 * Floating glassmorphism header consistent with landing page
 */

const navigation = [
  { name: "Dashboard", href: "/candidate" },
  { name: "Saved Jobs", href: "/candidate/saved" },
  { name: "Applications", href: "/candidate/applications" },
  { name: "Job Alerts", href: "/candidate/alerts" },
]

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
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
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                Orion
              </span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all duration-500 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/50" />
            </Link>

            {/* Center Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                      isActive
                        ? "text-foreground bg-foreground/5"
                        : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side - Search & Profile */}
            <div className="flex items-center gap-3">
              <Link
                href="/jobs"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Jobs
              </Link>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary/20 transition-colors">
                      <AvatarImage src="/avatars/candidate.jpg" alt="Profile" />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        JD
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">JD</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">John Doe</span>
                      <span className="text-xs text-foreground-muted">john@example.com</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/candidate/profile">Profile & Resume</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/candidate/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border">
        <nav className="flex items-center justify-around h-16 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
              >
                <NavIcon name={item.name} isActive={isActive} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-24 md:pt-28 pb-24 md:pb-12">
        {children}
      </main>
    </div>
  )
}

function NavIcon({ name, isActive }: { name: string; isActive: boolean }) {
  const className = cn("w-5 h-5", isActive ? "text-primary" : "text-foreground-muted")
  
  switch (name) {
    case "Dashboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    case "Saved Jobs":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    case "Applications":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case "Job Alerts":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    default:
      return null
  }
}

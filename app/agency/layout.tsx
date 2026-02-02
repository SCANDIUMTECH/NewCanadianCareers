"use client"

import React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Agency Dashboard Layout
 * Enhanced multi-company management for recruitment agencies
 * Features company context switching, pooled entitlements, and agency-specific navigation
 */

const navigation = [
  { name: "Dashboard", href: "/agency" },
  { name: "Companies", href: "/agency/companies" },
  { name: "Jobs", href: "/agency/jobs" },
  { name: "Analytics", href: "/agency/analytics" },
  { name: "Team", href: "/agency/team" },
]

const secondaryNav = [
  { name: "Billing", href: "/agency/billing" },
  { name: "Settings", href: "/agency/settings" },
]

// Mock client companies
const clientCompanies = [
  { id: 1, name: "Acme Corporation", logo: null, verified: true, activeJobs: 5, initials: "AC" },
  { id: 2, name: "TechStart Inc", logo: null, verified: true, activeJobs: 3, initials: "TS" },
  { id: 3, name: "Global Dynamics", logo: null, verified: false, activeJobs: 2, initials: "GD" },
  { id: 4, name: "Innovate Labs", logo: null, verified: true, activeJobs: 0, initials: "IL" },
]

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<typeof clientCompanies[0] | null>(null)
  const [showAddCompanyDialog, setShowAddCompanyDialog] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Mock agency data
  const agency = {
    name: "Talent Bridge Agency",
    logo: null,
    verified: true,
    role: "Owner",
    totalCredits: 45,
    billingMode: "agency", // "agency" | "company"
    clientCount: clientCompanies.length,
  }

  const clearCompanyContext = () => setSelectedCompany(null)

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
          {/* Inner glow effect */}
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
            {/* Logo + Agency/Company Context */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center group">
                <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                  Orion
                </span>
                <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all duration-500 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/50" />
              </Link>
              
              {/* Divider */}
              <div className="hidden md:block h-6 w-px bg-border/50" />
              
              {/* Agency Badge */}
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-semibold bg-violet-500/10 text-violet-600 border-violet-500/20">
                  Agency
                </Badge>
              </div>
              
              {/* Company Context Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex items-center gap-2 h-9 px-3">
                    {selectedCompany ? (
                      <>
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{selectedCompany.initials}</span>
                        </div>
                        <span className="text-sm font-medium max-w-[120px] truncate">{selectedCompany.name}</span>
                        {selectedCompany.verified && (
                          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded bg-violet-500/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-violet-600">TB</span>
                        </div>
                        <span className="text-sm font-medium">{agency.name}</span>
                      </>
                    )}
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72" align="start">
                  {/* Agency Level */}
                  <DropdownMenuLabel className="text-xs text-foreground-muted">Agency</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className={cn(
                      "flex items-center gap-3 p-3",
                      !selectedCompany && "bg-primary/5"
                    )}
                    onClick={clearCompanyContext}
                  >
                    <div className="w-8 h-8 rounded bg-violet-500/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-violet-600">TB</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{agency.name}</p>
                      <p className="text-xs text-foreground-muted">{agency.clientCount} client companies</p>
                    </div>
                    {!selectedCompany && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Client Companies */}
                  <DropdownMenuLabel className="text-xs text-foreground-muted">Client Companies</DropdownMenuLabel>
                  <DropdownMenuGroup className="max-h-[240px] overflow-y-auto">
                    {clientCompanies.map((company) => (
                      <DropdownMenuItem 
                        key={company.id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          selectedCompany?.id === company.id && "bg-primary/5"
                        )}
                        onClick={() => setSelectedCompany(company)}
                      >
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{company.initials}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{company.name}</p>
                            {company.verified && (
                              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-foreground-muted">{company.activeJobs} active jobs</p>
                        </div>
                        {selectedCompany?.id === company.id && (
                          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowAddCompanyDialog(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Client Company
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Center Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/agency" && pathname.startsWith(item.href))
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

            {/* Right side */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Pooled Credits Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-medium text-violet-600">{agency.totalCredits} credits</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                  Pooled
                </Badge>
              </div>

              {/* Post Job CTA */}
              <Link href={selectedCompany ? `/agency/jobs/new?company=${selectedCompany.id}` : "/agency/jobs/new"}>
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Post Job</span>
                </Button>
              </Link>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary/20 transition-colors">
                      <AvatarImage src="/avatars/agency-owner.jpg" alt="Profile" />
                      <AvatarFallback className="bg-violet-500/10 text-violet-600 font-medium">
                        RK
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-violet-500/10 text-violet-600">RK</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Rachel Kim</span>
                      <span className="text-xs text-foreground-muted">rachel@talentbridge.io</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-foreground-muted">Agency</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/companies">Manage Companies</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/billing">Billing & Credits</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/settings">Agency Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-foreground-muted">Account</DropdownMenuLabel>
                  <DropdownMenuItem>Personal Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
          
          {/* Company Context Indicator Bar */}
          {selectedCompany && (
            <div className="relative flex items-center justify-between px-4 md:px-6 py-2 border-t border-border/30 bg-primary/5">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-foreground-muted">Working as</span>
                <span className="font-medium text-foreground">{selectedCompany.name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-foreground-muted hover:text-foreground"
                onClick={clearCompanyContext}
              >
                Clear context
                <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/90 backdrop-blur-xl border-t border-border">
        <nav className="flex items-center justify-around h-16 px-2">
          {navigation.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/agency" && pathname.startsWith(item.href))
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
          <Link
            href="/agency/settings"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
              pathname.startsWith("/agency/settings") ? "text-primary" : "text-foreground-muted"
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            More
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <main className={cn("pt-24 md:pt-28 pb-24 lg:pb-12", selectedCompany && "pt-32 md:pt-36")}>
        {children}
      </main>

      {/* Add Company Dialog */}
      <Dialog open={showAddCompanyDialog} onOpenChange={setShowAddCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Company</DialogTitle>
            <DialogDescription>
              Create a new client company profile. You can post jobs on their behalf once added.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" placeholder="Acme Corporation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <Input id="company-website" placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-industry">Industry</Label>
              <Input id="company-industry" placeholder="Technology" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCompanyDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    case "Companies":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case "Jobs":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case "Analytics":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    case "Team":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    default:
      return null
  }
}

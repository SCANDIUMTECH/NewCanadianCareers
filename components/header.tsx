"use client"

import { useState, useEffect, useRef, Fragment, type ReactNode, type MouseEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { LayoutGrid } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth } from "@/hooks/use-auth"
import { ROLE_REDIRECTS } from "@/lib/auth/types"

const navLinks = [
  { label: "Find Jobs", href: "/jobs" },
  { label: "For Companies", href: "/company" },
  { label: "For Candidates", href: "/candidate" },
]

const devMenuPages = {
  "Public": [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: "Login", href: "/login" },
    { label: "Signup", href: "/signup" },
    { label: "Forgot Password", href: "/forgot-password" },
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ],
  "Candidate": [
    { label: "Dashboard", href: "/candidate" },
    { label: "Profile", href: "/candidate/profile" },
    { label: "Saved Jobs", href: "/candidate/saved" },
    { label: "Applications", href: "/candidate/applications" },
    { label: "Job Alerts", href: "/candidate/alerts" },
    { label: "Settings", href: "/candidate/settings" },
  ],
  "Company": [
    { label: "Dashboard", href: "/company" },
    { label: "Jobs", href: "/company/jobs" },
    { label: "Create Job", href: "/company/jobs/new" },
    { label: "Analytics", href: "/company/analytics" },
    { label: "Team", href: "/company/team" },
    { label: "Billing", href: "/company/billing" },
    { label: "Packages", href: "/company/packages" },
    { label: "Settings", href: "/company/settings" },
  ],
  "Agency": [
    { label: "Dashboard", href: "/agency" },
    { label: "Companies", href: "/agency/companies" },
    { label: "Jobs", href: "/agency/jobs" },
    { label: "Team", href: "/agency/team" },
    { label: "Billing", href: "/agency/billing" },
  ],
  "Admin": [
    { label: "Dashboard", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Companies", href: "/admin/companies" },
    { label: "Jobs", href: "/admin/jobs" },
    { label: "Moderation", href: "/admin/moderation" },
    { label: "Settings", href: "/admin/settings" },
  ],
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)
  const { user, isLoading, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300)

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 md:px-6 transition-all duration-700 ease-out",
        isScrolled ? "pt-4" : "pt-6",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}
    >
      {/* Floating container with glassmorphism */}
      <div 
        className={cn(
          "relative max-w-[1100px] mx-auto rounded-2xl transition-all duration-700 ease-out",
          isScrolled 
            ? "bg-card/70 backdrop-blur-2xl shadow-2xl shadow-black/5 border border-white/20" 
            : "bg-transparent"
        )}
      >
        {/* Inner glow effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-2xl transition-opacity duration-700 pointer-events-none",
            isScrolled ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%)",
          }}
        />
        
        {/* Subtle border glow on scroll */}
        <div 
          className={cn(
            "absolute -inset-px rounded-2xl transition-opacity duration-700 pointer-events-none",
            isScrolled ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: "linear-gradient(180deg, rgba(var(--primary-rgb), 0.15) 0%, transparent 50%)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "xor",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />

        <nav className="relative flex items-center justify-between h-16 md:h-20 px-4 md:px-8">

          {/* Logo with glow effect */}
          <Link href="/" className="flex items-center group relative">
            {/* Logo glow on hover */}
            <div className="absolute -inset-3 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-all duration-500" />
            <Image
              src="/logo.svg"
              alt="New Canadian Careers Logo"
              width={48}
              height={48}
              className="relative h-12 w-auto transition-all duration-300 group-hover:scale-110"
              priority
            />
          </Link>

          {/* Center Navigation - Pill style */}
          <div className="hidden md:flex items-center relative">
            {/* Active indicator background */}
            <div
              className={cn(
                "absolute h-10 rounded-full bg-foreground/5 transition-all duration-300 ease-out",
                activeLink ? "opacity-100" : "opacity-0"
              )}
            />

            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                label={link.label}
                onHover={setActiveLink}
                isActive={activeLink === link.label}
              />
            ))}

            {/* Dev Menu — only in development */}
            {process.env.NODE_ENV === "development" && <DevMenu />}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {isLoading ? (
              <div className="w-20 h-9 rounded-lg bg-foreground/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href={ROLE_REDIRECTS[user.role]}
                  className={cn(
                    "hidden sm:flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Dashboard
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                      <UserAvatar
                        name={user.full_name}
                        avatar={user.avatar}
                        size="sm"
                        className="border-2 border-transparent hover:border-primary/20 transition-colors"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-white/20">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.full_name}</p>
                        <p className="text-xs leading-none text-foreground-muted">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={ROLE_REDIRECTS[user.role]} className="cursor-pointer">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer"
                      onClick={logout}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "hidden sm:flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Sign in
                </Link>

                {/* Premium CTA Button */}
                <PremiumButton href="/signup">
                  Get Started
                </PremiumButton>
              </>
            )}
          </div>

        </nav>
      </div>
    </header>
  )
}

function NavLink({
  href,
  label,
  onHover,
  isActive,
}: {
  href: string
  label: string
  onHover: (label: string | null) => void
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-5 py-3 text-sm font-medium transition-all duration-300",
        isActive ? "text-foreground" : "text-foreground-muted hover:text-foreground"
      )}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
    >
      {label}
    </Link>
  )
}

function DevMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "ml-2 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
            "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
          )}
          aria-label="All Pages"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-card/95 backdrop-blur-xl border-white/20"
      >
        {Object.entries(devMenuPages).map(([section, pages], index) => (
          <Fragment key={section}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-foreground-muted uppercase tracking-wider">
                {section}
              </DropdownMenuLabel>
              {pages.map((page) => (
                <DropdownMenuItem key={page.href} asChild>
                  <Link
                    href={page.href}
                    className="cursor-pointer"
                  >
                    {page.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PremiumButton({ href, children }: { href: string; children: ReactNode }) {
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: MouseEvent) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    })
  }

  return (
    <Link
      ref={buttonRef}
      href={href}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setPosition({ x: 0, y: 0 })
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Glow effect */}
      <div 
        className={cn(
          "absolute -inset-1 rounded-xl bg-primary/20 blur-xl transition-all duration-500",
          isHovered ? "opacity-100 scale-110" : "opacity-0 scale-100"
        )}
      />
      
      {/* Button body */}
      <div
        className={cn(
          "relative overflow-hidden px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
          "bg-primary text-primary-foreground"
        )}
        style={{
          transform: isHovered 
            ? `translate(${position.x * 0.1}px, ${position.y * 0.1}px)` 
            : "translate(0, 0)",
        }}
      >
        {/* Shine effect */}
        <div 
          className={cn(
            "absolute inset-0 transition-transform duration-700",
            isHovered ? "translate-x-full" : "-translate-x-full"
          )}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
          }}
        />
        
        <span className="relative z-10 flex items-center gap-2">
          {children}
          {/* Arrow that appears on hover */}
          <svg 
            className={cn(
              "w-4 h-4 transition-all duration-300",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
            )}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

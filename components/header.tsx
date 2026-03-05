"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Menu, X, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth } from "@/hooks/use-auth"
import { ROLE_REDIRECTS } from "@/lib/auth/types"

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

type NavItem =
  | { type: "link"; label: string; href: string }
  | { type: "dropdown"; label: string; id: string; items: DropdownItem[] }

interface DropdownItem {
  title: string
  subtitle: string
  href: string
}

const navItems: NavItem[] = [
  { type: "link", label: "Find Jobs", href: "/jobs" },
  {
    type: "dropdown",
    label: "For Employers",
    id: "employers",
    items: [
      { title: "Pricing", subtitle: "Plans & packages", href: "/pricing" },
      { title: "Companies", subtitle: "Browse employers", href: "/companies" },
      { title: "Post a Job", subtitle: "Start hiring", href: "/signup" },
      { title: "Dashboard", subtitle: "Manage your jobs", href: "/company" },
    ],
  },
  {
    type: "dropdown",
    label: "Resources",
    id: "resources",
    items: [
      { title: "News", subtitle: "Industry updates", href: "/news" },
      { title: "About Us", subtitle: "Our mission", href: "/about" },
      { title: "Contact", subtitle: "Get in touch", href: "/contact" },
      { title: "Help Center", subtitle: "FAQs & support", href: "/help" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)

  // Scroll listener + initial reveal
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

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null)
    setMobileMenuOpen(false)
  }, [pathname])

  const handleDropdownOpen = (id: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setOpenDropdown(id)
  }

  const handleDropdownClose = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150)
  }

  const isDropdownCurrent = (item: Extract<NavItem, { type: "dropdown" }>) =>
    item.items.some((i) => pathname.startsWith(i.href))

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
          <Link href="/" className="flex items-center group relative" onClick={() => setMobileMenuOpen(false)}>
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

          {/* Divider after logo */}
          <div className="hidden md:block w-px h-5 bg-foreground/10 mx-2" />

          {/* Center Navigation — Desktop */}
          <div className="hidden md:flex items-center">
            {navItems.map((item) =>
              item.type === "link" ? (
                <NavLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  isCurrent={pathname.startsWith(item.href)}
                />
              ) : (
                <NavDropdownTrigger
                  key={item.id}
                  item={item}
                  isOpen={openDropdown === item.id}
                  isCurrent={isDropdownCurrent(item)}
                  onOpen={() => handleDropdownOpen(item.id)}
                  onClose={handleDropdownClose}
                  align={item.id === "resources" ? "right" : "center"}
                />
              )
            )}
          </div>

          {/* Right side: Auth + Mobile toggle */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Divider before auth */}
            <div className="hidden sm:block w-px h-5 bg-foreground/10 mx-2" />

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
                  className="group hidden sm:flex items-center justify-center px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground-muted/70 hover:text-foreground transition-colors duration-200"
                >
                  <span className="relative inline-block">
                    Sign in
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-primary/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center" />
                  </span>
                </Link>

                {/* Premium CTA Button */}
                <PremiumButton href="/signup">
                  Get Started
                </PremiumButton>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className={cn(
                "md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </nav>

        {/* Mobile Navigation Dropdown */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-out",
            mobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 space-y-1">
            {navItems.map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    pathname.startsWith(item.href)
                      ? "text-foreground bg-foreground/5"
                      : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <MobileDropdownSection
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )
            )}

            {/* Mobile-only auth links when not visible in header */}
            {!isAuthenticated && !isLoading && (
              <Link
                href="/login"
                className="block sm:hidden px-4 py-3 rounded-xl text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}

            {isAuthenticated && user && (
              <Link
                href={ROLE_REDIRECTS[user.role]}
                className="block sm:hidden px-4 py-3 rounded-xl text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// NavLink (simple flat link — same as before)
// ---------------------------------------------------------------------------

function NavLink({
  href,
  label,
  isCurrent,
}: {
  href: string
  label: string
  isCurrent: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200",
        isCurrent ? "text-foreground" : "text-foreground-muted/70 hover:text-foreground"
      )}
    >
      <span className="relative inline-block">
        {label}
        <span
          className={cn(
            "absolute -bottom-1 left-0 right-0 h-[2px] rounded-full transition-all duration-200 origin-center",
            isCurrent ? "scale-x-100 bg-primary" : "scale-x-0 bg-primary/40 group-hover:scale-x-100"
          )}
        />
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// NavDropdownTrigger (hover-triggered mega menu)
// ---------------------------------------------------------------------------

function NavDropdownTrigger({
  item,
  isOpen,
  isCurrent,
  onOpen,
  onClose,
  align = "center",
}: {
  item: Extract<NavItem, { type: "dropdown" }>
  isOpen: boolean
  isCurrent: boolean
  onOpen: () => void
  onClose: () => void
  align?: "center" | "right"
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      {/* Trigger */}
      <button
        className={cn(
          "relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center gap-1",
          isCurrent || isOpen ? "text-foreground" : "text-foreground-muted/70 hover:text-foreground"
        )}
      >
        <span className="relative inline-block">
          {item.label}
          <span
            className={cn(
              "absolute -bottom-1 left-0 right-0 h-[2px] rounded-full transition-all duration-200 origin-center",
              isOpen || isCurrent ? "scale-x-100 bg-primary" : "scale-x-0 bg-primary/40"
            )}
          />
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute top-full pt-2 z-50",
          "transition-all duration-200 ease-out",
          align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        )}
      >
        <div className="w-[420px] grid grid-cols-2 gap-1 p-3 rounded-xl bg-card/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/10">
          {item.items.map((dropdownItem) => (
            <MegaMenuItem key={dropdownItem.href} item={dropdownItem} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MegaMenuItem (single item inside dropdown panel)
// ---------------------------------------------------------------------------

function MegaMenuItem({ item }: { item: DropdownItem }) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col gap-0.5 px-3 py-2.5 rounded-lg hover:bg-foreground/5 transition-colors duration-150"
    >
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-150">
        {item.title}
      </span>
      <span className="text-xs text-foreground-muted/60">
        {item.subtitle}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// MobileDropdownSection (accordion in mobile drawer)
// ---------------------------------------------------------------------------

function MobileDropdownSection({
  item,
  pathname,
  onNavigate,
}: {
  item: Extract<NavItem, { type: "dropdown" }>
  pathname: string
  onNavigate: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isCurrent = item.items.some((i) => pathname.startsWith(i.href))

  return (
    <div>
      <button
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
          isCurrent
            ? "text-foreground bg-foreground/5"
            : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pl-4 space-y-0.5 pb-1">
          {item.items.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block px-4 py-2.5 rounded-xl text-sm transition-all duration-200",
                pathname.startsWith(child.href)
                  ? "text-foreground font-medium"
                  : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
              )}
              onClick={onNavigate}
            >
              <span className="block">{child.title}</span>
              <span className="block text-xs text-foreground-muted/60">{child.subtitle}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PremiumButton
// ---------------------------------------------------------------------------

function PremiumButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "h-9 px-5 rounded-md text-sm font-medium inline-flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "active:scale-[0.97]",
        "transition-all duration-200"
      )}
    >
      {children}
    </Link>
  )
}

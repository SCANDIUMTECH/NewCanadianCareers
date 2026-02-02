"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Ultra Premium Floating Header
 * - Glassmorphism with layered transparency
 * - Floating pill design with glow effects
 * - Magnetic hover interactions
 * - Smooth scroll-aware transitions
 */

const navLinks = [
  { label: "Candidates", href: "#candidates" },
  { label: "Companies", href: "#companies" },
  { label: "Platform", href: "#platform" },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 300)

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
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
            background: "linear-gradient(180deg, rgba(59,91,219,0.15) 0%, transparent 50%)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "xor",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />

        <nav className="relative flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
          
          {/* Logo with glow effect */}
          <Link href="/" className="flex items-center group relative">
            {/* Logo glow on hover */}
            <div className="absolute -inset-3 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-all duration-500" />
            <span className="relative text-lg font-semibold tracking-tight text-foreground transition-all duration-300 group-hover:text-primary">
              Orion
            </span>
            <span 
              className={cn(
                "relative ml-1.5 w-2 h-2 rounded-full transition-all duration-500",
                "bg-primary/50 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/50"
              )} 
            />
          </Link>

          {/* Center Navigation - Pill style */}
          <div className="hidden md:flex items-center relative">
            {/* Active indicator background */}
            <div 
              className={cn(
                "absolute h-8 rounded-full bg-foreground/5 transition-all duration-300 ease-out",
                activeLink ? "opacity-100" : "opacity-0"
              )}
              style={{
                left: activeLink === "Candidates" ? "0px" : activeLink === "Companies" ? "96px" : activeLink === "Platform" ? "192px" : "0px",
                width: activeLink === "Candidates" ? "88px" : activeLink === "Companies" ? "96px" : activeLink === "Platform" ? "80px" : "0px",
              }}
            />
            
            {navLinks.map((link) => (
              <NavLink 
                key={link.label} 
                href={link.href}
                onHover={setActiveLink}
                isActive={activeLink === link.label}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link 
              href="/login"
              className={cn(
                "hidden sm:flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
              )}
            >
              Sign in
            </Link>
            
            {/* Premium CTA Button */}
            <PremiumButton href="/signup">
              Get Started
            </PremiumButton>
          </div>

        </nav>
      </div>
    </header>
  )
}

function NavLink({ 
  href, 
  children, 
  onHover,
  isActive 
}: { 
  href: string
  children: React.ReactNode
  onHover: (label: string | null) => void
  isActive: boolean
}) {
  return (
    <a
      href={href}
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-all duration-300",
        isActive ? "text-foreground" : "text-foreground-muted hover:text-foreground"
      )}
      onMouseEnter={() => onHover(children as string)}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </a>
  )
}

function PremiumButton({ href, children }: { href: string; children: React.ReactNode }) {
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
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
          "relative overflow-hidden px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
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

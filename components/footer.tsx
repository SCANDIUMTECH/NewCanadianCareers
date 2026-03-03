"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "./motion-wrapper"
import { AffiliateSlot } from "@/components/affiliates/affiliate-slot"

const footerLinks = [
  { label: "About", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
]

export function Footer() {
  return (
    <footer className="py-16 md:py-24 border-t border-border/50">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        
        <MotionWrapper delay={0}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            
            {/* Logo / Wordmark with hover effect */}
            <LogoWordmark />

            {/* Minimal navigation with premium hover */}
            <nav className="flex flex-wrap items-center gap-8">
              {footerLinks.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </nav>

          </div>
        </MotionWrapper>

        <MotionWrapper delay={50}>
          <AffiliateSlot placement="footer" variant="footer" className="mt-8" />
        </MotionWrapper>

        <MotionWrapper delay={100}>
          <div className="mt-12 pt-8 border-t border-border/30">
            <p className="text-sm text-foreground-muted/60">
              &copy; {new Date().getFullYear()} Orion. All rights reserved.
            </p>
          </div>
        </MotionWrapper>

      </div>
    </footer>
  )
}

function LogoWordmark() {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <div 
      className="flex items-center cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span 
        className={cn(
          "text-xl font-semibold tracking-tight transition-colors duration-300",
          isHovered ? "text-primary" : "text-foreground"
        )}
      >
        Orion
      </span>
      {/* Subtle dot accent */}
      <span 
        className={cn(
          "ml-1 w-1.5 h-1.5 rounded-full transition-all duration-500",
          isHovered ? "bg-primary scale-100" : "bg-primary/40 scale-75"
        )}
      />
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <a 
      href={href}
      className="relative text-sm text-foreground-muted transition-colors duration-300 hover:text-foreground"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {/* Underline animation */}
      <span 
        className={cn(
          "absolute -bottom-1 left-0 h-px bg-primary transition-all duration-300",
          isHovered ? "w-full" : "w-0"
        )}
      />
    </a>
  )
}

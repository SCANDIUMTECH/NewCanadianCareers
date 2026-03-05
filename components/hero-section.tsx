"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, MapPin } from "lucide-react"
import { MotionWrapper } from "./motion-wrapper"
import { MagneticButton } from "./magnetic-button"
import { TextReveal } from "./text-reveal"
import { ConstellationCanvas } from "./constellation-canvas"
import { FloatingMapleLeaves } from "./floating-maple-leaves"

export function HeroSection() {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [location, setLocation] = useState("")

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set("q", keyword.trim())
    if (location.trim()) params.set("location", location.trim())
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Ambient background gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(var(--primary-rgb), 0.08) 0%, transparent 50%)"
        }}
      />
      
      {/* Floating maple leaf silhouettes */}
      <FloatingMapleLeaves />

      {/* Editorial container */}
      <div className="relative w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-32 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left column: Content */}
          <div className="space-y-8">
            {/* Staggered reveal: headline with word animation */}
            <MotionWrapper delay={0}>
              <TextReveal 
                as="h1" 
                className="text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
              >
                Your Canadian Career Starts Here
              </TextReveal>
            </MotionWrapper>

            {/* Staggered reveal: subhead */}
            <MotionWrapper delay={200}>
              <p className="font-secondary text-lg md:text-xl text-foreground-muted leading-relaxed max-w-md">
                The trusted job platform connecting newcomers to Canada with employers who value diverse talent and global experience.
              </p>
            </MotionWrapper>

            {/* Staggered reveal: CTAs with magnetic effect */}
            <MotionWrapper delay={400}>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link href="/signup">
                  <MagneticButton variant="primary">
                    Get Started
                  </MagneticButton>
                </Link>

                <Link href="/jobs">
                  <MagneticButton variant="ghost">
                    Learn more
                  </MagneticButton>
                </Link>
              </div>
            </MotionWrapper>

          </div>

          {/* Right column: Live Constellation Canvas */}
          <MotionWrapper delay={300} className="relative">
            <div 
              className="relative aspect-square w-full max-w-[600px] mx-auto lg:ml-auto rounded-2xl overflow-hidden"
              aria-label="Animated NCC Constellation"
              role="img"
            >
              {/* Soft radial glow background */}
              <div 
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at center, rgba(var(--primary-rgb), 0.12) 0%, rgba(var(--primary-rgb), 0.04) 40%, transparent 70%)"
                }}
              />
              
              {/* Live animated canvas */}
              <ConstellationCanvas />
              
              {/* Subtle border */}
              <div className="absolute inset-0 border border-border/30 rounded-2xl pointer-events-none" />
            </div>
          </MotionWrapper>

        </div>

        {/* Full-width search bar */}
        <MotionWrapper delay={500}>
          <form onSubmit={handleSearch} className="mt-12">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2 bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted/50" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title or keyword"
                  className="w-full pl-10 pr-3 py-3 bg-transparent text-sm text-foreground placeholder:text-foreground-muted/50 outline-none rounded-xl focus:bg-foreground/[0.02] transition-colors"
                />
              </div>
              <div className="hidden sm:block w-px bg-border/50 my-2" />
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted/50" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or province"
                  className="w-full pl-10 pr-3 py-3 bg-transparent text-sm text-foreground placeholder:text-foreground-muted/50 outline-none rounded-xl focus:bg-foreground/[0.02] transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                Search Jobs
              </button>
            </div>
          </form>
        </MotionWrapper>
      </div>
    </section>
  )
}

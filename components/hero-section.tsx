"use client"

import Link from "next/link"
import { MotionWrapper } from "./motion-wrapper"
import { MagneticButton } from "./magnetic-button"
import { TextReveal } from "./text-reveal"
import { ConstellationCanvas } from "./constellation-canvas"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Ambient background gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(var(--primary-rgb), 0.08) 0%, transparent 50%)"
        }}
      />
      
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
                Find the right people. Without the noise.
              </TextReveal>
            </MotionWrapper>

            {/* Staggered reveal: subhead */}
            <MotionWrapper delay={200}>
              <p className="text-lg md:text-xl text-foreground-muted leading-relaxed max-w-md">
                A hiring platform built for clarity — for candidates, companies, and agencies.
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
      </div>
    </section>
  )
}

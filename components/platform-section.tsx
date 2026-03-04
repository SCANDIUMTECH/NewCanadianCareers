"use client"

import { MotionWrapper } from "./motion-wrapper"
import { TextReveal } from "./text-reveal"

export function PlatformSection() {
  return (
    <section className="py-32 md:py-48 bg-background-secondary relative overflow-hidden">
      {/* Centered ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 50% at 50% 100%, rgba(var(--primary-rgb), 0.05) 0%, transparent 50%)"
        }}
      />
      
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        
        {/* Section label with line */}
        <MotionWrapper delay={0}>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-8 bg-primary/40" />
            <p className="text-sm font-medium text-foreground-muted tracking-wide uppercase">
              Platform
            </p>
          </div>
        </MotionWrapper>

        {/* Single strong statement */}
        <MotionWrapper delay={100}>
          <TextReveal 
            as="h2" 
            className="text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground max-w-4xl"
          >
            Platform-Level Control
          </TextReveal>
        </MotionWrapper>

        {/* The statement paragraph */}
        <MotionWrapper delay={300}>
          <p className="mt-12 md:mt-16 text-xl md:text-2xl text-foreground-muted leading-relaxed max-w-3xl">
            New Canadian Careers isn&apos;t just a job board. It&apos;s infrastructure for how hiring should work. Permissions, workflows, integrations, and analytics — all designed to give you control without complexity. Every feature exists because it needed to. Nothing more.
          </p>
        </MotionWrapper>

      </div>
    </section>
  )
}

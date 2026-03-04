"use client"

import { MotionWrapper } from "./motion-wrapper"
import { TextReveal, LineReveal } from "./text-reveal"

export function WhyOrionSection() {
  return (
    <section className="py-32 md:py-48 relative">
      {/* Subtle gradient accent */}
      <div 
        className="absolute right-0 top-1/4 w-1/2 h-1/2 pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(circle at 80% 50%, rgba(var(--primary-rgb), 0.06) 0%, transparent 50%)"
        }}
      />
      
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        
        {/* Section label with line */}
        <MotionWrapper delay={0}>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-8 bg-primary/40" />
            <p className="text-sm font-medium text-foreground-muted tracking-wide uppercase">
              Why NCC Exists
            </p>
          </div>
        </MotionWrapper>

        {/* Editorial headline with word reveal */}
        <MotionWrapper delay={100}>
          <TextReveal 
            as="h2" 
            className="text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground max-w-3xl"
          >
            Hiring is broken. Not because of a lack of tools — but because of too many of them.
          </TextReveal>
        </MotionWrapper>

        {/* Editorial body with line reveals */}
        <div className="mt-16 md:mt-24 max-w-2xl">
          <LineReveal
            delay={300}
            className="space-y-8"
            lineClassName="text-lg text-foreground-muted leading-relaxed"
            lines={[
              "Job boards are cluttered. Applicant tracking systems are bloated. Candidates apply to hundreds of roles and hear nothing back. Companies drown in resumes they never read.",
              "New Canadian Careers is different. We strip away the noise to surface what matters: the right connection between talent and opportunity. No gamification. No dark patterns. No wasted time."
            ]}
          />
          
          {/* Emphasis line */}
          <MotionWrapper delay={600}>
            <p className="mt-8 text-xl text-foreground leading-relaxed font-medium">
              Just clarity.
            </p>
          </MotionWrapper>
        </div>

      </div>
    </section>
  )
}

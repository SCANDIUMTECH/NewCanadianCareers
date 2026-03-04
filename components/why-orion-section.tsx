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
            Because newcomers deserve better than starting over.
          </TextReveal>
        </MotionWrapper>

        {/* Editorial body with line reveals */}
        <div className="mt-16 md:mt-24 max-w-2xl">
          <LineReveal
            delay={300}
            className="space-y-8"
            lineClassName="text-lg text-foreground-muted leading-relaxed"
            lines={[
              "Moving to Canada is bold. But finding your first Canadian job shouldn\u2019t mean starting from scratch. Too many newcomers face invisible barriers \u2014 unrecognized credentials, the \u2018Canadian experience\u2019 catch-22, and job boards that weren\u2019t built with them in mind.",
              "New Canadian Careers changes that. We connect skilled newcomers directly with Canadian employers who understand the value of international experience. No hidden barriers. No wasted applications. No noise."
            ]}
          />
          
          {/* Emphasis line */}
          <MotionWrapper delay={600}>
            <p className="mt-8 text-xl text-foreground leading-relaxed font-medium">
              Just opportunity.
            </p>
          </MotionWrapper>
        </div>

      </div>
    </section>
  )
}

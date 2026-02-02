"use client"

import { MotionWrapper } from "./motion-wrapper"
import { TextReveal, LineReveal } from "./text-reveal"
import { MagneticButton } from "./magnetic-button"
import { UIFrame } from "./ui-frame"

/**
 * Built for Companies & Agencies
 * Reversed layout with premium UI frame
 */

export function CompaniesSection() {
  return (
    <section className="py-32 md:py-48 relative overflow-hidden">
      {/* Ambient accent */}
      <div 
        className="absolute right-0 bottom-0 w-full h-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59, 91, 219, 0.04) 0%, transparent 50%)"
        }}
      />
      
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Premium UI Frame */}
          <MotionWrapper delay={200} className="order-2 lg:order-1">
            <UIFrame label="Employer Dashboard" variant="employer" />
          </MotionWrapper>

          {/* Right: Text content */}
          <div className="space-y-8 order-1 lg:order-2">
            <MotionWrapper delay={0}>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-primary/40" />
                <p className="text-sm font-medium text-foreground-muted tracking-wide uppercase">
                  For Companies & Agencies
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={100}>
              <TextReveal 
                as="h2" 
                className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground"
              >
                Built for Companies & Agencies
              </TextReveal>
            </MotionWrapper>

            <MotionWrapper delay={200}>
              <LineReveal
                className="space-y-6 max-w-lg"
                lineClassName="text-lg text-foreground-muted leading-relaxed"
                lines={[
                  "Post roles in minutes. Review candidates who actually match. Communicate directly — no middlemen, no noise.",
                  "Whether you're hiring for one role or one hundred, Orion scales with you. Built for speed without sacrificing depth."
                ]}
              />
            </MotionWrapper>

            <MotionWrapper delay={400}>
              <MagneticButton variant="ghost">
                Post your first role
              </MagneticButton>
            </MotionWrapper>
          </div>

        </div>
      </div>
    </section>
  )
}

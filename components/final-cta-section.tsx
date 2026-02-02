"use client"

import { MotionWrapper } from "./motion-wrapper"
import { TextReveal } from "./text-reveal"
import { MagneticButton } from "./magnetic-button"

/**
 * Final CTA Section
 * Premium centered CTA with ambient glow
 */

export function FinalCTASection() {
  return (
    <section className="py-32 md:py-48 relative overflow-hidden">
      {/* Dramatic ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59, 91, 219, 0.08) 0%, transparent 60%)"
        }}
      />
      
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        
        <div className="max-w-2xl mx-auto text-center">
          
          <MotionWrapper delay={0}>
            <TextReveal 
              as="h2" 
              className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Ready to see clearly?
            </TextReveal>
          </MotionWrapper>

          <MotionWrapper delay={150}>
            <p className="mt-6 text-lg md:text-xl text-foreground-muted leading-relaxed">
              Join the platform built for how hiring should work.
            </p>
          </MotionWrapper>

          <MotionWrapper delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton variant="primary" className="px-10 py-5">
                Get Started
              </MagneticButton>
              
              <MagneticButton variant="ghost">
                Contact Sales
              </MagneticButton>
            </div>
          </MotionWrapper>

        </div>

      </div>
    </section>
  )
}

"use client"

import { MotionWrapper } from "./motion-wrapper"
import { TextReveal, LineReveal } from "./text-reveal"
import { MagneticButton } from "./magnetic-button"
import { UIFrame } from "./ui-frame"

/**
 * Designed for Candidates
 * Editorial text with premium UI frame
 */

export function CandidatesSection() {
  return (
    <section className="py-32 md:py-48 bg-background-secondary relative overflow-hidden">
      {/* Ambient accent */}
      <div 
        className="absolute left-0 top-0 w-full h-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 0% 50%, rgba(59, 91, 219, 0.04) 0%, transparent 50%)"
        }}
      />
      
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Text content */}
          <div className="space-y-8">
            <MotionWrapper delay={0}>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-primary/40" />
                <p className="text-sm font-medium text-foreground-muted tracking-wide uppercase">
                  For Candidates
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={100}>
              <TextReveal 
                as="h2" 
                className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground"
              >
                Designed for Candidates
              </TextReveal>
            </MotionWrapper>

            <MotionWrapper delay={200}>
              <LineReveal
                className="space-y-6 max-w-lg"
                lineClassName="text-lg text-foreground-muted leading-relaxed"
                lines={[
                  "Your profile is your resume. Build it once, and let opportunities find you. No more reformatting for every application.",
                  "Track every application in one place. Know where you stand. Get real responses — or know when to move on."
                ]}
              />
            </MotionWrapper>

            <MotionWrapper delay={400}>
              <MagneticButton variant="ghost">
                Create your profile
              </MagneticButton>
            </MotionWrapper>
          </div>

          {/* Right: Premium UI Frame */}
          <MotionWrapper delay={200}>
            <UIFrame label="Candidate Interface" variant="candidate" />
          </MotionWrapper>

        </div>
      </div>
    </section>
  )
}

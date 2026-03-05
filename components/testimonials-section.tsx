"use client"

import { Star } from "lucide-react"
import { MotionWrapper } from "./motion-wrapper"
import { TextReveal } from "./text-reveal"

const testimonials = [
  {
    name: "Maria Santos",
    role: "Software Developer",
    origin: "Brazil",
    quote:
      "Within two weeks of signing up, I had three interviews lined up. NCC connected me with employers who truly valued my international experience.",
    rating: 5,
  },
  {
    name: "Ahmed Hassan",
    role: "Project Manager",
    origin: "Egypt",
    quote:
      "As a newcomer, I was struggling to get noticed on generic job boards. NCC made all the difference — my skills were finally seen by the right employers.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Registered Nurse",
    origin: "India",
    quote:
      "The platform understood my needs as an immigrant. I found a healthcare position that recognized my credentials and helped me build my Canadian career.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <MotionWrapper delay={0}>
          <div className="text-center mb-12">
            <TextReveal
              as="h2"
              className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Success Stories
            </TextReveal>
            <p className="font-secondary mt-4 text-foreground-muted text-lg max-w-2xl mx-auto">
              Hear from newcomers who found their Canadian career through our
              platform
            </p>
          </div>
        </MotionWrapper>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <MotionWrapper key={t.name} delay={100 + index * 100}>
              <div className="relative p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="font-secondary text-foreground/80 text-sm leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-secondary text-sm font-medium text-foreground">
                      {t.name}
                    </p>
                    <p className="font-secondary text-xs text-foreground-muted">
                      {t.role} &middot; From {t.origin}
                    </p>
                  </div>
                </div>
              </div>
            </MotionWrapper>
          ))}
        </div>
      </div>
    </section>
  )
}

"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Compass,
  Building2,
  Handshake,
  DoorOpen,
  Award,
  Heart,
  TrendingUp,
  Sparkles,
  Check,
  ArrowRight,
  Users,
  Briefcase,
} from "lucide-react"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TextReveal } from "@/components/text-reveal"
import { MagneticButton } from "@/components/magnetic-button"
import { FloatingMapleLeaves } from "@/components/floating-maple-leaves"

/* ───────────────────────────── Section 1: Hero ───────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(var(--primary-rgb), 0.08) 0%, transparent 50%)",
        }}
      />
      <FloatingMapleLeaves />

      <div className="relative w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <MotionWrapper delay={0}>
            <TextReveal
              as="h1"
              className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Building Career Pathways for Newcomers in Canada
            </TextReveal>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <p className="font-secondary text-lg md:text-xl text-foreground-muted leading-relaxed max-w-2xl mx-auto">
              NewCanadian.Careers is a purpose-built hiring platform designed to
              help newcomers access meaningful employment opportunities in
              Canada — and to help employers connect with skilled, motivated
              talent ready to contribute from day one.
            </p>
          </MotionWrapper>

          <MotionWrapper delay={400}>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/jobs">
                <MagneticButton variant="primary">
                  Explore Opportunities
                </MagneticButton>
              </Link>
              <Link href="/signup">
                <MagneticButton variant="ghost">Post a Job</MagneticButton>
              </Link>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────── Section 2: Trust Band ──────────────────────── */

function TrustBand() {
  return (
    <section className="bg-card border-y border-border/50">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-16 md:py-20">
        <MotionWrapper className="max-w-3xl mx-auto text-center space-y-6">
          {/* Accent line */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            <div className="h-px w-8 bg-primary/40" />
          </div>
          <p className="font-secondary text-xl md:text-2xl font-semibold text-foreground leading-snug tracking-tight">
            A focused hiring destination for newcomers, employers, and long-term
            workforce growth.
          </p>
          <p className="text-base text-foreground-muted leading-relaxed">
            NewCanadian.Careers is built on a simple belief: talent should be
            recognized for its capability, not overlooked because someone is new
            to Canada. We are creating a credible, professional space where
            ambition meets access, and where employers can hire with both
            confidence and purpose.
          </p>
        </MotionWrapper>
      </div>
    </section>
  )
}

/* ──────────────────────────── Section 3: Our Mission ─────────────────────── */

function MissionSection() {
  return (
    <section className="bg-background">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <MotionWrapper>
            <div className="space-y-6">
              <TextReveal
                as="h2"
                className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
              >
                Our Mission
              </TextReveal>
              <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                Our mission is to help newcomers establish themselves in Canada
                through real employment opportunities, while helping employers
                discover a highly valuable talent pool that is often
                under-reached by traditional hiring channels.
              </p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <div className="space-y-6">
              <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                We believe employment is more than a transaction. For newcomers,
                it can be the foundation of stability, dignity, confidence, and
                long-term belonging. For employers, it is an opportunity to
                strengthen teams with people who bring resilience, diverse
                experience, adaptability, and a strong commitment to growth.
              </p>
              <p className="font-secondary text-base md:text-lg font-semibold text-foreground tracking-tight">
                NewCanadian.Careers was built to support both outcomes.
              </p>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────── Section 4: Why We Exist ────────────────────── */

const whyCards = [
  {
    icon: Compass,
    title: "For Newcomers",
    description: "Easier to find relevant opportunities",
  },
  {
    icon: Building2,
    title: "For Employers",
    description: "Easier to reach qualified candidates",
  },
  {
    icon: Handshake,
    title: "For Everyone",
    description: "Hiring built on potential and momentum",
  },
]

function WhyWeExistSection() {
  return (
    <section className="bg-card/50">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
        <MotionWrapper className="max-w-3xl mx-auto text-center space-y-6 mb-16">
          <TextReveal
            as="h2"
            className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
          >
            Why NewCanadian.Careers Exists
          </TextReveal>
          <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
            Too often, newcomers arrive in Canada with education, experience,
            and determination — but still face friction when trying to enter the
            workforce. The challenge is not a lack of talent. The challenge is
            visibility, access, and the absence of hiring spaces designed around
            their reality.
          </p>
          <p className="font-secondary text-base md:text-lg text-foreground font-semibold tracking-tight">
            That is where we come in.
          </p>
        </MotionWrapper>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 mb-12 max-w-4xl mx-auto">
          {whyCards.map((card, i) => (
            <MotionWrapper key={card.title} delay={i * 100}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {card.title}
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </MotionWrapper>
          ))}
        </div>

        <MotionWrapper delay={400} className="text-center">
          <p className="font-secondary text-base md:text-lg text-foreground leading-relaxed max-w-2xl mx-auto font-semibold tracking-tight">
            We are not simply listing jobs. We are building a more intentional
            pathway into the Canadian workforce.
          </p>
        </MotionWrapper>
      </div>
    </section>
  )
}

/* ────────────────── Section 5: For Candidates + For Employers ────────────── */

const candidateBullets = [
  "That the opportunities are relevant",
  "That the experience is accessible",
  "And that their career potential is real",
]

const employerBullets = [
  "Expand access to opportunity",
  "Reach a focused and valuable candidate audience",
  "Strengthen their teams with fresh talent",
  "Participate in building a more inclusive Canadian economy",
]

function AudienceSection() {
  return (
    <>
      {/* For Candidates */}
      <section className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <MotionWrapper>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" />
                  <span className="font-secondary text-sm font-semibold uppercase tracking-widest">
                    For Candidates
                  </span>
                </div>
                <TextReveal
                  as="h2"
                  className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
                >
                  Your journey starts here
                </TextReveal>
                <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                  If you are new to Canada, this platform is built with your
                  journey in mind. Whether you are searching for your first
                  role, re-entering your profession, exploring a new industry,
                  or looking for a better opportunity to grow,
                  NewCanadian.Careers is here to help you move forward with
                  confidence.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={150}>
              <div className="space-y-6">
                <p className="text-base text-foreground-muted leading-relaxed">
                  We want every candidate who visits our platform to feel three
                  things immediately:
                </p>
                <ul className="space-y-3">
                  {candidateBullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-foreground-muted"
                    >
                      <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </span>
                      <span className="text-base leading-relaxed">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-secondary text-base text-foreground leading-relaxed font-semibold tracking-tight">
                  Your background, effort, and future matter. This is a place
                  where your next chapter can begin.
                </p>
                <div className="pt-2">
                  <Link href="/jobs">
                    <MagneticButton variant="primary">
                      Browse Jobs
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* For Employers */}
      <section className="bg-card/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <MotionWrapper>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-secondary text-sm font-semibold uppercase tracking-widest">
                    For Employers
                  </span>
                </div>
                <TextReveal
                  as="h2"
                  className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
                >
                  Hire with intention
                </TextReveal>
                <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                  Hiring newcomer talent is not only inclusive — it is smart
                  workforce strategy. Newcomers bring energy, adaptability,
                  global perspective, and a strong desire to build long-term
                  success in Canada.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={150}>
              <div className="space-y-6">
                <p className="text-base text-foreground-muted leading-relaxed">
                  By posting on NewCanadian.Careers, companies do more than
                  advertise open roles. They choose to:
                </p>
                <ul className="space-y-3">
                  {employerBullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-foreground-muted"
                    >
                      <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </span>
                      <span className="text-base leading-relaxed">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-secondary text-base text-foreground leading-relaxed font-semibold tracking-tight">
                  We encourage employers to hire for capability, commitment, and
                  growth potential.
                </p>
                <div className="pt-2">
                  <Link href="/pricing">
                    <MagneticButton variant="primary">
                      Post a Job
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>
    </>
  )
}

/* ──────────────────── Section 6: What We Stand For (Values) ──────────────── */

const values = [
  {
    icon: DoorOpen,
    title: "Access",
    description: "Opportunity should be easier to find and easier to pursue.",
  },
  {
    icon: Award,
    title: "Credibility",
    description:
      "Employers and job seekers deserve a professional platform built with seriousness and trust.",
  },
  {
    icon: Heart,
    title: "Inclusion",
    description:
      "Talent should not be excluded because someone is early in their Canadian journey.",
  },
  {
    icon: TrendingUp,
    title: "Progress",
    description:
      "A first opportunity can open the door to a long and successful career.",
  },
  {
    icon: Sparkles,
    title: "Impact",
    description:
      "Better hiring creates stronger businesses, stronger communities, and stronger futures.",
  },
]

/* Marquee track — CSS keyframes for buttery-smooth infinite scroll */
const marqueeStyles = `
@keyframes marquee-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes marquee-right {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}
`

function ValuePill({
  icon: Icon,
  title,
  description,
}: (typeof values)[number]) {
  return (
    <div className="flex-shrink-0 flex items-center gap-4 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm pl-2 pr-6 py-2 select-none">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <span className="font-secondary text-sm font-semibold text-foreground">{title}</span>
        <span className="text-foreground-muted/40 mx-2">—</span>
        <span className="text-sm text-foreground-muted">{description}</span>
      </div>
    </div>
  )
}

// 4x duplication ensures seamless loop on ultra-wide screens
const marqueeValues = [...values, ...values, ...values, ...values]

function ValuesSection() {
  return (
    <section className="bg-background overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: marqueeStyles }} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 pt-20 md:pt-28 pb-6">
        <MotionWrapper className="text-center mb-14">
          <TextReveal
            as="h2"
            className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
          >
            What We Stand For
          </TextReveal>
        </MotionWrapper>
      </div>

      {/* Marquee container */}
      <div className="relative group/marquee pb-20 md:pb-28 space-y-4">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

        {/* Row 1 — scrolls left */}
        <div
          className="flex gap-4 w-max group-hover/marquee:[animation-play-state:paused]"
          style={{
            animation: "marquee-left 80s linear infinite",
            willChange: "transform",
          }}
        >
          {marqueeValues.map((value, i) => (
            <ValuePill key={`row1-${value.title}-${i}`} {...value} />
          ))}
        </div>

        {/* Row 2 — scrolls right (offset start for variety) */}
        <div
          className="flex gap-4 w-max group-hover/marquee:[animation-play-state:paused]"
          style={{
            animation: "marquee-right 90s linear infinite",
            willChange: "transform",
          }}
        >
          {[...marqueeValues.slice(2), ...marqueeValues.slice(0, 2)].map(
            (value, i) => (
              <ValuePill key={`row2-${value.title}-${i}`} {...value} />
            )
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Section 7: Our Commitment ───────────────────────── */

const commitmentBullets = [
  "Job seekers can pursue opportunity with confidence",
  "Employers can connect with serious candidates",
  "Hiring can become a bridge to long-term success",
]

function CommitmentSection() {
  return (
    <section
      className="relative"
      style={{
        background:
          "linear-gradient(to bottom, var(--background), rgba(var(--primary-rgb), 0.03))",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <MotionWrapper>
            <TextReveal
              as="h2"
              className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
            >
              Our Commitment
            </TextReveal>
          </MotionWrapper>

          <MotionWrapper delay={100}>
            <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
              At NewCanadian.Careers, we are committed to becoming a trusted
              destination for newcomer employment in Canada. That means
              continuously building a platform that serves both sides of the
              hiring journey with clarity, professionalism, and purpose.
            </p>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <p className="text-base text-foreground-muted leading-relaxed mb-6">
              We are committed to creating an environment where:
            </p>
            <ul className="inline-flex flex-col items-start gap-3 text-left">
              {commitmentBullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-foreground-muted"
                >
                  <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-base leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          </MotionWrapper>

          <MotionWrapper delay={300}>
            <p className="font-secondary text-base md:text-lg text-foreground font-semibold italic leading-relaxed pt-4 tracking-tight">
              Our work is grounded in one core idea: when talented people are
              given a fair chance, everyone benefits.
            </p>
          </MotionWrapper>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── Section 8: Closing Executive Statement ────────────────── */

function ClosingStatement() {
  return (
    <section className="bg-background border-t border-border/30">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-20 md:py-28">
        <div className="max-w-3xl mx-auto space-y-10">
          <MotionWrapper>
            <TextReveal
              as="h2"
              className="text-3xl md:text-4xl font-medium tracking-tight text-foreground text-center"
            >
              Opportunity Deserves a Better Starting Point
            </TextReveal>
          </MotionWrapper>

          <MotionWrapper delay={100}>
            <div className="space-y-6 text-center">
              <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                For newcomers, NewCanadian.Careers is a place to move forward.
              </p>
              <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                For employers, it is a place to hire with intention.
              </p>
              <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
                For Canada, it is one small but meaningful way to help ensure
                that talent, ambition, and hard work are met with real
                opportunity.
              </p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="h-px w-8 bg-primary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <div className="h-px w-8 bg-primary/40" />
            </div>
          </MotionWrapper>

          <MotionWrapper delay={250}>
            <p className="font-secondary text-lg md:text-xl font-semibold text-foreground text-center leading-snug tracking-tight">
              NewCanadian.Careers is where new beginnings meet real career
              potential.
            </p>
          </MotionWrapper>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────── Section 9: Final CTA Banner ────────────────────── */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(var(--primary-rgb), 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-24 md:py-32">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <MotionWrapper>
            <TextReveal
              as="h2"
              className="text-3xl md:text-4xl font-medium tracking-tight text-foreground"
            >
              Ready to take the next step?
            </TextReveal>
          </MotionWrapper>

          <MotionWrapper delay={100}>
            <p className="text-base md:text-lg text-foreground-muted leading-relaxed">
              Whether you are building your career in Canada or building a
              stronger team, NewCanadian.Careers is here to help make the right
              connection.
            </p>
          </MotionWrapper>

          <MotionWrapper delay={200}>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/jobs">
                <MagneticButton variant="primary">
                  Explore Jobs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </MagneticButton>
              </Link>
              <Link href="/pricing">
                <MagneticButton variant="ghost">Post a Job</MagneticButton>
              </Link>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────── Main Export ─────────────────────────────────── */

export function AboutClient() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <TrustBand />
      <MissionSection />
      <WhyWeExistSection />
      <AudienceSection />
      <ValuesSection />
      <CommitmentSection />
      <ClosingStatement />
      <FinalCTA />
    </div>
  )
}

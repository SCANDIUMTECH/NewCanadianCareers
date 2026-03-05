"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MotionWrapper } from "./motion-wrapper"
import { TextReveal } from "./text-reveal"
import { JobCard } from "./jobs/job-card"
import { getFeaturedJobs, type PublicJobListItem } from "@/lib/api/public"

function transformJob(job: PublicJobListItem) {
  const hasSalary = job.show_salary && job.salary_min && job.salary_max

  return {
    id: job.job_id,
    title: job.title,
    company: {
      name: job.company_name,
      logo: job.company_logo || undefined,
    },
    location: {
      city: job.city,
      state: job.state || undefined,
      country: job.country,
      remote: job.location_type,
    },
    type: job.employment_type,
    salary: hasSalary
      ? {
          min: Number(job.salary_min),
          max: Number(job.salary_max),
          currency: job.salary_currency,
          period: job.salary_period || undefined,
        }
      : undefined,
    skills: job.skills || [],
    postedDate: job.posted_at,
    featured: job.featured,
  }
}

export function FeaturedJobsSection() {
  const [jobs, setJobs] = useState<PublicJobListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeaturedJobs(6)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && jobs.length === 0) {
    return (
      <section className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
          <MotionWrapper delay={0}>
            <div className="text-center">
              <TextReveal
                as="h2"
                className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
              >
                Latest Opportunities
              </TextReveal>
              <p className="font-secondary mt-4 text-foreground-muted text-lg">
                New jobs added daily.{" "}
                <Link
                  href="/jobs"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Browse all jobs &rarr;
                </Link>
              </p>
            </div>
          </MotionWrapper>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <MotionWrapper delay={0}>
          <div className="flex items-end justify-between mb-12">
            <div>
              <TextReveal
                as="h2"
                className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
              >
                Latest Opportunities
              </TextReveal>
              <p className="font-secondary mt-4 text-foreground-muted text-lg">
                Featured roles from top Canadian employers
              </p>
            </div>
            <Link
              href="/jobs"
              className="hidden md:inline-flex font-secondary text-sm text-primary hover:text-primary/80 font-medium transition-colors whitespace-nowrap"
            >
              View all jobs &rarr;
            </Link>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-foreground/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job, index) => (
              <MotionWrapper key={job.job_id} delay={50 + index * 50}>
                <JobCard {...transformJob(job)} />
              </MotionWrapper>
            ))}
          </div>
        )}

        <MotionWrapper delay={400}>
          <div className="text-center mt-8 md:hidden">
            <Link
              href="/jobs"
              className="font-secondary text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View all jobs &rarr;
            </Link>
          </div>
        </MotionWrapper>
      </div>
    </section>
  )
}

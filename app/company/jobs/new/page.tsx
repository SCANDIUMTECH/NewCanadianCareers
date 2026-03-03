"use client"

import React from "react"
import Link from "next/link"
import { MotionWrapper } from "@/components/motion-wrapper"
import { JobWizard } from "@/components/job-wizard/job-wizard"

/**
 * Create New Job Page
 * 8-step wizard with localStorage draft persistence
 */
export default function CreateJobPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/company/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-foreground">Create New Job</span>
        </nav>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a Job Posting</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Fill out the details below to post your job to thousands of candidates
          </p>
        </div>
      </MotionWrapper>

      {/* Wizard */}
      <MotionWrapper delay={100}>
        <JobWizard />
      </MotionWrapper>
    </div>
  )
}

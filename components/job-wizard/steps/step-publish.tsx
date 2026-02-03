"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { type JobWizardData } from "@/lib/job-wizard-schema"

interface StepPublishProps {
  data: JobWizardData
}

export function StepPublish({ data }: StepPublishProps) {
  const formatSalary = () => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(data.salaryMin)} - ${formatter.format(data.salaryMax)}`
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ready to Publish</h2>
        <p className="text-foreground-muted">
          Review the summary below and click Publish to make your job live
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: data.company?.color ? `${data.company.color}15` : undefined }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: data.company?.color || "var(--primary)" }}
              >
                {data.company?.initials || "A"}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{data.title}</h3>
              <p className="text-foreground-muted">{data.company?.name || "Your Company"}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm font-medium text-foreground">
                {data.remote === "remote"
                  ? "Remote"
                  : `${data.city}, ${data.state}`}
                {data.remote !== "onsite" && data.remote !== "remote" && " · Hybrid"}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Type</p>
              <p className="text-sm font-medium text-foreground capitalize">{data.type.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Experience</p>
              <p className="text-sm font-medium text-foreground capitalize">{data.experience.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Department</p>
              <p className="text-sm font-medium text-foreground">{data.department}</p>
            </div>
          </div>

          {data.showSalary && data.salaryMin > 0 && (
            <div className="pt-2">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Compensation</p>
              <p className="text-lg font-semibold text-foreground">
                {formatSalary()}
                <span className="text-sm font-normal text-foreground-muted ml-1">/ {data.period}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* What happens next */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
        <h4 className="font-medium text-foreground mb-3">What happens next</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Job goes live immediately</p>
              <p className="text-xs text-foreground-muted">Your job will be visible to candidates right away</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Social posts scheduled</p>
              <p className="text-xs text-foreground-muted">
                {[
                  data.linkedin && "LinkedIn",
                  data.twitter && "X",
                  data.facebook && "Facebook",
                  data.instagram && "Instagram",
                ]
                  .filter(Boolean)
                  .join(", ") || "No social channels selected"}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Start receiving applications</p>
              <p className="text-xs text-foreground-muted">
                {data.applyMethod === "internal"
                  ? "Manage applications directly in Orion"
                  : data.applyMethod === "email"
                  ? `Applications sent to ${data.applyEmail}`
                  : "Candidates redirected to your external URL"}
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Credit usage */}
      <div className="rounded-xl bg-foreground/[0.02] border border-border/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Job Post Credit</p>
              <p className="text-xs text-foreground-muted">1 credit will be used • 11 remaining</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            30-day listing
          </Badge>
        </div>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-foreground-muted">
        By publishing, you agree to our{" "}
        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
        {" "}and{" "}
        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        Job postings must comply with all applicable laws and regulations.
      </p>
    </div>
  )
}

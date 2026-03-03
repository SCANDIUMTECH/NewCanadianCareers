"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type JobWizardData } from "@/lib/job-wizard-schema"

interface StepPreviewProps {
  data: JobWizardData
  onEdit: (step: number) => void
}

export function StepPreview({ data, onEdit }: StepPreviewProps) {
  const formatSalary = () => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 0,
    })
    if (data.salaryMax > 0 && data.salaryMax > data.salaryMin) {
      return `${formatter.format(data.salaryMin)} - ${formatter.format(data.salaryMax)}`
    }
    return formatter.format(data.salaryMin)
  }

  const getRemoteLabel = () => {
    switch (data.remote) {
      case "onsite":
        return "On-site"
      case "hybrid":
        return "Hybrid"
      case "remote":
        return "Remote"
    }
  }

  const getTypeLabel = () => {
    switch (data.type) {
      case "full-time":
        return "Full-time"
      case "part-time":
        return "Part-time"
      case "contract":
        return "Contract"
      case "internship":
        return "Internship"
      default:
        return data.type
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Preview</h2>
        <p className="text-sm text-foreground-muted">
          Review how your job will appear to candidates
        </p>
      </div>

      {/* Job Card Preview */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: data.company?.color ? `${data.company.color}15` : undefined }}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: data.company?.color || "var(--primary)" }}
                  >
                    {data.company?.initials || "A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">{data.company?.name || "Your Company"}</p>
                  {data.company?.verified === true && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Verified
                    </Badge>
                  )}
                  {data.company?.verified === false && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold text-foreground mt-4">
                {data.title || "Job Title"}
              </h1>

              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="bg-foreground/5">
                  {data.city
                    ? [data.city, data.state].filter(Boolean).join(", ")
                    : data.remote === "remote"
                    ? "Remote"
                    : "Location not set"}
                  {data.remote !== "onsite" && ` · ${getRemoteLabel()}`}
                </Badge>
                <Badge variant="secondary" className="bg-foreground/5">
                  {getTypeLabel() || "Employment Type"}
                </Badge>
                <Badge variant="secondary" className="bg-foreground/5">
                  {data.experience || "Experience Level"}
                </Badge>
              </div>

              {data.showSalary && data.salaryMin > 0 && (
                <p className="text-xl font-semibold text-foreground mt-4">
                  {formatSalary()}
                  <span className="text-sm font-normal text-foreground-muted ml-1">/ {data.period}</span>
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(1)}
              className="bg-transparent shrink-0"
            >
              Edit
            </Button>
          </div>

          {/* Skills */}
          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="p-6 md:p-8 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
              <span className="w-1 h-5 bg-primary rounded-full" />
              About this role
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
              className="text-foreground-muted hover:text-foreground"
            >
              Edit
            </Button>
          </div>
          {data.description ? (
            <p className="text-foreground-muted leading-relaxed whitespace-pre-line">
              {data.description}
            </p>
          ) : (
            <p className="text-foreground-muted/50 italic">No description added</p>
          )}
        </div>

        {/* Responsibilities */}
        {data.responsibilities.length > 0 && (
          <div className="p-6 md:p-8 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="w-1 h-5 bg-primary rounded-full" />
                Responsibilities
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(2)}
                className="text-foreground-muted hover:text-foreground"
              >
                Edit
              </Button>
            </div>
            <ul className="space-y-2">
              {data.responsibilities.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span className="text-foreground-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {data.requirements.length > 0 && (
          <div className="p-6 md:p-8 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="w-1 h-5 bg-primary rounded-full" />
                Requirements
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(2)}
                className="text-foreground-muted hover:text-foreground"
              >
                Edit
              </Button>
            </div>
            <ul className="space-y-2">
              {data.requirements.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-primary shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-foreground-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {data.benefits.length > 0 && (
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="w-1 h-5 bg-primary rounded-full" />
                Benefits & Perks
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(4)}
                className="text-foreground-muted hover:text-foreground"
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.02]">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Distribution Summary */}
      <div className="rounded-xl bg-foreground/[0.02] border border-border/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">Distribution</p>
              <p className="text-xs text-foreground-muted">
                {[
                  data.linkedin && "LinkedIn",
                  data.twitter && "X",
                  data.facebook && "Facebook",
                  data.instagram && "Instagram",
                ]
                  .filter(Boolean)
                  .join(", ") || "No channels selected"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(6)}
            className="text-foreground-muted hover:text-foreground"
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

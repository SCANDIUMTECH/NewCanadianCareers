"use client"

import { useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { type JobWizardData } from "@/lib/job-wizard-schema"
import { useAuth } from "@/hooks/use-auth"
import { useCompanyContext } from "@/hooks/use-company"

interface StepApplyMethodProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
  errors?: Record<string, string>
  onBlur?: (field: keyof JobWizardData) => void
}

const applyMethods = [
  {
    value: "internal",
    label: "Through Orion",
    description: "Candidates apply directly through our platform (Recommended)",
    recommended: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    value: "email",
    label: "Via Email",
    description: "Candidates send applications to your email address",
    recommended: false,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: "external",
    label: "External URL",
    description: "Redirect candidates to your ATS or careers page",
    recommended: false,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    ),
  },
]

export function StepApplyMethod({ data, updateData }: StepApplyMethodProps) {
  const { user } = useAuth()
  const { company } = useCompanyContext()
  const prefilled = useRef(false)

  // Prefill application email from user email if empty
  useEffect(() => {
    if (prefilled.current) return
    if (!user?.email && !company?.website) return // wait for context data

    prefilled.current = true

    if (!data.applyEmail && user?.email) {
      updateData({ applyEmail: user.email })
    }
    if (!data.applyUrl && company?.website) {
      updateData({ applyUrl: company.website })
    }
  }, [user, company, data.applyEmail, data.applyUrl, updateData])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Application Method</h2>
        <p className="text-sm text-foreground-muted">
          How should candidates apply for this position?
        </p>
      </div>

      {/* Method Selection */}
      <div className="space-y-3">
        {applyMethods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => updateData({ applyMethod: method.value as "internal" | "email" | "external" })}
            className={cn(
              "w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200",
              data.applyMethod === method.value
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-foreground/20"
            )}
          >
            <div className={cn(
              "shrink-0 transition-colors",
              data.applyMethod === method.value ? "text-primary" : "text-foreground-muted"
            )}>
              {method.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "font-medium",
                  data.applyMethod === method.value ? "text-primary" : "text-foreground"
                )}>
                  {method.label}
                </p>
                {method.recommended && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground-muted mt-1">
                {method.description}
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
              data.applyMethod === method.value
                ? "border-primary bg-primary"
                : "border-foreground/30"
            )}>
              {data.applyMethod === method.value && (
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Conditional Fields */}
      {data.applyMethod === "internal" && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">Benefits of Orion applications:</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Track all applications in one place
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  AI-powered candidate matching
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Built-in communication tools
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {data.applyMethod === "email" && (
        <div className="space-y-4 p-5 rounded-xl bg-foreground/[0.02] border border-border/50">
          <div className="space-y-2">
            <Label htmlFor="applyEmail">Application Email <span className="text-destructive">*</span></Label>
            <Input
              id="applyEmail"
              type="email"
              placeholder="careers@company.com"
              value={data.applyEmail}
              onChange={(e) => updateData({ applyEmail: e.target.value })}
            />
            <p className="text-xs text-foreground-muted">
              Candidates will be instructed to send their applications to this email
            </p>
          </div>
        </div>
      )}

      {data.applyMethod === "external" && (
        <div className="space-y-4 p-5 rounded-xl bg-foreground/[0.02] border border-border/50">
          <div className="space-y-2">
            <Label htmlFor="applyUrl">Application URL <span className="text-destructive">*</span></Label>
            <Input
              id="applyUrl"
              type="url"
              placeholder="https://company.com/careers/apply/job-123"
              value={data.applyUrl}
              onChange={(e) => updateData({ applyUrl: e.target.value })}
            />
            <p className="text-xs text-foreground-muted">
              Candidates will be redirected to this URL when they click &quot;Apply&quot;
            </p>
          </div>
        </div>
      )}

      {/* Application Instructions */}
      <div className="space-y-2">
        <Label htmlFor="applyInstructions">Application Instructions (Optional)</Label>
        <Textarea
          id="applyInstructions"
          placeholder="e.g., Please include your portfolio link and a brief introduction..."
          value={data.applyInstructions}
          onChange={(e) => updateData({ applyInstructions: e.target.value })}
          rows={3}
        />
        <p className="text-xs text-foreground-muted">
          Add any specific instructions for candidates applying to this role
        </p>
      </div>
    </div>
  )
}

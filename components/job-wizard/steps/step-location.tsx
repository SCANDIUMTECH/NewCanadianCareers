"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type JobWizardData } from "@/lib/job-wizard-schema"

interface StepLocationProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
}

const countries = [
  { code: "USA", name: "United States" },
  { code: "CAN", name: "Canada" },
  { code: "GBR", name: "United Kingdom" },
  { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" },
  { code: "AUS", name: "Australia" },
  { code: "IND", name: "India" },
  { code: "SGP", name: "Singapore" },
  { code: "JPN", name: "Japan" },
  { code: "BRA", name: "Brazil" },
  { code: "NLD", name: "Netherlands" },
  { code: "ESP", name: "Spain" },
  { code: "ITA", name: "Italy" },
  { code: "SWE", name: "Sweden" },
  { code: "CHE", name: "Switzerland" },
]

const remoteOptions = [
  {
    value: "onsite",
    label: "On-site",
    description: "Work from the office full-time",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Mix of remote and office work",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    value: "remote",
    label: "Fully Remote",
    description: "Work from anywhere",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function StepLocation({ data, updateData }: StepLocationProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Location</h2>
        <p className="text-sm text-foreground-muted">
          Where is this job based?
        </p>
      </div>

      {/* Remote Policy */}
      <div className="space-y-3">
        <Label>Work Arrangement <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {remoteOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ remote: option.value as "onsite" | "hybrid" | "remote" })}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200",
                data.remote === option.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 hover:border-foreground/20 text-foreground-muted"
              )}
            >
              <div className={cn(
                "transition-colors",
                data.remote === option.value ? "text-primary" : "text-foreground-muted"
              )}>
                {option.icon}
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-medium",
                  data.remote === option.value ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location Details */}
      {data.remote !== "remote" && (
        <div className="space-y-4 p-5 rounded-xl bg-foreground/[0.02] border border-border/50">
          <p className="text-sm font-medium text-foreground">Office Location</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
              <Input
                id="city"
                placeholder="e.g., San Francisco"
                value={data.city}
                onChange={(e) => updateData({ city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                placeholder="e.g., CA"
                value={data.state}
                onChange={(e) => updateData({ state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
              <Select
                value={data.country}
                onValueChange={(value) => updateData({ country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Remote location info */}
      {data.remote === "remote" && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">Fully remote position</p>
              <p className="text-sm text-foreground-muted mt-1">
                This job will be listed as remote. You can optionally specify a preferred timezone or region below.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Primary Region (Optional)</Label>
              <Select
                value={data.country}
                onValueChange={(value) => updateData({ country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any region</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

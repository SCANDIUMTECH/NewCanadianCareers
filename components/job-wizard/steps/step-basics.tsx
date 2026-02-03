"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type JobWizardData } from "@/lib/job-wizard-schema"
import { type ValidationErrors } from "@/hooks/use-job-wizard"

interface StepBasicsProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
  errors?: ValidationErrors
  onBlur?: (field: keyof JobWizardData) => void
}

const departments = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Customer Success",
  "Operations",
  "Finance",
  "HR",
  "Legal",
  "Other",
]

const employmentTypes = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
]

const experienceLevels = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level (2-4 years)" },
  { value: "senior", label: "Senior (5+ years)" },
  { value: "lead", label: "Lead / Manager" },
  { value: "director", label: "Director / Executive" },
]

export function StepBasics({ data, updateData, errors = {}, onBlur }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Job Basics</h2>
        <p className="text-sm text-foreground-muted">
          Start with the fundamental details about this position
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className={cn(errors.title && "text-destructive")}>
            Job Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Senior Product Designer"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            onBlur={() => onBlur?.("title")}
            className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
            aria-invalid={!!errors.title}
          />
          {errors.title ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.title}
            </p>
          ) : (
            <p className="text-xs text-foreground-muted">
              Be specific. &quot;Senior Product Designer&quot; is better than &quot;Designer&quot;
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department" className={cn(errors.department && "text-destructive")}>
            Department <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.department}
            onValueChange={(value) => updateData({ department: value })}
          >
            <SelectTrigger className={cn(errors.department && "border-destructive focus:ring-destructive")}>
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.department}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type" className={cn(errors.type && "text-destructive")}>
              Employment Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.type}
              onValueChange={(value) => updateData({ type: value })}
            >
              <SelectTrigger className={cn(errors.type && "border-destructive focus:ring-destructive")}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {employmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.type}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience" className={cn(errors.experience && "text-destructive")}>
              Experience Level <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.experience}
              onValueChange={(value) => updateData({ experience: value })}
            >
              <SelectTrigger className={cn(errors.experience && "border-destructive focus:ring-destructive")}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.experience && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.experience}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

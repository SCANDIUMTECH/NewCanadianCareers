"use client"

import React, { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type JobWizardData } from "@/lib/job-wizard-schema"

interface StepRoleDetailsProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
}

const suggestedSkills = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "AWS", "Docker", "Kubernetes", "Git", "Agile",
  "Product Design", "Figma", "User Research", "Data Analysis",
  "Project Management", "Communication", "Leadership", "Problem Solving",
]

export function StepRoleDetails({ data, updateData }: StepRoleDetailsProps) {
  const [newResponsibility, setNewResponsibility] = useState("")
  const [newRequirement, setNewRequirement] = useState("")
  const [skillInput, setSkillInput] = useState("")

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      updateData({ responsibilities: [...data.responsibilities, newResponsibility.trim()] })
      setNewResponsibility("")
    }
  }

  const removeResponsibility = (index: number) => {
    updateData({ responsibilities: data.responsibilities.filter((_, i) => i !== index) })
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      updateData({ requirements: [...data.requirements, newRequirement.trim()] })
      setNewRequirement("")
    }
  }

  const removeRequirement = (index: number) => {
    updateData({ requirements: data.requirements.filter((_, i) => i !== index) })
  }

  const addSkill = (skill: string) => {
    if (skill.trim() && !data.skills.includes(skill.trim())) {
      updateData({ skills: [...data.skills, skill.trim()] })
    }
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    updateData({ skills: data.skills.filter((s) => s !== skill) })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Role Details</h2>
        <p className="text-sm text-foreground-muted">
          Describe what the role involves and what you&apos;re looking for
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Job Description <span className="text-destructive">*</span></Label>
        <Textarea
          id="description"
          placeholder="Describe the role, your team, and what makes this opportunity exciting..."
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          rows={6}
        />
        <p className="text-xs text-foreground-muted">
          {data.description.length} characters (minimum 50 recommended)
        </p>
      </div>

      {/* Responsibilities */}
      <div className="space-y-3">
        <Label>Responsibilities <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a responsibility..."
            value={newResponsibility}
            onChange={(e) => setNewResponsibility(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addResponsibility())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addResponsibility}
            className="bg-transparent shrink-0"
          >
            Add
          </Button>
        </div>
        {data.responsibilities.length > 0 && (
          <ul className="space-y-2">
            {data.responsibilities.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-border/50 group"
              >
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span className="flex-1 text-sm text-foreground">{item}</span>
                <button
                  type="button"
                  onClick={() => removeResponsibility(index)}
                  className="opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-destructive transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Requirements */}
      <div className="space-y-3">
        <Label>Requirements <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a requirement..."
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addRequirement}
            className="bg-transparent shrink-0"
          >
            Add
          </Button>
        </div>
        {data.requirements.length > 0 && (
          <ul className="space-y-2">
            {data.requirements.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-border/50 group"
              >
                <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="flex-1 text-sm text-foreground">{item}</span>
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-destructive transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Skills */}
      <div className="space-y-3">
        <Label>Skills & Technologies <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillInput))}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addSkill(skillInput)}
            className="bg-transparent shrink-0"
          >
            Add
          </Button>
        </div>

        {/* Selected Skills */}
        {data.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="px-3 py-1.5 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <svg className="w-3 h-3 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Badge>
            ))}
          </div>
        )}

        {/* Suggested Skills */}
        <div className="pt-2">
          <p className="text-xs text-foreground-muted mb-2">Suggested skills:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills
              .filter((skill) => !data.skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={cn(
                    "px-2 py-1 text-xs cursor-pointer transition-colors bg-transparent",
                    "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  )}
                  onClick={() => addSkill(skill)}
                >
                  + {skill}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

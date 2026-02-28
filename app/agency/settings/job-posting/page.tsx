"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Zap,
  Layers,
  ExternalLink,
  Check,
  Info,
  Save,
} from "lucide-react"
import { useAgencySettings } from "@/hooks/use-quick-job-post"
import { type AgencySettings } from "@/lib/quick-job-schema"
import { CHART } from "@/lib/constants/colors"

/**
 * Job Posting Settings Page
 * Configure workflow preferences between Quick and Standard modes
 */

const workflowOptions = [
  {
    id: "quick" as const,
    title: "Quick Post",
    description: "Single-page composer with company selection, core fields, and instant publishing. Perfect for high-volume posting.",
    icon: Zap,
    color: CHART.primary,
    features: [
      "All fields on one page",
      "Inline company selector",
      "Draft auto-save",
      "Keyboard shortcuts",
    ],
    previewHref: "/agency/jobs/new/quick",
  },
  {
    id: "standard" as const,
    title: "Standard Wizard",
    description: "Multi-step guided flow with company pre-selection. Ideal for detailed job postings with rich descriptions.",
    icon: Layers,
    color: CHART.purple,
    features: [
      "Step-by-step guidance",
      "Rich text editor",
      "Preview before publish",
      "Detailed validation",
    ],
    previewHref: "/agency/jobs/new",
  },
]

export default function JobPostingSettingsPage() {
  const { settings, saveSettings, isLoaded } = useAgencySettings()
  const [localSettings, setLocalSettings] = useState<AgencySettings>(settings)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Sync local state with loaded settings
  useEffect(() => {
    if (isLoaded) {
      setLocalSettings(settings)
    }
  }, [isLoaded, settings])

  // Track changes
  useEffect(() => {
    if (!isLoaded) return
    setHasChanges(
      localSettings.job_post_workflow !== settings.job_post_workflow ||
      localSettings.default_apply_email !== settings.default_apply_email
    )
  }, [localSettings, settings, isLoaded])

  const handleWorkflowChange = (workflow: "quick" | "standard") => {
    setLocalSettings((prev) => ({ ...prev, job_post_workflow: workflow }))
    setIsSaved(false)
  }

  const handleEmailChange = (email: string) => {
    setLocalSettings((prev) => ({ ...prev, default_apply_email: email }))
    setIsSaved(false)
  }

  const handleSave = () => {
    saveSettings(localSettings)
    setHasChanges(false)
    setIsSaved(true)

    // Reset saved indicator after 3 seconds
    setTimeout(() => setIsSaved(false), 3000)
  }

  if (!isLoaded) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <Link
          href="/agency/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Job Posting
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Choose your preferred workflow for posting jobs
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              "gap-2 transition-all duration-200",
              isSaved && "bg-emerald-600 hover:bg-emerald-600"
            )}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Workflow Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-8"
      >
        <Label className="text-sm font-medium text-foreground mb-4 block">
          Default Workflow
        </Label>

        <div className="grid gap-4">
          {workflowOptions.map((option) => {
            const isSelected = localSettings.job_post_workflow === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleWorkflowChange(option.id)}
                className={cn(
                  "w-full p-5 rounded-xl border text-left transition-all duration-200",
                  "hover:border-primary/40 hover:shadow-sm",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 bg-card"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${option.color}10` }}
                  >
                    <option.icon
                      className="w-6 h-6"
                      style={{ color: option.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">
                        {option.title}
                      </h3>
                      {isSelected && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-[10px]"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {option.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {option.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground"
                        >
                          <Check className="w-3 h-3 text-emerald-500" />
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Preview Link */}
                    <Link
                      href={option.previewHref}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Preview workflow
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Default Apply Email */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="p-5 rounded-xl border border-border/60 bg-card mb-8"
      >
        <Label htmlFor="apply-email" className="text-sm font-medium text-foreground">
          Default Apply Email
        </Label>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Pre-fill the apply email field when creating new jobs. You can override this per company.
        </p>

        <Input
          id="apply-email"
          type="email"
          placeholder="hr@agency.com"
          value={localSettings.default_apply_email || ""}
          onChange={(e) => handleEmailChange(e.target.value)}
          className="max-w-md"
        />
      </motion.div>

      {/* Backdating Info (Admin Feature) */}
      {settings.allow_backdated_post_date && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Backdating Enabled
              </p>
              <p className="text-sm text-amber-700/80 mt-0.5">
                Your agency can post jobs with dates up to {settings.max_backdate_days} days in the past.
                This feature was enabled by a platform administrator.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Keyboard Shortcuts Help */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-8 p-5 rounded-xl bg-muted/30 border border-border/40"
      >
        <h3 className="text-sm font-medium text-foreground mb-3">
          Quick Post Keyboard Shortcuts
        </h3>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Save draft</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                ⌘
              </kbd>
              <span className="text-muted-foreground">+</span>
              <kbd className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                S
              </kbd>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Publish job</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                ⌘
              </kbd>
              <span className="text-muted-foreground">+</span>
              <kbd className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                Enter
              </kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar,
  Shield,
  ShieldCheck,
  RefreshCw,
  Tag,
  Loader2,
  Settings,
  Clock,
  Zap,
  MousePointerClick,
  ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { getJobPolicySettings, updateJobPolicySettings } from "@/lib/api/admin-jobs"
import type { AdminJobPolicySettings } from "@/lib/admin/types"

interface JobPolicySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// --- Section wrapper with icon + title + optional badge ---
function PolicySection({
  icon: Icon,
  title,
  description,
  badge,
  badgeVariant = "secondary",
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  badge?: string
  badgeVariant?: "secondary" | "destructive" | "outline"
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 text-primary">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            {badge && (
              <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  )
}

// --- Inline switch row ---
function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 group">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0 mt-0.5"
      />
    </div>
  )
}

// --- Compact number field ---
function NumberField({
  label,
  description,
  value,
  onChange,
  min = 0,
  max,
  suffix,
}: {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseInt(e.target.value) || min)}
          className="pr-12"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export function JobPolicySettingsDialog({ open, onOpenChange }: JobPolicySettingsDialogProps) {
  const [settings, setSettings] = useState<AdminJobPolicySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load settings when dialog opens
  useEffect(() => {
    if (open && !settings) {
      setLoading(true)
      getJobPolicySettings()
        .then(data => setSettings(data))
        .catch(() => toast.error("Failed to load policy settings"))
        .finally(() => setLoading(false))
    }
  }, [open, settings])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setSettings(null)
    }
  }, [open])

  const update = <K extends keyof AdminJobPolicySettings>(
    key: K,
    value: AdminJobPolicySettings[K]
  ) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await updateJobPolicySettings(settings)
      toast.success("Job policies updated")
      onOpenChange(false)
    } catch {
      toast.error("Failed to save policy settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Fixed header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Job Policy Settings</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Platform-wide rules and defaults for job postings
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings ? (
            <div className="space-y-4">

              {/* ---- Posting Defaults ---- */}
              <PolicySection
                icon={Calendar}
                title="Posting Defaults"
                description="Duration limits and application method"
              >
                <div className="grid grid-cols-3 gap-4">
                  <NumberField
                    label="Default Duration"
                    description="Fallback when package has no duration"
                    value={settings.default_post_duration}
                    onChange={v => update("default_post_duration", v)}
                    min={1}
                    suffix="days"
                  />
                  <NumberField
                    label="Max Duration"
                    description="Hard cap on post duration. 0 = unlimited"
                    value={settings.max_duration_days ?? 90}
                    onChange={v => update("max_duration_days", v)}
                    min={0}
                    suffix="days"
                  />
                  <NumberField
                    label="Max Active Jobs"
                    description="Per-company concurrent limit"
                    value={settings.max_active_jobs_per_company}
                    onChange={v => update("max_active_jobs_per_company", v)}
                    min={1}
                    suffix="jobs"
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Default Apply Mode</Label>
                    <p className="text-xs text-muted-foreground">How candidates apply by default</p>
                    <Select
                      value={settings.default_apply_mode}
                      onValueChange={(value: "direct" | "external" | "both") =>
                        update("default_apply_mode", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">
                          <span className="flex items-center gap-2">
                            <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                            Direct Apply Only
                          </span>
                        </SelectItem>
                        <SelectItem value="external">
                          <span className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                            External URL Only
                          </span>
                        </SelectItem>
                        <SelectItem value="both">
                          <span className="flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                            Both Allowed
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PolicySection>

              {/* ---- Posting Requirements ---- */}
              <PolicySection
                icon={ShieldCheck}
                title="Posting Requirements"
                description="Mandatory fields and validation rules"
              >
                <div className="space-y-1 divide-y divide-border/30">
                  <SwitchRow
                    label="Salary Required"
                    description="Require salary range on all postings"
                    checked={settings.salary_required}
                    onCheckedChange={v => update("salary_required", v)}
                  />
                  <SwitchRow
                    label="External URL Validation"
                    description="Validate that external apply URLs are reachable"
                    checked={settings.external_url_validation}
                    onCheckedChange={v => update("external_url_validation", v)}
                  />
                  <SwitchRow
                    label="Auto-Expire Jobs"
                    description="Automatically expire jobs after their posting duration ends"
                    checked={settings.auto_expire_enabled}
                    onCheckedChange={v => update("auto_expire_enabled", v)}
                  />
                </div>
              </PolicySection>

              {/* ---- Approval Rules ---- */}
              <PolicySection
                icon={Shield}
                title="Approval Rules"
                description="Control which jobs need manual review before going live"
                badge="Moderation"
              >
                <div className="space-y-1 divide-y divide-border/30">
                  <SwitchRow
                    label="Auto-Approve Verified Companies"
                    description="Verified companies skip the review queue. When off, ALL jobs require approval."
                    checked={settings.auto_approve_verified ?? true}
                    onCheckedChange={v => update("auto_approve_verified", v)}
                  />
                  <SwitchRow
                    label="Require Approval for New Companies"
                    description="First posting from a new company requires manual review"
                    checked={settings.require_approval_for_new_companies}
                    onCheckedChange={v => update("require_approval_for_new_companies", v)}
                  />
                  <SwitchRow
                    label="Require Approval for Unverified"
                    description="All postings from unverified companies need approval"
                    checked={settings.require_approval_for_unverified}
                    onCheckedChange={v => update("require_approval_for_unverified", v)}
                  />
                  <SwitchRow
                    label="Re-Approval After Editing"
                    description="Published jobs revert to pending when critical fields are edited"
                    checked={settings.require_reapproval_on_edit ?? false}
                    onCheckedChange={v => update("require_reapproval_on_edit", v)}
                  />
                  <SwitchRow
                    label="Lock Editing After Publish"
                    description="Companies cannot edit published jobs (platform-wide)"
                    checked={settings.lock_editing_after_publish ?? false}
                    onCheckedChange={v => update("lock_editing_after_publish", v)}
                  />
                </div>
              </PolicySection>

              {/* ---- Refresh & Quality ---- */}
              <PolicySection
                icon={RefreshCw}
                title="Refresh & Quality Control"
                description="Bump, spam detection, and duplicate blocking"
              >
                {/* Refresh subsection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Refresh / Bump</span>
                  </div>
                  <SwitchRow
                    label="Enable Job Refresh"
                    description="Allow companies to bump jobs to the top of search results (costs 1 credit)"
                    checked={settings.job_enable_refresh ?? true}
                    onCheckedChange={v => update("job_enable_refresh", v)}
                  />
                  {(settings.job_enable_refresh ?? true) && (
                    <div className="pl-0 pt-1">
                      <NumberField
                        label="Refresh Cooldown"
                        description="Minimum days between refreshes for the same job"
                        value={settings.refresh_cooldown_days ?? 7}
                        onChange={v => update("refresh_cooldown_days", v)}
                        min={0}
                        suffix="days"
                      />
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-border/30" />

                {/* Spam detection subsection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spam Detection</span>
                  </div>
                  <SwitchRow
                    label="Enable Spam Detection"
                    description="Score job postings for spam patterns on creation"
                    checked={settings.job_enable_spam_detection ?? true}
                    onCheckedChange={v => update("job_enable_spam_detection", v)}
                  />
                  {(settings.job_enable_spam_detection ?? true) && (
                    <div className="pl-0 pt-1">
                      <NumberField
                        label="Auto-Hold Threshold"
                        description="Jobs scoring above this value are held for review (0–100)"
                        value={settings.spam_detection_threshold ?? 70}
                        onChange={v => update("spam_detection_threshold", v)}
                        min={0}
                        max={100}
                      />
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-border/30" />

                {/* Duplicate blocking subsection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duplicate Blocking</span>
                  </div>
                  <SwitchRow
                    label="Block Duplicate Jobs"
                    description="Prevent companies from posting jobs with identical titles"
                    checked={settings.job_block_duplicates ?? true}
                    onCheckedChange={v => update("job_block_duplicates", v)}
                  />
                </div>
              </PolicySection>

              {/* ---- Retention ---- */}
              <PolicySection
                icon={Clock}
                title="Retention & Cleanup"
                description="Automatic deletion schedules for old jobs"
              >
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Expired Job Retention"
                    description="Delete expired jobs after N days. 0 = keep forever"
                    value={settings.expired_retention_days ?? 0}
                    onChange={v => update("expired_retention_days", v)}
                    min={0}
                    suffix="days"
                  />
                  <NumberField
                    label="Trash Retention"
                    description="Permanently delete trashed jobs after N days"
                    value={settings.trash_retention_days ?? 30}
                    onChange={v => update("trash_retention_days", v)}
                    min={1}
                    suffix="days"
                  />
                </div>
              </PolicySection>

              {/* ---- Content Filtering ---- */}
              <PolicySection
                icon={Tag}
                title="Content Filtering"
                description="Keyword blocklists for flagging suspicious postings"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Prohibited Keywords</Label>
                    <p className="text-xs text-muted-foreground">
                      Jobs containing these words will be flagged for review. Comma-separated.
                    </p>
                    <Textarea
                      value={settings.prohibited_keywords.join(", ")}
                      onChange={e =>
                        update(
                          "prohibited_keywords",
                          e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                        )
                      }
                      placeholder="crypto, mlm, pyramid, guaranteed income..."
                      className="min-h-[72px] resize-none"
                    />
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Categories & Industries</p>
                      <p className="text-xs text-muted-foreground">
                        Manage allowed job categories and industries in Taxonomies
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/taxonomies" onClick={() => onOpenChange(false)}>
                        Taxonomies
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </PolicySection>

            </div>
          ) : null}
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-border/40 bg-background flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !settings}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

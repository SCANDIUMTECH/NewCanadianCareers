"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Check,
  Save,
  Mail,
  Building2,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { CHART } from "@/lib/constants/colors"
import {
  getAgencyNotificationPreferences,
  updateAgencyNotificationPreferences,
} from "@/lib/api/agencies"
import type { AgencyNotificationPreferences } from "@/lib/agency/types"

/**
 * Agency Notifications Settings Page
 * Configure email alerts and notification preferences
 * Fetches from GET /api/notifications/preferences/
 * Saves via PATCH /api/notifications/preferences/
 */

const defaultPreferences: AgencyNotificationPreferences = {
  email_application_received: true,
  email_application_status: true,
  email_job_alerts: true,
  email_job_status: true,
  email_messages: true,
  email_job_expired: true,
  email_credits_low: true,
  email_billing: true,
  email_weekly_digest: false,
  email_marketing: false,
  push_enabled: true,
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<AgencyNotificationPreferences>(defaultPreferences)
  const [originalSettings, setOriginalSettings] = useState<AgencyNotificationPreferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fetch current preferences
  const fetchPreferences = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAgencyNotificationPreferences()
      setSettings(data)
      setOriginalSettings(data)
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const handleToggle = (key: keyof AgencyNotificationPreferences) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setIsSaved(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const updated = await updateAgencyNotificationPreferences(settings)
      setSettings(updated)
      setOriginalSettings(updated)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save notification preferences:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-8">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-border/60 bg-card mb-6">
            <Skeleton className="h-10 w-10 rounded-xl mb-4" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-3">
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/agency/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPreferences}>Retry</Button>
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
              Notifications
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Control what emails and alerts you receive
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              "gap-2 transition-all duration-200",
              isSaved && "bg-emerald-600 hover:bg-emerald-600"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
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

        {saveError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {saveError}
          </div>
        )}
      </motion.div>

      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="p-5 rounded-xl border border-border/60 bg-card mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${CHART.primary}10` }}
          >
            <Mail className="w-5 h-5" style={{ color: CHART.primary }} />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Email Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Alerts sent to your inbox
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">New Applications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when candidates apply to your jobs
              </p>
            </div>
            <Switch
              checked={settings.email_application_received}
              onCheckedChange={() => handleToggle("email_application_received")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Application Status Updates</Label>
              <p className="text-sm text-muted-foreground">
                When application statuses change on your postings
              </p>
            </div>
            <Switch
              checked={settings.email_application_status}
              onCheckedChange={() => handleToggle("email_application_status")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Job Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notifications about job posting activity and publishing
              </p>
            </div>
            <Switch
              checked={settings.email_job_alerts}
              onCheckedChange={() => handleToggle("email_job_alerts")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Job Status Updates</Label>
              <p className="text-sm text-muted-foreground">
                Approved, rejected, and pending review notifications
              </p>
            </div>
            <Switch
              checked={settings.email_job_status}
              onCheckedChange={() => handleToggle("email_job_status")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Job Expiring Soon</Label>
              <p className="text-sm text-muted-foreground">
                Warning before a job listing expires
              </p>
            </div>
            <Switch
              checked={settings.email_job_expired}
              onCheckedChange={() => handleToggle("email_job_expired")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Low Credits Warning</Label>
              <p className="text-sm text-muted-foreground">
                Alert when your credit balance is running low
              </p>
            </div>
            <Switch
              checked={settings.email_credits_low}
              onCheckedChange={() => handleToggle("email_credits_low")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Messages</Label>
              <p className="text-sm text-muted-foreground">
                Notifications for new messages and conversations
              </p>
            </div>
            <Switch
              checked={settings.email_messages}
              onCheckedChange={() => handleToggle("email_messages")}
            />
          </div>
        </div>
      </motion.div>

      {/* Marketing & Digest */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="p-5 rounded-xl border border-border/60 bg-card mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${CHART.purple}10` }}
          >
            <Building2 className="w-5 h-5" style={{ color: CHART.purple }} />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Marketing & Updates</h2>
            <p className="text-sm text-muted-foreground">
              Product news, tips, and promotional content
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Product updates, feature announcements, and tips
              </p>
            </div>
            <Switch
              checked={settings.email_marketing}
              onCheckedChange={() => handleToggle("email_marketing")}
            />
          </div>
        </div>
      </motion.div>

      {/* Push / In-App Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="p-5 rounded-xl border border-border/60 bg-card mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${CHART.warning}10` }}
          >
            <Users className="w-5 h-5" style={{ color: CHART.warning }} />
          </div>
          <div>
            <h2 className="font-medium text-foreground">In-App Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Notifications shown within the platform
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable in-app notification bell and alerts
              </p>
            </div>
            <Switch
              checked={settings.push_enabled}
              onCheckedChange={() => handleToggle("push_enabled")}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

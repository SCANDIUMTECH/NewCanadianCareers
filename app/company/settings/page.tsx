"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCompanySettings,
  updateJobDefaults,
  getCompanyNotificationPreferences,
  updateCompanyNotifications,
  type CompanySettings,
  type CompanyJobDefaults,
  type CompanyNotificationPreferences,
} from "@/lib/api/companies"
import { CompanyTeamManagement } from "@/components/company-team-management"
import { AccountSecurity } from "@/components/account-security"
import { useCompanyContext } from "@/hooks/use-company"

/**
 * Inline email field with validation and save button.
 */
function ApplyEmailField({ currentEmail, onSave }: { currentEmail: string; onSave: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState(currentEmail)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync when parent data loads/changes
  useEffect(() => {
    setEmail(currentEmail)
  }, [currentEmail])

  const hasChanges = email.trim() !== currentEmail

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(null)
      return true // empty is valid (optional field)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError(null)
    return true
  }

  const handleSave = async () => {
    if (!validateEmail(email)) return
    setIsSaving(true)
    try {
      await onSave(email.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setEmailError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="default-apply-email">Default Apply Email</Label>
      <p className="text-sm text-foreground-muted">
        Pre-fill the application email when creating new jobs
      </p>
      <div className="flex gap-2">
        <Input
          id="default-apply-email"
          type="email"
          placeholder="hr@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) validateEmail(e.target.value)
            if (saved) setSaved(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasChanges) handleSave()
          }}
          className={emailError ? 'border-destructive' : ''}
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={saved ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''}
        >
          {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </Button>
      </div>
      {emailError && (
        <p className="text-sm text-destructive">{emailError}</p>
      )}
    </div>
  )
}

/**
 * Company Settings
 * Account security, job defaults, notifications, and team.
 * Company profile editing is handled at /company/profile.
 */

export default function CompanySettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <CompanySettingsContent />
    </Suspense>
  )
}

function CompanySettingsContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "account"
  const { hasTeamManagement } = useCompanyContext()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Settings state
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<CompanyNotificationPreferences | null>(null)
  const [savedField, setSavedField] = useState<string | null>(null)

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [settingsData, notifPrefs] = await Promise.all([
        getCompanySettings(),
        getCompanyNotificationPreferences(),
      ])
      setSettings(settingsData)
      setNotificationPrefs(notifPrefs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Brief "Saved" flash for auto-save fields
  const flashSaved = (field: string) => {
    setSavedField(field)
    setTimeout(() => setSavedField(null), 2000)
  }

  // Job defaults handlers
  const handleJobDefaultChange = async (key: keyof CompanyJobDefaults, value: CompanyJobDefaults[keyof CompanyJobDefaults]) => {
    if (!settings) return
    try {
      const updated = await updateJobDefaults({ [key]: value })
      setSettings(prev => prev ? { ...prev, job_defaults: updated } : null)
      flashSaved(key)
    } catch (err) {
      console.error('Failed to update job default:', err)
    }
  }

  // Notification handlers — uses shared /api/notifications/preferences/
  const handleNotificationChange = async (key: keyof CompanyNotificationPreferences, value: boolean) => {
    if (!notificationPrefs) return
    const oldValue = notificationPrefs[key]
    setNotificationPrefs({ ...notificationPrefs, [key]: value })
    try {
      await updateCompanyNotifications({ [key]: value })
      flashSaved(key)
    } catch (err) {
      setNotificationPrefs({ ...notificationPrefs, [key]: oldValue })
      console.error('Failed to update notification setting:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
          <div className="h-4 w-48 bg-background-secondary rounded animate-pulse mt-2" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-foreground-muted mt-1">Manage account security, job posting defaults, notifications, and team</p>
        </div>
      </MotionWrapper>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <MotionWrapper delay={50}>
          <TabsList className="w-full justify-start bg-background-secondary/50 p-1">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="job-defaults">Job Defaults</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </MotionWrapper>

        {/* Account Security */}
        <TabsContent value="account" className="space-y-6">
          <AccountSecurity />
        </TabsContent>

        {/* Job Defaults */}
        <TabsContent value="job-defaults" className="space-y-6">
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Job Posting Defaults</CardTitle>
                <CardDescription>Default settings for new job postings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-sm">
                  <div className="flex items-center gap-2">
                    <Label>Default Apply Method</Label>
                    {savedField === 'default_apply_method' && (
                      <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>
                    )}
                  </div>
                  <Select
                    value={settings?.job_defaults.default_apply_method || 'internal'}
                    onValueChange={(value) => handleJobDefaultChange('default_apply_method', value as 'internal' | 'email' | 'external')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Application</SelectItem>
                      <SelectItem value="email">Email Application</SelectItem>
                      <SelectItem value="external">External URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ApplyEmailField
                  currentEmail={settings?.job_defaults.default_apply_email || ''}
                  onSave={async (email) => {
                    await handleJobDefaultChange('default_apply_email', email)
                  }}
                />
              </CardContent>
            </Card>
          </MotionWrapper>

        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Email Notifications</CardTitle>
                <CardDescription>Manage which emails you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">New Applications</Label>
                      {savedField === 'email_application_received' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Get notified when candidates apply</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_application_received ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('email_application_received', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Job Status Updates</Label>
                      {savedField === 'email_job_status' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Approved, rejected, and pending review notifications</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_job_status ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('email_job_status', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Job Expiring Soon</Label>
                      {savedField === 'email_job_expired' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Reminder before jobs expire</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_job_expired ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('email_job_expired', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Low Credits Warning</Label>
                      {savedField === 'email_credits_low' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Alert when credits are running low</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_credits_low ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('email_credits_low', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Billing & Receipts</Label>
                      {savedField === 'email_billing' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Payment confirmations and invoices</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_billing ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('email_billing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Weekly Performance Digest</Label>
                      {savedField === 'email_weekly_digest' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Summary of job performance metrics</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_weekly_digest ?? false}
                    onCheckedChange={(checked) => handleNotificationChange('email_weekly_digest', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Marketing Emails</Label>
                      {savedField === 'email_marketing' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">News, tips, and feature updates</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.email_marketing ?? false}
                    onCheckedChange={(checked) => handleNotificationChange('email_marketing', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">In-App Notifications</CardTitle>
                <CardDescription>Control in-app notification bell alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-foreground">Push Notifications</Label>
                      {savedField === 'push_enabled' && <span className="text-xs text-emerald-600 font-medium animate-in fade-in">Saved</span>}
                    </div>
                    <p className="text-sm text-foreground-muted">Show in-app notification alerts</p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.push_enabled ?? true}
                    onCheckedChange={(checked) => handleNotificationChange('push_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="space-y-6">
          {hasTeamManagement ? (
            <CompanyTeamManagement />
          ) : (
            <MotionWrapper delay={100}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Team Management</h3>
                  <p className="text-sm text-foreground-muted mb-6 max-w-md">
                    Invite team members, assign roles, and collaborate on job postings.
                    Upgrade to a plan with team management to unlock this feature.
                  </p>
                  <Link href="/company/billing">
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      View Plans
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </MotionWrapper>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}

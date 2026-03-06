"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn, isSafeExternalUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { requestPasswordReset } from "@/lib/api/auth"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getPrivacySettings,
  updatePrivacySettings,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllSessions,
  exportData,
  deleteAccount,
} from "@/lib/api/candidates"
import type { CandidateNotificationPreferences, PrivacySettings, Session } from "@/lib/candidate/types"

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const [notificationPrefs, setNotificationPrefs] = useState<CandidateNotificationPreferences | null>(null)
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [passwordDialog, setPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [exportDialog, setExportDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const [isRevokingSession, setIsRevokingSession] = useState<number | null>(null)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [prefs, privacy, sessionList] = await Promise.all([
        getNotificationPreferences(),
        getPrivacySettings().catch(() => null),
        getSessions().catch(() => []),
      ])
      setNotificationPrefs(prefs)
      setPrivacySettings(privacy)
      setSessions(sessionList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleNotificationChange = async (
    key: keyof CandidateNotificationPreferences,
    value: boolean
  ) => {
    if (!notificationPrefs) return
    const oldValue = notificationPrefs[key]
    setNotificationPrefs({ ...notificationPrefs, [key]: value })
    try {
      await updateNotificationPreferences({ [key]: value })
    } catch (err) {
      setNotificationPrefs({ ...notificationPrefs, [key]: oldValue })
      toast.error(err instanceof Error ? err.message : "Failed to update preference")
    }
  }

  const handlePrivacyChange = async (
    key: keyof PrivacySettings,
    value: PrivacySettings[keyof PrivacySettings]
  ) => {
    if (!privacySettings) return
    const oldValue = privacySettings[key]
    setPrivacySettings({ ...privacySettings, [key]: value })
    try {
      await updatePrivacySettings({ [key]: value })
    } catch (err) {
      setPrivacySettings({ ...privacySettings, [key]: oldValue })
      toast.error(err instanceof Error ? err.message : "Failed to update privacy setting")
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setIsSendingReset(true)
    try {
      await requestPasswordReset({ email: user.email })
      setResetSent(true)
    } catch {
      // The API always returns success for security (no user enumeration)
      setResetSent(true)
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }
    setIsChangingPassword(true)
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      })
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setPasswordDialog(false)
        setPasswordSuccess(false)
      }, 1500)
    } catch (err) {
      const error = err as { message?: string; errors?: Record<string, string[]> }
      setPasswordError(error.errors?.current_password?.[0] || error.errors?.new_password?.[0] || error.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleRevokeSession = async (sessionId: number) => {
    setIsRevokingSession(sessionId)
    try {
      await revokeSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session")
    } finally {
      setIsRevokingSession(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm("This will sign you out of all other devices. Continue?")) return
    setIsRevokingAll(true)
    try {
      await revokeAllSessions()
      setSessions((prev) => prev.filter((s) => s.is_current))
      toast.success("All other sessions have been revoked")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke sessions")
    } finally {
      setIsRevokingAll(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const { download_url } = await exportData()
      if (download_url && isSafeExternalUrl(download_url)) {
        window.open(download_url, "_blank", "noopener,noreferrer")
      } else {
        toast.info("Your data export is being prepared. You'll receive an email when it's ready.")
      }
      setExportDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request data export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password")
      return
    }
    setIsDeleting(true)
    try {
      await deleteAccount(deletePassword)
      await logout()
      router.push("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-background-secondary/50 rounded w-48" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-background-secondary/50 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchSettings}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Manage your account and preferences
          </p>
        </div>
      </MotionWrapper>

      <div className="space-y-6">
        {/* Account Settings */}
        <MotionWrapper delay={100}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
              <CardDescription>Manage your account credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Email Address</Label>
                  <p className="text-sm text-foreground-muted">{user?.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {user?.email_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <Separator />

              {/* Password */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <p className="text-sm text-foreground-muted">
                    Change your password or reset via email
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={passwordDialog} onOpenChange={(open) => {
                    setPasswordDialog(open)
                    if (!open) { setPasswordError(""); setPasswordSuccess(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("") }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Change Password</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>Enter your current password and a new password.</DialogDescription>
                      </DialogHeader>
                      {passwordSuccess ? (
                        <div className="py-6 text-center">
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                            Password changed successfully
                          </Badge>
                        </div>
                      ) : (
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                          </div>
                          {passwordError && (
                            <p className="text-sm text-destructive">{passwordError}</p>
                          )}
                        </div>
                      )}
                      {!passwordSuccess && (
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setPasswordDialog(false)} disabled={isChangingPassword}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                          >
                            {isChangingPassword ? "Changing..." : "Change Password"}
                          </Button>
                        </DialogFooter>
                      )}
                    </DialogContent>
                  </Dialog>
                  {resetSent ? (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                      Reset email sent
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePasswordReset}
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? "Sending..." : "Reset via email"}
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Two-Factor */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-foreground-muted">Add an extra layer of security</p>
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  user?.mfa_enabled
                    ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                    : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                )}>
                  {user?.mfa_enabled ? "Enabled" : "Not enabled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Session Management */}
        {sessions.length > 0 && (
          <MotionWrapper delay={125}>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Active Sessions</CardTitle>
                    <CardDescription>Devices where you're signed in</CardDescription>
                  </div>
                  {sessions.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeAllSessions}
                      disabled={isRevokingAll}
                    >
                      {isRevokingAll ? "Revoking..." : "Sign out all others"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.browser} on {session.device}
                          {session.is_current && (
                            <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                          )}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {session.location || session.ip_address} · Last active {new Date(session.last_active).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isRevokingSession === session.id}
                      >
                        {isRevokingSession === session.id ? "..." : "Revoke"}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </MotionWrapper>
        )}

        {/* Notification Settings */}
        <MotionWrapper delay={150}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Control what emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Job Alert Emails</Label>
                  <p className="text-sm text-foreground-muted">Get notified about new matching jobs</p>
                </div>
                <Switch
                  checked={notificationPrefs?.email_job_alerts ?? true}
                  onCheckedChange={(checked) => handleNotificationChange("email_job_alerts", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Application Updates</Label>
                  <p className="text-sm text-foreground-muted">Status changes on your applications</p>
                </div>
                <Switch
                  checked={notificationPrefs?.email_application_status ?? true}
                  onCheckedChange={(checked) => handleNotificationChange("email_application_status", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Messages</Label>
                  <p className="text-sm text-foreground-muted">Notifications when employers message you</p>
                </div>
                <Switch
                  checked={notificationPrefs?.email_messages ?? true}
                  onCheckedChange={(checked) => handleNotificationChange("email_messages", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Job Expiration Alerts</Label>
                  <p className="text-sm text-foreground-muted">When saved jobs are about to expire</p>
                </div>
                <Switch
                  checked={notificationPrefs?.email_job_expired ?? true}
                  onCheckedChange={(checked) => handleNotificationChange("email_job_expired", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Marketing Emails</Label>
                  <p className="text-sm text-foreground-muted">News, tips, and feature updates</p>
                </div>
                <Switch
                  checked={notificationPrefs?.email_marketing ?? false}
                  onCheckedChange={(checked) => handleNotificationChange("email_marketing", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Privacy & Data */}
        <MotionWrapper delay={200}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Privacy & Data</CardTitle>
              <CardDescription>Control your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resume Visibility */}
              {privacySettings && (
                <>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Resume Visibility</Label>
                      <p className="text-sm text-foreground-muted">Who can see your resume</p>
                    </div>
                    <Select
                      value={privacySettings.resume_visibility}
                      onValueChange={(value) => handlePrivacyChange("resume_visibility", value as PrivacySettings["resume_visibility"])}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Only on apply</SelectItem>
                        <SelectItem value="employers">Employers only</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Profile Indexing</Label>
                      <p className="text-sm text-foreground-muted">Allow search engines to index your profile</p>
                    </div>
                    <Switch
                      checked={privacySettings.profile_indexable}
                      onCheckedChange={(checked) => handlePrivacyChange("profile_indexable", checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Show &quot;Open to Work&quot;</Label>
                      <p className="text-sm text-foreground-muted">Display your availability to employers</p>
                    </div>
                    <Switch
                      checked={privacySettings.show_open_to_work}
                      onCheckedChange={(checked) => handlePrivacyChange("show_open_to_work", checked)}
                    />
                  </div>

                  <Separator />
                </>
              )}

              {/* Data Export */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Export Your Data</Label>
                  <p className="text-sm text-foreground-muted">Download all your data (GDPR)</p>
                </div>
                <Dialog open={exportDialog} onOpenChange={setExportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Request Export</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Your Data</DialogTitle>
                      <DialogDescription>
                        We&apos;ll prepare a downloadable archive of all your data including your profile, saved jobs, applications, and activity history.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-foreground-muted">
                        Your data export will be ready within 24 hours. We&apos;ll send you an email when it&apos;s available for download.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setExportDialog(false)} disabled={isExporting}>
                        Cancel
                      </Button>
                      <Button onClick={handleExportData} disabled={isExporting}>
                        {isExporting ? "Requesting..." : "Request Export"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Danger Zone */}
        <MotionWrapper delay={250}>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Delete Account</Label>
                  <p className="text-sm text-foreground-muted">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <ul className="text-sm text-foreground-muted list-disc list-inside space-y-1 py-2">
                      <li>Your profile and resume</li>
                      <li>Saved jobs and searches</li>
                      <li>Application history</li>
                      <li>All preferences and settings</li>
                    </ul>
                    <div className="space-y-2 py-2">
                      <Label>Enter your password to confirm</Label>
                      <Input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setDeletePassword("")}
                        disabled={isDeleting}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || !deletePassword}
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete my account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>
    </div>
  )
}

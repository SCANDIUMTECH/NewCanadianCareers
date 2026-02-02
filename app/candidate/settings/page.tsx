"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
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

/**
 * Candidate Settings Page
 * Account, notifications, and privacy controls
 */

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    email: "john@example.com",
    notifications: {
      savedSearchAlerts: true,
      applicationUpdates: true,
      platformAnnouncements: false,
      weeklyDigest: true,
    },
    privacy: {
      resumeVisibility: "direct-apply-only",
      profileIndexable: false,
    },
  })

  const [passwordDialog, setPasswordDialog] = useState(false)
  const [exportDialog, setExportDialog] = useState(false)

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
                  <p className="text-sm text-foreground-muted">{settings.email}</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Change</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Email Address</DialogTitle>
                      <DialogDescription>
                        A verification email will be sent to your new address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Current Email</Label>
                        <Input value={settings.email} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>New Email</Label>
                        <Input placeholder="Enter new email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" placeholder="Confirm your password" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
                        Update Email
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              {/* Password */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <p className="text-sm text-foreground-muted">Last changed 30 days ago</p>
                </div>
                <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Change</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Choose a strong password with at least 8 characters.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input type="password" placeholder="Enter current password" />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input type="password" placeholder="Enter new password" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input type="password" placeholder="Confirm new password" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPasswordDialog(false)}>Cancel</Button>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
                        Update Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              {/* Two-Factor */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-foreground-muted">Add an extra layer of security</p>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5">
                  Not enabled
                </Badge>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

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
                  <Label className="text-sm font-medium">Saved Search Alerts</Label>
                  <p className="text-sm text-foreground-muted">Get notified about new matching jobs</p>
                </div>
                <Switch
                  checked={settings.notifications.savedSearchAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, savedSearchAlerts: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Application Updates</Label>
                  <p className="text-sm text-foreground-muted">Status changes on your applications</p>
                </div>
                <Switch
                  checked={settings.notifications.applicationUpdates}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, applicationUpdates: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Weekly Job Digest</Label>
                  <p className="text-sm text-foreground-muted">Summary of top jobs matching your preferences</p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, weeklyDigest: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Platform Announcements</Label>
                  <p className="text-sm text-foreground-muted">News and feature updates</p>
                </div>
                <Switch
                  checked={settings.notifications.platformAnnouncements}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, platformAnnouncements: checked },
                    })
                  }
                />
              </div>

              <div className="pt-2">
                <Button variant="link" className="h-auto p-0 text-primary">
                  Unsubscribe from all emails
                </Button>
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
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Resume Visibility</Label>
                  <p className="text-sm text-foreground-muted">
                    {settings.privacy.resumeVisibility === "direct-apply-only"
                      ? "Only shared when you apply directly"
                      : "Visible to all employers"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Direct Apply Only
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Search Engine Indexing</Label>
                  <p className="text-sm text-foreground-muted">Allow your profile to appear in search engines</p>
                </div>
                <Switch
                  checked={settings.privacy.profileIndexable}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, profileIndexable: checked },
                    })
                  }
                />
              </div>

              <Separator />

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
                      <Button variant="outline" onClick={() => setExportDialog(false)}>Cancel</Button>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
                        Request Export
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
                <AlertDialog>
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
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, delete my account
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

"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

/**
 * Company Settings
 * Profile, Job Defaults, Notifications, and Internal Settings
 */

export default function CompanySettingsPage() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-foreground-muted mt-1">Manage your company profile and preferences</p>
        </div>
      </MotionWrapper>

      <Tabs defaultValue="profile" className="space-y-6">
        <MotionWrapper delay={50}>
          <TabsList className="w-full justify-start bg-background-secondary/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="job-defaults">Job Defaults</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
        </MotionWrapper>

        {/* Company Profile */}
        <TabsContent value="profile" className="space-y-6">
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Company Profile</CardTitle>
                    <CardDescription>This information is displayed publicly</CardDescription>
                  </div>
                  <Button 
                    variant={isEditing ? "default" : "outline"} 
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? "bg-primary hover:bg-primary-hover text-primary-foreground" : "bg-transparent"}
                  >
                    {isEditing ? "Save Changes" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">A</span>
                  </div>
                  {isEditing && (
                    <div>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Upload Logo
                      </Button>
                      <p className="text-xs text-foreground-muted mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input defaultValue="Acme Corporation" disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input defaultValue="https://acme.com" disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select defaultValue="technology" disabled={!isEditing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select defaultValue="51-200" disabled={!isEditing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    defaultValue="Acme Corporation is a leading technology company focused on building innovative solutions for modern businesses."
                    disabled={!isEditing}
                    rows={4}
                  />
                  <p className="text-xs text-foreground-muted">Brief description shown on job listings</p>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Verification Status */}
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-600">Verified Company</p>
                      <p className="text-sm text-emerald-600/80">Email domain verified on Jan 1, 2025</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    Verified
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Job Duration</Label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Apply Method</Label>
                    <Select defaultValue="internal">
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Require Salary Information</Label>
                      <p className="text-sm text-foreground-muted">Always include salary range on job posts</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Allow Remote Applications</Label>
                      <p className="text-sm text-foreground-muted">Default to accepting remote candidates</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  Save Defaults
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>

          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Default Visibility</CardTitle>
                <CardDescription>Control how your jobs appear by default</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Featured Listing</Label>
                    <p className="text-sm text-foreground-muted">Highlight jobs in search results</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Show Company Logo</Label>
                    <p className="text-sm text-foreground-muted">Display logo on job cards</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Highlight Card</Label>
                    <p className="text-sm text-foreground-muted">Add visual emphasis to job cards</p>
                  </div>
                  <Switch />
                </div>
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
                    <Label className="text-foreground">New Applications</Label>
                    <p className="text-sm text-foreground-muted">Get notified when candidates apply</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Job Published</Label>
                    <p className="text-sm text-foreground-muted">Confirmation when jobs go live</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Job Expiring Soon</Label>
                    <p className="text-sm text-foreground-muted">Reminder 7 days before expiration</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Low Credits Warning</Label>
                    <p className="text-sm text-foreground-muted">Alert when credits are running low</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Billing & Receipts</Label>
                    <p className="text-sm text-foreground-muted">Payment confirmations and invoices</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Weekly Performance Digest</Label>
                    <p className="text-sm text-foreground-muted">Summary of job performance metrics</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>

        {/* Social Distribution */}
        <TabsContent value="social" className="space-y-6">
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Default Social Distribution</CardTitle>
                <CardDescription>Choose which platforms to post jobs by default</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#0077B5]/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#0077B5]">in</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">LinkedIn</p>
                      <p className="text-sm text-foreground-muted">Connected as Acme Corporation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Connected
                    </Badge>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-foreground/10 flex items-center justify-center">
                      <span className="text-sm font-bold">X</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">X (Twitter)</p>
                      <p className="text-sm text-foreground-muted">Connected as @acmecorp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Connected
                    </Badge>
                    <Switch />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#1877F2]/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#1877F2]">f</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Facebook</p>
                      <p className="text-sm text-foreground-muted">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    Connect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">ig</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Instagram</p>
                      <p className="text-sm text-foreground-muted">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </TabsContent>
      </Tabs>
    </div>
  )
}

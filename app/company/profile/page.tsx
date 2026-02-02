"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Public Company Profile Editor
 * Edit the company profile that appears on job listings
 */

export default function CompanyProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Company Profile</h1>
            <p className="text-sm text-foreground-muted mt-1">This information is displayed on your job listings</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </MotionWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-3xl font-bold text-primary">A</span>
                  </div>
                  {isEditing && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Upload Logo
                      </Button>
                      <p className="text-xs text-foreground-muted">
                        Recommended: 400x400px, PNG or JPG, max 2MB
                      </p>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Remove Logo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      defaultValue="Acme Corporation" 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-background-secondary/50" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      defaultValue="https://acme.com" 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-background-secondary/50" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select defaultValue="technology" disabled={!isEditing}>
                      <SelectTrigger className={!isEditing ? "bg-background-secondary/50" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select defaultValue="51-200" disabled={!isEditing}>
                      <SelectTrigger className={!isEditing ? "bg-background-secondary/50" : ""}>
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
                  <div className="space-y-2">
                    <Label>Headquarters Location</Label>
                    <Input 
                      defaultValue="San Francisco, CA" 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-background-secondary/50" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Founded Year</Label>
                    <Input 
                      defaultValue="2015" 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-background-secondary/50" : ""}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* About */}
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">About</CardTitle>
                <CardDescription>Tell candidates about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Description</Label>
                  <Textarea 
                    defaultValue="Acme Corporation is a leading technology company focused on building innovative solutions for modern businesses. We're passionate about creating products that make a difference and empowering our team to do their best work."
                    disabled={!isEditing}
                    rows={5}
                    className={!isEditing ? "bg-background-secondary/50" : ""}
                  />
                  <p className="text-xs text-foreground-muted">
                    {isEditing ? "500 characters max" : "This appears on your job listings"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Mission Statement (Optional)</Label>
                  <Textarea 
                    defaultValue="To empower businesses with innovative technology solutions that drive growth and efficiency."
                    disabled={!isEditing}
                    rows={2}
                    className={!isEditing ? "bg-background-secondary/50" : ""}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Social Links */}
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Social Links</CardTitle>
                <CardDescription>Help candidates learn more about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input 
                    defaultValue="https://linkedin.com/company/acme" 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-background-secondary/50" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X</Label>
                  <Input 
                    defaultValue="https://twitter.com/acmecorp" 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-background-secondary/50" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Careers Page</Label>
                  <Input 
                    defaultValue="https://acme.com/careers" 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-background-secondary/50" : ""}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Verification Status */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="font-medium text-emerald-600">Verified Company</p>
                    <p className="text-xs text-emerald-600/80 mt-0.5">Domain verified via acme.com</p>
                  </div>
                </div>
                <p className="text-xs text-foreground-muted mt-3">
                  Verified companies get a badge on their job listings, increasing trust with candidates.
                </p>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Profile Preview */}
          <MotionWrapper delay={300}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Profile Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg border border-border/50 bg-background-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">A</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">Acme Corporation</span>
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Verified
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-muted">Technology · San Francisco</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-3">
                    Acme Corporation is a leading technology company focused on building innovative solutions...
                  </p>
                </div>
                <p className="text-xs text-foreground-muted mt-3">
                  This is how your company appears on job listings.
                </p>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Quick Stats */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Profile Views</span>
                  <span className="text-sm font-medium text-foreground">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Active Jobs</span>
                  <span className="text-sm font-medium text-foreground">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Total Applications</span>
                  <span className="text-sm font-medium text-foreground">142</span>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>
    </div>
  )
}

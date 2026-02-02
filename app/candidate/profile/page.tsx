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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MotionWrapper } from "@/components/motion-wrapper"

/**
 * Candidate Profile Page
 * Minimal, intentional profile management
 */

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "",
    headline: "Senior Frontend Engineer",
    bio: "",
    preferredLocations: ["Remote", "San Francisco, CA"],
    preferredKeywords: ["Frontend", "React", "TypeScript"],
    remotePreference: "remote-first",
    openToWork: true,
    resume: {
      name: "John_Doe_Resume_2026.pdf",
      uploadedAt: new Date("2026-01-15"),
      size: "245 KB",
    },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [newKeyword, setNewKeyword] = useState("")

  const addLocation = () => {
    if (newLocation && !profile.preferredLocations.includes(newLocation)) {
      setProfile({ ...profile, preferredLocations: [...profile.preferredLocations, newLocation] })
      setNewLocation("")
    }
  }

  const removeLocation = (loc: string) => {
    setProfile({ ...profile, preferredLocations: profile.preferredLocations.filter((l) => l !== loc) })
  }

  const addKeyword = () => {
    if (newKeyword && !profile.preferredKeywords.includes(newKeyword)) {
      setProfile({ ...profile, preferredKeywords: [...profile.preferredKeywords, newKeyword] })
      setNewKeyword("")
    }
  }

  const removeKeyword = (kw: string) => {
    setProfile({ ...profile, preferredKeywords: profile.preferredKeywords.filter((k) => k !== kw) })
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage your profile and resume
            </p>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? "bg-primary text-primary-foreground hover:bg-primary-hover" : ""}
          >
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
        </div>
      </MotionWrapper>

      <div className="space-y-6">
        {/* Avatar & Basic Info */}
        <MotionWrapper delay={100}>
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                    <AvatarImage src="/avatars/candidate.jpg" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="mt-3 w-full bg-transparent">
                      Change Photo
                    </Button>
                  )}
                </div>

                {/* Name & Headline */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      {isEditing ? (
                        <Input
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        />
                      ) : (
                        <p className="text-foreground font-medium">{profile.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      {isEditing ? (
                        <Input
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        />
                      ) : (
                        <p className="text-foreground font-medium">{profile.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Headline</Label>
                    {isEditing ? (
                      <Input
                        value={profile.headline}
                        onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                        placeholder="e.g., Senior Frontend Engineer"
                      />
                    ) : (
                      <p className="text-foreground-muted">{profile.headline || "Add a headline"}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={profile.openToWork}
                      onCheckedChange={(checked) => setProfile({ ...profile, openToWork: checked })}
                      disabled={!isEditing}
                    />
                    <div>
                      <Label className="cursor-pointer">Open to Work</Label>
                      <p className="text-xs text-foreground-muted">Let employers know you&apos;re available</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Contact Info */}
        <MotionWrapper delay={150}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Your email is used for job applications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-background-secondary/50" />
                  <p className="text-xs text-foreground-muted">Contact support to change your email</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  {isEditing ? (
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  ) : (
                    <p className="text-foreground-muted">{profile.phone || "Not provided"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Resume */}
        <MotionWrapper delay={200}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Resume</CardTitle>
              <CardDescription>Upload your resume for direct apply applications</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.resume ? (
                <div className="flex items-center justify-between p-4 rounded-lg bg-background-secondary/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile.resume.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {profile.resume.size} · Uploaded {profile.resume.uploadedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background-secondary flex items-center justify-center">
                    <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground mb-1">Drag and drop or click to upload</p>
                  <p className="text-xs text-foreground-muted">PDF or DOC, max 5MB</p>
                  <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                    Upload Resume
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Job Preferences */}
        <MotionWrapper delay={250}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Job Preferences</CardTitle>
              <CardDescription>Help us find the right jobs for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Remote Preference */}
              <div className="space-y-2">
                <Label>Work Location Preference</Label>
                {isEditing ? (
                  <Select
                    value={profile.remotePreference}
                    onValueChange={(v) => setProfile({ ...profile, remotePreference: v })}
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote-only">Remote Only</SelectItem>
                      <SelectItem value="remote-first">Remote First</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground capitalize">{profile.remotePreference.replace("-", " ")}</p>
                )}
              </div>

              {/* Preferred Locations */}
              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <div className="flex flex-wrap gap-2">
                  {profile.preferredLocations.map((loc) => (
                    <Badge
                      key={loc}
                      variant="secondary"
                      className={cn("text-sm", isEditing && "pr-1")}
                    >
                      {loc}
                      {isEditing && (
                        <button
                          onClick={() => removeLocation(loc)}
                          className="ml-1 hover:text-destructive"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Add location"
                        className="h-8 w-[140px]"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                      />
                      <Button variant="outline" size="sm" onClick={addLocation} className="h-8 bg-transparent">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Keywords */}
              <div className="space-y-2">
                <Label>Role Keywords</Label>
                <p className="text-xs text-foreground-muted mb-2">Keywords that match your target roles</p>
                <div className="flex flex-wrap gap-2">
                  {profile.preferredKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className={cn("text-sm border-primary/30 text-primary", isEditing && "pr-1")}
                    >
                      {kw}
                      {isEditing && (
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="ml-1 hover:text-destructive"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add keyword"
                        className="h-8 w-[140px]"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      />
                      <Button variant="outline" size="sm" onClick={addKeyword} className="h-8 bg-transparent">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>
    </div>
  )
}

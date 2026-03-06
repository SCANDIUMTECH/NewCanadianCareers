"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { cn, isAllowedDocumentType, isAllowedImageType } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { UserAvatar } from "@/components/user-avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useCandidate } from "@/hooks/use-candidate"
import {
  getCandidateProfile,
  updateCandidateProfile,
  uploadResume,
  deleteResume,
  uploadAvatar,
} from "@/lib/api/candidates"
import type { CandidateProfile, CandidateProfileUpdate } from "@/lib/candidate/types"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProfilePage() {
  const { refreshProfile } = useCandidate()

  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [formData, setFormData] = useState<CandidateProfileUpdate>({})
  const [newLocation, setNewLocation] = useState("")
  const [newKeyword, setNewKeyword] = useState("")

  const resumeInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCandidateProfile()
      setProfile(data)
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        headline: data.headline,
        bio: data.bio,
        preferred_locations: data.preferred_locations,
        preferred_keywords: data.preferred_keywords,
        remote_preference: data.remote_preference,
        open_to_work: data.open_to_work,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      const updated = await updateCandidateProfile(formData)
      setProfile(updated)
      setIsEditing(false)
      refreshProfile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (!profile) return
    setFormData({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      headline: profile.headline,
      bio: profile.bio,
      preferred_locations: profile.preferred_locations,
      preferred_keywords: profile.preferred_keywords,
      remote_preference: profile.remote_preference,
      open_to_work: profile.open_to_work,
    })
    setIsEditing(false)
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isAllowedDocumentType(file)) {
      toast.error("Invalid file type. Please upload a PDF, DOC, DOCX, RTF, or TXT file.")
      if (resumeInputRef.current) resumeInputRef.current.value = ""
      return
    }

    setIsUploadingResume(true)
    try {
      const resume = await uploadResume(file)
      setProfile((prev) => prev ? { ...prev, resume } : prev)
      refreshProfile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume")
    } finally {
      setIsUploadingResume(false)
      if (resumeInputRef.current) resumeInputRef.current.value = ""
    }
  }

  const handleResumeDelete = async () => {
    if (!confirm("Are you sure you want to delete your resume?")) return
    try {
      await deleteResume()
      setProfile((prev) => prev ? { ...prev, resume: null } : prev)
      refreshProfile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resume")
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isAllowedImageType(file)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.")
      if (avatarInputRef.current) avatarInputRef.current.value = ""
      return
    }

    setIsUploadingAvatar(true)
    try {
      const { avatar } = await uploadAvatar(file)
      setProfile((prev) => prev ? { ...prev, avatar } : prev)
      refreshProfile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const addLocation = () => {
    if (newLocation && !formData.preferred_locations?.includes(newLocation)) {
      setFormData({
        ...formData,
        preferred_locations: [...(formData.preferred_locations || []), newLocation],
      })
      setNewLocation("")
    }
  }

  const removeLocation = (loc: string) => {
    setFormData({
      ...formData,
      preferred_locations: formData.preferred_locations?.filter((l) => l !== loc) || [],
    })
  }

  const addKeyword = () => {
    if (newKeyword && !formData.preferred_keywords?.includes(newKeyword)) {
      setFormData({
        ...formData,
        preferred_keywords: [...(formData.preferred_keywords || []), newKeyword],
      })
      setNewKeyword("")
    }
  }

  const removeKeyword = (kw: string) => {
    setFormData({
      ...formData,
      preferred_keywords: formData.preferred_keywords?.filter((k) => k !== kw) || [],
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-background-secondary/50 rounded w-48" />
            <div className="h-10 bg-background-secondary/50 rounded w-32" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-background-secondary/50 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error || "Failed to load profile"}</p>
          <Button onClick={fetchProfile}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Hidden file inputs */}
      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleResumeUpload}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage your profile and resume
            </p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
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
                  <UserAvatar
                    name={`${profile.first_name} ${profile.last_name}`}
                    avatar={profile.avatar}
                    size="xl"
                    className="border-4 border-background shadow-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full bg-transparent"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>

                {/* Name & Headline */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      {isEditing ? (
                        <Input
                          value={formData.first_name || ""}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-foreground font-medium">{profile.first_name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      {isEditing ? (
                        <Input
                          value={formData.last_name || ""}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-foreground font-medium">{profile.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Headline</Label>
                    {isEditing ? (
                      <Input
                        value={formData.headline || ""}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="e.g., Senior Frontend Engineer"
                      />
                    ) : (
                      <p className="text-foreground-muted">{profile.headline || "Add a headline"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    {isEditing ? (
                      <Textarea
                        value={formData.bio || ""}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell employers about yourself..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-foreground-muted">{profile.bio || "Add a bio"}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={formData.open_to_work ?? profile.open_to_work}
                      onCheckedChange={(checked) => setFormData({ ...formData, open_to_work: checked })}
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
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
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
                      <p className="text-sm font-medium text-foreground">{profile.resume.file_name}</p>
                      <p className="text-xs text-foreground-muted">
                        {formatFileSize(profile.resume.file_size)} · Uploaded{" "}
                        {new Date(profile.resume.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={profile.resume.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resumeInputRef.current?.click()}
                      disabled={isUploadingResume}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleResumeDelete}
                    >
                      Delete
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-transparent"
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? "Uploading..." : "Upload Resume"}
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
                    value={formData.remote_preference || ""}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        remote_preference: v as CandidateProfileUpdate["remote_preference"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote-only">Remote Only</SelectItem>
                      <SelectItem value="remote-first">Remote First</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite-only">On-site Only</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground capitalize">
                    {profile.remote_preference?.replace("-", " ") || "Not set"}
                  </p>
                )}
              </div>

              {/* Preferred Locations */}
              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? formData.preferred_locations : profile.preferred_locations)?.map((loc) => (
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
                  {!isEditing && profile.preferred_locations.length === 0 && (
                    <p className="text-foreground-muted text-sm">No locations added</p>
                  )}
                </div>
              </div>

              {/* Preferred Keywords */}
              <div className="space-y-2">
                <Label>Role Keywords</Label>
                <p className="text-xs text-foreground-muted mb-2">Keywords that match your target roles</p>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? formData.preferred_keywords : profile.preferred_keywords)?.map((kw) => (
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
                  {!isEditing && profile.preferred_keywords.length === 0 && (
                    <p className="text-foreground-muted text-sm">No keywords added</p>
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

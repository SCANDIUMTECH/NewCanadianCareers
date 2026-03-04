"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
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
import { IndustryCombobox } from "@/components/admin/industry-combobox"
import { useCompanyContext } from "@/hooks/use-company"
import { useAuth } from "@/hooks/use-auth"
import { ExternalLink } from "lucide-react"
import { updateCompanyProfile, uploadCompanyLogo, uploadCompanyBanner } from "@/lib/api/companies"
import { getJobStats } from "@/lib/api/jobs"
import type { CompanyProfileUpdate } from "@/lib/company/types"

/**
 * Company Profile Page
 * Full-width layout with account owner info, company details,
 * headquarters address, about section, and social links.
 */

export default function CompanyProfilePage() {
  const { company, isLoading: contextLoading, refreshCompany } = useCompanyContext()
  const { user: authUser } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobStats, setJobStats] = useState<{ total_views: number; total_applications: number; published_jobs: number } | null>(null)

  // Edit form state
  const [formData, setFormData] = useState<CompanyProfileUpdate>({})

  // Initialize form when company loads
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        description: company.description,
        tagline: company.tagline ?? undefined,
        website: company.website,
        industry: company.industry,
        size: company.size,
        headquarters_address: company.headquarters_address ?? undefined,
        headquarters_city: company.headquarters_city ?? undefined,
        headquarters_state: company.headquarters_state ?? undefined,
        headquarters_country: company.headquarters_country ?? undefined,
        headquarters_postal_code: company.headquarters_postal_code ?? undefined,
        founded_year: company.founded_year ?? undefined,
        linkedin_url: company.linkedin_url ?? undefined,
        twitter_url: company.twitter_url ?? undefined,
        facebook_url: company.facebook_url ?? undefined,
        instagram_url: company.instagram_url ?? undefined,
      })
    }
  }, [company])

  // Fetch job stats
  const fetchStats = useCallback(async () => {
    try {
      const stats = await getJobStats()
      setJobStats(stats)
    } catch {
      // Stats are optional
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await updateCompanyProfile(formData)
      await refreshCompany()
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (company) {
      setFormData({
        name: company.name,
        description: company.description,
        tagline: company.tagline ?? undefined,
        website: company.website,
        industry: company.industry,
        size: company.size,
        headquarters_address: company.headquarters_address ?? undefined,
        headquarters_city: company.headquarters_city ?? undefined,
        headquarters_state: company.headquarters_state ?? undefined,
        headquarters_country: company.headquarters_country ?? undefined,
        headquarters_postal_code: company.headquarters_postal_code ?? undefined,
        founded_year: company.founded_year ?? undefined,
        linkedin_url: company.linkedin_url ?? undefined,
        twitter_url: company.twitter_url ?? undefined,
        facebook_url: company.facebook_url ?? undefined,
        instagram_url: company.instagram_url ?? undefined,
      })
    }
    setIsEditing(false)
    setError(null)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    try {
      await uploadCompanyLogo(file)
      await refreshCompany()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    try {
      await uploadCompanyBanner(file)
      await refreshCompany()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload banner")
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = <K extends keyof CompanyProfileUpdate>(key: K, value: CompanyProfileUpdate[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Loading skeleton
  if (contextLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse mb-6" />
        {/* 3-card row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="h-28 bg-background-secondary rounded-lg animate-pulse" />
          <div className="h-28 bg-background-secondary rounded-lg animate-pulse" />
          <div className="h-28 bg-background-secondary rounded-lg animate-pulse" />
        </div>
        {/* 2-col row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="h-80 bg-background-secondary rounded-lg animate-pulse" />
          <div className="h-80 bg-background-secondary rounded-lg animate-pulse" />
        </div>
        {/* About */}
        <div className="h-48 bg-background-secondary rounded-lg animate-pulse mb-6" />
        {/* Social */}
        <div className="h-48 bg-background-secondary rounded-lg animate-pulse mb-6" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Banner */}
      <MotionWrapper delay={0}>
        <div className="relative mb-6 rounded-xl overflow-hidden bg-background-secondary h-40 md:h-48">
          {company?.banner ? (
            <Image
              src={company.banner}
              alt="Company banner"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center gap-2">
              <svg className="w-8 h-8 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-sm font-medium text-foreground-muted/50">No banner uploaded</p>
              <p className="text-xs text-foreground-muted/40">Recommended: 1400 x 400px. PNG, JPG, WebP, or SVG. Max 5MB.</p>
            </div>
          )}
          {isEditing && (
            <label className="absolute bottom-3 right-3 cursor-pointer">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-sm font-medium hover:bg-background transition-colors cursor-pointer">
                {company?.banner ? "Change Banner" : "Upload Banner"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                onChange={handleBannerUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Company Profile</h1>
            <p className="text-sm text-foreground-muted mt-1">Manage your company information displayed on job listings</p>
          </div>
          <div className="flex items-center gap-3">
            {company?.entity_id && (
              <Button variant="outline" className="bg-transparent" asChild>
                <a href={`/companies/${company.entity_id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View Public Profile
                </a>
              </Button>
            )}
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="bg-transparent">
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

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Account Owner + Verification + Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <MotionWrapper delay={50}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Account Owner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {authUser?.avatar ? (
                    <Image
                      src={authUser.avatar}
                      alt={authUser.full_name}
                      width={48}
                      height={48}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-primary">
                      {authUser?.first_name?.charAt(0) || ""}{authUser?.last_name?.charAt(0) || ""}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {authUser?.full_name || `${authUser?.first_name || ""} ${authUser?.last_name || ""}`.trim() || "—"}
                  </p>
                  <p className="text-sm text-foreground-muted truncate">{authUser?.email || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        <MotionWrapper delay={75}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {company?.status === "verified" ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-emerald-600">Verified</p>
                    <p className="text-xs text-foreground-muted">Domain verified</p>
                  </div>
                </div>
              ) : company?.status === "pending" ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-amber-600">Pending Review</p>
                    <p className="text-xs text-foreground-muted">Verification under review</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-600">Unverified</p>
                    <p className="text-xs text-foreground-muted">Verify your domain to get a badge</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>

        <MotionWrapper delay={100}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Profile Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{(jobStats?.total_views ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-foreground-muted">Views</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{jobStats?.published_jobs ?? company?.job_count ?? 0}</p>
                  <p className="text-xs text-foreground-muted">Active Jobs</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{jobStats?.total_applications ?? 0}</p>
                  <p className="text-xs text-foreground-muted">Applications</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{company?.member_count ?? 0}</p>
                  <p className="text-xs text-foreground-muted">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Company Info + Address Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Basic Information */}
        <MotionWrapper delay={125}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Company Information</CardTitle>
              <CardDescription>Core details visible on all job listings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo */}
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {company?.logo ? (
                    company.logo.endsWith('.svg') ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Image
                        src={company.logo}
                        alt={company.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {company?.name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <label className="cursor-pointer inline-block">
                      <span className="inline-flex items-center justify-center rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                        Upload Logo
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-foreground-muted">SVG, PNG, JPG, or WebP. Max 2MB.</p>
                  </div>
                ) : (
                  <div className="pt-1">
                    <p className="font-semibold text-foreground text-lg">{company?.name}</p>
                    <p className="text-sm text-foreground-muted">{company?.industry || "No industry set"}</p>
                    {company?.is_verified && (
                      <Badge variant="outline" className="mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Company Name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.name || "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Website</Label>
                  {isEditing ? (
                    <Input
                      value={formData.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://example.com"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.website || "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Industry</Label>
                  {isEditing ? (
                    <IndustryCombobox
                      value={formData.industry || ""}
                      onValueChange={(v) => updateField("industry", v)}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.industry || "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Company Size</Label>
                  {isEditing ? (
                    <Select
                      value={formData.size || ""}
                      onValueChange={(v) => updateField("size", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1001-5000">1001-5000 employees</SelectItem>
                        <SelectItem value="5001+">5001+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.size ? `${company.size} employees` : "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Founded</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.founded_year || ""}
                      onChange={(e) => updateField("founded_year", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="2020"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.founded_year || "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Headquarters Address */}
        <MotionWrapper delay={150}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Headquarters Address</CardTitle>
              <CardDescription>Company location shown on job listings and profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Street Address</Label>
                  {isEditing ? (
                    <Input
                      value={formData.headquarters_address || ""}
                      onChange={(e) => updateField("headquarters_address", e.target.value || null)}
                      placeholder="123 Main Street, Suite 100"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{company?.headquarters_address || "—"}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">City</Label>
                    {isEditing ? (
                      <Input
                        value={formData.headquarters_city || ""}
                        onChange={(e) => updateField("headquarters_city", e.target.value || null)}
                        placeholder="Toronto"
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{company?.headquarters_city || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">State / Province</Label>
                    {isEditing ? (
                      <Input
                        value={formData.headquarters_state || ""}
                        onChange={(e) => updateField("headquarters_state", e.target.value || null)}
                        placeholder="California"
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{company?.headquarters_state || "—"}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Postal / ZIP Code</Label>
                    {isEditing ? (
                      <Input
                        value={formData.headquarters_postal_code || ""}
                        onChange={(e) => updateField("headquarters_postal_code", e.target.value || null)}
                        placeholder="94102"
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{company?.headquarters_postal_code || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Country</Label>
                    {isEditing ? (
                      <Input
                        value={formData.headquarters_country || ""}
                        onChange={(e) => updateField("headquarters_country", e.target.value || null)}
                        placeholder="United States"
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{company?.headquarters_country || "—"}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* About Section */}
      <div className="mb-6">
        <MotionWrapper delay={175}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">About</CardTitle>
              <CardDescription>Tell candidates about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Company Description</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={5}
                    placeholder="Describe your company, mission, and culture..."
                  />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{company?.description || "No description added yet."}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Tagline</Label>
                {isEditing ? (
                  <Input
                    value={formData.tagline || ""}
                    onChange={(e) => updateField("tagline", e.target.value)}
                    placeholder="A short tagline for your company"
                  />
                ) : (
                  <p className="text-sm text-foreground">{company?.tagline || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Social Links */}
      <div className="mb-6">
        <MotionWrapper delay={200}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Social Links</CardTitle>
              <CardDescription>Help candidates learn more about your company online</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LinkedIn */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-social-linkedin/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-social-linkedin" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">LinkedIn</Label>
                    {isEditing ? (
                      <Input
                        value={formData.linkedin_url || ""}
                        onChange={(e) => updateField("linkedin_url", e.target.value || null)}
                        placeholder="https://linkedin.com/company/..."
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{company?.linkedin_url || "—"}</p>
                    )}
                  </div>
                </div>

                {/* X */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">X</Label>
                    {isEditing ? (
                      <Input
                        value={formData.twitter_url || ""}
                        onChange={(e) => updateField("twitter_url", e.target.value || null)}
                        placeholder="https://x.com/..."
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{company?.twitter_url || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Facebook */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-social-facebook/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-social-facebook" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Facebook</Label>
                    {isEditing ? (
                      <Input
                        value={formData.facebook_url || ""}
                        onChange={(e) => updateField("facebook_url", e.target.value || null)}
                        placeholder="https://facebook.com/..."
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{company?.facebook_url || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-social-instagram-from/10 via-social-instagram-via/10 to-social-instagram-to/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-social-instagram" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Label className="text-foreground-muted text-xs font-medium uppercase tracking-wider">Instagram</Label>
                    {isEditing ? (
                      <Input
                        value={formData.instagram_url || ""}
                        onChange={(e) => updateField("instagram_url", e.target.value || null)}
                        placeholder="https://instagram.com/..."
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{company?.instagram_url || "—"}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>
    </div>
  )
}

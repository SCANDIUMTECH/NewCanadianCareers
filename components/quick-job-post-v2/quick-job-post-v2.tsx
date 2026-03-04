"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  currencies,
  jobTypes,
  remoteOptions,
  wagePeriods,
  type Currency,
  type JobType,
  type QuickJobCompany,
  type QuickJobDraft,
  type RemoteType,
  type WagePeriod,
  getJobStatusFromDate,
  validateForPublish,
} from "@/lib/quick-job-schema"
import {
  useAgencySettings,
  useExitConfirmation,
  useQuickJobPost,
  useQuickJobShortcuts,
} from "@/hooks/use-quick-job-post"
import { CHART } from "@/lib/constants/colors"
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
} from "lucide-react"

const emailSchema = z.string().email()

const baseCompanies: QuickJobCompany[] = [
  {
    id: 1,
    name: "Acme Corporation",
    initials: "AC",
    color: CHART.primary,
    verified: true,
    industry: "Technology",
    applyEmail: "careers@acme.com",
  },
  {
    id: 2,
    name: "TechStart Inc",
    initials: "TS",
    color: CHART.success,
    verified: true,
    industry: "SaaS",
    applyEmail: "jobs@techstart.io",
  },
  {
    id: 3,
    name: "Global Dynamics",
    initials: "GD",
    color: CHART.warning,
    verified: false,
    industry: "Finance",
    applyEmail: "hr@globaldynamics.com",
  },
  {
    id: 4,
    name: "Innovate Labs",
    initials: "IL",
    color: CHART.purple,
    verified: true,
    industry: "Research",
    applyEmail: "talent@innovatelabs.co",
  },
]

type PublishMode = "now" | "schedule"

interface QuickJobPostV2Props {
  initialCompanyId?: number
}

export function QuickJobPostV2({ initialCompanyId }: QuickJobPostV2Props) {
  const router = useRouter()
  const { settings } = useAgencySettings()

  const [publishMode, setPublishMode] = useState<PublishMode>("now")
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const [pendingPublish, setPendingPublish] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companySearch, setCompanySearch] = useState("")
  const [createdCompanies, setCreatedCompanies] = useState<QuickJobCompany[]>([])
  const [newCompanyName, setNewCompanyName] = useState("")

  const {
    data,
    selectedCompany,
    isDirty,
    isSaving,
    isPublishing,
    lastSaved,
    selectCompany,
    updateField,
    saveDraft,
    publish,
  } = useQuickJobPost(initialCompanyId)

  useExitConfirmation(isDirty)

  const companies = useMemo(() => [...createdCompanies, ...baseCompanies], [createdCompanies])

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase()
    if (!q) return companies
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
    )
  }, [companies, companySearch])

  const effectivePostDate = useMemo(() => {
    if (publishMode === "now") return new Date().toISOString()
    return data.postDate || ""
  }, [publishMode, data.postDate])

  const effectiveDataForValidation = useMemo(() => {
    const companyId = selectedCompany?.id ?? (data.companyId ?? 0)
    return {
      ...data,
      companyId,
      postDate: effectivePostDate,
    } satisfies QuickJobDraft
  }, [data, selectedCompany, effectivePostDate])

  const publishStatus = useMemo(() => getJobStatusFromDate(effectivePostDate), [effectivePostDate])

  const publishLabel = publishMode === "schedule" ? "Schedule" : "Publish"

  const publishReadiness = useMemo(() => {
    const result = validateForPublish(effectiveDataForValidation)
    return {
      valid: result.valid,
      errors: result.errors,
    }
  }, [effectiveDataForValidation])

  const uiErrors = useMemo<Record<string, string>>(
    () => (showErrors ? publishReadiness.errors : {}),
    [showErrors, publishReadiness.errors]
  )

  const completion = useMemo(() => {
    const required = [
      !!selectedCompany,
      !!data.title?.trim(),
      !!data.type,
      !!data.location?.trim(),
      (data.description?.trim().length || 0) >= 50,
      !!data.applyEmail?.trim() && emailSchema.safeParse(data.applyEmail).success,
      publishMode === "now" || !!data.postDate,
    ]
    const score = required.filter(Boolean).length / required.length
    return Math.round(score * 100)
  }, [selectedCompany, data, publishMode])

  const handleBack = () => {
    if (isDirty) {
      setShowExitDialog(true)
      return
    }
    router.push("/agency/jobs")
  }

  const handleSave = async () => {
    if (!selectedCompany) {
      setCompanyDialogOpen(true)
      return
    }

    const ok = await saveDraft()
    if (ok) {
      setSaveToast(true)
      window.setTimeout(() => setSaveToast(false), 2000)
    }
  }

  const ensurePostDateForMode = (mode: PublishMode) => {
    if (mode === "now") {
      updateField("postDate", new Date().toISOString())
      return
    }
    if (!data.postDate) {
      updateField("postDate", "")
    }
  }

  const handlePublish = async () => {
    setShowErrors(true)

    if (!selectedCompany) {
      setCompanyDialogOpen(true)
      return
    }

    if (!publishReadiness.valid) {
      return
    }

    if (publishMode === "now") {
      if (!data.postDate || getJobStatusFromDate(data.postDate) === "scheduled") {
        updateField("postDate", new Date().toISOString())
        setPendingPublish(true)
        return
      }
    }

    if (publishMode === "schedule" && !data.postDate) {
      return
    }

    await publish()
  }

  useQuickJobShortcuts(handleSave, handlePublish)

  useEffect(() => {
    if (!pendingPublish) return
    if (!data.postDate) return
    setPendingPublish(false)
    publish()
  }, [pendingPublish, data.postDate, publish])

  useEffect(() => {
    if (!initialCompanyId) return
    const company = companies.find((c) => c.id === initialCompanyId)
    if (!company) return
    selectCompany(company)
  }, [initialCompanyId, companies, selectCompany])

  const insertDescriptionTemplate = () => {
    const role = (data.title || "Role").trim() || "Role"
    const company = selectedCompany?.name || "the company"
    const location = data.remote === "remote" ? "Remote" : (data.location || "On-site")
    const employment = jobTypes.find((t) => t.value === data.type)?.label || "Employment"

    const template = [
      `About ${company}`,
      `${company} is hiring for ${role}.`,
      "",
      "What you’ll do",
      "- ",
      "",
      "What we’re looking for",
      "- ",
      "",
      "Why this role",
      "- ",
      "",
      `Details: ${employment} • ${location}`,
    ].join("\n")

    updateField("description", template)
  }

  const topMeta = (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        Typically under 2 minutes
      </span>
      <span className="hidden sm:inline">•</span>
      <span className="hidden sm:inline">Autosaves while you type</span>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4 pb-6">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Quick job post</h1>
            {topMeta}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>⌘S</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {publishLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>⌘↵</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-8 pb-16">
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Essentials</CardTitle>
              <CardDescription>Only the fields needed to publish. Everything else is optional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Company</Label>
                <button
                  type="button"
                  onClick={() => setCompanyDialogOpen(true)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/40",
                    !selectedCompany && "text-muted-foreground",
                    uiErrors.companyId && "border-destructive"
                  )}
                >
                  {selectedCompany ? (
                    <span className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${selectedCompany.color}15` }}
                      >
                        <span className="text-sm font-semibold" style={{ color: selectedCompany.color }}>
                          {selectedCompany.initials}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{selectedCompany.name}</span>
                          {selectedCompany.verified && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">{selectedCompany.industry}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Change</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Select a company…
                    </span>
                  )}
                </button>
                {uiErrors.companyId && <p className="text-sm text-destructive">{uiErrors.companyId}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job title</Label>
                  <Input
                    id="title"
                    value={data.title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g. Senior Frontend Developer"
                    className={cn(uiErrors.title && "border-destructive")}
                  />
                  {uiErrors.title && <p className="text-sm text-destructive">{uiErrors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Job type</Label>
                  <select
                    value={data.type || ""}
                    onChange={(e) => updateField("type", e.target.value as JobType)}
                    className={cn(
                      "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      uiErrors.type && "border-destructive"
                    )}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {jobTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {uiErrors.type && <p className="text-sm text-destructive">{uiErrors.type}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work arrangement</Label>
                <div className="grid grid-cols-3 gap-2">
                  {remoteOptions.map((opt) => {
                    const active = data.remote === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("remote", opt.value as RemoteType)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={data.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder={data.remote === "remote" ? "Remote (Canadian timezone/region)" : "e.g., Toronto, ON"}
                    className={cn("pl-9", uiErrors.location && "border-destructive")}
                  />
                </div>
                {uiErrors.location && <p className="text-sm text-destructive">{uiErrors.location}</p>}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="description">Job description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={insertDescriptionTemplate}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Insert template
                  </Button>
                </div>
                <Textarea
                  id="description"
                  value={data.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={9}
                  placeholder="Describe the role, responsibilities, requirements, and why it’s a great opportunity."
                  className={cn(uiErrors.description && "border-destructive")}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(uiErrors.description ? "text-destructive" : "text-muted-foreground")}>
                    {uiErrors.description ? uiErrors.description : "Aim for clarity. Bullets work well."}
                  </span>
                  <span
                    className={cn(
                      (data.description?.length || 0) >= 50
                        ? "text-muted-foreground"
                        : "text-amber-700"
                    )}
                  >
                    {data.description?.length || 0} / 50+
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Optional details</CardTitle>
              <CardDescription>Add these if you have them—greatly improves applicant quality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary range</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={data.wageMin ?? ""}
                        onChange={(e) =>
                          updateField(
                            "wageMin",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        placeholder="Min"
                        className="pl-9"
                      />
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={data.wageMax ?? ""}
                        onChange={(e) =>
                          updateField(
                            "wageMax",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        placeholder="Max"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[96px,1fr] gap-2">
                    <select
                      value={data.currency || "USD"}
                      onChange={(e) => updateField("currency", e.target.value as Currency)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      {currencies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={data.wagePeriod || "year"}
                      onChange={(e) => updateField("wagePeriod", e.target.value as WagePeriod)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      {wagePeriods.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">Hours per week</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={168}
                    value={data.hoursPerWeek ?? ""}
                    onChange={(e) =>
                      updateField(
                        "hoursPerWeek",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 40"
                  />
                  <p className="text-xs text-muted-foreground">Optional, but helps set expectations.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:hidden">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Actions</CardTitle>
                <CardDescription>Save a draft or publish when ready.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="justify-center"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="justify-center"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {publishLabel}
                </Button>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ""}</span>
                  <span className={cn(saveToast ? "text-emerald-700" : "text-transparent")}>Saved</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Readiness</CardTitle>
                <span className="text-xs text-muted-foreground">{completion}%</span>
              </div>
              <Progress value={completion} />
            </CardHeader>
            <CardContent className="space-y-3">
              <ChecklistItem ok={!!selectedCompany} label="Company selected" />
              <ChecklistItem ok={!!data.title?.trim()} label="Job title" />
              <ChecklistItem ok={!!data.type} label="Job type" />
              <ChecklistItem ok={!!data.location?.trim()} label="Location" />
              <ChecklistItem ok={(data.description?.trim().length || 0) >= 50} label="Description (50+ chars)" />
              <ChecklistItem
                ok={!!data.applyEmail?.trim() && emailSchema.safeParse(data.applyEmail).success}
                label="Apply email"
              />
              <ChecklistItem
                ok={publishMode === "now" || !!data.postDate}
                label={publishMode === "now" ? "Publish immediately" : "Schedule date"}
              />

              {showErrors && !publishReadiness.valid && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Fix the missing required fields to {publishLabel.toLowerCase()}.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Publish</CardTitle>
              <CardDescription>Choose publish now or schedule for later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={publishMode}
                onValueChange={(v) => {
                  const next = v as PublishMode
                  setPublishMode(next)
                  ensurePostDateForMode(next)
                }}
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="now" className="justify-center">
                    Now
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="justify-center">
                    Schedule
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="now" className="mt-3 space-y-3">
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Publish immediately
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We’ll set the publish date to today when you publish.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Publish date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start font-normal",
                            !data.postDate && "text-muted-foreground",
                            uiErrors.postDate && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data.postDate ? format(new Date(data.postDate), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={data.postDate ? new Date(data.postDate) : undefined}
                          onSelect={(d) => updateField("postDate", d ? d.toISOString() : "")}
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)

                            const min = settings.allow_backdated_post_date
                              ? new Date(today.getTime() - (settings.max_backdate_days || 167) * 86400000)
                              : today

                            const candidate = new Date(date)
                            candidate.setHours(0, 0, 0, 0)
                            return candidate < min
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {uiErrors.postDate && <p className="text-sm text-destructive">{uiErrors.postDate}</p>}

                    {data.postDate && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className={cn(publishStatus === "scheduled" ? "text-amber-700" : "text-emerald-700")}>
                            {publishStatus === "scheduled"
                              ? `Will publish ${format(new Date(data.postDate), "MMM d, yyyy")}`
                              : "Publishing immediately"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Applications</CardTitle>
              <CardDescription>Where should candidates apply?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={data.applyEmail || ""}
                  onChange={(e) => updateField("applyEmail", e.target.value)}
                  placeholder="e.g. jobs@company.com"
                  className={cn("pl-9", uiErrors.applyEmail && "border-destructive")}
                />
              </div>
              {uiErrors.applyEmail && <p className="text-sm text-destructive">{uiErrors.applyEmail}</p>}

              {!data.applyEmail && settings.default_apply_email && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateField("applyEmail", settings.default_apply_email || "")}
                  className="w-full justify-center"
                >
                  Use agency default: {settings.default_apply_email}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Live preview</CardTitle>
              <CardDescription>How this will look to candidates.</CardDescription>
            </CardHeader>
            <CardContent>
              <JobPreview
                company={selectedCompany}
                data={data}
                publishMode={publishMode}
                effectivePostDate={effectivePostDate}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDesc>Save your draft before leaving?</DialogDesc>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => router.push("/agency/jobs")}>
              Discard
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await handleSave()
                router.push("/agency/jobs")
              }}
            >
              Save & exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select a company</DialogTitle>
            <DialogDesc>Pick the client you’re posting on behalf of.</DialogDesc>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies…"
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[260px] rounded-lg border">
              <div className="p-2">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        selectCompany(company)
                        if (!data.applyEmail && (company.applyEmail || settings.default_apply_email)) {
                          updateField("applyEmail", company.applyEmail || settings.default_apply_email || "")
                        }
                        setCompanyDialogOpen(false)
                      }}
                      className={cn(
                        "w-full rounded-lg p-3 text-left transition-colors",
                        "hover:bg-muted/50",
                        selectedCompany?.id === company.id && "bg-primary/5"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                          style={{ backgroundColor: `${company.color}15` }}
                        >
                          <span className="text-sm font-semibold" style={{ color: company.color }}>
                            {company.initials}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium truncate">{company.name}</span>
                            {company.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </span>
                          <span className="block text-xs text-muted-foreground">{company.industry}</span>
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No matches
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Add a new company</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Company name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const name = newCompanyName.trim()
                    if (!name) return
                    const initials = name
                      .split(" ")
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    const newCompany: QuickJobCompany = {
                      id: Date.now(),
                      name,
                      initials: initials || "CO",
                      color: CHART.primary,
                      verified: false,
                      industry: "Other",
                    }

                    setCreatedCompanies((prev) => [newCompany, ...prev])
                    selectCompany(newCompany)
                    setNewCompanyName("")
                    setCompanyDialogOpen(false)
                  }}
                  disabled={!newCompanyName.trim()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                You can complete the company profile later.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden md:block fixed right-6 bottom-6 z-40">
        <div
          className={cn(
            "rounded-xl border bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5",
            "px-4 py-3 w-[360px]"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {selectedCompany ? selectedCompany.name : "Select a company"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isSaving
                  ? "Saving…"
                  : lastSaved
                    ? `Saved ${lastSaved.toLocaleTimeString()}`
                    : isDirty
                      ? "Unsaved changes"
                      : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {publishLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      </span>
    </div>
  )
}

function JobPreview({
  company,
  data,
  publishMode,
  effectivePostDate,
}: {
  company: QuickJobCompany | null
  data: QuickJobDraft
  publishMode: PublishMode
  effectivePostDate: string
}) {
  const title = data.title?.trim() || "Untitled role"
  const companyName = company?.name || "Company"
  const type = jobTypes.find((t) => t.value === data.type)?.label
  const remote = remoteOptions.find((r) => r.value === data.remote)?.label

  const location = data.remote === "remote" ? "Remote" : data.location?.trim() || "Location"

  const salary =
    data.wageMin || data.wageMax
      ? `${data.currency || "USD"} ${data.wageMin || "…"}–${data.wageMax || "…"} ${wagePeriods.find((w) => w.value === (data.wagePeriod || "year"))?.label || ""}`
      : null

  const descriptionSnippet = (data.description || "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 140)

  const publishText = publishMode === "now"
    ? "Publishes immediately"
    : effectivePostDate
      ? `Publishes ${format(new Date(effectivePostDate), "MMM d")}`
      : "Pick a publish date"

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-xs text-muted-foreground truncate">{companyName}</div>
          </div>
          <div className="text-[11px] text-muted-foreground shrink-0">{publishText}</div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
          {(type || remote) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
              <Building2 className="h-3.5 w-3.5" />
              {type || ""}{type && remote ? " • " : ""}{remote || ""}
            </span>
          )}
          {salary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
              <DollarSign className="h-3.5 w-3.5" />
              {salary}
            </span>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {descriptionSnippet ? `${descriptionSnippet}${(data.description || "").length > 140 ? "…" : ""}` : "Start typing a description to see a preview."}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Apply: {data.applyEmail?.trim() || "—"}
        </div>
      </div>
    </div>
  )
}

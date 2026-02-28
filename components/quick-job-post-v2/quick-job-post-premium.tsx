"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { cn, getVisibleTextLength, sanitizeHtml } from "@/lib/utils"
import { addAgencyClient } from "@/lib/api/agencies"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowLeft,
  Building2,
  CalendarIcon,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Save,
  Search,
  Send,
} from "lucide-react"
import { TiptapEditor } from "./tiptap-editor"

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
    location: "San Francisco, CA",
  },
  {
    id: 2,
    name: "TechStart Inc",
    initials: "TS",
    color: CHART.success,
    verified: true,
    industry: "SaaS",
    applyEmail: "jobs@techstart.io",
    location: "Austin, TX",
  },
  {
    id: 3,
    name: "Global Dynamics",
    initials: "GD",
    color: CHART.warning,
    verified: false,
    industry: "Finance",
    applyEmail: "hr@globaldynamics.com",
    location: "New York, NY",
  },
  {
    id: 4,
    name: "Innovate Labs",
    initials: "IL",
    color: CHART.purple,
    verified: true,
    industry: "Research",
    applyEmail: "talent@innovatelabs.co",
    location: "Seattle, WA",
  },
]


interface QuickJobPostPremiumProps {
  initialCompanyId?: number
}

export function QuickJobPostPremium({ initialCompanyId }: QuickJobPostPremiumProps) {
  const router = useRouter()
  const { settings } = useAgencySettings()

  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saveToast, setSaveToast] = useState(false)

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companyDialogMode, setCompanyDialogMode] = useState<"select" | "add">("select")
  const [companySearch, setCompanySearch] = useState("")
  const [createdCompanies, setCreatedCompanies] = useState<QuickJobCompany[]>([])

  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyLocation, setNewCompanyLocation] = useState("")
  const [newCompanyApplyEmail, setNewCompanyApplyEmail] = useState("")

  const [successOpen, setSuccessOpen] = useState(false)
  const [successStatus, setSuccessStatus] = useState<"published" | "scheduled">("published")
  const [successDate, setSuccessDate] = useState<string>("")

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

  useEffect(() => {
    if (!initialCompanyId) return
    const company = companies.find((c) => c.id === initialCompanyId)
    if (!company) return
    selectCompany(company)
  }, [initialCompanyId, companies, selectCompany])

  useEffect(() => {
    if (!selectedCompany) return
    if (data.postDate) return
    updateField("postDate", new Date().toISOString())
  }, [selectedCompany, data.postDate, updateField])

  const effectiveDataForValidation = useMemo(() => {
    const companyId = selectedCompany?.id ?? (data.companyId ?? 0)
    return {
      ...data,
      companyId,
    } satisfies QuickJobDraft
  }, [data, selectedCompany])

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

  const status = getJobStatusFromDate(data.postDate || "")
  const isFuturePublish = status === "scheduled"

  const openCompanyDialog = (mode: "select" | "add") => {
    setCompanyDialogMode(mode)
    setCompanyDialogOpen(true)
  }

  const handleBack = () => {
    if (isDirty) {
      setShowExitDialog(true)
      return
    }
    router.push("/agency/jobs")
  }

  const handleSave = async () => {
    if (!selectedCompany) {
      openCompanyDialog("select")
      return
    }

    const ok = await saveDraft()
    if (ok) {
      setSaveToast(true)
      window.setTimeout(() => setSaveToast(false), 2000)
    }
  }

  const handlePublish = async () => {
    setShowErrors(true)

    if (!selectedCompany) {
      openCompanyDialog("select")
      return
    }

    if (!publishReadiness.valid) {
      return
    }

    const currentStatus = getJobStatusFromDate(data.postDate || "")
    const ok = await publish({ redirectTo: null })
    if (!ok) return

    setSuccessStatus(currentStatus === "scheduled" ? "scheduled" : "published")
    setSuccessDate(data.postDate || "")
    setSuccessOpen(true)
  }

  useQuickJobShortcuts(handleSave, handlePublish)

  const handleSelectCompany = (company: QuickJobCompany) => {
    selectCompany(company)

    const emailPrefill = company.applyEmail || settings.default_apply_email || ""
    if (!data.applyEmail && emailPrefill) {
      updateField("applyEmail", emailPrefill)
    }

    if (!data.location && company.location) {
      updateField("location", company.location)
    }

    setCompanyDialogOpen(false)
    setCompanyDialogMode("select")
  }

  const [isCreatingCompany, setIsCreatingCompany] = useState(false)

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim()
    const location = newCompanyLocation.trim()
    const applyEmail = newCompanyApplyEmail.trim()

    if (!name || !location) return
    if (!emailSchema.safeParse(applyEmail).success) return

    setIsCreatingCompany(true)
    try {
      const client = await addAgencyClient({ name })
      const companyName = client.company_detail?.name ?? client.company_name ?? name

      const initials = companyName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

      const newCompany: QuickJobCompany = {
        id: client.company,
        name: companyName,
        initials: initials || "CO",
        color: CHART.primary,
        verified: false,
        industry: "Other",
        applyEmail,
        location,
      }

      setCreatedCompanies((prev) => [newCompany, ...prev])
      selectCompany(newCompany)

      updateField("applyEmail", applyEmail)
      updateField("location", location)
      updateField("postDate", new Date().toISOString())

      setNewCompanyName("")
      setNewCompanyLocation("")
      setNewCompanyApplyEmail("")
      setCompanyDialogOpen(false)
      setCompanyDialogMode("select")
    } catch {
      toast.error("Failed to create company. Please try again.")
    } finally {
      setIsCreatingCompany(false)
    }
  }

  const title = data.title?.trim() || "Untitled role"
  const companyName = selectedCompany?.name || "Company"
  const type = jobTypes.find((t) => t.value === data.type)?.label
  const remote = remoteOptions.find((r) => r.value === data.remote)?.label
  const location = data.remote === "remote" ? "Remote" : data.location?.trim() || "Location"

  const salary =
    data.wageMin || data.wageMax
      ? `${data.currency || "USD"} ${data.wageMin || "…"}–${data.wageMax || "…"} ${wagePeriods.find((w) => w.value === (data.wagePeriod || "year"))?.label || ""}`
      : null

  const onPostDateSelect = (d?: Date) => {
    updateField("postDate", d ? d.toISOString() : "")
  }

  const minDate = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!settings.allow_backdated_post_date) return today

    const maxDays = settings.max_backdate_days || 167
    return new Date(today.getTime() - maxDays * 86400000)
  }, [settings.allow_backdated_post_date, settings.max_backdate_days])

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
      <div className="flex items-start justify-between gap-4 py-6">
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
            <div className="text-xs text-muted-foreground">
              {selectedCompany ? "Fast, full-page composer" : "Select a company to begin"}
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground pt-2">
          {isSaving ? "Saving…" : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : isDirty ? "Unsaved" : ""}
        </div>
      </div>

      <motion.div
        initial={false}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.16 }}
      >
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Company</CardTitle>
            <CardDescription>Company details auto-fill key job fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2">
              <button
                type="button"
                onClick={() => openCompanyDialog("select")}
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
                      <span className="block text-xs text-muted-foreground truncate">
                        {selectedCompany.location || selectedCompany.industry}
                      </span>
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

              <Button
                type="button"
                variant="outline"
                onClick={() => openCompanyDialog("add")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add new
              </Button>
            </div>

            {uiErrors.companyId && <p className="text-sm text-destructive">{uiErrors.companyId}</p>}
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {!selectedCompany ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="mt-6"
          >
            <Card className="border-border/60">
              <CardContent className="py-10">
                <div className="max-w-md mx-auto text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-2xl border bg-muted/30 flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">
                      Select or create a company to start posting a job.
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Company details help auto-fill job fields and speed up posting.
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button type="button" onClick={() => openCompanyDialog("select")}>
                      Select company
                    </Button>
                    <Button type="button" variant="outline" onClick={() => openCompanyDialog("add")}>
                      Add new company
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="mt-6 space-y-6"
          >
            <motion.div initial={false} whileHover={{ y: -1 }} transition={{ duration: 0.16 }}>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Job details</CardTitle>
                  <CardDescription>Core fields are grouped for speed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Label>Employment type</Label>
                    <Select value={data.type || ""} onValueChange={(v) => updateField("type", v as JobType)}>
                      <SelectTrigger className={cn(uiErrors.type && "border-destructive")}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {uiErrors.type && <p className="text-sm text-destructive">{uiErrors.type}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Work arrangement</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {remoteOptions.map((opt) => {
                          const active = data.remote === opt.value
                          return (
                            <motion.button
                              key={opt.value}
                              type="button"
                              onClick={() => updateField("remote", opt.value as RemoteType)}
                              whileHover={{ y: -1 }}
                              transition={{ duration: 0.12 }}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              {opt.label}
                            </motion.button>
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
                          placeholder={data.remote === "remote" ? "Remote (timezone/region)" : "City / Region"}
                          className={cn("pl-9", uiErrors.location && "border-destructive")}
                        />
                      </div>
                      {uiErrors.location && <p className="text-sm text-destructive">{uiErrors.location}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wage range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={data.wageMin ?? ""}
                          onChange={(e) =>
                            updateField("wageMin", e.target.value ? Number(e.target.value) : undefined)
                          }
                          placeholder="Min"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="number"
                          value={data.wageMax ?? ""}
                          onChange={(e) =>
                            updateField("wageMax", e.target.value ? Number(e.target.value) : undefined)
                          }
                          placeholder="Max"
                        />
                      </div>

                      <div className="grid grid-cols-[110px,1fr] gap-2">
                        <Select
                          value={data.currency || "USD"}
                          onValueChange={(v) => updateField("currency", v as Currency)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={data.wagePeriod || "year"}
                          onValueChange={(v) => updateField("wagePeriod", v as WagePeriod)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {wagePeriods.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours</Label>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applyEmail">Apply email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="applyEmail"
                          value={data.applyEmail || ""}
                          onChange={(e) => updateField("applyEmail", e.target.value)}
                          placeholder="e.g. jobs@company.com"
                          className={cn("pl-9", uiErrors.applyEmail && "border-destructive")}
                        />
                      </div>
                      {uiErrors.applyEmail && <p className="text-sm text-destructive">{uiErrors.applyEmail}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Post date</Label>
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
                            {data.postDate ? format(new Date(data.postDate), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={data.postDate ? new Date(data.postDate) : undefined}
                            onSelect={onPostDateSelect}
                            disabled={(date) => {
                              const candidate = new Date(date)
                              candidate.setHours(0, 0, 0, 0)
                              return candidate < minDate
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {uiErrors.postDate && <p className="text-sm text-destructive">{uiErrors.postDate}</p>}
                    </div>
                  </div>

                  <AnimatePresence>
                    {data.postDate && isFuturePublish ? (
                      <motion.div
                        key="scheduleInfo"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16 }}
                        className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <div className="text-foreground">
                          This job will automatically go live on {format(new Date(data.postDate), "PPP")}.
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          You can still edit or unpublish it before then.
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Job description</Label>
                      <div className="text-xs text-muted-foreground">
                        {getVisibleTextLength(data.description || "")} / 50+
                      </div>
                    </div>

                    <TiptapEditor
                      value={data.description || ""}
                      onChange={(next) => updateField("description", next)}
                      placeholder="Describe the role, responsibilities, and requirements."
                      minHeight={260}
                    />

                    {uiErrors.description && <p className="text-sm text-destructive">{uiErrors.description}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={false} whileHover={{ y: -1 }} transition={{ duration: 0.16 }}>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Candidate-facing listing preview.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border bg-card shadow-sm">
                    <div className="p-4 md:p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold tracking-tight truncate">{title}</div>
                          <div className="text-sm text-muted-foreground truncate">{companyName}</div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {data.postDate
                            ? isFuturePublish
                              ? `Goes live ${format(new Date(data.postDate), "MMM d")}`
                              : "Live today"
                            : ""}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {location}
                        </span>
                        {(type || remote) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {type || ""}
                            {type && remote ? " • " : ""}
                            {remote || ""}
                          </span>
                        )}
                        {salary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
                            {salary}
                          </span>
                        )}
                      </div>

                      <AnimatePresence mode="wait">
                        {getVisibleTextLength(data.description || "") > 0 ? (
                          <motion.div
                            key="desc"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.description || "") }}
                          />
                        ) : (
                          <motion.div
                            key="descEmpty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="text-sm text-muted-foreground"
                          >
                            Start writing a description to see the preview.
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="pt-3 border-t text-sm">
                        <div className="text-xs text-muted-foreground">Apply</div>
                        <div className="font-medium">{data.applyEmail?.trim() || "—"}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="text-xs text-muted-foreground">
                <AnimatePresence>
                  {saveToast ? (
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.16 }}
                      className="inline-flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Saved draft
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save draft
                </Button>
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="gap-2"
                >
                  {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDesc>Save your draft before leaving?</DialogDesc>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => router.push("/agency/jobs")}>Discard</Button>
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

      <Dialog
        open={companyDialogOpen}
        onOpenChange={(v) => {
          setCompanyDialogOpen(v)
          if (!v) {
            setCompanyDialogMode("select")
            setCompanySearch("")
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{companyDialogMode === "add" ? "Add a company" : "Select a company"}</DialogTitle>
            <DialogDesc>
              {companyDialogMode === "add"
                ? "Create a company profile to prefill job details."
                : "Company details help prefill job fields."}
            </DialogDesc>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-1">
              <Button
                type="button"
                variant={companyDialogMode === "select" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setCompanyDialogMode("select")}
              >
                Select
              </Button>
              <Button
                type="button"
                variant={companyDialogMode === "add" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setCompanyDialogMode("add")}
              >
                Add new
              </Button>
            </div>

            {companyDialogMode === "select" ? (
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

                <ScrollArea className="h-[240px] rounded-lg border">
                  <div className="p-2">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleSelectCompany(company)}
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
                              <span className="block text-xs text-muted-foreground truncate">
                                {company.location || company.industry}
                              </span>
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">No matches</div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setCompanyDialogMode("add")}>
                    Add new company
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-sm font-medium">Company details</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Company name</Label>
                    <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input value={newCompanyLocation} onChange={(e) => setNewCompanyLocation(e.target.value)} />
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <Label>Apply email</Label>
                  <Input
                    value={newCompanyApplyEmail}
                    onChange={(e) => setNewCompanyApplyEmail(e.target.value)}
                    placeholder={settings.default_apply_email || "jobs@company.com"}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={() => setCompanyDialogMode("select")}>
                    Back to list
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateCompany}
                    disabled={
                      !newCompanyName.trim() ||
                      !newCompanyLocation.trim() ||
                      !emailSchema.safeParse(newCompanyApplyEmail.trim()).success
                    }
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={successOpen}
        onOpenChange={(v) => {
          setSuccessOpen(v)
          if (!v) router.push("/agency/jobs")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {successStatus === "scheduled" ? "Job scheduled successfully." : "Job published successfully."}
            </DialogTitle>
            <DialogDesc>
              {successStatus === "scheduled" && successDate
                ? `It will be published on ${format(new Date(successDate), "PPP")}.`
                : "It is now live and visible to candidates."}
            </DialogDesc>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => router.push("/agency/jobs")}>Back to jobs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

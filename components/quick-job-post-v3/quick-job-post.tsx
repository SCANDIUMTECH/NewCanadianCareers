"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getVisibleTextLength } from "@/lib/utils"
import { addAgencyClient } from "@/lib/api/agencies"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CompanySection } from "./company-section"
import { JobForm } from "./job-form"
import { JobPreview } from "./job-preview"
import {
  useQuickJobPost,
  useQuickJobShortcuts,
  useExitConfirmation,
} from "@/hooks/use-quick-job-post"
import { type QuickJobCompany, getJobStatusFromDate } from "@/lib/quick-job-schema"
import { CHART } from "@/lib/constants/colors"
import { Save, Send, ArrowLeft, Loader2, Check, CalendarClock } from "lucide-react"
import { getAgencyClientsList } from "@/lib/api/agencies"
import type { AgencyClient } from "@/lib/agency/types"

const CHART_COLORS = [CHART.primary, CHART.success, CHART.warning, CHART.purple, CHART.cyan]

function mapClientToCompany(client: AgencyClient, index: number): QuickJobCompany {
  const name = client.company_detail?.name ?? client.company_name
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  return {
    id: client.company,
    name,
    initials,
    color: CHART_COLORS[index % CHART_COLORS.length],
    verified: client.company_detail?.status === "verified",
    industry: client.company_detail?.industry ?? "",
    location: client.company_detail
      ? [client.company_detail.headquarters_city, client.company_detail.headquarters_country].filter(Boolean).join(", ")
      : undefined,
  }
}

interface QuickJobPostV3Props {
  initialCompanyId?: number
}

export function QuickJobPostV3({ initialCompanyId }: QuickJobPostV3Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState<QuickJobCompany[]>([])

  // Fetch real agency clients
  useEffect(() => {
    getAgencyClientsList()
      .then((clients) => setCompanies(clients.map(mapClientToCompany)))
      .catch(() => {})
  }, [])
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showSuccessState, setShowSuccessState] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const {
    data,
    selectedCompany,
    errors,
    computedStatus,
    isDirty,
    isSaving,
    isPublishing,
    lastSaved,
    canPublish,
    selectCompany,
    updateField,
    saveDraft,
    publish,
  } = useQuickJobPost(initialCompanyId)

  // Load initial company if provided
  useEffect(() => {
    if (initialCompanyId) {
      const company = companies.find((c) => c.id === initialCompanyId)
      if (company) {
        selectCompany(company)
      }
    }
  }, [initialCompanyId, companies, selectCompany])

  // Handle company selection with auto-populate
  const handleSelectCompany = (company: QuickJobCompany | null) => {
    // Handle clearing selection
    if (!company) {
      selectCompany(null)
      return
    }

    selectCompany(company)
    // Auto-populate apply email and location if available
    if (company.applyEmail) {
      updateField("applyEmail", company.applyEmail)
    }
    if (company.location) {
      updateField("location", company.location)
    }
    // Set post date to today if not set
    if (!data.postDate) {
      updateField("postDate", new Date().toISOString())
    }
  }

  // Handle adding a new company via API
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)

  const handleAddCompany = async (companyData: Omit<QuickJobCompany, "id" | "initials" | "color" | "verified" | "industry">) => {
    setIsCreatingCompany(true)
    try {
      const client = await addAgencyClient({ name: companyData.name.trim() })
      const companyName = client.company_detail?.name ?? client.company_name ?? companyData.name
      const newCompany: QuickJobCompany = {
        id: client.company,
        name: companyName,
        initials: companyName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        color: CHART.primary,
        verified: false,
        industry: "Other",
        applyEmail: companyData.applyEmail,
        location: companyData.location,
      }
      setCompanies((prev) => [...prev, newCompany])
      handleSelectCompany(newCompany)
    } catch {
      toast.error("Failed to create company. Please try again.")
    } finally {
      setIsCreatingCompany(false)
    }
  }

  // Handle save with toast
  const handleSave = async () => {
    await saveDraft()
  }

  // Handle publish
  const handlePublish = async () => {
    const success = await publish({ redirectTo: null })
    if (success) {
      const status = getJobStatusFromDate(data.postDate || "")
      if (status === "scheduled") {
        setSuccessMessage(`Job scheduled successfully. It will be published on ${new Date(data.postDate!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`)
      } else {
        setSuccessMessage("Job published successfully. It is now live and visible to candidates.")
      }
      setShowSuccessState(true)
      // Redirect after a delay
      setTimeout(() => {
        router.push("/agency/jobs")
      }, 2500)
    }
  }

  // Keyboard shortcuts
  useQuickJobShortcuts(handleSave, handlePublish)

  // Exit confirmation
  useExitConfirmation(isDirty)

  // Handle back navigation
  const handleBack = () => {
    if (isDirty) {
      setShowExitDialog(true)
    } else {
      router.push("/agency/jobs")
    }
  }

  const descriptionLength = getVisibleTextLength(data.description || "")
  const showPreview = descriptionLength >= 50

  // Determine button text based on status
  const isScheduled = computedStatus === "scheduled"
  const publishButtonText = isScheduled ? "Schedule" : "Publish"
  const PublishIcon = isScheduled ? CalendarClock : Send

  // Success state
  if (showSuccessState) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            {isScheduled ? "Job Scheduled!" : "Job Published!"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {successMessage}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Redirecting to jobs list...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        className="flex items-center justify-between py-6 border-b border-border/40 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground">
              New Job Post
            </h1>
            {lastSaved && (
              <p className="text-xs text-muted-foreground">
                Last saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !selectedCompany}
            className="gap-2 bg-transparent"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Save Draft</span>
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PublishIcon className="w-4 h-4" />
            )}
            {publishButtonText}
          </Button>
        </div>
      </motion.div>

      {/* Main Content - Single Column Flow */}
      <div className="space-y-6 pb-12">
        {/* Section 1: Company Selection */}
        <section>
          <CompanySection
            companies={companies}
            selectedCompany={selectedCompany}
            onSelect={handleSelectCompany}
            onAddCompany={handleAddCompany}
          />
        </section>

        {/* Section 2: Job Form (appears after company selected) */}
        <AnimatePresence>
          {selectedCompany && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <h2 className="text-base font-semibold text-foreground mb-4">
                  Job Details
                </h2>
                <JobForm
                  data={data}
                  errors={errors}
                  onFieldChange={updateField}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 3: Job Preview (fades in after 50+ chars in description) */}
        <AnimatePresence>
          {selectedCompany && showPreview && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <JobPreview data={data} company={selectedCompany} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 4: Bottom Actions (visible when company selected) */}
        <AnimatePresence>
          {selectedCompany && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between pt-4 border-t border-border/40"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="gap-2 bg-transparent"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Draft
              </Button>

              <Button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PublishIcon className="w-4 h-4" />
                )}
                {publishButtonText}
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save your draft before
              leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/agency/jobs")}
              className="bg-transparent"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await saveDraft()
                router.push("/agency/jobs")
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

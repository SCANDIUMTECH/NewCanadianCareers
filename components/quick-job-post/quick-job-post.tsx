"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusPill } from "./status-pill"
import { CompanySelector } from "./company-selector"
import { JobFormFields } from "./job-form-fields"
import {
  CompanyPreviewCard,
  ApplyToCard,
  PublishingCard,
} from "./sidebar-cards"
import {
  useQuickJobPost,
  useQuickJobShortcuts,
  useExitConfirmation,
  useAgencySettings,
} from "@/hooks/use-quick-job-post"
import { type QuickJobCompany } from "@/lib/quick-job-schema"
import { CHART } from "@/lib/constants/colors"
import { Save, Send, ArrowLeft, Loader2, Check } from "lucide-react"
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

interface QuickJobPostProps {
  initialCompanyId?: number
}

export function QuickJobPost({ initialCompanyId }: QuickJobPostProps) {
  const router = useRouter()
  const { settings } = useAgencySettings()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const [companies, setCompanies] = useState<QuickJobCompany[]>([])

  // Fetch real agency clients
  useEffect(() => {
    getAgencyClientsList()
      .then((clients) => setCompanies(clients.map(mapClientToCompany)))
      .catch(() => {})
  }, [])

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
  }, [initialCompanyId, selectCompany])

  // Handle save with toast
  const handleSave = async () => {
    const success = await saveDraft()
    if (success) {
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 2000)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    await publish()
    // Redirect is handled in the publish function
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

  // Determine button text based on status
  const publishButtonText =
    computedStatus === "scheduled" ? "Schedule" : "Publish"

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        className="flex items-center justify-between py-6 border-b border-border/40 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
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
                Saved {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Center: Status */}
        <StatusPill status={computedStatus} />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {saveToast && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-sm text-emerald-600 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Saved
              </motion.span>
            )}
          </AnimatePresence>

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
            <span className="hidden sm:inline">Save Draft</span>
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {publishButtonText}
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 pb-12">
        {/* Left Column: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-8"
        >
          {/* Company Selector */}
          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelect={(company) => {
              selectCompany(company)
              // Auto-populate apply email
              if (company?.applyEmail) {
                updateField("applyEmail", company.applyEmail)
              }
            }}
          />

          {/* Form Fields */}
          <JobFormFields
            data={data}
            errors={errors}
            allowBackdating={settings.allow_backdated_post_date}
            maxBackdateDays={settings.max_backdate_days}
            onFieldChange={updateField}
          />
        </motion.div>

        {/* Right Column: Sidebar */}
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4 lg:sticky lg:top-28 lg:self-start"
        >
              {/* Company Preview */}
              <CompanyPreviewCard company={selectedCompany} />

              {/* Apply Email */}
              <ApplyToCard
                email={data.applyEmail || ""}
                error={errors.applyEmail}
                onChange={(email) => updateField("applyEmail", email)}
              />

              {/* Publishing Options */}
              <PublishingCard
                postDate={data.postDate || ""}
                allowBackdating={settings.allow_backdated_post_date}
                maxBackdateDays={settings.max_backdate_days}
                onDateChange={(date) => updateField("postDate", date)}
                onPublishNow={handlePublish}
                isScheduled={computedStatus === "scheduled"}
              />
        </motion.aside>
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
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

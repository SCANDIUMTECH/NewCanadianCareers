"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useJobWizard } from "@/hooks/use-job-wizard"
import { type JobWizardCompany, type JobWizardData } from "@/lib/job-wizard-schema"
import { useCompanyContext } from "@/hooks/use-company"
import { useCart } from "@/hooks/use-cart"
import { createJob, updateJob, publishJob } from "@/lib/api/jobs"
import type { CreateJobData, Package } from "@/lib/company/types"
import { BRAND } from "@/lib/constants/colors"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"
import { WizardProgress } from "./wizard-progress"
import { WizardNavigation } from "./wizard-navigation"
import { StepBasics } from "./steps/step-basics"
import { StepRoleDetails } from "./steps/step-role-details"
import { StepLocation } from "./steps/step-location"
import { StepCompensation } from "./steps/step-compensation"
import { StepApplyMethod } from "./steps/step-apply-method"
import { StepDistribution } from "./steps/step-distribution"
import { StepPreview } from "./steps/step-preview"
import { StepPublish } from "./steps/step-publish"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const PENDING_PUBLISH_KEY = "ncc-pending-publish"

function mapWizardDataToCreateJob(data: JobWizardData): CreateJobData {
  const typeMap: Record<string, CreateJobData["employment_type"]> = {
    "full-time": "full_time",
    "full_time": "full_time",
    "part-time": "part_time",
    "part_time": "part_time",
    "contract": "contract",
    "freelance": "freelance",
    "internship": "internship",
  }

  const experienceMap: Record<string, CreateJobData["experience_level"]> = {
    "entry-level": "entry",
    "entry": "entry",
    "mid-level": "mid",
    "mid": "mid",
    "senior-level": "senior",
    "senior": "senior",
    "lead": "lead",
    "executive": "executive",
  }

  // Backend expects: hour, day, week, month, year
  const periodMap: Record<string, CreateJobData["salary_period"]> = {
    "hour": "hour",
    "hourly": "hour",
    "day": "day",
    "week": "week",
    "month": "month",
    "monthly": "month",
    "year": "year",
    "yearly": "year",
  }

  return {
    title: data.title,
    description: data.description,
    employment_type: typeMap[data.type] || "full_time",
    experience_level: experienceMap[data.experience] || "mid",
    location_type: data.remote as CreateJobData["location_type"],
    address: data.remote === "remote" ? undefined : data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    postal_code: data.remote === "remote" ? undefined : data.postalCode || undefined,
    country: data.country || "CA",
    salary_min: data.salaryMin > 0 ? data.salaryMin : undefined,
    salary_max: data.salaryMax > 0 ? data.salaryMax : undefined,
    salary_currency: data.currency || "CAD",
    salary_period: periodMap[data.period] || "year",
    show_salary: data.showSalary,
    skills: data.skills,
    benefits: data.benefits,
    responsibilities: data.responsibilities,
    requirements: data.requirements,
    nice_to_have: data.niceToHave,
    apply_method: data.applyMethod || "internal",
    apply_email: data.applyMethod === "email" ? data.applyEmail : undefined,
    apply_url: data.applyMethod === "external" ? data.applyUrl : undefined,
    apply_instructions: data.applyInstructions || undefined,
    category: data.category || undefined,
  }
}

interface JobWizardProps {
  company?: JobWizardCompany
  exitPath?: string
}

export function JobWizard({ company, exitPath = "/company/jobs" }: JobWizardProps) {
  const router = useRouter()
  const { company: contextCompany, entitlements, refreshEntitlements } = useCompanyContext()
  const { addItem, clearCart } = useCart()
  const {
    currentStep,
    data,
    isLoaded,
    errors,
    updateData,
    touchField,
    setStepErrors,
    nextStep,
    prevStep,
    goToStep,
    clearDraft,
  } = useJobWizard()

  // Set company data from prop (agency context) or from company context.
  // Extract primitives so the dependency array is stable across renders.
  const companyId = company?.id
  const contextCompanyId = contextCompany?.id
  const contextCompanyName = contextCompany?.name
  const contextCompanyVerified = contextCompany?.is_verified
  const contextCompanyIndustry = contextCompany?.industry
  useEffect(() => {
    if (data.company) return

    if (companyId && company) {
      // Agency context: use the explicitly passed company prop
      updateData({ company })
    } else if (contextCompanyId && contextCompanyName) {
      // Company context: derive from the logged-in company's profile
      const initials = contextCompanyName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      updateData({
        company: {
          id: contextCompanyId,
          name: contextCompanyName,
          initials,
          color: BRAND.primary,
          verified: contextCompanyVerified ?? false,
          industry: contextCompanyIndustry ?? undefined,
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, contextCompanyId, contextCompanyName, contextCompanyVerified, contextCompanyIndustry, data.company, updateData])

  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const createdJobIdRef = useRef<string | null>(null)
  const savedDraftIdRef = useRef<string | null>(null)
  const { turnstileToken, setTurnstileToken } = useTurnstileToken()

  const getSocialPlatforms = useCallback((): string[] => {
    return (["linkedin", "twitter", "facebook", "instagram"] as const).filter(
      (platform) => data[platform]
    )
  }, [data.linkedin, data.twitter, data.facebook, data.instagram])

  const saveJobToBackend = useCallback(async (): Promise<string> => {
    const createData = mapWizardDataToCreateJob(data)
    if (turnstileToken) createData.turnstile_token = turnstileToken

    if (savedDraftIdRef.current) {
      await updateJob(savedDraftIdRef.current, createData)
      return savedDraftIdRef.current
    }

    const createdJob = await createJob(createData)
    savedDraftIdRef.current = createdJob.job_id
    return createdJob.job_id
  }, [data, turnstileToken])

  const handleNext = () => {
    if (setStepErrors(currentStep)) {
      nextStep()
    }
  }

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(data.title && data.category && data.type && data.experience)
      case 2:
        return !!(
          data.description &&
          data.description.length >= 50 &&
          data.responsibilities.length > 0 &&
          data.requirements.length > 0 &&
          data.skills.length > 0
        )
      case 3:
        if (data.remote === "remote") return true
        return !!(data.address && data.city && data.state && data.postalCode && data.country)
      case 4:
        return data.salaryMin > 0 && (data.salaryMax === 0 || data.salaryMax >= data.salaryMin)
      case 5:
        if (data.applyMethod === "internal") return true
        if (data.applyMethod === "email") return !!data.applyEmail
        if (data.applyMethod === "external") return !!data.applyUrl
        return true
      default:
        return true
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setPublishError(null)

    try {
      const remainingCredits = entitlements?.remaining_credits ?? 0

      if (remainingCredits < 1) {
        // ── No credits: save draft + purchase flow ──
        if (!selectedPackage) {
          setPublishError("Please select a plan to continue.")
          setIsPublishing(false)
          return
        }

        // 1. Save job as draft on backend
        const draftId = await saveJobToBackend()

        // 2. Store pending publish intent so checkout success can auto-publish
        localStorage.setItem(PENDING_PUBLISH_KEY, JSON.stringify({
          jobId: draftId,
          socialPlatforms: getSocialPlatforms(),
          turnstileToken: turnstileToken || undefined,
          savedAt: new Date().toISOString(),
        }))

        // 3. Clear any existing cart, then add the selected package
        clearCart()
        addItem({
          id: `pkg-${selectedPackage.id}`,
          type: "package",
          name: `${selectedPackage.name} Package`,
          description: `${selectedPackage.job_credits ?? selectedPackage.credits} job posting credits`,
          credits: selectedPackage.job_credits ?? selectedPackage.credits,
          unitPrice: selectedPackage.price,
          popular: selectedPackage.is_popular,
        })

        // 4. Clear wizard localStorage draft (backend draft persists)
        clearDraft()

        // 5. Navigate to checkout
        router.push("/company/checkout")
        return
      }

      // ── Has credits: normal publish flow ──

      // Step 1: Create/update the job on backend
      const jobId = await saveJobToBackend()
      createdJobIdRef.current = jobId

      // Step 2: Publish the job (consumes 1 credit)
      const socialPlatforms = getSocialPlatforms()
      await publishJob(jobId, {
        social_platforms: socialPlatforms.length > 0 ? socialPlatforms : undefined,
        turnstile_token: turnstileToken || undefined,
      })

      // Step 3: Refresh entitlements to update credit count
      await refreshEntitlements()

      clearDraft()
      setShowSuccessDialog(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish job. Please try again."
      setPublishError(message)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setPublishError(null)

    try {
      await saveJobToBackend()
      clearDraft()
      router.push(exitPath)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save draft. Please try again."
      setPublishError(message)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleExit = () => {
    if (data.title) {
      setShowExitDialog(true)
    } else {
      router.push(exitPath)
    }
  }

  const handleConfirmExit = async (saveDraft: boolean) => {
    if (saveDraft) {
      setShowExitDialog(false)
      await handleSaveDraft()
    } else {
      clearDraft()
      router.push(exitPath)
    }
  }

  const handleStartOver = () => {
    setShowStartOverDialog(false)
    clearDraft()
  }

  const handlePackageSelect = useCallback((pkg: Package | null) => {
    setSelectedPackage(pkg)
    setPublishError(null)
  }, [])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const hasCredits = (entitlements?.remaining_credits ?? 0) >= 1

  return (
    <>
      <div className="flex gap-8">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <WizardProgress
              currentStep={currentStep}
              onStepClick={(step) => step < currentStep && goToStep(step)}
            />

            {/* Exit button */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <button
                onClick={handleExit}
                className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile Progress */}
          <div className="lg:hidden mb-6">
            <WizardProgress currentStep={currentStep} />
          </div>

          {/* Step Content */}
          <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6 md:p-8">
            <div
              className={cn(
                "transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
            >
              {currentStep === 1 && (
                <StepBasics data={data} updateData={updateData} errors={errors} onBlur={touchField} />
              )}
              {currentStep === 2 && (
                <StepRoleDetails data={data} updateData={updateData} errors={errors} onBlur={touchField} />
              )}
              {currentStep === 3 && (
                <StepLocation data={data} updateData={updateData} errors={errors} onBlur={touchField} />
              )}
              {currentStep === 4 && (
                <StepCompensation data={data} updateData={updateData} errors={errors} onBlur={touchField} />
              )}
              {currentStep === 5 && (
                <StepApplyMethod data={data} updateData={updateData} errors={errors} onBlur={touchField} />
              )}
              {currentStep === 6 && (
                <StepDistribution data={data} updateData={updateData} />
              )}
              {currentStep === 7 && (
                <StepPreview data={data} onEdit={goToStep} />
              )}
              {currentStep === 8 && (
                <StepPublish
                  data={data}
                  onPackageSelect={handlePackageSelect}
                  selectedPackageId={selectedPackage?.id ?? null}
                />
              )}
            </div>

            {/* Turnstile on publish step */}
            {currentStep === 8 && (
              <TurnstileGuard
                feature="jobs"
                onToken={setTurnstileToken}
                className="mt-4"
              />
            )}

            {/* Publish / Draft Error */}
            {publishError && currentStep === 8 && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{publishError}</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <WizardNavigation
              currentStep={currentStep}
              onBack={prevStep}
              onNext={handleNext}
              onPublish={handlePublish}
              onSaveDraft={data.title ? handleSaveDraft : undefined}
              isNextDisabled={!isStepValid()}
              isPublishing={isPublishing}
              isSavingDraft={isSavingDraft}
              hasCredits={hasCredits}
              hasSelectedPackage={!!selectedPackage}
            />
          </div>

          {/* Mobile Exit */}
          <div className="lg:hidden mt-6 text-center">
            <button
              onClick={handleExit}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Exit
            </button>
          </div>
        </main>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <DialogTitle className="text-center">Job Published!</DialogTitle>
            <DialogDescription className="text-center">
              Your job posting is now live and visible to candidates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            {createdJobIdRef.current && (
              <Button
                onClick={() => router.push(`/company/jobs/${createdJobIdRef.current}`)}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                View Job
              </Button>
            )}
            <Button
              variant={createdJobIdRef.current ? "outline" : "default"}
              onClick={() => router.push(exitPath)}
              className={cn("w-full", createdJobIdRef.current ? "bg-transparent" : "bg-primary hover:bg-primary-hover text-primary-foreground")}
            >
              View All Jobs
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false)
                setTurnstileToken("")
                createdJobIdRef.current = null
                savedDraftIdRef.current = null
                router.refresh()
              }}
              className="w-full bg-transparent"
            >
              Post Another Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave the wizard?</DialogTitle>
            <DialogDescription>
              Choose what to do with your progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleConfirmExit(true)}
              disabled={isSavingDraft}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSavingDraft ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <div className="border-t border-border/50 pt-2 space-y-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowExitDialog(false)
                  setShowStartOverDialog(true)
                }}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Start Over
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleConfirmExit(false)}
                className="w-full text-foreground-muted hover:text-foreground"
              >
                Discard &amp; Exit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Over Confirmation */}
      <AlertDialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your progress and return to Step 1. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartOver}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Start Over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

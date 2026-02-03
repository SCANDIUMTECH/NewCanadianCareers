"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useJobWizard } from "@/hooks/use-job-wizard"
import { type JobWizardCompany } from "@/lib/job-wizard-schema"
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
import { Button } from "@/components/ui/button"

interface JobWizardProps {
  company?: JobWizardCompany
  exitPath?: string
}

/**
 * Job Creation Wizard
 * 8-step wizard with localStorage persistence
 */
export function JobWizard({ company, exitPath = "/company/jobs" }: JobWizardProps) {
  const router = useRouter()
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

  // Set company data when provided (agency context)
  const companyId = company?.id
  useEffect(() => {
    if (company && !data.company) {
      updateData({ company })
    }
  }, [companyId, data.company, updateData, company])

  const [isPublishing, setIsPublishing] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Validate and proceed to next step
  const handleNext = () => {
    const isValid = setStepErrors(currentStep)
    if (isValid) {
      nextStep()
    }
  }

  // Check if current step is valid (for button state)
  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(data.title && data.department && data.type && data.experience)
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
        return !!(data.city && data.country)
      case 4:
        return data.salaryMin > 0 && data.salaryMax > 0 && data.salaryMax >= data.salaryMin
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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsPublishing(false)
    clearDraft()
    setShowSuccessDialog(true)
  }

  const handleExit = () => {
    // If there's unsaved data, show confirmation
    if (data.title) {
      setShowExitDialog(true)
    } else {
      router.push(exitPath)
    }
  }

  const handleConfirmExit = (saveDraft: boolean) => {
    if (!saveDraft) {
      clearDraft()
    }
    router.push(exitPath)
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

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
                Save & Exit
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
                <StepPublish data={data} />
              )}
            </div>

            {/* Navigation */}
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={8}
              onBack={prevStep}
              onNext={handleNext}
              onPublish={handlePublish}
              isNextDisabled={!isStepValid()}
              isPublishing={isPublishing}
            />
          </div>

          {/* Mobile Exit */}
          <div className="lg:hidden mt-6 text-center">
            <button
              onClick={handleExit}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Save & Exit
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
            <Button
              onClick={() => router.push(exitPath)}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              View All Jobs
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false)
                clearDraft()
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
            <DialogTitle>Save your progress?</DialogTitle>
            <DialogDescription>
              Your job posting isn&apos;t complete yet. Would you like to save it as a draft?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleConfirmExit(false)}
              className="bg-transparent"
            >
              Discard
            </Button>
            <Button
              onClick={() => handleConfirmExit(true)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

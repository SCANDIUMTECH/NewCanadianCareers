"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface WizardNavigationProps {
  currentStep: number
  onBack: () => void
  onNext: () => void
  onPublish?: () => void
  onSaveDraft?: () => void
  isNextDisabled?: boolean
  isPublishing?: boolean
  isSavingDraft?: boolean
  hasCredits?: boolean
  hasSelectedPackage?: boolean
}

export function WizardNavigation({
  currentStep,
  onBack,
  onNext,
  onPublish,
  onSaveDraft,
  isNextDisabled = false,
  isPublishing = false,
  isSavingDraft = false,
  hasCredits = true,
  hasSelectedPackage = false,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isPreviewStep = currentStep === 7
  const isPublishStep = currentStep === 8

  const getPublishButtonContent = () => {
    if (isPublishing) {
      return (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          {hasCredits ? "Publishing..." : "Saving draft..."}
        </span>
      )
    }

    if (!hasCredits) {
      return (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          Purchase &amp; Publish
        </>
      )
    }

    return (
      <>
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Publish Job
      </>
    )
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border/50">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn(
          "bg-transparent",
          isFirstStep && "invisible"
        )}
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>

      <div className="flex items-center gap-3">
        {/* Save as Draft — visible from step 2+ when handler provided */}
        {currentStep > 1 && onSaveDraft && (
          <Button
            variant="ghost"
            onClick={onSaveDraft}
            disabled={isSavingDraft || isPublishing}
            className="text-foreground-muted hover:text-foreground"
          >
            {isSavingDraft ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-foreground-muted/30 border-t-foreground-muted rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save as Draft"
            )}
          </Button>
        )}

        {isPublishStep ? (
          <Button
            onClick={onPublish}
            disabled={isPublishing || isSavingDraft || (!hasCredits && !hasSelectedPackage)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground min-w-[160px]"
          >
            {getPublishButtonContent()}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className="bg-primary hover:bg-primary-hover text-primary-foreground min-w-[120px]"
          >
            {isPreviewStep ? "Continue to Publish" : "Continue"}
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  )
}

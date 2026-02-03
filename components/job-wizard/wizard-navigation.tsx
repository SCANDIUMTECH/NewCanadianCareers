"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onPublish?: () => void
  isNextDisabled?: boolean
  isPublishing?: boolean
}

/**
 * Wizard Navigation
 * Back/Next buttons with step-aware labels
 */
export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onPublish,
  isNextDisabled = false,
  isPublishing = false,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isPreviewStep = currentStep === 7
  const isPublishStep = currentStep === 8

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
        {isPublishStep ? (
          <Button
            onClick={onPublish}
            disabled={isPublishing}
            className="bg-primary hover:bg-primary-hover text-primary-foreground min-w-[140px]"
          >
            {isPublishing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Publishing...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish Job
              </>
            )}
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

"use client"

import { cn } from "@/lib/utils"
import { wizardSteps } from "@/lib/job-wizard-schema"

interface WizardProgressProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

/**
 * Wizard Progress Indicator
 * Desktop: Full step list with titles
 * Mobile: Compact progress bar with current step
 */
export function WizardProgress({ currentStep, onStepClick }: WizardProgressProps) {
  return (
    <>
      {/* Desktop Progress */}
      <div className="hidden lg:block">
        <div className="space-y-2">
          {wizardSteps.map((step) => {
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep
            const isClickable = step.id <= currentStep

            return (
              <button
                key={step.id}
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                  isActive && "bg-primary/10",
                  !isActive && isClickable && "hover:bg-foreground/5 cursor-pointer",
                  !isClickable && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "bg-foreground/10 text-foreground-muted"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {step.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">
            Step {currentStep} of {wizardSteps.length}
          </p>
          <p className="text-sm text-foreground-muted">
            {wizardSteps[currentStep - 1].title}
          </p>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / wizardSteps.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { type JobWizardData, defaultJobData } from "@/lib/job-wizard-schema"

const STORAGE_KEY = "orion-job-draft"

export type ValidationErrors = {
  [K in keyof JobWizardData]?: string
}

/**
 * Custom hook for managing job wizard state
 * Handles state management, localStorage persistence, and validation
 */
export function useJobWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<JobWizardData>(defaultJobData)
  const [isLoaded, setIsLoaded] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Set<keyof JobWizardData>>(new Set())

  // Load saved draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setData({ ...defaultJobData, ...parsed.data })
          setCurrentStep(parsed.step || 1)
        }
      } catch (error) {
        console.error("Failed to load saved draft:", error)
      }
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage whenever data or step changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data,
          step: currentStep,
          savedAt: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Failed to save draft:", error)
      }
    }
  }, [data, currentStep, isLoaded])

  // Update specific fields and clear related errors
  const updateData = useCallback((updates: Partial<JobWizardData>) => {
    setData(prev => ({ ...prev, ...updates }))
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates) as (keyof JobWizardData)[]
    setErrors(prev => {
      const newErrors = { ...prev }
      updatedFields.forEach(field => {
        delete newErrors[field]
      })
      return newErrors
    })
  }, [])

  // Mark field as touched (for showing validation on blur)
  const touchField = useCallback((field: keyof JobWizardData) => {
    setTouched(prev => new Set(prev).add(field))
  }, [])

  // Validate current step and return errors
  const validateStep = useCallback((step: number): ValidationErrors => {
    const stepErrors: ValidationErrors = {}

    switch (step) {
      case 1: // Basics
        if (!data.title || data.title.length < 3) {
          stepErrors.title = "Job title must be at least 3 characters"
        }
        if (!data.department) {
          stepErrors.department = "Please select a department"
        }
        if (!data.type) {
          stepErrors.type = "Please select an employment type"
        }
        if (!data.experience) {
          stepErrors.experience = "Please select an experience level"
        }
        break
      case 2: // Role Details
        if (!data.description || data.description.length < 50) {
          stepErrors.description = "Description must be at least 50 characters"
        }
        if (data.responsibilities.length === 0) {
          stepErrors.responsibilities = "Add at least one responsibility"
        }
        if (data.requirements.length === 0) {
          stepErrors.requirements = "Add at least one requirement"
        }
        if (data.skills.length === 0) {
          stepErrors.skills = "Add at least one skill"
        }
        break
      case 3: // Location
        if (data.remote !== "remote") {
          if (!data.city) {
            stepErrors.city = "Please enter a city"
          }
          if (!data.country) {
            stepErrors.country = "Please select a country"
          }
        }
        break
      case 4: // Compensation
        if (data.salaryMin <= 0) {
          stepErrors.salaryMin = "Please enter a minimum salary"
        }
        if (data.salaryMax <= 0) {
          stepErrors.salaryMax = "Please enter a maximum salary"
        }
        if (data.salaryMax < data.salaryMin) {
          stepErrors.salaryMax = "Maximum salary must be greater than minimum"
        }
        break
      case 5: // Apply Method
        if (data.applyMethod === "email" && !data.applyEmail) {
          stepErrors.applyEmail = "Please enter an email address"
        }
        if (data.applyMethod === "external" && !data.applyUrl) {
          stepErrors.applyUrl = "Please enter a valid URL"
        }
        break
    }

    return stepErrors
  }, [data])

  // Set errors for current step (called on next button click)
  const setStepErrors = useCallback((step: number) => {
    const stepErrors = validateStep(step)
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }, [validateStep])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched(new Set())
  }, [])

  // Navigation
  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 8))
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 8) {
      setCurrentStep(step)
    }
  }, [])

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
    setData(defaultJobData)
    setCurrentStep(1)
    setErrors({})
    setTouched(new Set())
  }, [])

  // Check if there's a saved draft
  const hasDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) !== null
    }
    return false
  }, [])

  // Get draft timestamp
  const getDraftTimestamp = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          return parsed.savedAt ? new Date(parsed.savedAt) : null
        }
      } catch {
        return null
      }
    }
    return null
  }, [])

  return {
    currentStep,
    data,
    isLoaded,
    errors,
    touched,
    updateData,
    touchField,
    validateStep,
    setStepErrors,
    clearErrors,
    nextStep,
    prevStep,
    goToStep,
    clearDraft,
    hasDraft,
    getDraftTimestamp,
  }
}

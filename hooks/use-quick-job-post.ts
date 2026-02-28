"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  type QuickJobDraft,
  type QuickJobCompany,
  type AgencySettings,
  defaultQuickJobData,
  defaultAgencySettings,
  agencySettingsSchema,
  quickJobDraftSchema,
  validateForPublish,
  getJobStatusFromDate,
} from "@/lib/quick-job-schema"
import { createAgencyJob, publishAgencyJob } from "@/lib/api/agencies"
import type { CreateAgencyJobData } from "@/lib/agency/types"

const AGENCY_SETTINGS_KEY = "agency-settings"
const DRAFT_KEY_PREFIX = "quick-job-draft"

export function useAgencySettings() {
  const [settings, setSettings] = useState<AgencySettings>(defaultAgencySettings)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AGENCY_SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const validated = agencySettingsSchema.safeParse(parsed)
        if (validated.success) {
          setSettings(validated.data)
        }
      }
    } catch {
      // Use defaults on error
    }
    setIsLoaded(true)
  }, [])

  const saveSettings = useCallback((newSettings: Partial<AgencySettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem(AGENCY_SETTINGS_KEY, JSON.stringify(updated))
  }, [settings])

  return {
    settings,
    saveSettings,
    isLoaded,
    isQuickMode: settings.job_post_workflow === "quick",
  }
}

export function useQuickJobPost(initialCompanyId?: number) {
  const router = useRouter()
  const [data, setData] = useState<QuickJobDraft>(defaultQuickJobData)
  const [selectedCompany, setSelectedCompany] = useState<QuickJobCompany | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getStorageKey = useCallback((companyId?: number) => {
    return companyId ? `${DRAFT_KEY_PREFIX}-${companyId}` : null
  }, [])

  const loadDraft = useCallback((companyId: number) => {
    const key = getStorageKey(companyId)
    if (!key) return null

    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = quickJobDraftSchema.safeParse(JSON.parse(stored))
        return parsed.success ? parsed.data : null
      }
    } catch {
      // Return null on error
    }
    return null
  }, [getStorageKey])

  const saveDraft = useCallback(async () => {
    if (!selectedCompany) return false

    const key = getStorageKey(selectedCompany.id)
    if (!key) return false

    setIsSaving(true)

    try {
      const draftData = {
        ...data,
        companyId: selectedCompany.id,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(key, JSON.stringify(draftData))
      setLastSaved(new Date())
      setIsDirty(false)
      return true
    } catch {
      return false
    } finally {
      setIsSaving(false)
    }
  }, [data, selectedCompany, getStorageKey])

  const clearDraft = useCallback(() => {
    if (!selectedCompany) return

    const key = getStorageKey(selectedCompany.id)
    if (key) {
      localStorage.removeItem(key)
    }
    setData(defaultQuickJobData)
    setIsDirty(false)
    setLastSaved(null)
  }, [selectedCompany, getStorageKey])

  useEffect(() => {
    if (!isDirty || !selectedCompany) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 2000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isDirty, selectedCompany, saveDraft])

  const selectCompany = useCallback((company: QuickJobCompany | null) => {
    setSelectedCompany(company)

    if (!company) {
      setData(defaultQuickJobData)
      setIsDirty(false)
      setErrors({})
      setLastSaved(null)
      return
    }

    const draft = loadDraft(company.id)
    if (draft) {
      setData(draft)
      if (draft.savedAt) {
        setLastSaved(new Date(draft.savedAt))
      }
    } else {
      setData({
        ...defaultQuickJobData,
        companyId: company.id,
        applyEmail: company.applyEmail || "",
        location: company.location || "",
        postDate: new Date().toISOString(),
      })
    }

    setIsDirty(false)
    setErrors({})
  }, [loadDraft])

  const updateField = useCallback(<K extends keyof QuickJobDraft>(
    field: K,
    value: QuickJobDraft[K]
  ) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }, [errors])

  const updateFields = useCallback((updates: Partial<QuickJobDraft>) => {
    setData((prev) => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  const validate = useCallback(() => {
    const result = validateForPublish(data)
    setErrors(result.errors)
    return result.valid
  }, [data])

  const publish = useCallback(async (options?: { redirectTo?: string | null }) => {
    if (!validate()) return false
    if (!selectedCompany) return false

    setIsPublishing(true)

    try {
      const typeMap: Record<string, string> = {
        "full-time": "full_time",
        "part-time": "part_time",
        "contract": "contract",
        "temporary": "contract",
        "internship": "internship",
      }

      const createData: CreateAgencyJobData = {
        title: data.title || "",
        description: data.description || "",
        company_id: selectedCompany.id,
        employment_type: typeMap[data.type || "full-time"] || "full_time",
        experience_level: "mid",
        location_type: data.remote || "onsite",
        city: data.location || undefined,
        salary_min: data.wageMin || undefined,
        salary_max: data.wageMax || undefined,
        salary_currency: data.currency || "CAD",
        salary_period: data.wagePeriod || "year",
      }

      const createdJob = await createAgencyJob(createData)
      const status = getJobStatusFromDate(data.postDate || "")
      if (status === "published" || status === "scheduled") {
        await publishAgencyJob(createdJob.job_id)
      }

      clearDraft()
      const redirectTo = options?.redirectTo === undefined ? "/agency/jobs" : options.redirectTo
      if (redirectTo) {
        router.push(redirectTo)
      }

      return true
    } catch {
      return false
    } finally {
      setIsPublishing(false)
    }
  }, [data, selectedCompany, validate, clearDraft, router])

  const computedStatus = data.postDate
    ? getJobStatusFromDate(data.postDate)
    : "draft"

  const canPublish = !!(
    selectedCompany &&
    data.title &&
    data.type &&
    data.location &&
    data.description &&
    data.description.length >= 50 &&
    data.applyEmail
  )

  return {
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
    updateFields,
    saveDraft,
    clearDraft,
    validate,
    publish,
  }
}

export function useQuickJobShortcuts(
  onSave: () => void,
  onPublish: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        onSave()
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        onPublish()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onSave, onPublish])
}

export function useExitConfirmation(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])
}

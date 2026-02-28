"use client"

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react'
import { getCompanyProfile } from '@/lib/api/companies'
import { getEntitlementSummary } from '@/lib/api/billing'
import { getUnreadCount } from '@/lib/api/notifications'
import type { Company, EntitlementSummary } from '@/lib/company/types'

export interface CompanyContextValue {
  company: Company | null
  entitlements: EntitlementSummary | null
  unreadNotifications: number
  isLoading: boolean
  error: Error | null
  refreshCompany: () => Promise<void>
  refreshEntitlements: () => Promise<void>
  refreshNotifications: () => Promise<void>
  refreshAll: () => Promise<void>
  hasTeamManagement: boolean
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [entitlements, setEntitlements] = useState<EntitlementSummary | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshCompany = useCallback(async () => {
    try {
      const data = await getCompanyProfile()
      setCompany(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch company profile'))
    }
  }, [])

  const refreshEntitlements = useCallback(async () => {
    const data = await getEntitlementSummary().catch(() => null)
    if (data) setEntitlements(data)
  }, [])

  const refreshNotifications = useCallback(async () => {
    const data = await getUnreadCount().catch(() => null)
    if (data !== null) setUnreadNotifications(data)
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        refreshCompany(),
        refreshEntitlements(),
        refreshNotifications(),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [refreshCompany, refreshEntitlements, refreshNotifications])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const interval = setInterval(refreshNotifications, 60000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const hasTeamManagement = entitlements?.has_team_management ?? false

  const value = useMemo<CompanyContextValue>(
    () => ({
      company,
      entitlements,
      unreadNotifications,
      isLoading,
      error,
      refreshCompany,
      refreshEntitlements,
      refreshNotifications,
      refreshAll,
      hasTeamManagement,
    }),
    [
      company,
      entitlements,
      unreadNotifications,
      isLoading,
      error,
      refreshCompany,
      refreshEntitlements,
      refreshNotifications,
      refreshAll,
      hasTeamManagement,
    ]
  )

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export function useCompanyContext(): CompanyContextValue {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider')
  }
  return context
}

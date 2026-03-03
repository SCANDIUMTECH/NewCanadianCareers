"use client"

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react'
import {
  getAgencyProfile,
  getAgencyClientsList,
  getAgencyUnreadCount,
  getAgencyDashboardCounts,
  getAgencyEntitlements,
} from '@/lib/api/agencies'
import type { Agency, AgencyClient, AgencyContextValue } from '@/lib/agency/types'

const AgencyContext = createContext<AgencyContextValue | undefined>(undefined)

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [activeJobsCount, setActiveJobsCount] = useState(0)
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)
  const [usedCredits, setUsedCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshAgency = useCallback(async () => {
    try {
      const data = await getAgencyProfile()
      setAgency(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agency profile'))
    }
  }, [])

  const refreshClients = useCallback(async () => {
    const data = await getAgencyClientsList().catch(() => null)
    if (data) setClients(data)
  }, [])

  const refreshNotifications = useCallback(async () => {
    const count = await getAgencyUnreadCount().catch(() => null)
    if (count !== null) setUnreadNotifications(count)
  }, [])

  const refreshCounts = useCallback(async () => {
    const counts = await getAgencyDashboardCounts().catch(() => null)
    if (counts) {
      setActiveJobsCount(counts.active_jobs)
      setPendingApplicationsCount(counts.pending_applications)
    }
    const entitlements = await getAgencyEntitlements().catch(() => null)
    if (entitlements) {
      setTotalCredits(entitlements.total_credits)
      setUsedCredits(entitlements.used_credits)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        refreshAgency(),
        refreshClients(),
        refreshNotifications(),
        refreshCounts(),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [refreshAgency, refreshClients, refreshNotifications, refreshCounts])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const interval = setInterval(refreshNotifications, 60000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const value = useMemo<AgencyContextValue>(
    () => ({
      agency,
      clients,
      unreadNotifications,
      activeJobsCount,
      pendingApplicationsCount,
      totalCredits,
      usedCredits,
      isLoading,
      error,
      refreshAgency,
      refreshClients,
      refreshNotifications,
      refreshCounts,
      refreshAll,
    }),
    [
      agency,
      clients,
      unreadNotifications,
      activeJobsCount,
      pendingApplicationsCount,
      totalCredits,
      usedCredits,
      isLoading,
      error,
      refreshAgency,
      refreshClients,
      refreshNotifications,
      refreshCounts,
      refreshAll,
    ]
  )

  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>
}

export function useAgencyContext(): AgencyContextValue {
  const context = useContext(AgencyContext)
  if (context === undefined) {
    throw new Error('useAgencyContext must be used within an AgencyProvider')
  }
  return context
}

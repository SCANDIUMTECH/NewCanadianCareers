"use client"

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react'
import { getDashboardStats, getQuickCounts, getSystemAlerts, getModerationSummary } from '@/lib/api/admin-dashboard'
import { getUnreadCount } from '@/lib/api/notifications'
import type {
  AdminDashboardStats,
  AdminDashboardModerationItem,
  AdminAlert,
} from '@/lib/admin/types'

export interface AdminQuickCounts {
  pending_jobs: number
  pending_companies: number
  pending_agencies: number
  open_fraud_alerts: number
  compliance_due_soon: number
}

export interface AdminContextValue {
  stats: AdminDashboardStats | null
  quickCounts: AdminQuickCounts | null
  alerts: AdminAlert[]
  moderation: AdminDashboardModerationItem[]
  unreadNotifications: number
  isLoading: boolean
  error: Error | null
  refreshStats: (timeRange?: '24h' | '7d' | '30d' | '90d') => Promise<void>
  refreshQuickCounts: () => Promise<void>
  refreshAlerts: () => Promise<void>
  refreshModeration: () => Promise<void>
  refreshNotifications: () => Promise<void>
  refreshAll: () => Promise<void>
  dismissAlertById: (alertId: number) => void
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [quickCounts, setQuickCounts] = useState<AdminQuickCounts | null>(null)
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [moderation, setModeration] = useState<AdminDashboardModerationItem[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshStats = useCallback(async (timeRange: '24h' | '7d' | '30d' | '90d' = '7d') => {
    try {
      const data = await getDashboardStats(timeRange)
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'))
    }
  }, [])

  const refreshQuickCounts = useCallback(async () => {
    const data = await getQuickCounts().catch(() => null)
    if (data) setQuickCounts(data)
  }, [])

  const refreshAlerts = useCallback(async () => {
    const data = await getSystemAlerts().catch(() => null)
    if (data) setAlerts(data)
  }, [])

  const refreshModeration = useCallback(async () => {
    const data = await getModerationSummary().catch(() => null)
    if (data) setModeration(data)
  }, [])

  const refreshNotifications = useCallback(async () => {
    const data = await getUnreadCount().catch(() => null)
    if (data !== null) setUnreadNotifications(data)
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        refreshStats(),
        refreshQuickCounts(),
        refreshAlerts(),
        refreshModeration(),
        refreshNotifications(),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [refreshStats, refreshQuickCounts, refreshAlerts, refreshModeration, refreshNotifications])

  const dismissAlertById = useCallback((alertId: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshQuickCounts()
      refreshNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [refreshQuickCounts, refreshNotifications])

  const value = useMemo<AdminContextValue>(
    () => ({
      stats,
      quickCounts,
      alerts,
      moderation,
      unreadNotifications,
      isLoading,
      error,
      refreshStats,
      refreshQuickCounts,
      refreshAlerts,
      refreshModeration,
      refreshNotifications,
      refreshAll,
      dismissAlertById,
    }),
    [
      stats,
      quickCounts,
      alerts,
      moderation,
      unreadNotifications,
      isLoading,
      error,
      refreshStats,
      refreshQuickCounts,
      refreshAlerts,
      refreshModeration,
      refreshNotifications,
      refreshAll,
      dismissAlertById,
    ]
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider')
  }
  return context
}

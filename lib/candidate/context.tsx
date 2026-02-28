'use client'

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react'
import type { CandidateProfile, CandidateContextValue } from './types'
import {
  getCandidateProfile,
  getDashboardStats,
  getUnreadNotificationCount,
} from '@/lib/api/candidates'

const CandidateContext = createContext<CandidateContextValue | null>(null)

interface CandidateProviderProps {
  children: ReactNode
}

export function CandidateProvider({ children }: CandidateProviderProps) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [savedJobsCount, setSavedJobsCount] = useState(0)
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getCandidateProfile()
      setProfile(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load profile'))
    }
  }, [])

  const refreshCounts = useCallback(async () => {
    try {
      const stats = await getDashboardStats()
      setSavedJobsCount(stats.saved_jobs)
      setApplicationsCount(stats.total_applications)
      setUnreadMessages(stats.unread_messages)
    } catch (err) {
      console.error('Failed to refresh counts:', err)
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount()
      setUnreadNotifications(count)
    } catch (err) {
      console.error('Failed to refresh notifications:', err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        refreshProfile(),
        refreshCounts(),
        refreshNotifications(),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [refreshProfile, refreshCounts, refreshNotifications])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const interval = setInterval(refreshNotifications, 60000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const value: CandidateContextValue = {
    profile,
    savedJobsCount,
    applicationsCount,
    unreadNotifications,
    unreadMessages,
    isLoading,
    error,
    refreshProfile,
    refreshCounts,
    refreshNotifications,
    refreshAll,
  }

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  )
}

export function useCandidateContext(): CandidateContextValue {
  const context = useContext(CandidateContext)
  if (!context) {
    throw new Error('useCandidateContext must be used within a CandidateProvider')
  }
  return context
}

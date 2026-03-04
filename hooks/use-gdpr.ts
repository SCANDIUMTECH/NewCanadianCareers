"use client"

import { useContext } from 'react'
import { GDPRContext } from '@/components/gdpr/GDPRProvider'
import type { GDPRContextValue } from '@/lib/gdpr/types'

export function useGDPR(): GDPRContextValue {
  const ctx = useContext(GDPRContext)
  if (!ctx) throw new Error('useGDPR must be used within <GDPRProvider>')
  return ctx
}

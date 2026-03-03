'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_REDIRECTS, type UserRole } from '@/lib/auth/types'

interface RequireRoleProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  requireEmailVerified?: boolean
}

export function RequireRole({
  allowedRoles,
  children,
  loadingComponent,
  requireEmailVerified = true
}: RequireRoleProps) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  const isReady =
    !isLoading &&
    isAuthenticated &&
    !!user &&
    (!requireEmailVerified || user.email_verified) &&
    allowedRoles.includes(user.role)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }

    if (requireEmailVerified && !user.email_verified) {
      router.replace('/verify-email/prompt')
      return
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace(ROLE_REDIRECTS[user.role])
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, requireEmailVerified, router])

  if (!isReady) {
    return loadingComponent || <DefaultLoadingComponent />
  }

  return <>{children}</>
}

function DefaultLoadingComponent() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

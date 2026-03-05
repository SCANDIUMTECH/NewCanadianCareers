'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, AuthState, LoginCredentials, LoginCodeCredentials, RegisterData } from './types'
import {
  hasSession,
  clearSessionCookie,
  SESSION_EXPIRED_EVENT,
  resetSessionExpiredFlag,
} from '@/lib/api/client'
import * as authApi from '@/lib/api/auth'

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>
  loginWithCode: (credentials: LoginCodeCredentials) => Promise<User>
  register: (data: RegisterData) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Hydrate user on mount if session cookie exists
  useEffect(() => {
    const hydrateUser = async () => {
      if (!hasSession()) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        // Token might be expired/invalid — clear presence flag
        clearSessionCookie()
      } finally {
        setIsLoading(false)
      }
    }

    hydrateUser()
  }, [])

  // Listen for session expired events (emitted when token refresh fails mid-session)
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      clearSessionCookie()
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        // Don't redirect if already on an auth page
        const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']
        if (authPages.some(page => currentPath.startsWith(page))) return

        window.location.href = `/login?session_expired=true&redirect=${encodeURIComponent(currentPath)}`
      }
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    resetSessionExpiredFlag()
    const response = await authApi.login(credentials)
    setUser(response.user)
    return response.user
  }, [])

  const loginWithCode = useCallback(async (credentials: LoginCodeCredentials): Promise<User> => {
    resetSessionExpiredFlag()
    const response = await authApi.verifyLoginCode(credentials)
    setUser(response.user)
    return response.user
  }, [])

  const register = useCallback(async (data: RegisterData): Promise<User> => {
    resetSessionExpiredFlag()
    const response = await authApi.register(data)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await authApi.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!hasSession()) return
    try {
      const userData = await authApi.getMe()
      setUser(userData)
    } catch {
      clearSessionCookie()
      setUser(null)
    }
  }, [])

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginWithCode,
    register,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

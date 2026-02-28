"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { requestPasswordReset, getSessions, revokeSession, revokeAllSessions } from "@/lib/api/auth"
import type { Session } from "@/lib/auth/types"

/**
 * AccountSecurity — shared component for account security settings.
 * Used in company settings, agency security page, and potentially others.
 * Provides: email display, password change (via email link), 2FA status, active sessions.
 */

interface AccountSecurityProps {
  /** Starting delay for MotionWrapper animations (default: 100) */
  motionDelay?: number
}

export function AccountSecurity({ motionDelay = 100 }: AccountSecurityProps) {
  const { user } = useAuth()

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isRevokingSession, setIsRevokingSession] = useState<number | null>(null)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  // Password reset state
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    const data = await getSessions().catch(() => [])
    setSessions(data)
    setIsLoadingSessions(false)
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Password reset via email link
  const handlePasswordReset = async () => {
    if (!user?.email) return
    setIsSendingReset(true)
    try {
      await requestPasswordReset({ email: user.email })
      setResetSent(true)
    } catch {
      // The API always returns success for security (no user enumeration)
      setResetSent(true)
    } finally {
      setIsSendingReset(false)
    }
  }

  // Session revoke handler
  const handleRevokeSession = async (sessionId: number) => {
    setIsRevokingSession(sessionId)
    try {
      await revokeSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session")
    } finally {
      setIsRevokingSession(null)
    }
  }

  // Revoke all sessions handler
  const handleRevokeAllSessions = async () => {
    if (!confirm("This will sign you out of all other devices. Continue?")) return
    setIsRevokingAll(true)
    try {
      await revokeAllSessions()
      setSessions((prev) => prev.filter((s) => s.is_current))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke sessions")
    } finally {
      setIsRevokingAll(false)
    }
  }

  return (
    <>
      {/* Account Card */}
      <MotionWrapper delay={motionDelay}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Account</CardTitle>
            <CardDescription>Manage your account credentials and security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Email Address</Label>
                <p className="text-sm text-foreground-muted">{user?.email}</p>
              </div>
              <Badge
                variant={user?.email_verified ? "secondary" : "outline"}
                className={cn(
                  "text-xs",
                  user?.email_verified
                    ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                    : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                )}
              >
                {user?.email_verified ? "Verified" : "Unverified"}
              </Badge>
            </div>

            <Separator />

            {/* Password */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <p className="text-sm text-foreground-muted">
                  {resetSent
                    ? "Check your email for a password reset link"
                    : "Reset your password via email"
                  }
                </p>
              </div>
              {resetSent ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                    Email sent
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResetSent(false)
                      handlePasswordReset()
                    }}
                    disabled={isSendingReset}
                  >
                    Resend
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasswordReset}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? "Sending..." : "Send reset link"}
                </Button>
              )}
            </div>

            <Separator />

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-foreground-muted">Add an extra layer of security</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    user?.mfa_enabled
                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                      : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  {user?.mfa_enabled ? "Enabled" : "Not enabled"}
                </Badge>
                <Button variant="outline" size="sm" disabled>
                  Coming soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Active Sessions Card */}
      <MotionWrapper delay={motionDelay + 50}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Active Sessions</CardTitle>
                <CardDescription>Devices where you&apos;re signed in</CardDescription>
              </div>
              {sessions.filter((s) => !s.is_current).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeAllSessions}
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? "Revoking..." : "Sign out all others"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSessions ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-background-secondary/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-6">
                No active sessions found
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        {session.device?.toLowerCase().includes("phone") ||
                        session.device?.toLowerCase().includes("mobile") ||
                        session.device?.toLowerCase().includes("iphone") ||
                        session.device?.toLowerCase().includes("android") ? (
                          <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.browser} on {session.device}
                          {session.is_current && (
                            <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                          )}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {session.location || session.ip_address} · Last active{" "}
                          {new Date(session.last_active).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isRevokingSession === session.id}
                      >
                        {isRevokingSession === session.id ? "..." : "Revoke"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>
    </>
  )
}

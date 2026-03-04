"use client"

import { Suspense, useState, useEffect, useRef, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AuthInput } from "@/components/auth-input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"
import { confirmPasswordReset } from "@/lib/api/auth"
import type { ApiError } from "@/lib/auth/types"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [error, setError] = useState("")
  const { turnstileToken, setTurnstileToken } = useTurnstileToken()
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setIsTokenValid(!!token)
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter a new password")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!token) {
      setError("Invalid reset link")
      return
    }

    setIsLoading(true)
    try {
      await confirmPasswordReset({
        token,
        password,
        password_confirm: confirmPassword,
        turnstile_token: turnstileToken || undefined,
      })
      setIsSuccess(true)

      // Redirect to login after 3 seconds
      redirectTimerRef.current = setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.status === 400) {
        // Token invalid or expired
        setIsTokenValid(false)
        setError("This reset link is invalid or has expired")
      } else if (apiError.errors?.password) {
        setError(apiError.errors.password[0])
      } else {
        setError(apiError.message || "Could not reset password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-foreground overflow-hidden">
        {/* Ambient gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 20% 80%, rgba(var(--primary-rgb), 0.3) 0%, transparent 50%)"
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(var(--primary-rgb), 0.2) 0%, transparent 50%)"
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-semibold tracking-tight text-white">
              NCC
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
          </Link>

          {/* Quote */}
          <div className="max-w-md">
            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-white/90">
              {isSuccess
                ? "You're all set!"
                : isTokenValid
                  ? "Create a strong password."
                  : "Oops, something went wrong."}
            </p>
            <p className="mt-6 text-base text-white/60">
              {isSuccess
                ? "Your password has been reset. You can now sign in with your new credentials."
                : isTokenValid
                  ? "Choose a password that's at least 8 characters and includes a mix of letters, numbers, and symbols."
                  : "This reset link is invalid or has expired. Please request a new one."}
            </p>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} New Canadian Careers
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <MotionWrapper delay={0} className="lg:hidden mb-12">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-semibold tracking-tight text-foreground">
                NCC
              </span>
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
            </Link>
          </MotionWrapper>

          {!isTokenValid ? (
            // Invalid/Expired Token State
            <>
              <MotionWrapper delay={0}>
                {/* Error Icon */}
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Link expired
                </h1>
                <p className="mt-3 text-foreground-muted">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-8 space-y-3">
                  <Link
                    href="/forgot-password"
                    className={cn(
                      "block w-full py-4 rounded-lg text-base font-medium text-center transition-all duration-300",
                      "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                    )}
                  >
                    Request new link
                  </Link>

                  <Link
                    href="/login"
                    className="block w-full py-4 rounded-lg text-base font-medium text-center text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Back to sign in
                  </Link>
                </div>
              </MotionWrapper>
            </>
          ) : isSuccess ? (
            // Success State
            <>
              <MotionWrapper delay={0}>
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Password reset!
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Your password has been successfully reset. You&apos;ll be redirected to sign in shortly.
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-8">
                  <Link
                    href="/login"
                    className={cn(
                      "block w-full py-4 rounded-lg text-base font-medium text-center transition-all duration-300",
                      "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                    )}
                  >
                    Sign in now
                  </Link>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <p className="mt-6 text-center text-sm text-foreground-muted">
                  Redirecting in 3 seconds...
                </p>
              </MotionWrapper>
            </>
          ) : (
            // Reset Form State
            <>
              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Create new password
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Enter your new password below. Make sure it&apos;s at least 8 characters.
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="password"
                    label="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />

                  <AuthInput
                    type="password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    error={error}
                    required
                  />

                  <TurnstileGuard feature="auth" onToken={setTurnstileToken} />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "relative w-full py-4 rounded-lg text-base font-medium transition-all duration-300",
                      "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "overflow-hidden"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center gap-2 transition-all duration-300",
                      isLoading && "opacity-0"
                    )}>
                      Reset password
                    </span>

                    {/* Loading spinner */}
                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      </span>
                    )}
                  </button>
                </form>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <p className="mt-10 text-center text-foreground-muted">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </MotionWrapper>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

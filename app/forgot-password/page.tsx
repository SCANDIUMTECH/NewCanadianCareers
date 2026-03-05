"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { AuthInput } from "@/components/auth-input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"
import { requestPasswordReset } from "@/lib/api/auth"
import type { ApiError } from "@/lib/auth/types"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const { turnstileToken, setTurnstileToken } = useTurnstileToken()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await requestPasswordReset({ email, turnstile_token: turnstileToken || undefined })
      setIsSuccess(true)
    } catch (err) {
      // Don't reveal if email exists - always show success for security
      // But still show API errors for other issues (network, etc.)
      const apiError = err as ApiError
      if (apiError.status === 400) {
        // Email not found - still show success for security
        setIsSuccess(true)
      } else {
        setError(apiError.message || "Something went wrong. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsLoading(true)
    try {
      await requestPasswordReset({ email, turnstile_token: turnstileToken || undefined })
    } catch {
      // Silently fail on resend
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
            <Image
              src="/logo.svg"
              alt="New Canadian Careers"
              width={180}
              height={48}
              className="h-10 w-auto brightness-0 invert"
              priority
            />
          </Link>

          {/* Quote */}
          <div className="max-w-md">
            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-white/90">
              Happens to the best of us.
              <br />
              Let&apos;s get you back in.
            </p>
            <p className="mt-6 text-base text-white/60">
              We&apos;ll send you a secure link to reset your password and regain access to your account.
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
              <Image
                src="/logo.svg"
                alt="New Canadian Careers"
                width={160}
                height={44}
                className="h-9 w-auto"
                priority
              />
            </Link>
          </MotionWrapper>

          {!isSuccess ? (
            <>
              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Reset password
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Enter your email and we&apos;ll send you a link to reset your password
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="email"
                    label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
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
                      Send reset link
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
          ) : (
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
                  Check your email
                </h1>
                <p className="mt-3 text-foreground-muted">
                  We&apos;ve sent a password reset link to
                </p>
                <p className="mt-1 text-foreground font-medium">
                  {email}
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-8 p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
                  <p className="text-sm text-foreground-muted">
                    Didn&apos;t receive the email? Check your spam folder, or{" "}
                    <button
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Sending..." : "click here to resend"}
                    </button>
                  </p>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <div className="mt-8 space-y-3">
                  <Link
                    href="/login"
                    className={cn(
                      "block w-full py-4 rounded-lg text-base font-medium text-center transition-all duration-300",
                      "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                    )}
                  >
                    Return to sign in
                  </Link>

                  <button
                    onClick={() => {
                      setIsSuccess(false)
                      setEmail("")
                    }}
                    className="w-full py-4 rounded-lg text-base font-medium text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Try a different email
                  </button>
                </div>
              </MotionWrapper>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

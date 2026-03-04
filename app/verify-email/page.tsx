"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "@/components/motion-wrapper"
import { verifyEmail as verifyEmailApi, resendVerificationEmail } from "@/lib/api/auth"
import type { ApiError } from "@/lib/auth/types"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const emailParam = searchParams.get("email")

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState("")

  // Auto-verify on mount
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setIsVerifying(false)
        setError("Missing verification token")
        return
      }

      try {
        await verifyEmailApi({ token })
        setIsSuccess(true)
        // Redirect to login after 3 seconds
        redirectTimer.current = setTimeout(() => {
          router.push("/login?verified=true")
        }, 3000)
      } catch (err) {
        const apiError = err as ApiError
        if (apiError.status === 400) {
          setError("This verification link is invalid or has expired")
        } else {
          setError(apiError.message || "Could not verify email")
        }
      } finally {
        setIsVerifying(false)
      }
    }

    verifyEmail()
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [token, router])

  const handleResend = async () => {
    setIsResending(true)
    try {
      // Don't pass user-supplied email param — require authentication for resend
      await resendVerificationEmail()
      setResendSuccess(true)
    } catch {
      setError("Could not resend verification email. Please sign in and try again.")
    } finally {
      setIsResending(false)
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
              {isVerifying
                ? "Verifying your email..."
                : isSuccess
                  ? "Email verified!"
                  : "Let's try again."}
            </p>
            <p className="mt-6 text-base text-white/60">
              {isVerifying
                ? "Please wait while we confirm your email address."
                : isSuccess
                  ? "Your email has been confirmed. You're all set to start using New Canadian Careers."
                  : "Your verification link may have expired. We can send you a new one."}
            </p>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} New Canadian Careers
          </p>
        </div>
      </div>

      {/* Right Panel - Content */}
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

          {isVerifying ? (
            // Verifying State
            <>
              <MotionWrapper delay={0}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Verifying email
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Please wait while we verify your email address...
                </p>
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
                  Email verified!
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Your email has been successfully verified. You can now sign in to your account.
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
                    Sign in to your account
                  </Link>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <p className="mt-6 text-center text-sm text-foreground-muted">
                  Redirecting in 3 seconds...
                </p>
              </MotionWrapper>
            </>
          ) : resendSuccess ? (
            // Resend Success State
            <>
              <MotionWrapper delay={0}>
                {/* Email Icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Check your email
                </h1>
                <p className="mt-3 text-foreground-muted">
                  We&apos;ve sent a new verification link to your email address. Please check your inbox.
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-8 p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
                  <p className="text-sm text-foreground-muted">
                    Didn&apos;t receive the email? Check your spam folder, or{" "}
                    <button
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-50"
                    >
                      click here to resend
                    </button>
                  </p>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <p className="mt-10 text-center text-foreground-muted">
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Back to sign in
                  </Link>
                </p>
              </MotionWrapper>
            </>
          ) : (
            // Error State
            <>
              <MotionWrapper delay={0}>
                {/* Error Icon */}
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Verification failed
                </h1>
                <p className="mt-3 text-foreground-muted">
                  {error || "Something went wrong while verifying your email."}
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-8 space-y-3">
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className={cn(
                      "relative w-full py-4 rounded-lg text-base font-medium text-center transition-all duration-300",
                      "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isResending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Resend verification email"
                    )}
                  </button>

                  <Link
                    href="/login"
                    className="block w-full py-4 rounded-lg text-base font-medium text-center text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Back to sign in
                  </Link>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <div className="mt-8 p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
                  <p className="text-sm text-foreground-muted">
                    <strong className="text-foreground">Need help?</strong>{" "}
                    Contact our support team at{" "}
                    <a href="mailto:support@newcanadian.careers" className="text-primary hover:text-primary-hover transition-colors">
                      support@newcanadian.careers
                    </a>
                  </p>
                </div>
              </MotionWrapper>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

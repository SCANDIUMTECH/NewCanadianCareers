"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { MotionWrapper } from "@/components/motion-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { resendVerificationEmail } from "@/lib/api/auth"

export default function VerifyEmailPromptPage() {
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleResend = async () => {
    setIsResending(true)
    setError("")
    try {
      await resendVerificationEmail()
      setResendSuccess(true)
    } catch {
      setError("Could not send verification email. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
    router.push("/login")
  }

  // Redirect if user is verified
  useEffect(() => {
    if (user?.email_verified) {
      router.push("/")
    }
  }, [user?.email_verified, router])

  // Show loading while auth hydrates
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show nothing while redirecting verified users
  if (user?.email_verified) {
    return null
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
              Almost there!
            </p>
            <p className="mt-6 text-base text-white/60">
              We sent you an email to verify your account. Check your inbox and click the link to get started.
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

          {resendSuccess ? (
            // Success State
            <>
              <MotionWrapper delay={0}>
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
                  We&apos;ve sent a new verification link to <strong className="text-foreground">{user?.email}</strong>
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
                <button
                  onClick={handleSignOut}
                  className="mt-8 w-full text-center text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Sign out and use a different account
                </button>
              </MotionWrapper>
            </>
          ) : (
            // Initial State
            <>
              <MotionWrapper delay={0}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Verify your email
                </h1>
                <p className="mt-3 text-foreground-muted">
                  We sent a verification link to{" "}
                  <strong className="text-foreground">{user?.email || "your email"}</strong>
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <p className="mt-6 text-sm text-foreground-muted">
                  Click the link in the email to verify your account and access your dashboard.
                </p>
              </MotionWrapper>

              {error && (
                <MotionWrapper delay={250}>
                  <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </MotionWrapper>
              )}

              <MotionWrapper delay={300}>
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

                  <button
                    onClick={handleSignOut}
                    className="block w-full py-4 rounded-lg text-base font-medium text-center text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={400}>
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

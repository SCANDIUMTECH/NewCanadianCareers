"use client"

import { Suspense, useState, useEffect, useRef, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { AuthInput } from "@/components/auth-input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"
import { useAuth } from "@/hooks/use-auth"
import { ROLE_REDIRECTS } from "@/lib/auth/types"
import type { ApiError } from "@/lib/auth/types"
import { checkEmail, sendLoginCode } from "@/lib/api/auth"

type LoginStep = "email" | "password" | "code"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, loginWithCode } = useAuth()

  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { turnstileToken, setTurnstileToken } = useTurnstileToken()

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  const sessionExpired = searchParams.get("session_expired") === "true"

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const getRedirectPath = (userRole: string) => {
    let rawRedirect = ""
    try { rawRedirect = decodeURIComponent(searchParams.get("redirect") || "") } catch { /* malformed URI */ }
    return rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.includes("\\") && !rawRedirect.includes(":")
      ? rawRedirect
      : ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS]
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await checkEmail({ email, turnstile_token: turnstileToken || undefined })
      if (result.exists) {
        setStep("password")
      } else {
        router.push(`/signup?email=${encodeURIComponent(email)}`)
      }
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await login({ email, password, turnstile_token: turnstileToken || undefined })
      router.push(getRedirectPath(user.role))
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendCode = async () => {
    setError("")
    setIsLoading(true)

    try {
      await sendLoginCode({ email, turnstile_token: turnstileToken || undefined })
      setStep("code")
      startResendCooldown()
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || "Failed to send code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await loginWithCode({ email, code, turnstile_token: turnstileToken || undefined })
      router.push(getRedirectPath(user.role))
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || "Invalid code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setError("")

    try {
      await sendLoginCode({ email, turnstile_token: turnstileToken || undefined })
      startResendCooldown()
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || "Failed to resend code.")
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleChangeEmail = () => {
    setStep("email")
    setPassword("")
    setCode("")
    setError("")
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
            <p className="font-secondary text-2xl md:text-3xl font-medium leading-relaxed text-white/90">
              Find the right people.
              <br />
              Without the noise.
            </p>
            <p className="font-secondary mt-6 text-base text-white/60">
              Join thousands of companies and candidates building meaningful connections.
            </p>
          </div>

          {/* Footer */}
          <p className="font-secondary text-sm text-white/40">
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

          {sessionExpired && (
            <MotionWrapper delay={50}>
              <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-secondary text-sm text-amber-700">
                  Your session has expired. Please sign in again.
                </p>
              </div>
            </MotionWrapper>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <>
              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="font-secondary mt-3 text-foreground-muted">
                  Enter your email to continue
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <form onSubmit={handleEmailSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="email"
                    label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
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
                      Continue
                    </span>

                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      </span>
                    )}
                  </button>

                  {error && (
                    <p role="alert" className="font-secondary text-sm text-destructive">{error}</p>
                  )}
                </form>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="font-secondary px-4 text-sm text-foreground-muted bg-background">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <SocialButton provider="google">Google</SocialButton>
                  <SocialButton provider="linkedin">LinkedIn</SocialButton>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={400}>
                <p className="font-secondary mt-10 text-center text-foreground-muted">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </MotionWrapper>
            </>
          )}

          {/* Step 2: Password */}
          {step === "password" && (
            <>
              <MotionWrapper delay={0}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Welcome back
                </h1>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-secondary text-foreground-muted">{email}</span>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="font-secondary text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    Change
                  </button>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <form onSubmit={handlePasswordSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    error={error}
                    required
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="font-secondary text-sm text-foreground-muted">Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="font-secondary text-sm text-primary hover:text-primary-hover transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

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
                      Sign in
                    </span>

                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      </span>
                    )}
                  </button>
                </form>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className="font-secondary text-sm text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
                  >
                    Email me a sign-in code instead
                  </button>
                </div>
              </MotionWrapper>
            </>
          )}

          {/* Step 3: Code */}
          {step === "code" && (
            <>
              <MotionWrapper delay={0}>
                <button
                  type="button"
                  onClick={() => { setStep("password"); setCode(""); setError("") }}
                  className="flex items-center gap-2 font-secondary text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
                >
                  <span className="text-lg">&larr;</span>
                  <span>Back</span>
                </button>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Check your email
                </h1>
                <p className="font-secondary mt-3 text-foreground-muted">
                  We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <form onSubmit={handleCodeSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="text"
                    label="Enter code"
                    value={code}
                    onChange={(e) => {
                      // Only allow digits, max 6
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setCode(val)
                    }}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoFocus
                    error={error}
                    required
                  />

                  <TurnstileGuard feature="auth" onToken={setTurnstileToken} />

                  <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
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
                      Verify
                    </span>

                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      </span>
                    )}
                  </button>
                </form>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="font-secondary text-sm text-primary hover:text-primary-hover transition-colors disabled:text-foreground-muted disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"
                    }
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

function SocialButton({
  provider,
  children
}: {
  provider: "google" | "linkedin"
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className={cn(
        "flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-border",
        "font-secondary text-sm font-medium text-foreground transition-all duration-300",
        "opacity-50 cursor-not-allowed"
      )}
    >
      {provider === "google" && (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {provider === "linkedin" && (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )}
      <span>{children}</span>
    </button>
  )
}

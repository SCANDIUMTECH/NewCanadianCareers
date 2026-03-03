"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AuthInput } from "@/components/auth-input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { TurnstileGuard, useTurnstileToken } from "@/components/turnstile"
import { useAuth } from "@/hooks/use-auth"
import { ROLE_REDIRECTS } from "@/lib/auth/types"
import type { ApiError, UserRole } from "@/lib/auth/types"

type AccountType = "candidate" | "company" | null

// Map frontend account types to backend roles
const ACCOUNT_TYPE_TO_ROLE: Record<NonNullable<AccountType>, UserRole> = {
  candidate: "candidate",
  company: "employer",
}

export default function SignupPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { turnstileToken, setTurnstileToken } = useTurnstileToken()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!accountType) return

    if (password !== passwordConfirm) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const role = ACCOUNT_TYPE_TO_ROLE[accountType]

      // For employers, the name field is the company name
      // For candidates, it's their personal name
      let firstName = ""
      let lastName = ""
      let companyName: string | undefined

      if (accountType === "company") {
        companyName = name.trim()
      } else {
        const nameParts = name.trim().split(/\s+/)
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      const user = await register({
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
        role,
        company_name: companyName,
        turnstile_token: turnstileToken || undefined,
      })

      // Redirect based on email verification status
      if (!user.email_verified) {
        router.push('/verify-email/prompt')
      } else {
        router.push(ROLE_REDIRECTS[user.role])
      }
    } catch (err) {
      const apiError = err as ApiError
      // Show field-specific errors or general message
      if (apiError.errors?.email) {
        setError(apiError.errors.email[0])
      } else if (apiError.errors?.password) {
        setError(apiError.errors.password[0])
      } else {
        setError(apiError.message || "Could not create account")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type)
    setStep(2)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-foreground overflow-hidden">
        {/* Ambient gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 80% 20%, rgba(var(--primary-rgb), 0.3) 0%, transparent 50%)"
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 20% 80%, rgba(var(--primary-rgb), 0.2) 0%, transparent 50%)"
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-semibold tracking-tight text-white">
              Orion
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
          </Link>
          
          {/* Quote - Dynamic based on account type */}
          <div className="max-w-md">
            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-white/90">
              {accountType === "candidate" ? (
                <>Build your profile once.<br />Let opportunities find you.</>
              ) : accountType === "company" ? (
                <>Find exceptional talent.<br />Without the noise.</>
              ) : (
                <>Join a platform built<br />for clarity.</>
              )}
            </p>
            <p className="mt-6 text-base text-white/60">
              {accountType === "candidate"
                ? "Track applications, get real responses, and move faster."
                : accountType === "company"
                ? "Post roles, review matches, communicate directly."
                : "For candidates, companies, and agencies."}
            </p>
          </div>
          
          {/* Footer */}
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Orion
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
                Orion
              </span>
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
            </Link>
          </MotionWrapper>

          {/* Step 1: Account Type Selection */}
          {step === 1 && (
            <>
              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Create your account
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Choose how you want to use Orion
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <div className="mt-10 space-y-4">
                  <AccountTypeCard
                    type="candidate"
                    title="I'm looking for work"
                    description="Create a profile, discover opportunities, and track your applications."
                    isSelected={accountType === "candidate"}
                    onClick={() => handleTypeSelect("candidate")}
                  />
                  <AccountTypeCard
                    type="company"
                    title="I'm hiring"
                    description="Post roles, review candidates, and build your team efficiently."
                    isSelected={accountType === "company"}
                    onClick={() => handleTypeSelect("company")}
                  />
                </div>
              </MotionWrapper>

              <MotionWrapper delay={300}>
                <p className="mt-10 text-center text-foreground-muted">
                  Already have an account?{" "}
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

          {/* Step 2: Account Details */}
          {step === 2 && (
            <>
              <MotionWrapper delay={0}>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
                >
                  <span className="text-lg">←</span>
                  <span>Back</span>
                </button>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  {accountType === "candidate" ? "Create your profile" : "Set up your company"}
                </h1>
                <p className="mt-3 text-foreground-muted">
                  {accountType === "candidate" 
                    ? "Let opportunities find you"
                    : "Start finding the right people"}
                </p>
              </MotionWrapper>

              <MotionWrapper delay={200}>
                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <AuthInput
                    type="text"
                    label={accountType === "candidate" ? "Full name" : "Company name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete={accountType === "candidate" ? "name" : "organization"}
                    required
                  />
                  
                  <AuthInput
                    type="email"
                    label="Work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  
                  <AuthInput
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />

                  <AuthInput
                    type="password"
                    label="Confirm password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    error={error}
                    required
                  />

                  <p className="text-xs text-foreground-muted pt-1">
                    By creating an account, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>

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
                      Create account
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
                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm text-foreground-muted bg-background">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <SocialButton provider="google">Google</SocialButton>
                  <SocialButton provider="github">GitHub</SocialButton>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={400}>
                <p className="mt-10 text-center text-foreground-muted">
                  Already have an account?{" "}
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

function AccountTypeCard({ 
  type, 
  title, 
  description, 
  isSelected, 
  onClick 
}: { 
  type: AccountType
  title: string
  description: string
  isSelected: boolean
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full text-left p-6 rounded-xl border transition-all duration-300",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={cn(
            "text-lg font-medium transition-colors duration-300",
            (isHovered || isSelected) ? "text-primary" : "text-foreground"
          )}>
            {title}
          </h3>
          <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Selection indicator */}
        <div className={cn(
          "w-5 h-5 rounded-full border-2 transition-all duration-300 flex-shrink-0 mt-1",
          isSelected 
            ? "border-primary bg-primary" 
            : "border-border"
        )}>
          {isSelected && (
            <svg className="w-full h-full text-primary-foreground p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

function SocialButton({
  provider,
  children
}: {
  provider: "google" | "github"
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className={cn(
        "flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-border",
        "text-sm font-medium text-foreground transition-all duration-300",
        "opacity-50 cursor-not-allowed"
      )}
    >
      {provider === "google" && (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      {provider === "github" && (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )}
      <span>{children}</span>
    </button>
  )
}

"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PROVINCES, COUNTRY } from "@/lib/constants/canada"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { completeOnboarding } from "@/lib/api/auth"
import { INDUSTRY_LABELS } from "@/lib/constants/industries"
import type { User } from "@/lib/auth/types"

interface CompanyOnboardingProps {
  user: User
  companyName: string
  onComplete: () => void
}

export function CompanyOnboarding({ user, companyName, onComplete }: CompanyOnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [firstName, setFirstName] = useState(user.first_name || "")
  const [lastName, setLastName] = useState(user.last_name || "")
  const [industry, setIndustry] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [country] = useState(COUNTRY.name)
  const [postalCode, setPostalCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name")
      return
    }
    setError("")
    setStep(2)
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await completeOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        industry: industry.trim(),
        headquarters_address: address.trim(),
        headquarters_city: city.trim(),
        headquarters_state: state.trim(),
        headquarters_country: country.trim(),
        headquarters_postal_code: postalCode.trim(),
      })
      onComplete()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipAddress = async () => {
    setIsSubmitting(true)
    try {
      await completeOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        industry: industry.trim(),
      })
      onComplete()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-foreground overflow-hidden">
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

        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-semibold tracking-tight text-white">
              NCC
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
          </div>

          {/* Content */}
          <div className="max-w-md">
            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-white/90">
              {step === 1 ? (
                <>Welcome to New Canadian Careers.<br />Let&apos;s set up your account.</>
              ) : (
                <>Almost there.<br />Where is {companyName} based?</>
              )}
            </p>
            <p className="mt-6 text-base text-white/60">
              {step === 1
                ? "Just a couple of quick details to get you started."
                : "This helps candidates find roles near them."}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-1 rounded-full transition-all duration-500",
              step >= 1 ? "w-12 bg-primary" : "w-8 bg-white/20"
            )} />
            <div className={cn(
              "h-1 rounded-full transition-all duration-500",
              step >= 2 ? "w-12 bg-primary" : "w-8 bg-white/20"
            )} />
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12 flex items-center">
            <span className="text-xl font-semibold tracking-tight text-foreground">
              NCC
            </span>
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
          </div>

          {/* Step 1: Your name */}
          {step === 1 && (
            <>
              <MotionWrapper delay={0}>
                <div className="mb-2">
                  <span className="text-xs font-medium tracking-wider uppercase text-primary">
                    Step 1 of 2
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  What&apos;s your name?
                </h1>
                <p className="mt-3 text-foreground-muted">
                  This will be shown to your team and candidates.
                </p>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <form onSubmit={handleNext} className="mt-10 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      autoComplete="given-name"
                      autoFocus
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      autoComplete="family-name"
                      required
                      className="h-12"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    Continue
                  </Button>
                </form>
              </MotionWrapper>
            </>
          )}

          {/* Step 2: Company address */}
          {step === 2 && (
            <>
              <MotionWrapper delay={0}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
                >
                  <span className="text-lg">&larr;</span>
                  <span>Back</span>
                </button>
              </MotionWrapper>

              <MotionWrapper delay={50}>
                <div className="mb-2">
                  <span className="text-xs font-medium tracking-wider uppercase text-primary">
                    Step 2 of 2
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                  Company address
                </h1>
                <p className="mt-3 text-foreground-muted">
                  Where is <span className="font-medium text-foreground">{companyName}</span> headquartered?
                </p>
              </MotionWrapper>

              <MotionWrapper delay={100}>
                <form onSubmit={handleComplete} className="mt-10 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <div className="relative">
                      <Combobox
                        items={INDUSTRY_LABELS}
                        value={industry || null}
                        onValueChange={(val) => setIndustry(val || "")}
                      >
                        <ComboboxInput placeholder="Select industry..." showClear className="h-12" />
                        <ComboboxContent>
                          <ComboboxEmpty>No industry found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street address</Label>
                    <Input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main Street, Suite 100"
                      autoComplete="street-address"
                      autoFocus
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Toronto"
                        autoComplete="address-level2"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Province</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVINCES.map((prov) => (
                            <SelectItem key={prov.code} value={prov.code}>
                              {prov.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal / ZIP code</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="M5V 3L9"
                        autoComplete="postal-code"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={COUNTRY.name}
                        disabled
                        className="h-12 bg-muted"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-hover text-primary-foreground mt-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : (
                      "Complete setup"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleSkipAddress}
                    disabled={isSubmitting}
                    className="w-full text-center text-sm text-foreground-muted hover:text-foreground transition-colors py-2"
                  >
                    Skip for now
                  </button>
                </form>
              </MotionWrapper>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

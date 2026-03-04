"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type JobWizardData } from "@/lib/job-wizard-schema"
import { useCompanyContext } from "@/hooks/use-company"
import { getPackages } from "@/lib/api/billing"
import type { Package } from "@/lib/company/types"
import { cn, getCurrencySymbol } from "@/lib/utils"
import { Check, CreditCard, Sparkles, Zap, AlertCircle, RefreshCw } from "lucide-react"

interface StepPublishProps {
  data: JobWizardData
  onPackageSelect?: (pkg: Package | null) => void
  selectedPackageId?: number | null
}

export function StepPublish({ data, onPackageSelect, selectedPackageId }: StepPublishProps) {
  const { entitlements } = useCompanyContext()
  const remainingCredits = entitlements?.remaining_credits ?? 0
  const postDurationDays = entitlements?.post_duration_days ?? 30

  const [packages, setPackages] = useState<Package[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState<string | null>(null)

  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true)
      setPackagesError(null)
      const pkgs = await getPackages()
      setPackages(pkgs)
    } catch {
      setPackagesError("Failed to load packages.")
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (remainingCredits < 1) {
      fetchPackages()
    }
  }, [remainingCredits, fetchPackages])

  const formatSalary = () => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 0,
    })
    if (data.salaryMax > 0 && data.salaryMax > data.salaryMin) {
      return `${formatter.format(data.salaryMin)} - ${formatter.format(data.salaryMax)}`
    }
    return formatter.format(data.salaryMin)
  }

  const selectedPackage = packages.find(p => p.id === selectedPackageId) || null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        {remainingCredits >= 1 ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Ready to Publish</h2>
            <p className="text-foreground-muted">
              Review the summary below and click Publish to make your job live
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Get Credits to Publish</h2>
            <p className="text-foreground-muted">
              Choose a plan below to purchase credits and publish your job
            </p>
          </>
        )}
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: data.company?.color ? `${data.company.color}15` : undefined }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: data.company?.color || "var(--primary)" }}
              >
                {data.company?.initials || "A"}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{data.title}</h3>
              <p className="text-foreground-muted">{data.company?.name || "Your Company"}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm font-medium text-foreground">
                {data.remote === "remote"
                  ? "Remote"
                  : [data.city, data.state, data.postalCode].filter(Boolean).join(", ")}
                {data.remote !== "onsite" && data.remote !== "remote" && " · Hybrid"}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Type</p>
              <p className="text-sm font-medium text-foreground capitalize">{data.type.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Experience</p>
              <p className="text-sm font-medium text-foreground capitalize">{data.experience.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Category</p>
              <p className="text-sm font-medium text-foreground">{data.categoryLabel || "—"}</p>
            </div>
          </div>

          {data.showSalary && data.salaryMin > 0 && (
            <div className="pt-2">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Compensation</p>
              <p className="text-lg font-semibold text-foreground">
                {formatSalary()}
                <span className="text-sm font-normal text-foreground-muted ml-1">/ {data.period}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== HAS CREDITS: Normal publish info ===== */}
      {remainingCredits >= 1 && (
        <>
          {/* What happens next */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
            <h4 className="font-medium text-foreground mb-3">What happens next</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Job goes live immediately</p>
                  <p className="text-xs text-foreground-muted">Your job will be visible to candidates right away</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Social posts scheduled</p>
                  <p className="text-xs text-foreground-muted">
                    {[
                      data.linkedin && "LinkedIn",
                      data.twitter && "X",
                      data.facebook && "Facebook",
                      data.instagram && "Instagram",
                    ]
                      .filter(Boolean)
                      .join(", ") || "No social channels selected"}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Start receiving applications</p>
                  <p className="text-xs text-foreground-muted">
                    {data.applyMethod === "internal"
                      ? "Manage applications directly in New Canadian Careers"
                      : data.applyMethod === "email"
                      ? `Applications sent to ${data.applyEmail}`
                      : "Candidates redirected to your external URL"}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Credit usage */}
          <div className="rounded-xl bg-foreground/[0.02] border border-border/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Job Post Credit</p>
                  <p className="text-xs text-foreground-muted">
                    1 credit will be used &bull; {remainingCredits} remaining
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {postDurationDays}-day listing
              </Badge>
            </div>
          </div>
        </>
      )}

      {/* ===== NO CREDITS: Inline package selection ===== */}
      {remainingCredits < 1 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Select a plan</h4>

          {packagesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[220px] bg-background-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : packagesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
              <p className="text-sm text-foreground-muted mb-3">{packagesError}</p>
              <Button variant="outline" size="sm" onClick={fetchPackages} className="bg-transparent">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id
                  const Icon = pkg.is_popular ? Sparkles : Zap
                  const credits = pkg.job_credits ?? pkg.credits ?? 0
                  const perCredit = credits > 0 ? (pkg.price / credits).toFixed(2) : "0"
                  const features = pkg.features ?? []

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => onPackageSelect?.(isSelected ? null : pkg)}
                      className={cn(
                        "relative text-left rounded-xl border-2 p-4 transition-all duration-200",
                        "hover:border-primary/50 hover:shadow-sm",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 bg-card",
                        pkg.is_popular && !isSelected && "border-primary/30"
                      )}
                    >
                      {pkg.is_popular && (
                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                          Popular
                        </Badge>
                      )}

                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}

                      <div className="pt-1">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <p className="font-semibold text-foreground text-sm">{pkg.name}</p>

                        <div className="mt-2">
                          <span className="text-2xl font-bold text-primary">
                            {getCurrencySymbol(pkg.currency)}{pkg.price}
                          </span>
                          {pkg.billing_period && pkg.package_type !== "one_time" && (
                            <span className="text-xs text-foreground-muted">
                              /{pkg.billing_period === "month" || pkg.billing_period === "monthly" ? "mo" : "yr"}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-foreground-muted mt-1">
                          {credits} credits &middot; {getCurrencySymbol(pkg.currency)}{perCredit}/credit
                        </p>

                        {features.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {features.slice(0, 3).map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-xs text-foreground-muted">
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{f}</span>
                              </li>
                            ))}
                            {features.length > 3 && (
                              <li className="text-xs text-primary font-medium">
                                +{features.length - 3} more
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected package summary */}
              {selectedPackage && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedPackage.name} &mdash; {getCurrencySymbol(selectedPackage.currency)}{selectedPackage.price}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {selectedPackage.job_credits ?? selectedPackage.credits} credits &bull; 1 will be used to publish this job
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {selectedPackage.post_duration_days}-day listing
                    </Badge>
                  </div>
                </div>
              )}

              {/* How it works */}
              {!selectedPackage && (
                <p className="text-xs text-center text-foreground-muted">
                  Select a plan above. Your job will be saved as a draft while you complete payment.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Terms */}
      <p className="text-xs text-center text-foreground-muted">
        By publishing, you agree to our{" "}
        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
        {" "}and{" "}
        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        Job postings must comply with all applicable laws and regulations.
      </p>
    </div>
  )
}

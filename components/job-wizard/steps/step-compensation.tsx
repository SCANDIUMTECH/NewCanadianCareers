"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type JobWizardData } from "@/lib/job-wizard-schema"

interface StepCompensationProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
  errors?: Record<string, string>
  onBlur?: (field: keyof JobWizardData) => void
}

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
]

const periods = [
  { value: "hour", label: "per hour" },
  { value: "month", label: "per month" },
  { value: "year", label: "per year" },
]

const suggestedBenefits = [
  "Health Insurance",
  "Dental Insurance",
  "Vision Insurance",
  "401(k) / Retirement Plan",
  "401(k) Matching",
  "Flexible PTO",
  "Unlimited PTO",
  "Remote Work",
  "Flexible Hours",
  "Equity / Stock Options",
  "Annual Bonus",
  "Learning & Development",
  "Conference Budget",
  "Home Office Stipend",
  "Gym / Wellness Stipend",
  "Parental Leave",
  "Mental Health Support",
  "Commuter Benefits",
  "Free Lunch / Snacks",
  "Company Events",
]

export function StepCompensation({ data, updateData }: StepCompensationProps) {
  const [benefitInput, setBenefitInput] = useState("")

  const getCurrencySymbol = () => {
    return currencies.find((c) => c.code === data.currency)?.symbol || "$"
  }

  const formatSalary = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  }

  const addBenefit = (benefit: string) => {
    if (benefit.trim() && !data.benefits.includes(benefit.trim())) {
      updateData({ benefits: [...data.benefits, benefit.trim()] })
    }
    setBenefitInput("")
  }

  const removeBenefit = (benefit: string) => {
    updateData({ benefits: data.benefits.filter((b) => b !== benefit) })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Compensation</h2>
        <p className="text-sm text-foreground-muted">
          Define the salary range and benefits for this position
        </p>
      </div>

      {/* Salary */}
      <div className="space-y-4">
        <Label>Salary <span className="text-destructive">*</span></Label>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-xs text-foreground-muted">Currency</Label>
            <Select
              value={data.currency}
              onValueChange={(value) => updateData({ currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salaryMin" className="text-xs text-foreground-muted">Amount <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none">
                {getCurrencySymbol()}
              </span>
              <Input
                id="salaryMin"
                type="number"
                className={cn(getCurrencySymbol().length > 1 ? "pl-10" : "pl-7")}
                placeholder="50,000"
                value={data.salaryMin || ""}
                onChange={(e) => updateData({ salaryMin: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salaryMax" className="text-xs text-foreground-muted">Maximum (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none">
                {getCurrencySymbol()}
              </span>
              <Input
                id="salaryMax"
                type="number"
                className={cn(getCurrencySymbol().length > 1 ? "pl-10" : "pl-7")}
                placeholder="80,000"
                value={data.salaryMax || ""}
                onChange={(e) => updateData({ salaryMax: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period" className="text-xs text-foreground-muted">Period</Label>
            <Select
              value={data.period}
              onValueChange={(value: "hour" | "month" | "year") => updateData({ period: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Salary Preview */}
        {data.salaryMin > 0 && (
          <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
            <p className="text-sm text-foreground-muted mb-1">Salary will appear as:</p>
            <p className="text-lg font-semibold text-foreground">
              {getCurrencySymbol()}{formatSalary(data.salaryMin)}
              {data.salaryMax > 0 && data.salaryMax > data.salaryMin && (
                <> - {getCurrencySymbol()}{formatSalary(data.salaryMax)}</>
              )}
              <span className="text-sm font-normal text-foreground-muted ml-1">
                / {data.period}
              </span>
            </p>
          </div>
        )}

        {/* Show Salary Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50">
          <div>
            <Label className="text-foreground">Show Salary on Job Listing</Label>
            <p className="text-sm text-foreground-muted">
              Jobs with visible salaries get 40% more applications
            </p>
          </div>
          <Switch
            checked={data.showSalary}
            onCheckedChange={(checked) => updateData({ showSalary: checked })}
          />
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <Label>Benefits & Perks</Label>

        <div className="flex gap-2">
          <Input
            placeholder="Add a benefit..."
            value={benefitInput}
            onChange={(e) => setBenefitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit(benefitInput))}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addBenefit(benefitInput)}
            className="bg-transparent shrink-0"
          >
            Add
          </Button>
        </div>

        {/* Selected Benefits */}
        {data.benefits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.benefits.map((benefit) => (
              <Badge
                key={benefit}
                variant="secondary"
                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20"
                onClick={() => removeBenefit(benefit)}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {benefit}
                <svg className="w-3 h-3 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Badge>
            ))}
          </div>
        )}

        {/* Suggested Benefits */}
        <div className="pt-2">
          <p className="text-xs text-foreground-muted mb-2">Common benefits:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedBenefits
              .filter((benefit) => !data.benefits.includes(benefit))
              .slice(0, 12)
              .map((benefit) => (
                <Badge
                  key={benefit}
                  variant="outline"
                  className={cn(
                    "px-2 py-1 text-xs cursor-pointer transition-colors bg-transparent",
                    "hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                  )}
                  onClick={() => addBenefit(benefit)}
                >
                  + {benefit}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

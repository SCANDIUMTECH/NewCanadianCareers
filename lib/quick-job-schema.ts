import { z } from "zod"
import { getVisibleTextLength } from "@/lib/utils"

export const jobTypes = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
] as const

export type JobType = (typeof jobTypes)[number]["value"]

export const remoteOptions = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
] as const

export type RemoteType = (typeof remoteOptions)[number]["value"]

export const wagePeriods = [
  { value: "hour", label: "per hour" },
  { value: "month", label: "per month" },
  { value: "year", label: "per year" },
] as const

export type WagePeriod = (typeof wagePeriods)[number]["value"]

export { CURRENCY_OPTIONS as currencies, type CurrencyCode as Currency } from "@/lib/utils"

export type JobStatus = "draft" | "scheduled" | "published"

export const agencySettingsSchema = z.object({
  job_post_workflow: z.enum(["quick", "standard"]).default("standard"),
  default_apply_email: z.string().email().optional().or(z.literal("")),
  allow_backdated_post_date: z.boolean().default(false),
  max_backdate_days: z.number().default(167),
})

export type AgencySettings = z.infer<typeof agencySettingsSchema>

export const defaultAgencySettings: AgencySettings = {
  job_post_workflow: "standard",
  default_apply_email: "",
  allow_backdated_post_date: false,
  max_backdate_days: 167,
}

export interface QuickJobCompany {
  id: number
  name: string
  initials: string
  color: string
  verified: boolean
  industry: string
  applyEmail?: string
  location?: string
}

export const quickJobSchema = z.object({
  companyId: z.number().min(1, "Please select a company"),
  title: z.string().min(3, "Job title must be at least 3 characters"),
  type: z.enum(["full-time", "part-time", "contract", "temporary", "internship"], {
    required_error: "Please select a job type",
  }),
  location: z.string().min(1, "Location is required"),
  remote: z.enum(["onsite", "hybrid", "remote"]).default("onsite"),
  wageMin: z.number().positive().optional(),
  wageMax: z.number().positive().optional(),
  wagePeriod: z.enum(["hour", "month", "year"]).default("year"),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("CAD"),
  hoursPerWeek: z.number().min(1).max(168).optional(),
  postDate: z.string().min(1, "Post date is required"),
  description: z.string().refine((value) => getVisibleTextLength(value) >= 50, {
    message: "Description must be at least 50 characters",
  }),
  applyEmail: z.string().email("Please enter a valid email"),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
  savedAt: z.string().optional(),
})

export type QuickJobData = z.infer<typeof quickJobSchema>

export const quickJobDraftSchema = quickJobSchema.partial().extend({
  companyId: z.number().optional(),
  title: z.string().optional(),
  type: z.enum(["full-time", "part-time", "contract", "temporary", "internship"]).optional(),
  location: z.string().optional(),
  remote: z.enum(["onsite", "hybrid", "remote"]).optional(),
  postDate: z.string().optional(),
  description: z.string().optional(),
  applyEmail: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
})

export type QuickJobDraft = z.infer<typeof quickJobDraftSchema>

export const defaultQuickJobData: QuickJobDraft = {
  companyId: undefined,
  title: "",
  type: undefined,
  location: "",
  remote: "onsite",
  wageMin: undefined,
  wageMax: undefined,
  wagePeriod: "year",
  currency: "CAD",
  hoursPerWeek: undefined,
  postDate: "",
  description: "",
  applyEmail: "",
  status: "draft",
}

export function validateForPublish(data: QuickJobDraft): {
  valid: boolean
  errors: Record<string, string>
} {
  const result = quickJobSchema.safeParse(data)

  if (result.success) {
    return { valid: true, errors: {} }
  }

  const errors: Record<string, string> = {}
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".")
    errors[path] = issue.message
  })

  return { valid: false, errors }
}

export function getJobStatusFromDate(postDate: string): JobStatus {
  if (!postDate) return "draft"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const post = new Date(postDate)
  post.setHours(0, 0, 0, 0)

  if (post > today) {
    return "scheduled"
  }

  return "published"
}


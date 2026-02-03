import { z } from "zod"

/**
 * Job Wizard Validation Schemas
 * Zod schemas for each step of the job creation wizard
 */

// Step 1: Basics
export const basicsSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters"),
  department: z.string().min(1, "Please select a department"),
  type: z.string().min(1, "Please select an employment type"),
  experience: z.string().min(1, "Please select an experience level"),
})

// Step 2: Role Details
export const roleDetailsSchema = z.object({
  description: z.string().min(50, "Description must be at least 50 characters"),
  responsibilities: z.array(z.string()).min(1, "Add at least one responsibility"),
  requirements: z.array(z.string()).min(1, "Add at least one requirement"),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
})

// Step 3: Location
export const locationSchema = z.object({
  city: z.string().min(1, "Please enter a city"),
  state: z.string().optional(),
  country: z.string().min(1, "Please select a country"),
  remote: z.enum(["onsite", "hybrid", "remote"]),
})

// Step 4: Compensation
export const compensationSchema = z.object({
  salaryMin: z.number().min(0, "Minimum salary must be positive"),
  salaryMax: z.number().min(0, "Maximum salary must be positive"),
  currency: z.string().min(1, "Please select a currency"),
  period: z.enum(["hour", "month", "year"]),
  showSalary: z.boolean(),
  benefits: z.array(z.string()),
}).refine((data) => data.salaryMax >= data.salaryMin, {
  message: "Maximum salary must be greater than or equal to minimum",
  path: ["salaryMax"],
})

// Step 5: Application Method
export const applyMethodSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("internal"),
    instructions: z.string().optional(),
  }),
  z.object({
    method: z.literal("email"),
    email: z.string().email("Please enter a valid email"),
    instructions: z.string().optional(),
  }),
  z.object({
    method: z.literal("external"),
    url: z.string().url("Please enter a valid URL"),
    instructions: z.string().optional(),
  }),
])

// Step 6: Distribution
export const distributionSchema = z.object({
  linkedin: z.boolean(),
  twitter: z.boolean(),
  facebook: z.boolean(),
  instagram: z.boolean(),
})

// Company type for agency context
export interface JobWizardCompany {
  id: number
  name: string
  initials: string
  color: string
  verified: boolean
  industry?: string
  activeJobs?: number
}

// Complete job data type
export interface JobWizardData {
  // Company (for agency context)
  company?: JobWizardCompany

  // Step 1: Basics
  title: string
  department: string
  type: string
  experience: string

  // Step 2: Role Details
  description: string
  responsibilities: string[]
  requirements: string[]
  skills: string[]

  // Step 3: Location
  city: string
  state: string
  country: string
  remote: "onsite" | "hybrid" | "remote"

  // Step 4: Compensation
  salaryMin: number
  salaryMax: number
  currency: string
  period: "hour" | "month" | "year"
  showSalary: boolean
  benefits: string[]

  // Step 5: Apply Method
  applyMethod: "internal" | "email" | "external"
  applyEmail: string
  applyUrl: string
  applyInstructions: string

  // Step 6: Distribution
  linkedin: boolean
  twitter: boolean
  facebook: boolean
  instagram: boolean
}

// Default values for new job
export const defaultJobData: JobWizardData = {
  company: undefined,
  title: "",
  department: "",
  type: "",
  experience: "",
  description: "",
  responsibilities: [],
  requirements: [],
  skills: [],
  city: "",
  state: "",
  country: "USA",
  remote: "onsite",
  salaryMin: 0,
  salaryMax: 0,
  currency: "USD",
  period: "year",
  showSalary: true,
  benefits: [],
  applyMethod: "internal",
  applyEmail: "",
  applyUrl: "",
  applyInstructions: "",
  linkedin: true,
  twitter: false,
  facebook: false,
  instagram: false,
}

// Step configuration
export const wizardSteps = [
  { id: 1, title: "Basics", description: "Job title and type" },
  { id: 2, title: "Role Details", description: "Description and requirements" },
  { id: 3, title: "Location", description: "Where the job is based" },
  { id: 4, title: "Compensation", description: "Salary and benefits" },
  { id: 5, title: "Application", description: "How candidates apply" },
  { id: 6, title: "Distribution", description: "Where to share" },
  { id: 7, title: "Preview", description: "Review your listing" },
  { id: 8, title: "Publish", description: "Post your job" },
] as const

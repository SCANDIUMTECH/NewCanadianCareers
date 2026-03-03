export interface JobWizardCompany {
  id: number
  name: string
  initials: string
  color: string
  verified: boolean
  industry?: string
  activeJobs?: number
}

export interface JobWizardData {
  company?: JobWizardCompany
  title: string
  category: string
  categoryLabel: string
  type: string
  experience: string
  description: string
  responsibilities: string[]
  requirements: string[]
  niceToHave: string[]
  skills: string[]
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  remote: "onsite" | "hybrid" | "remote"
  salaryMin: number
  salaryMax: number
  currency: string
  period: "hour" | "month" | "year"
  showSalary: boolean
  benefits: string[]
  applyMethod: "internal" | "email" | "external"
  applyEmail: string
  applyUrl: string
  applyInstructions: string
  linkedin: boolean
  twitter: boolean
  facebook: boolean
  instagram: boolean
}

export const defaultJobData: JobWizardData = {
  company: undefined,
  title: "",
  category: "",
  categoryLabel: "",
  type: "",
  experience: "",
  description: "",
  responsibilities: [],
  requirements: [],
  niceToHave: [],
  skills: [],
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "CA",
  remote: "onsite",
  salaryMin: 0,
  salaryMax: 0,
  currency: "CAD",
  period: "hour",
  showSalary: true,
  benefits: [],
  applyMethod: "internal",
  applyEmail: "",
  applyUrl: "",
  applyInstructions: "",
  linkedin: false,
  twitter: false,
  facebook: false,
  instagram: false,
}

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

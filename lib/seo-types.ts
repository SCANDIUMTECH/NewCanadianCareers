export interface JobPostingSchema {
  title: string
  description: string
  datePosted: string
  validThrough?: string
  employmentType: EmploymentType | EmploymentType[]
  hiringOrganization: HiringOrganization
  jobLocation: JobLocation | JobLocation[]
  baseSalary?: BaseSalary
  identifier?: JobIdentifier
  applicantLocationRequirements?: LocationRequirement[]
  jobLocationType?: 'TELECOMMUTE'
  directApply?: boolean
  skills?: string[]
  qualifications?: string[]
  responsibilities?: string[]
  educationRequirements?: EducationalOccupationalCredential
  experienceRequirements?: OccupationalExperienceRequirements
  industry?: string
}

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACTOR'
  | 'TEMPORARY'
  | 'INTERN'
  | 'VOLUNTEER'
  | 'PER_DIEM'
  | 'OTHER'

export interface HiringOrganization {
  '@type': 'Organization'
  name: string
  sameAs?: string
  logo?: string
  url?: string
  description?: string
}

export interface JobLocation {
  '@type': 'Place'
  address: PostalAddress
}

export interface PostalAddress {
  '@type': 'PostalAddress'
  streetAddress?: string
  addressLocality: string
  addressRegion?: string
  postalCode?: string
  addressCountry: string
}

export interface BaseSalary {
  '@type': 'MonetaryAmount'
  currency: string
  value: SalaryValue
}

export interface SalaryValue {
  '@type': 'QuantitativeValue'
  value?: number
  minValue?: number
  maxValue?: number
  unitText: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

export interface JobIdentifier {
  '@type': 'PropertyValue'
  name: string
  value: string
}

export interface LocationRequirement {
  '@type': 'Country' | 'State' | 'City'
  name: string
}

export interface EducationalOccupationalCredential {
  '@type': 'EducationalOccupationalCredential'
  credentialCategory: string
}

export interface OccupationalExperienceRequirements {
  '@type': 'OccupationalExperienceRequirements'
  monthsOfExperience?: number
}

export interface OrganizationSchema {
  name: string
  url?: string
  logo?: string
  description?: string
  foundingDate?: string
  numberOfEmployees?: QuantitativeValue
  address?: PostalAddress
  contactPoint?: ContactPoint
  sameAs?: string[]
  industry?: string
}

export interface QuantitativeValue {
  '@type': 'QuantitativeValue'
  minValue?: number
  maxValue?: number
  value?: number
}

export interface ContactPoint {
  '@type': 'ContactPoint'
  contactType: string
  email?: string
  telephone?: string
  url?: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

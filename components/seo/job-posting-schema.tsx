import {
  JobPostingSchema,
  EmploymentType,
  HiringOrganization,
  JobLocation,
  BaseSalary,
} from '@/lib/seo-types'

interface JobPostingSchemaProps {
  job: {
    id: string
    title: string
    description: string
    postedDate: string
    expirationDate?: string
    type: string
    company: {
      name: string
      website?: string
      logo?: string
      description?: string
    }
    location: {
      city: string
      state?: string
      country: string
      remote?: 'remote' | 'hybrid' | 'onsite'
    }
    salary?: {
      min: number
      max: number
      currency: string
      period: 'hour' | 'day' | 'week' | 'month' | 'year'
    }
    skills?: string[]
    requirements?: string[]
    responsibilities?: string[]
    experience?: string
  }
}

function mapEmploymentType(type: string): EmploymentType {
  const mapping: Record<string, EmploymentType> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    'contract': 'CONTRACTOR',
    'contractor': 'CONTRACTOR',
    'temporary': 'TEMPORARY',
    'intern': 'INTERN',
    'internship': 'INTERN',
    'volunteer': 'VOLUNTEER',
  }
  return mapping[type.toLowerCase()] || 'OTHER'
}

type SalaryPeriod = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
const VALID_SALARY_PERIODS = new Set(['hour', 'day', 'week', 'month', 'year'])

function mapSalaryPeriod(period: string): SalaryPeriod {
  const lower = period.toLowerCase()
  return VALID_SALARY_PERIODS.has(lower) ? (lower.toUpperCase() as SalaryPeriod) : 'YEAR'
}

export function JobPostingJsonLd({ job }: JobPostingSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  const hiringOrganization: HiringOrganization = {
    '@type': 'Organization',
    name: job.company.name,
    ...(job.company.website && { sameAs: job.company.website, url: job.company.website }),
    ...(job.company.logo && { logo: job.company.logo }),
    ...(job.company.description && { description: job.company.description }),
  }

  const jobLocation: JobLocation = {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: job.location.city,
      ...(job.location.state && { addressRegion: job.location.state }),
      addressCountry: job.location.country,
    },
  }

  const baseSalary: BaseSalary | undefined = job.salary
    ? {
        '@type': 'MonetaryAmount',
        currency: job.salary.currency,
        value: {
          '@type': 'QuantitativeValue',
          minValue: job.salary.min,
          maxValue: job.salary.max,
          unitText: mapSalaryPeriod(job.salary.period),
        },
      }
    : undefined

  const schema: JobPostingSchema & { '@context': string; '@type': string; url: string } = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.postedDate,
    ...(job.expirationDate && { validThrough: job.expirationDate }),
    employmentType: mapEmploymentType(job.type),
    hiringOrganization,
    jobLocation,
    ...(baseSalary && { baseSalary }),
    identifier: {
      '@type': 'PropertyValue',
      name: 'New Canadian Careers',
      value: job.id,
    },
    url: `${baseUrl}/jobs/${job.id}`,
    directApply: true,
    ...(job.skills && { skills: job.skills }),
    ...(job.requirements && { qualifications: job.requirements }),
    ...(job.responsibilities && { responsibilities: job.responsibilities }),
  }

  // Add remote job support
  if (job.location.remote === 'remote') {
    Object.assign(schema, {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: [
        {
          '@type': 'Country',
          name: job.location.country,
        },
      ],
    })
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}

// For previewing schema in admin panel
export function generateJobPostingSchema(job: JobPostingSchemaProps['job']): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.postedDate,
    ...(job.expirationDate && { validThrough: job.expirationDate }),
    employmentType: mapEmploymentType(job.type),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company.name,
      ...(job.company.website && { sameAs: job.company.website, url: job.company.website }),
      ...(job.company.logo && { logo: job.company.logo }),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location.city,
        ...(job.location.state && { addressRegion: job.location.state }),
        addressCountry: job.location.country,
      },
    },
    ...(job.salary && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.salary.currency,
        value: {
          '@type': 'QuantitativeValue',
          minValue: job.salary.min,
          maxValue: job.salary.max,
          unitText: mapSalaryPeriod(job.salary.period),
        },
      },
    }),
    identifier: {
      '@type': 'PropertyValue',
      name: 'New Canadian Careers',
      value: job.id,
    },
    url: `${baseUrl}/jobs/${job.id}`,
    directApply: true,
    ...(job.location.remote === 'remote' && {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: [
        { '@type': 'Country', name: job.location.country },
      ],
    }),
  }

  return JSON.stringify(schema, null, 2)
}

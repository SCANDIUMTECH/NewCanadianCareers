import { cache } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobPostingJsonLd } from '@/components/seo/job-posting-schema'
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-schema'
import { FAQPageJsonLd, generateJobFAQItems } from '@/components/seo/faq-schema'
import { JobDetailClient } from './job-detail-client'
import { getPublicJob, type PublicJobDetail } from '@/lib/api/public'

type Props = {
  params: Promise<{ id: string }>
}

const getJob = cache(async (id: string): Promise<PublicJobDetail | null> => {
  try {
    const job = await getPublicJob(id)
    return job
  } catch (error) {
    console.error("Error fetching job:", error)
    return null
  }
})

function transformJobForClient(job: PublicJobDetail) {
  const hasSalary = job.show_salary && job.salary_min && job.salary_max

  return {
    id: String(job.id),
    jobId: job.job_id,
    title: job.title,
    company: {
      name: job.company.name,
      logo: job.company.logo,
      verified: job.company.is_verified,
      website: job.company.website || '',
      industry: job.company.industry || '',
      size: job.company.size || '',
      description: job.company.description || '',
    },
    location: {
      city: job.city,
      state: job.state || '',
      country: job.country,
      remote: job.location_type,
    },
    type: job.employment_type,
    experience: job.experience_level,
    salary: hasSalary
      ? {
          min: parseFloat(job.salary_min!),
          max: parseFloat(job.salary_max!),
          currency: job.salary_currency,
          period: job.salary_period || 'year',
        }
      : { min: 0, max: 0, currency: 'USD', period: 'year' },
    postedDate: job.posted_at,
    expirationDate: job.expires_at || '',
    status: job.status,
    views: job.views,
    applications: job.applications_count,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    niceToHave: job.nice_to_have,
    benefits: job.benefits,
    skills: job.skills,
    category: job.category,
    applyUrl: job.apply_url || null,
    applyEmail: job.apply_email || '',
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const job = await getJob(id)

  if (!job) {
    return {
      title: 'Job Not Found | Orion Jobs',
      description: 'The job you are looking for could not be found.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orion.jobs'
  const jobUrl = `${baseUrl}/jobs/${job.job_id}`

  const plainDescription = job.description.replace(/<[^>]*>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim()
  const metaDescription = plainDescription.slice(0, 155).trim() + (plainDescription.length > 155 ? '...' : '')

  const hasSalary = job.show_salary && job.salary_min && job.salary_max
  const salaryText = hasSalary
    ? `${job.salary_currency} ${parseFloat(job.salary_min!).toLocaleString()} - ${parseFloat(job.salary_max!).toLocaleString()}/${job.salary_period || 'year'}`
    : ''

  const locationText =
    job.location_type === 'remote'
      ? 'Remote'
      : job.location_type === 'hybrid'
        ? `${job.city}, ${job.state} (Hybrid)`
        : `${job.city}, ${job.state}`

  // Noindex expired, hidden, or filled jobs — keep them out of search results
  // Paused jobs are intentionally excluded: they may be temporarily paused and should remain indexable
  const noIndexStatuses = ['expired', 'hidden', 'filled']
  const shouldNoIndex = noIndexStatuses.includes(job.status)

  return {
    title: `${job.title} at ${job.company.name} | Orion Jobs`,
    description: metaDescription,
    keywords: [...(job.skills || []), job.category, job.company.name, locationText].join(', '),
    authors: [{ name: job.company.name }],
    ...(shouldNoIndex && {
      robots: { index: false, follow: false },
    }),
    openGraph: {
      type: 'website',
      url: jobUrl,
      title: `${job.title} at ${job.company.name}`,
      description: metaDescription,
      siteName: 'Orion Jobs',
      images: [
        {
          url: job.company.logo || `${baseUrl}/og-job.png`,
          width: 1200,
          height: 630,
          alt: `${job.title} at ${job.company.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.title} at ${job.company.name}`,
      description: metaDescription,
      images: [job.company.logo || `${baseUrl}/og-job.png`],
    },
    alternates: {
      canonical: jobUrl,
    },
    other: {
      'og:salary': salaryText,
      'og:location': locationText,
      'og:job_type': job.employment_type,
    },
  }
}

export default async function JobViewPage({ params }: Props) {
  const { id } = await params
  const job = await getJob(id)

  if (!job) {
    notFound()
  }

  const hasSalary = job.show_salary && job.salary_min && job.salary_max
  const schemaJob = {
    id: job.job_id,
    title: job.title,
    description: job.description,
    postedDate: job.posted_at,
    expirationDate: job.expires_at || '',
    type: job.employment_type,
    company: {
      name: job.company.name,
      website: job.company.website || undefined,
      logo: job.company.logo ?? undefined,
      description: job.company.description || undefined,
    },
    location: {
      city: job.city,
      state: job.state ?? undefined,
      country: job.country,
      remote: job.location_type,
    },
    salary: hasSalary
      ? { min: parseFloat(job.salary_min!), max: parseFloat(job.salary_max!), currency: job.salary_currency, period: (job.salary_period || 'year') as 'hour' | 'month' | 'year' | 'week' | 'day' }
      : undefined,
    skills: job.skills,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    experience: job.experience_level,
  }

  // Breadcrumb items
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Jobs', url: '/jobs' },
    { name: job.title, url: `/jobs/${job.job_id}` },
  ]

  // Transform job for client component
  const clientJob = transformJobForClient(job)

  // Generate FAQ items for AI search optimization (GEO)
  const faqItems = generateJobFAQItems({
    title: job.title,
    company: { name: job.company.name },
    location: {
      city: job.city,
      state: job.state ?? undefined,
      country: job.country,
      remote: job.location_type,
    },
    salary: hasSalary
      ? { min: parseFloat(job.salary_min!), max: parseFloat(job.salary_max!), currency: job.salary_currency, period: job.salary_period || 'year' }
      : null,
    type: job.employment_type,
    experience: job.experience_level,
    requirements: job.requirements,
    skills: job.skills,
  })

  return (
    <>
      {/* SEO Schema Markup */}
      <JobPostingJsonLd job={schemaJob} />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FAQPageJsonLd items={faqItems} />

      {/* Client-side interactive component */}
      <JobDetailClient job={clientJob} />
    </>
  )
}

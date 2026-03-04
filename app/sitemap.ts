import { MetadataRoute } from 'next'

/**
 * Dynamic sitemap connected to the backend API.
 *
 * Fetches real published jobs, verified companies, and active categories
 * from /api/search/sitemap-data/ (public, no auth).
 *
 * Falls back to static pages if the API is unreachable.
 */

interface SitemapData {
  jobs: Array<{ job_id: string; updated_at: string | null }>
  companies: Array<{ entity_id: string; updated_at: string | null }>
  categories: Array<{ slug: string }>
}

async function getSitemapData(): Promise<SitemapData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${apiUrl}/api/search/sitemap-data/`, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    })
    if (!res.ok) throw new Error(`API returned ${res.status}`)
    return await res.json()
  } catch {
    // Fallback: return empty data if API is unreachable
    return { jobs: [], companies: [], categories: [] }
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  // Fetch real data from backend
  const data = await getSitemapData()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ]

  // Job pages — high priority, frequently updated
  const jobPages: MetadataRoute.Sitemap = data.jobs.map((job) => ({
    url: `${baseUrl}/jobs/${job.job_id}`,
    lastModified: job.updated_at ? new Date(job.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Company profile pages
  const companyPages: MetadataRoute.Sitemap = data.companies.map((company) => ({
    url: `${baseUrl}/companies/${company.entity_id}`,
    lastModified: company.updated_at ? new Date(company.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Category pages omitted — Google sitemap spec discourages query-param URLs.
  // Category filtering is handled via /jobs page with client-side params.

  return [
    ...staticPages,
    ...jobPages,
    ...companyPages,
  ]
}

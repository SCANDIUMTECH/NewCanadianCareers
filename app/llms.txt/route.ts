/**
 * llms.txt — Machine-readable site description for AI crawlers.
 *
 * Emerging standard for helping AI search engines (ChatGPT, Perplexity,
 * Google AI Overviews, Claude) understand what content is available and
 * how to access it. Similar to robots.txt but for AI consumption.
 *
 * Spec: https://llmstxt.org/
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  const content = `# New Canadian Careers
> New Canadian Careers is a modern job board platform connecting candidates with employers and recruitment agencies.

## About
New Canadian Careers is a search-first job board platform. It supports four user types: Candidates, Companies, Agencies, and Platform Administrators. The platform is optimized for Google for Jobs with full structured data (JobPosting schema), and serves job listings across engineering, design, product, marketing, sales, data, finance, HR, operations, legal, and other categories.

## Available Content

### Job Listings
- Browse all jobs: ${baseUrl}/jobs
- Individual job pages: ${baseUrl}/jobs/{job_id}
- Jobs include: title, company, location, salary range, employment type, experience level, description, requirements, responsibilities, skills, and benefits
- All job pages include JobPosting JSON-LD structured data

### Company Profiles
- Browse companies: ${baseUrl}/companies
- Individual company pages: ${baseUrl}/companies/{entity_id}
- Companies include: name, industry, size, headquarters location, description, culture, benefits, and open positions
- Company pages include Organization JSON-LD structured data

### Search
- Job search with filters: ${baseUrl}/jobs?q={query}&location={location}
- Filters: employment type, experience level, category, location type, salary range
- Sort by: date posted, salary

## Data Formats
- HTML pages with semantic markup
- JSON-LD structured data (JobPosting, Organization, BreadcrumbList, FAQPage)
- XML Sitemap: ${baseUrl}/sitemap.xml
- RSS-compatible job feeds

## Contact
- Website: ${baseUrl}
- For API access or partnerships, visit ${baseUrl}/contact
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}

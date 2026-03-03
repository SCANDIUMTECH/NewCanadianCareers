/**
 * Public API functions (no authentication required).
 * Endpoints for public job search, job details, and company browsing.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Raw shape returned by Django /api/jobs/ endpoint (flat fields).
 */
export interface PublicJobListItem {
  id: number
  job_id: string
  title: string
  slug: string
  company: number
  company_name: string
  company_logo: string | null
  employment_type: string
  experience_level: string
  category: string
  city: string
  state: string | null
  country: string
  location_type: 'onsite' | 'remote' | 'hybrid'
  location_display: string
  salary_min: string | null
  salary_max: string | null
  salary_currency: string
  salary_period: string | null
  show_salary: boolean
  salary_display: string | null
  status: string
  featured: boolean
  urgent: boolean
  posted_at: string
  expires_at: string | null
  is_active: boolean
  applications_count: number
  skills?: string[]
}

/**
 * Raw shape returned by Django /api/jobs/<job_id>/ detail endpoint.
 * The detail endpoint returns company as a nested object (unlike the list).
 */
export interface PublicJobDetail {
  id: number
  job_id: string
  title: string
  slug: string
  company: {
    id: number
    name: string
    slug: string
    logo: string | null
    banner: string | null
    description: string
    tagline: string
    website: string
    industry: string
    size: string
    founded_year: number | null
    headquarters_city: string
    headquarters_state: string
    headquarters_country: string
    is_verified: boolean
    status: string
  }
  department: string
  employment_type: string
  experience_level: string
  category: string
  description: string
  responsibilities: string[]
  requirements: string[]
  nice_to_have: string[]
  skills: string[]
  benefits: string[]
  city: string
  state: string | null
  country: string
  location_type: 'onsite' | 'remote' | 'hybrid'
  timezone: string
  location_display: string
  salary_min: string | null
  salary_max: string | null
  salary_currency: string
  salary_period: string | null
  show_salary: boolean
  salary_display: string | null
  equity: boolean
  apply_method: string
  apply_email: string
  apply_url: string
  apply_instructions: string
  status: string
  featured: boolean
  urgent: boolean
  posted_at: string
  expires_at: string | null
  is_active: boolean
  views: number
  applications_count: number
  spam_score: number
}

export interface PublicCompanyListItem {
  entity_id: string
  slug: string
  name: string
  initials: string
  logo: string | null
  industry: string
  location: string
  size: string
  description: string
  openJobs: number
  verified: boolean
  featured: boolean
  culture: string[]
}

export interface PublicCompanyDetail extends PublicCompanyListItem {
  website: string | null
  founded: string | null
  tagline: string | null
  banner: string | null
  headquartersCity: string | null
  headquartersState: string | null
  headquartersCountry: string | null
  memberCount: number
  jobCount: number
  socialLinks: {
    linkedin: string | null
    twitter: string | null
    facebook: string | null
    instagram: string | null
  }
  benefits: string[]
  jobs: PublicJobListItem[]
}

export interface PublicJobSearchFilters {
  q?: string
  location?: string
  remote?: string[]
  type?: string[]
  salaryMin?: number
  salaryMax?: number
  datePosted?: string
  category?: string
  sort?: 'relevance' | 'date' | 'salary-high' | 'salary-low'
  page?: number
  page_size?: number
}

export interface PublicCompanyFilters {
  q?: string
  industry?: string
  location?: string
  size?: string
  verified?: boolean
  sort?: 'jobs' | 'name' | 'recent'
  page?: number
  page_size?: number
}

export interface PaginatedPublicResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// =============================================================================
// API Base URL
// =============================================================================

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? '')
  : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '')

// =============================================================================
// Public API Client (no auth headers)
// =============================================================================

async function publicApiClient<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    let errorMessage = 'An error occurred'
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorMessage
    } catch {
      // Response might not be JSON
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// =============================================================================
// Public Job Search
// =============================================================================

/**
 * Search public job listings with filters.
 * No authentication required.
 */
export async function searchJobs(
  filters?: PublicJobSearchFilters
): Promise<PaginatedPublicResponse<PublicJobListItem>> {
  const params = new URLSearchParams()

  if (filters?.q) params.set('q', filters.q)
  if (filters?.location) params.set('location', filters.location)
  if (filters?.remote?.length) params.set('remote', filters.remote.join(','))
  if (filters?.type?.length) params.set('type', filters.type.join(','))
  if (filters?.salaryMin) params.set('salary_min', String(filters.salaryMin))
  if (filters?.salaryMax) params.set('salary_max', String(filters.salaryMax))
  if (filters?.datePosted) params.set('date_posted', filters.datePosted)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.sort) params.set('sort', filters.sort)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/jobs/?${query}` : '/api/jobs/'

  return publicApiClient<PaginatedPublicResponse<PublicJobListItem>>(endpoint)
}

/**
 * Get a single public job by job_id (e.g. "K939V3").
 * No authentication required.
 */
export async function getPublicJob(jobId: string): Promise<PublicJobDetail> {
  return publicApiClient<PublicJobDetail>(`/api/jobs/${jobId}/`)
}

/**
 * Get featured jobs for homepage.
 * No authentication required.
 */
export async function getFeaturedJobs(limit: number = 6): Promise<PublicJobListItem[]> {
  const response = await publicApiClient<PaginatedPublicResponse<PublicJobListItem>>(
    `/api/jobs/?featured=true&page_size=${limit}`
  )
  return response.results
}

/**
 * Get job categories with counts.
 */
export async function getJobCategories(): Promise<Array<{ slug: string; name: string; count: number }>> {
  return publicApiClient('/api/jobs/categories/')
}

// =============================================================================
// Public Company Browse
// =============================================================================

/**
 * Browse public company profiles with filters.
 * No authentication required.
 */
export async function browseCompanies(
  filters?: PublicCompanyFilters
): Promise<PaginatedPublicResponse<PublicCompanyListItem>> {
  const params = new URLSearchParams()

  if (filters?.q) params.set('q', filters.q)
  if (filters?.industry) params.set('industry', filters.industry)
  if (filters?.location) params.set('location', filters.location)
  if (filters?.size) params.set('size', filters.size)
  if (filters?.verified !== undefined) params.set('verified', String(filters.verified))
  if (filters?.sort) params.set('sort', filters.sort)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/companies/?${query}` : '/api/companies/'

  return publicApiClient<PaginatedPublicResponse<PublicCompanyListItem>>(endpoint)
}

/**
 * Get a single public company by entity_id (e.g. "U5U27MT0").
 * No authentication required.
 */
export async function getPublicCompany(entityId: string): Promise<PublicCompanyDetail> {
  return publicApiClient<PublicCompanyDetail>(`/api/companies/${entityId}/`)
}

/**
 * Get featured companies for homepage.
 * No authentication required.
 */
export async function getFeaturedCompanies(limit: number = 4): Promise<PublicCompanyListItem[]> {
  const response = await publicApiClient<PaginatedPublicResponse<PublicCompanyListItem>>(
    `/api/companies/?featured=true&page_size=${limit}`
  )
  return response.results
}

/**
 * Get industry list with company counts.
 */
export async function getIndustries(): Promise<Array<{ slug: string; name: string; count: number }>> {
  return publicApiClient('/api/companies/industries/')
}

// =============================================================================
// Search Filters (Dynamic)
// =============================================================================

export interface SearchFiltersResponse {
  employment_types: Array<{ employment_type: string; count: number }>
  experience_levels: Array<{ experience_level: string; count: number }>
  categories: Array<{ category: string; count: number }>
  location_types: Array<{ location_type: string; count: number }>
  top_locations: Array<{ country: string; count: number }>
}

/**
 * Get dynamic search filter options from the backend.
 * No authentication required.
 */
export async function getSearchFilters(): Promise<SearchFiltersResponse> {
  return publicApiClient<SearchFiltersResponse>('/api/search/filters/')
}

// =============================================================================
// Report Job
// =============================================================================

export type ReportReason = 'spam' | 'scam' | 'discriminatory' | 'inappropriate' | 'expired' | 'other'

/**
 * Report a job listing.
 * Can be done anonymously or authenticated.
 */
export async function reportJob(
  jobId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/report/`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason, details }),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to submit report'
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorMessage
    } catch {
      // Response might not be JSON
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

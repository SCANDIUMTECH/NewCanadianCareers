/**
 * Admin Search & SEO API functions.
 * Endpoints for SEO dashboard, search indexing, and sitemap management.
 */

import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface CoreWebVitals {
  lcp: number // Largest Contentful Paint (seconds)
  cls: number // Cumulative Layout Shift
  inp: number // Interaction to Next Paint (milliseconds)
}

export interface SEOHealthMetrics {
  overallScore: number
  previousScore: number
  indexedPages: number
  crawlErrors: number
  coreWebVitals: CoreWebVitals
  schemaErrors: number
  aiVisibilityScore: number
  industryAverage?: number
}

export interface IndexStatus {
  lastIndexed: string
  totalDocuments: number
  pendingIndexing: number
  failedIndexing: number
  averageIndexTime: string
  indexLag: string
  health: 'healthy' | 'degraded' | 'unhealthy'
}

export interface CrawlHistoryItem {
  date: string
  indexed: number
  errors: number
  newPages: number
  removedPages: number
}

export interface FailedIndexJob {
  id: string
  jobId: string
  title: string
  company: string
  companyId: number
  error: string
  errorType: 'validation' | 'timeout' | 'network' | 'unknown'
  timestamp: string
  retryCount: number
}

export interface GoogleJobsValidationResult {
  id: string
  jobId: string
  title: string
  company: string
  severity: 'error' | 'warning' | 'info'
  fields: {
    title: boolean
    description: boolean
    datePosted: boolean
    employmentType: boolean
    baseSalary: boolean
    jobLocation: boolean
    remote: boolean
    identifier: boolean
    hiringOrganization: boolean
    validThrough: boolean
  }
  missingFields: string[]
  recommendations: string[]
}

export interface SitemapInfo {
  url: string
  type: 'index' | 'jobs' | 'companies' | 'categories' | 'static'
  urls: number
  lastGenerated: string
  status: 'current' | 'stale' | 'generating'
}

export interface AIBotConfig {
  id: string
  name: string
  description: string
  userAgent: string
  allowed: boolean
  lastSeen: string | null
  requestCount: number
}

export interface ReindexJob {
  id: string
  scope: 'all' | 'company' | 'single' | 'category'
  targetId?: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  totalDocuments: number
  processedDocuments: number
  failedDocuments: number
  startedAt: string
  completedAt: string | null
  error: string | null
}

export interface IndexNowSubmission {
  id: string
  urlCount: number
  status: 'pending' | 'submitted' | 'failed'
  submittedTo: string[]
  submittedAt: string
  responseStatus?: Record<string, string>
}

export interface SchemaTemplateSettings {
  organizationName: string
  organizationUrl: string
  logoUrl: string
  includeSalary: boolean
  includeDirectApply: boolean
  includeRemoteFields: boolean
  defaultCurrency: string
}

// =============================================================================
// SEO Health & Dashboard
// =============================================================================

/**
 * Get overall SEO health metrics.
 */
export async function getSEOHealthMetrics(): Promise<SEOHealthMetrics> {
  return apiClient<SEOHealthMetrics>('/api/search/health/')
}

/**
 * Get Core Web Vitals metrics.
 */
export async function getCoreWebVitals(): Promise<{
  current: CoreWebVitals
  history: Array<{ date: string; vitals: CoreWebVitals }>
}> {
  return apiClient('/api/search/web-vitals/')
}

/**
 * Get page speed by template.
 */
export async function getPageSpeedByTemplate(): Promise<Array<{
  template: string
  score: number
  pageCount: number
  issues: string[]
}>> {
  return apiClient('/api/search/page-speed/')
}

// =============================================================================
// Index Management
// =============================================================================

/**
 * Get current index status.
 */
export async function getIndexStatus(): Promise<IndexStatus> {
  return apiClient<IndexStatus>('/api/search/index/status/')
}

/**
 * Get crawl/index history.
 */
export async function getCrawlHistory(days: number = 30): Promise<CrawlHistoryItem[]> {
  return apiClient<CrawlHistoryItem[]>(`/api/search/index/history/?days=${days}`)
}

/**
 * Get jobs that failed indexing.
 */
export async function getFailedIndexJobs(page: number = 1): Promise<{
  count: number
  results: FailedIndexJob[]
}> {
  return apiClient(`/api/search/index/failed/?page=${page}`)
}

/**
 * Retry indexing a specific job.
 */
export async function reindexJob(jobId: string): Promise<{ message: string; jobId: string }> {
  return apiClient<{ message: string; jobId: string }>(`/api/search/index/retry/${jobId}/`, {
    method: 'POST',
  })
}

/**
 * Trigger a full reindex of all documents.
 */
export async function triggerFullReindex(): Promise<ReindexJob> {
  return apiClient<ReindexJob>('/api/search/index/reindex/', {
    method: 'POST',
    body: JSON.stringify({ scope: 'all' }),
  })
}

/**
 * Trigger reindex for a specific company.
 */
export async function triggerCompanyReindex(companyId: number): Promise<ReindexJob> {
  return apiClient<ReindexJob>('/api/search/index/reindex/', {
    method: 'POST',
    body: JSON.stringify({ scope: 'company', target_id: companyId }),
  })
}

/**
 * Get status of a reindex job.
 */
export async function getReindexJobStatus(jobId: string): Promise<ReindexJob> {
  return apiClient<ReindexJob>(`/api/search/index/reindex/${jobId}/`)
}

/**
 * Cancel a running reindex job.
 */
export async function cancelReindexJob(jobId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/search/index/reindex/${jobId}/cancel/`, {
    method: 'POST',
  })
}

// =============================================================================
// Google for Jobs Validation
// =============================================================================

/**
 * Get Google for Jobs validation summary.
 */
export async function getGoogleJobsValidationSummary(): Promise<{
  valid: number
  warnings: number
  errors: number
  lastValidated: string
}> {
  return apiClient('/api/search/google-jobs/summary/')
}

/**
 * Get jobs with Google for Jobs validation issues.
 */
export async function getGoogleJobsValidationIssues(
  page: number = 1,
  severity?: 'error' | 'warning'
): Promise<{
  count: number
  results: GoogleJobsValidationResult[]
}> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (severity) params.set('severity', severity)
  return apiClient(`/api/search/google-jobs/issues/?${params.toString()}`)
}

/**
 * Validate a single job against Google for Jobs requirements.
 */
export async function validateJobForGoogle(jobId: string): Promise<GoogleJobsValidationResult> {
  return apiClient<GoogleJobsValidationResult>(`/api/search/google-jobs/validate/${jobId}/`)
}

/**
 * Run batch validation on all jobs.
 */
export async function runBatchValidation(options?: {
  scope: 'all' | 'recent' | 'errors' | 'company'
  companyId?: number
}): Promise<{ jobId: string; message: string }> {
  return apiClient<{ jobId: string; message: string }>('/api/search/google-jobs/batch-validate/', {
    method: 'POST',
    body: JSON.stringify(options || { scope: 'all' }),
  })
}

// =============================================================================
// Sitemap Management
// =============================================================================

/**
 * Get sitemap configuration and status.
 */
export async function getSitemapInfo(): Promise<SitemapInfo[]> {
  return apiClient<SitemapInfo[]>('/api/search/sitemap/')
}

/**
 * Regenerate sitemaps.
 */
export async function regenerateSitemap(type?: 'all' | 'jobs' | 'companies'): Promise<{
  message: string
  regenerated: string[]
}> {
  return apiClient<{ message: string; regenerated: string[] }>('/api/search/sitemap/regenerate/', {
    method: 'POST',
    body: JSON.stringify({ type: type || 'all' }),
  })
}

/**
 * Update sitemap configuration.
 */
export async function updateSitemapConfig(config: {
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly'
  maxUrlsPerSitemap?: number
  includeJobs?: boolean
  includeCompanies?: boolean
  includeCategories?: boolean
}): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/search/sitemap/config/', {
    method: 'PATCH',
    body: JSON.stringify(config),
  })
}

// =============================================================================
// IndexNow
// =============================================================================

/**
 * Submit URLs to IndexNow.
 */
export async function submitToIndexNow(options: {
  scope: 'recent' | 'selected' | 'all'
  jobIds?: string[]
}): Promise<IndexNowSubmission> {
  return apiClient<IndexNowSubmission>('/api/search/indexnow/submit/', {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

/**
 * Get IndexNow submission history.
 */
export async function getIndexNowHistory(page: number = 1): Promise<{
  count: number
  results: IndexNowSubmission[]
}> {
  return apiClient(`/api/search/indexnow/history/?page=${page}`)
}

/**
 * Get IndexNow configuration.
 */
export async function getIndexNowConfig(): Promise<{
  enabled: boolean
  apiKey: string
  autoSubmitOnPublish: boolean
}> {
  return apiClient('/api/search/indexnow/config/')
}

/**
 * Update IndexNow configuration.
 */
export async function updateIndexNowConfig(config: {
  enabled?: boolean
  apiKey?: string
  autoSubmitOnPublish?: boolean
}): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/search/indexnow/config/', {
    method: 'PATCH',
    body: JSON.stringify(config),
  })
}

// =============================================================================
// AI Bot Management
// =============================================================================

/**
 * Get AI bot crawler configuration.
 */
export async function getAIBotConfig(): Promise<AIBotConfig[]> {
  return apiClient<AIBotConfig[]>('/api/search/ai-bots/')
}

/**
 * Update AI bot access settings.
 */
export async function updateAIBotAccess(
  botId: string,
  allowed: boolean
): Promise<AIBotConfig> {
  return apiClient<AIBotConfig>(`/api/search/ai-bots/${botId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ allowed }),
  })
}

/**
 * Get robots.txt content.
 */
export async function getRobotsTxt(): Promise<{ content: string; lastModified: string }> {
  return apiClient('/api/search/robots-txt/')
}

/**
 * Update robots.txt content.
 */
export async function updateRobotsTxt(content: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/search/robots-txt/', {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

// =============================================================================
// Schema Management
// =============================================================================

/**
 * Get schema template settings.
 */
export async function getSchemaTemplateSettings(): Promise<SchemaTemplateSettings> {
  return apiClient<SchemaTemplateSettings>('/api/search/schema/settings/')
}

/**
 * Update schema template settings.
 */
export async function updateSchemaTemplateSettings(
  settings: Partial<SchemaTemplateSettings>
): Promise<SchemaTemplateSettings> {
  return apiClient<SchemaTemplateSettings>('/api/search/schema/settings/', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

/**
 * Generate schema preview for a job.
 */
export async function generateSchemaPreview(jobId: string): Promise<{
  schema: Record<string, unknown>
  valid: boolean
  errors: string[]
}> {
  return apiClient(`/api/search/schema/preview/${jobId}/`)
}

// =============================================================================
// Technical SEO
// =============================================================================

/**
 * Get crawlability audit results.
 */
export async function getCrawlabilityAudit(): Promise<Array<{
  check: string
  description: string
  status: 'passed' | 'warning' | 'failed'
  details: string
  affectedPages?: number
}>> {
  return apiClient('/api/search/audit/crawlability/')
}

/**
 * Run a full SEO audit.
 */
export async function runSEOAudit(): Promise<{
  jobId: string
  message: string
}> {
  return apiClient<{ jobId: string; message: string }>('/api/search/audit/run/', {
    method: 'POST',
  })
}

/**
 * Get SEO audit results.
 */
export async function getSEOAuditResults(auditId?: string): Promise<{
  score: number
  checks: Array<{
    category: string
    check: string
    status: 'passed' | 'warning' | 'failed'
    impact: 'high' | 'medium' | 'low'
    description: string
    recommendation?: string
  }>
  completedAt: string
}> {
  const endpoint = auditId
    ? `/api/search/audit/results/${auditId}/`
    : '/api/search/audit/results/latest/'
  return apiClient(endpoint)
}

// =============================================================================
// SEO Recommendations & Auto-Fix
// =============================================================================

export interface SEOAffectedJob {
  job_id: string
  title: string
  company__name: string | null
}

export interface SEOAffectedCompany {
  entity_id: string
  name: string
}

export interface SEORecommendation {
  id: string
  category: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  title: string
  description: string
  affected_count: number
  auto_fixable: boolean
  fix_action: string | null
  affected_items: SEOAffectedJob[] | SEOAffectedCompany[]
  item_type: 'job' | 'company'
}

export interface AutoFixResult {
  fixed: number
  errors: number
  action: string
  message: string
}

export interface JobSEOFieldScore {
  score: number
  max: number
  status: 'passed' | 'warning' | 'failed'
  message: string
}

export interface JobSEOScore {
  job_id: string
  title: string
  company: string | null
  status: string
  score: number
  max_score: number
  fields: Record<string, JobSEOFieldScore>
  recommendations: Array<{
    field: string
    severity: 'error' | 'warning'
    message: string
    auto_fixable: boolean
    fix_action: string | null
  }>
}

/**
 * Get prioritized SEO recommendations.
 */
export async function getSEORecommendations(): Promise<{
  total_published: number
  recommendations: SEORecommendation[]
}> {
  return apiClient('/api/search/recommendations/')
}

/**
 * Run auto-fix on published jobs (template-based, no AI cost).
 */
export async function runSEOAutoFix(
  action: 'fill_meta_titles' | 'fill_meta_descriptions' | 'fill_all_meta' | 'expire_overdue'
): Promise<AutoFixResult> {
  return apiClient<AutoFixResult>('/api/search/auto-fix/', {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

/**
 * Get per-job SEO score with field-by-field breakdown.
 */
export async function getJobSEOScore(jobId: string): Promise<JobSEOScore> {
  return apiClient<JobSEOScore>(`/api/search/job-score/${jobId}/`)
}

/**
 * Get a lightweight list of companies for reindex dropdown.
 * Uses the admin companies endpoint with a large page size and extracts id + name.
 */
export async function getCompaniesForReindex(): Promise<Array<{ id: number; name: string }>> {
  const data = await apiClient<{ results: Array<{ id: number; name: string }> }>(
    '/api/admin/companies/?page_size=500&fields=id,name'
  )
  return (data.results || []).map(c => ({ id: c.id, name: c.name }))
}

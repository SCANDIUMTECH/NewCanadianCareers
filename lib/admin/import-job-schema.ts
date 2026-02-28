/**
 * Zod validation schema for job import rows.
 * Mirrors backend BulkJobImportItemSerializer validation.
 * Also exports choice constants, sanitization helpers, and template generators.
 */

import { z } from 'zod'

// =============================================================================
// Choice Constants (exact backend values)
// =============================================================================

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance'] as const
export const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead', 'executive'] as const
/**
 * Default category slugs — used only as a fallback when the API is unreachable.
 * The canonical source of truth is the Category table, fetched via /api/admin/categories/.
 */
export const JOB_CATEGORIES_FALLBACK = ['engineering', 'design', 'marketing', 'sales', 'customer_support', 'finance', 'hr', 'operations', 'product', 'data', 'legal', 'other'] as const

/** @deprecated Use JOB_CATEGORIES_FALLBACK or fetch from API. */
export const JOB_CATEGORIES = JOB_CATEGORIES_FALLBACK
export const LOCATION_TYPES = ['remote', 'onsite', 'hybrid'] as const
export const SALARY_PERIODS = ['hour', 'day', 'week', 'month', 'year'] as const
export const APPLY_METHODS = ['internal', 'email', 'external'] as const

// Human-readable labels
export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract',
  temporary: 'Temporary', internship: 'Internship', freelance: 'Freelance',
}
export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead', executive: 'Executive',
}

// =============================================================================
// Limits
// =============================================================================

export const MAX_IMPORT_ROWS = 500
export const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024  // 5MB
export const MAX_JSON_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// =============================================================================
// Zod Schema Factory
// =============================================================================

/**
 * Build the cross-field refinement shared by both company and agency schemas.
 */
function crossFieldRefinements(data: Record<string, unknown>, ctx: z.RefinementCtx) {
  // Salary range cross-validation
  const salaryMin = data.salary_min as number | null | undefined
  const salaryMax = data.salary_max as number | null | undefined
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salary_max'],
    })
  }
  // Apply method cross-validation
  if (data.apply_method === 'email' && !data.apply_email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email is required when apply method is "email"',
      path: ['apply_email'],
    })
  }
  if (data.apply_method === 'external' && !data.apply_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL is required when apply method is "external"',
      path: ['apply_url'],
    })
  }
}

/**
 * Create an import job row Zod schema with dynamic category validation.
 *
 * @param validCategories - Array of valid category slugs fetched from the API.
 *   Falls back to JOB_CATEGORIES_FALLBACK if empty/undefined.
 */
export function createImportJobRowSchema(validCategories?: string[]) {
  const categories = validCategories && validCategories.length > 0
    ? validCategories
    : [...JOB_CATEGORIES_FALLBACK]

  const categorySet = new Set(categories)

  const baseSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title must be at most 255 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    employment_type: z.enum(EMPLOYMENT_TYPES, {
      errorMap: () => ({ message: `Must be one of: ${EMPLOYMENT_TYPES.join(', ')}` }),
    }),
    experience_level: z.enum(EXPERIENCE_LEVELS, {
      errorMap: () => ({ message: `Must be one of: ${EXPERIENCE_LEVELS.join(', ')}` }),
    }),
    category: z.string().min(1, 'Category is required').default('other').refine(
      (val) => categorySet.has(val),
      { message: `Must be one of: ${categories.join(', ')}` },
    ),
    city: z.string().min(1, 'City is required').max(100),
    country: z.string().min(1, 'Country is required').max(100),
    location_type: z.enum(LOCATION_TYPES, {
      errorMap: () => ({ message: `Must be one of: ${LOCATION_TYPES.join(', ')}` }),
    }),

    // Optional fields
    department: z.string().max(100).optional().default(''),
    state: z.string().max(100).optional().default(''),
    timezone: z.string().max(50).optional().default(''),
    responsibilities: z.array(z.string()).optional().default([]),
    requirements: z.array(z.string()).optional().default([]),
    nice_to_have: z.array(z.string()).optional().default([]),
    skills: z.array(z.string()).optional().default([]),
    benefits: z.array(z.string()).optional().default([]),

    // Salary
    salary_min: z.number().min(0).nullable().optional().default(null),
    salary_max: z.number().min(0).nullable().optional().default(null),
    salary_currency: z.string().max(3).optional().default('CAD'),
    salary_period: z.enum(SALARY_PERIODS).optional().default('year'),
    show_salary: z.boolean().optional().default(true),

    // Equity
    equity: z.boolean().optional().default(false),
    equity_min: z.number().nullable().optional().default(null),
    equity_max: z.number().nullable().optional().default(null),

    // Apply method
    apply_method: z.enum(APPLY_METHODS).optional().default('internal'),
    apply_email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
    apply_url: z.string().url('Invalid URL').or(z.literal('')).optional().default(''),
    apply_instructions: z.string().optional().default(''),

    // SEO
    meta_title: z.string().max(70, 'Meta title must be at most 70 characters').optional().default(''),
    meta_description: z.string().max(160, 'Meta description must be at most 160 characters').optional().default(''),

    // Agency mode fields
    company_name: z.string().max(255).optional().default(''),
    company_email: z.string().email('Invalid company email').or(z.literal('')).optional().default(''),
  }).superRefine(crossFieldRefinements)

  return baseSchema
}

/**
 * Create an agency-mode import schema (company_name + company_email required).
 */
export function createImportJobRowAgencySchema(validCategories?: string[]) {
  return createImportJobRowSchema(validCategories).superRefine((data, ctx) => {
    if (!data.company_name || data.company_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company name is required in agency mode',
        path: ['company_name'],
      })
    }
    if (!data.company_email || data.company_email.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company email is required in agency mode',
        path: ['company_email'],
      })
    }
  })
}

/** Static schemas using fallback categories — for backwards compatibility. */
export const importJobRowSchema = createImportJobRowSchema()
export const importJobRowAgencySchema = createImportJobRowAgencySchema()

export type ValidatedImportJobRow = z.infer<typeof importJobRowSchema>

// =============================================================================
// Sanitization Helpers
// =============================================================================

/** Strip HTML tags from a string. */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

/** Parse a semicolon-delimited string into an array, filtering empties. */
function parseDelimitedField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(';').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/** Parse a boolean field from various CSV representations. */
function parseBooleanField(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  if (typeof value === 'number') return value !== 0
  return false
}

/** Parse a numeric field, returning null if invalid. */
function parseNumericField(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

/**
 * Sanitize a raw parsed row (from JSON or CSV) into a shape
 * suitable for Zod validation. Handles type coercion, HTML stripping,
 * and delimiter parsing.
 */
export function sanitizeImportRow(raw: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  // String fields — strip HTML and trim
  const stringFields = [
    'title', 'description', 'department', 'city', 'state', 'country',
    'timezone', 'salary_currency', 'salary_period', 'apply_method',
    'apply_email', 'apply_url', 'apply_instructions',
    'meta_title', 'meta_description', 'company_name', 'company_email',
  ]
  for (const field of stringFields) {
    const val = raw[field]
    if (val !== undefined && val !== null) {
      row[field] = stripHtml(String(val))
    }
  }

  // Enum fields — lowercase and trim
  const enumFields = ['employment_type', 'experience_level', 'category', 'location_type']
  for (const field of enumFields) {
    const val = raw[field]
    if (val !== undefined && val !== null) {
      row[field] = String(val).toLowerCase().trim()
    }
  }

  // Array fields — parse from semicolon-delimited or array
  const arrayFields = ['responsibilities', 'requirements', 'nice_to_have', 'skills', 'benefits']
  for (const field of arrayFields) {
    row[field] = parseDelimitedField(raw[field])
  }

  // Numeric fields
  row.salary_min = parseNumericField(raw.salary_min)
  row.salary_max = parseNumericField(raw.salary_max)
  row.equity_min = parseNumericField(raw.equity_min)
  row.equity_max = parseNumericField(raw.equity_max)

  // Boolean fields
  row.show_salary = parseBooleanField(raw.show_salary ?? true)
  row.equity = parseBooleanField(raw.equity ?? false)

  return row
}

// =============================================================================
// Template Generators
// =============================================================================

/**
 * Sample jobs covering different employment types, locations, salary ranges,
 * experience levels, categories, and apply methods — realistic for WordPress
 * data migration.
 */
const SAMPLE_JOBS: Record<string, unknown>[] = [
  {
    title: 'Senior Software Engineer',
    description: 'We are looking for a senior software engineer to lead development of our core platform. You will architect scalable microservices, mentor junior developers, and drive technical decisions across the engineering team.',
    employment_type: 'full_time',
    experience_level: 'senior',
    category: 'engineering',
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    location_type: 'hybrid',
    department: 'Engineering',
    timezone: 'America/Toronto',
    responsibilities: ['Architect and build scalable microservices', 'Mentor junior and mid-level engineers', 'Lead code reviews and set engineering standards', 'Collaborate with product on technical roadmap'],
    requirements: ['5+ years software development experience', 'Proficient in Python and TypeScript', 'Experience designing distributed systems', 'Strong understanding of relational and NoSQL databases'],
    nice_to_have: ['Experience with Django or FastAPI', 'Knowledge of AWS or GCP', 'Contributions to open-source projects'],
    skills: ['Python', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
    benefits: ['Comprehensive health and dental insurance', 'Hybrid work flexibility', '$2,000 annual learning budget', 'Stock options'],
    salary_min: 130000,
    salary_max: 170000,
    salary_currency: 'CAD',
    salary_period: 'year',
    show_salary: true,
    equity: true,
    equity_min: 0.05,
    equity_max: 0.15,
    apply_method: 'internal',
    apply_email: '',
    apply_url: '',
    apply_instructions: '',
    meta_title: 'Senior Software Engineer - Toronto (Hybrid)',
    meta_description: 'Join our engineering team as a Senior Software Engineer. Competitive salary $130K-$170K CAD with equity. Hybrid work in Toronto.',
  },
  {
    title: 'Marketing Coordinator',
    description: 'Join our marketing team to coordinate campaigns across digital and traditional channels. You will manage social media calendars, assist with content creation, and track campaign performance metrics.',
    employment_type: 'full_time',
    experience_level: 'entry',
    category: 'marketing',
    city: 'Vancouver',
    state: 'British Columbia',
    country: 'Canada',
    location_type: 'onsite',
    department: 'Marketing',
    timezone: 'America/Vancouver',
    responsibilities: ['Manage social media content calendar', 'Coordinate email marketing campaigns', 'Track and report on campaign KPIs', 'Assist with event planning and logistics'],
    requirements: ['Bachelor\'s degree in Marketing or related field', '1+ years of marketing experience or internship', 'Familiarity with social media platforms and analytics', 'Strong written and verbal communication skills'],
    nice_to_have: ['Experience with HubSpot or Mailchimp', 'Basic graphic design skills (Canva, Figma)', 'Google Analytics certification'],
    skills: ['Social Media', 'Email Marketing', 'Content Writing', 'Google Analytics', 'Canva'],
    benefits: ['Extended health benefits', 'Transit pass', '3 weeks paid vacation'],
    salary_min: 45000,
    salary_max: 55000,
    salary_currency: 'CAD',
    salary_period: 'year',
    show_salary: true,
    equity: false,
    equity_min: null,
    equity_max: null,
    apply_method: 'email',
    apply_email: 'careers@example.com',
    apply_url: '',
    apply_instructions: 'Please include a cover letter and portfolio link.',
    meta_title: '',
    meta_description: '',
  },
  {
    title: 'UX/UI Designer',
    description: 'We need a creative UX/UI designer to craft intuitive user experiences for our SaaS platform. You will conduct user research, create wireframes and prototypes, and collaborate closely with engineering to ship polished features.',
    employment_type: 'contract',
    experience_level: 'mid',
    category: 'design',
    city: 'Montreal',
    state: 'Quebec',
    country: 'Canada',
    location_type: 'remote',
    department: 'Design',
    timezone: 'America/Montreal',
    responsibilities: ['Conduct user research and usability testing', 'Create wireframes, mockups, and interactive prototypes', 'Maintain and evolve the design system', 'Work with engineers to ensure pixel-perfect implementation'],
    requirements: ['3+ years of UX/UI design experience', 'Proficiency with Figma', 'Portfolio demonstrating end-to-end design process', 'Understanding of accessibility standards (WCAG)'],
    nice_to_have: ['Experience with SaaS products', 'Motion design skills (After Effects, Lottie)', 'Basic front-end knowledge (HTML/CSS)'],
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'],
    benefits: ['Fully remote position', 'Flexible working hours', 'Equipment allowance'],
    salary_min: 75,
    salary_max: 95,
    salary_currency: 'CAD',
    salary_period: 'hour',
    show_salary: true,
    equity: false,
    equity_min: null,
    equity_max: null,
    apply_method: 'external',
    apply_email: '',
    apply_url: 'https://careers.example.com/apply/ux-designer',
    apply_instructions: '',
    meta_title: 'UX/UI Designer (Remote Contract)',
    meta_description: 'Remote contract UX/UI designer role. $75-$95/hr CAD. Join our design team to shape the future of our SaaS platform.',
  },
  {
    title: 'Data Analyst',
    description: 'Seeking a data analyst to turn raw data into actionable business insights. You will build dashboards, write SQL queries, and present findings to stakeholders across the organization.',
    employment_type: 'full_time',
    experience_level: 'mid',
    category: 'data',
    city: 'Calgary',
    state: 'Alberta',
    country: 'Canada',
    location_type: 'hybrid',
    department: 'Data & Analytics',
    timezone: 'America/Edmonton',
    responsibilities: ['Build and maintain business intelligence dashboards', 'Write complex SQL queries for ad-hoc analysis', 'Present data-driven recommendations to leadership', 'Collaborate with engineering on data pipeline improvements'],
    requirements: ['2+ years of data analysis experience', 'Advanced SQL skills', 'Experience with BI tools (Tableau, Looker, or Power BI)', 'Strong statistical reasoning'],
    nice_to_have: ['Python or R for statistical analysis', 'Experience with dbt or Airflow', 'Knowledge of A/B testing methodology'],
    skills: ['SQL', 'Tableau', 'Python', 'Excel', 'Statistics'],
    benefits: ['Health and dental coverage', 'RRSP matching', 'Flexible hybrid schedule'],
    salary_min: 70000,
    salary_max: 90000,
    salary_currency: 'CAD',
    salary_period: 'year',
    show_salary: false,
    equity: false,
    equity_min: null,
    equity_max: null,
    apply_method: 'internal',
    apply_email: '',
    apply_url: '',
    apply_instructions: '',
    meta_title: '',
    meta_description: '',
  },
  {
    title: 'Customer Support Specialist',
    description: 'We are hiring a customer support specialist to provide world-class support to our growing user base. You will handle support tickets, troubleshoot issues, and help improve our knowledge base documentation.',
    employment_type: 'part_time',
    experience_level: 'entry',
    category: 'customer_support',
    city: 'Ottawa',
    state: 'Ontario',
    country: 'Canada',
    location_type: 'remote',
    department: 'Support',
    timezone: 'America/Toronto',
    responsibilities: ['Respond to customer inquiries via chat, email, and phone', 'Troubleshoot and resolve product issues', 'Escalate complex cases to engineering', 'Contribute to knowledge base articles'],
    requirements: ['Excellent written and verbal communication', 'Patience and empathy in customer interactions', 'Basic technical troubleshooting ability', 'Available for 20-25 hours per week'],
    nice_to_have: ['Experience with Zendesk or Intercom', 'Bilingual (English/French)', 'Previous SaaS support experience'],
    skills: ['Customer Service', 'Communication', 'Problem Solving', 'Zendesk'],
    benefits: ['Remote work', 'Flexible scheduling', 'Paid training'],
    salary_min: 22,
    salary_max: 28,
    salary_currency: 'CAD',
    salary_period: 'hour',
    show_salary: true,
    equity: false,
    equity_min: null,
    equity_max: null,
    apply_method: 'internal',
    apply_email: '',
    apply_url: '',
    apply_instructions: '',
    meta_title: '',
    meta_description: '',
  },
]

/**
 * Agency mode sample jobs — same jobs but with company_name and company_email
 * per row, demonstrating multiple different companies (WordPress migration scenario).
 */
const AGENCY_COMPANY_DATA = [
  { company_name: 'Maple Leaf Technologies', company_email: 'hr@mapleleaftech.ca' },
  { company_name: 'Maple Leaf Technologies', company_email: 'hr@mapleleaftech.ca' },
  { company_name: 'Northern Digital Inc.', company_email: 'careers@northerndigital.com' },
  { company_name: 'Pacific Coast Solutions', company_email: 'jobs@pacificcoast.io' },
  { company_name: 'Pacific Coast Solutions', company_email: 'jobs@pacificcoast.io' },
]

function buildSampleJobs(agencyMode: boolean): Record<string, unknown>[] {
  return SAMPLE_JOBS.map((job, i) => {
    if (!agencyMode) return job
    return { ...AGENCY_COMPANY_DATA[i], ...job }
  })
}

/** All CSV column headers in order. */
const CSV_HEADERS_COMPANY = [
  'title', 'description', 'employment_type', 'experience_level', 'category',
  'city', 'state', 'country', 'location_type', 'department', 'timezone',
  'responsibilities', 'requirements', 'nice_to_have', 'skills', 'benefits',
  'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'show_salary',
  'equity', 'equity_min', 'equity_max',
  'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
  'meta_title', 'meta_description',
]

const CSV_HEADERS_AGENCY = [
  'company_name', 'company_email', ...CSV_HEADERS_COMPANY,
]

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = Array.isArray(value) ? value.join(';') : String(value)
  // Escape if contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Generate a JSON template file content with multiple sample rows. */
export function generateJsonTemplate(agencyMode: boolean): string {
  return JSON.stringify(buildSampleJobs(agencyMode), null, 2)
}

/** Generate a CSV template file content with multiple sample rows. */
export function generateCsvTemplate(agencyMode: boolean): string {
  const headers = agencyMode ? CSV_HEADERS_AGENCY : CSV_HEADERS_COMPANY
  const samples = buildSampleJobs(agencyMode)
  const rows = samples.map(sample =>
    headers.map(h => escapeCsvField(sample[h])).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
}

export function hashToHue(input: string): number {
  if (!input) return 0
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h % 360
}

export function getUserInitials(input: string): string {
  const s = (input || '').trim()
  if (!s) return 'U'
  // Split by whitespace, dots, underscores, hyphens (handles emails)
  const parts = s.split(/[\s._-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------

export const CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD", symbol: "C$" },
] as const

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["value"]

/** Default platform currency */
export const DEFAULT_CURRENCY: CurrencyCode = "CAD"

/**
 * Format an amount as currency using Intl.NumberFormat.
 *
 * @param amount  - The monetary value (in major units, e.g. dollars not cents).
 * @param currency - ISO 4217 currency code. Defaults to `DEFAULT_CURRENCY`.
 * @param opts - Extra options: `decimals` (default 0), `locale` (default "en-CA").
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  opts?: { decimals?: number; locale?: string }
): string {
  const { decimals = 0, locale = currency === "CAD" ? "en-CA" : "en-US" } = opts ?? {}
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Format a Stripe amount (in smallest currency unit, e.g. cents) as currency.
 * Divides by 100 to convert to major units before formatting.
 */
export function formatCents(
  amountInCents: number,
  currency: string = DEFAULT_CURRENCY,
  opts?: { decimals?: number; locale?: string }
): string {
  return formatCurrency(amountInCents / 100, currency, { decimals: 2, ...opts })
}

/**
 * Return the symbol string for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
  const found = CURRENCY_OPTIONS.find((c) => c.value === currency)
  return found?.symbol ?? "$"
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and collapse whitespace to get visible character count. */
export function getVisibleTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim().length
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Human-readable relative time (e.g. "5 minutes ago", "Yesterday"). */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return "Just now"
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ---------------------------------------------------------------------------
// Initials helpers
// ---------------------------------------------------------------------------

/** Get initials from first + last name (for user avatars in layouts). */
export function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.charAt(0) || '?'
  const l = lastName?.charAt(0) || '?'
  return (f + l).toUpperCase()
}

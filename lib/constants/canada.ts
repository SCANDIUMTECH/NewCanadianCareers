/**
 * New Canadian Careers — Canadian Geography Constants
 *
 * This platform is strictly Canada-only.
 * All jobs, companies, and agencies must be located in Canada.
 */

// ── Country ─────────────────────────────────────────────────────────────
export const COUNTRY = { code: "CA", name: "Canada" } as const

// ── Provinces & Territories ─────────────────────────────────────────────
export const PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const

export type ProvinceCode = (typeof PROVINCES)[number]["code"]

/** Lookup province name by code */
export function getProvinceName(code: string): string {
  return PROVINCES.find((p) => p.code === code)?.name ?? code
}

/** Validate a province code */
export function isValidProvince(code: string): code is ProvinceCode {
  return PROVINCES.some((p) => p.code === code)
}

// ── Major Cities (grouped by province) ──────────────────────────────────
export const MAJOR_CITIES: Record<string, string[]> = {
  AB: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Medicine Hat"],
  BC: ["Vancouver", "Victoria", "Burnaby", "Surrey", "Kelowna", "Kamloops"],
  MB: ["Winnipeg", "Brandon", "Steinbach"],
  NB: ["Fredericton", "Saint John", "Moncton"],
  NL: ["St. John's", "Corner Brook", "Mount Pearl"],
  NS: ["Halifax", "Dartmouth", "Sydney"],
  NT: ["Yellowknife", "Hay River"],
  NU: ["Iqaluit"],
  ON: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Kitchener", "Windsor", "Markham", "Vaughan"],
  PE: ["Charlottetown", "Summerside"],
  QC: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke"],
  SK: ["Saskatoon", "Regina", "Prince Albert"],
  YT: ["Whitehorse", "Dawson City"],
} as const

// ── Canadian Timezones ──────────────────────────────────────────────────
export const CANADIAN_TIMEZONES = [
  { value: "America/St_Johns", label: "Newfoundland (UTC-3:30)" },
  { value: "America/Halifax", label: "Atlantic (UTC-4)" },
  { value: "America/Toronto", label: "Eastern (UTC-5)" },
  { value: "America/Winnipeg", label: "Central (UTC-6)" },
  { value: "America/Edmonton", label: "Mountain (UTC-7)" },
  { value: "America/Vancouver", label: "Pacific (UTC-8)" },
] as const

// ── Postal Code Validation ──────────────────────────────────────────────
/** Canadian postal code regex: A1A 1A1 or A1A1A1 */
export const POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/

export function isValidPostalCode(code: string): boolean {
  return POSTAL_CODE_REGEX.test(code.trim())
}

/** Format postal code to standard A1A 1A1 format */
export function formatPostalCode(code: string): string {
  const clean = code.replace(/\s/g, "").toUpperCase()
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`
  }
  return code
}

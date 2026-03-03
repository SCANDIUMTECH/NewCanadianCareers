/**
 * Orion Design System — Color Constants
 *
 * These values mirror the CSS custom properties defined in globals.css.
 * Use these when you need color values in JavaScript contexts (Recharts, inline styles, canvas, SVG).
 * For Tailwind classes, use the semantic tokens directly (e.g. `text-primary`, `bg-chart-primary`).
 *
 * IMPORTANT: If you update a color here, update the matching CSS variable in globals.css too.
 */

// ── Brand ────────────────────────────────────────────────────────────────
export const BRAND = {
  primary: "#3B5BDB",
  primaryHover: "#2F4BC7",
  primaryLight: "#5C7CFA",
  primaryRgb: "59, 91, 219",
} as const

// ── Chart & Data Viz Palette ─────────────────────────────────────────────
export const CHART = {
  primary: "#3B5BDB",
  success: "#10B981",
  warning: "#F59E0B",
  purple: "#8B5CF6",
  danger: "#EF4444",
  cyan: "#06B6D4",
  pink: "#EC4899",
  indigo: "#6366F1",
  orange: "#F97316",
  lime: "#84CC16",
  slate: "#64748B",
  grid: "#E5E7EB",
  tick: "#64748B",
} as const

/**
 * Ordered array of chart colors for consistent multi-series charts.
 * Use index % CHART_SEQUENCE.length for cycling.
 */
export const CHART_SEQUENCE = [
  CHART.primary,
  CHART.success,
  CHART.warning,
  CHART.purple,
  CHART.pink,
  CHART.indigo,
  CHART.cyan,
  CHART.orange,
  CHART.lime,
  CHART.danger,
] as const

// ── Status Colors ────────────────────────────────────────────────────────
export const STATUS = {
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  neutral: "#64748B",
  draft: "#94A3B8",
} as const

// ── Social Brand Colors ──────────────────────────────────────────────────
export const SOCIAL = {
  linkedin: "#0077B5",
  facebook: "#1877F2",
  instagram: "#E4405F",
  instagramFrom: "#F58529",
  instagramVia: "#DD2A7B",
  instagramTo: "#8134AF",
  twitter: "#000000",
} as const

// ── UI Surface Colors (for inline styles) ────────────────────────────────
export const UI = {
  background: "#F9FAFB",
  backgroundSecondary: "#F3F4F6",
  foreground: "#0F172A",
  foregroundMuted: "#475569",
  border: "#E5E7EB",
  card: "#FFFFFF",
} as const

// ── Recharts Tooltip Style ───────────────────────────────────────────────
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: UI.card,
  border: `1px solid ${UI.border}`,
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
} as const

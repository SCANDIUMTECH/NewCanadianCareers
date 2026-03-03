// Canonical status → badge style mappings used across dashboards.
// Keeps badge coloring consistent and avoids per-page duplication.

export const JOB_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  pending_payment: { label: "Payment", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  scheduled: { label: "Scheduled", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  published: { label: "Published", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  paused: { label: "Paused", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  expired: { label: "Expired", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  filled: { label: "Filled", className: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  hidden: { label: "Hidden", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
}

export const APPLICATION_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  reviewing: { label: "In Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  shortlisted: { label: "Shortlisted", className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  interviewing: { label: "Interviewing", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  offered: { label: "Offer", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  hired: { label: "Hired", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Not Selected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
}

"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function AdminJobDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundaryView
      error={error}
      reset={reset}
      description="Failed to load job details. Please try again or return to the jobs list."
      backHref="/admin/jobs"
      backLabel="Back to Jobs"
      backIcon="arrow"
      logLabel="Admin job detail error"
    />
  )
}

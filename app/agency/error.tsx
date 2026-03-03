"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function AgencyError({
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
      description="An unexpected error occurred in the agency portal. Please try again or return to the dashboard."
      backHref="/agency"
      backLabel="Agency Dashboard"
      backIcon="home"
      logLabel="Agency error"
    />
  )
}

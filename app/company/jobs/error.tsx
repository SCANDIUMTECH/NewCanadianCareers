"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function JobsError({
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
      title="Unable to load jobs"
      description="There was a problem loading your job listings. Please try again."
      backHref="/company"
      backLabel="Dashboard"
      backIcon="arrow"
      logLabel="Jobs page error"
    />
  )
}

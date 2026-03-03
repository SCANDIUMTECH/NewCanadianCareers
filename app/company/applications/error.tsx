"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function ApplicationsError({
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
      title="Unable to load applications"
      description="There was a problem loading your applications. Please try again."
      backHref="/company"
      backLabel="Dashboard"
      backIcon="arrow"
      logLabel="Applications page error"
    />
  )
}

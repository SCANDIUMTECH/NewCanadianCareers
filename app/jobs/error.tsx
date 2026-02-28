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
      description="An unexpected error occurred while loading jobs. Please try again or return to the home page."
      backHref="/"
      backLabel="Home"
      backIcon="home"
      logLabel="Jobs error"
    />
  )
}

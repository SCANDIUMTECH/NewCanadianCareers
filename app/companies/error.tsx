"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function CompaniesError({
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
      description="An unexpected error occurred while loading company information. Please try again."
      backHref="/"
      backLabel="Home"
      backIcon="home"
      logLabel="Companies error"
    />
  )
}

"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function CandidateError({
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
      description="An unexpected error occurred. Please try again or return to your dashboard."
      backHref="/candidate"
      backLabel="Candidate Dashboard"
      backIcon="home"
      logLabel="Candidate error"
    />
  )
}

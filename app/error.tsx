"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function GlobalError({
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
      description="An unexpected error occurred. Please try again or return to the home page."
      backHref="/"
      backLabel="Home"
      backIcon="home"
      logLabel="Global error"
    />
  )
}

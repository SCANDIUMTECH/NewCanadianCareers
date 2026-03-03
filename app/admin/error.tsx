"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function AdminError({
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
      description="An unexpected error occurred in the admin panel. Please try again or return to the dashboard."
      backHref="/admin"
      backLabel="Admin Dashboard"
      backIcon="home"
      logLabel="Admin error"
    />
  )
}

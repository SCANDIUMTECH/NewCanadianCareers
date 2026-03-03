"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function CompanyError({
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
      backHref="/company"
      logLabel="Company portal error"
    />
  )
}

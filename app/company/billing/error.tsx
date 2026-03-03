"use client"

import { ErrorBoundaryView } from "@/components/error-boundary-view"

export default function BillingError({
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
      title="Unable to load billing"
      description="There was a problem loading your billing information. Please try again."
      backHref="/company"
      backLabel="Dashboard"
      backIcon="arrow"
      logLabel="Billing page error"
    />
  )
}

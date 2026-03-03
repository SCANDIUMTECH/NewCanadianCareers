"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { QuickJobPost } from "@/components/quick-job-post/quick-job-post"
import { useAgencySettings } from "@/hooks/use-quick-job-post"
import { Loader2 } from "lucide-react"

/**
 * Quick Job Post Page
 * Entry point for the streamlined single-page job posting experience
 */

function QuickJobPostContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { settings, isLoaded } = useAgencySettings()
  const [shouldRender, setShouldRender] = useState(false)

  const companyId = searchParams.get("company")
  const initialCompanyId = companyId ? parseInt(companyId, 10) : undefined

  // Redirect to standard workflow if quick mode is not enabled
  useEffect(() => {
    if (isLoaded) {
      if (settings.job_post_workflow !== "quick") {
        // Preserve company param when redirecting
        const redirectUrl = companyId
          ? `/agency/jobs/new?company=${companyId}`
          : "/agency/jobs/new"
        router.replace(redirectUrl)
      } else {
        setShouldRender(true)
      }
    }
  }, [isLoaded, settings.job_post_workflow, router, companyId])

  // Show loading while checking workflow preference
  if (!isLoaded || !shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <QuickJobPost initialCompanyId={initialCompanyId} />
}

export default function QuickJobPostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <QuickJobPostContent />
    </Suspense>
  )
}

"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAgencySettings } from "@/hooks/use-quick-job-post"
import { QuickJobPostV3 } from "@/components/quick-job-post-v3"

function QuickJobPostV3Content() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { settings, isLoaded } = useAgencySettings()
  const [shouldRender, setShouldRender] = useState(false)

  const companyId = searchParams.get("company")
  const preview = searchParams.get("preview")
  const initialCompanyId = companyId ? parseInt(companyId, 10) : undefined

  useEffect(() => {
    if (!isLoaded) return

    // Allow preview mode to bypass workflow check
    if (settings.job_post_workflow !== "quick" && preview !== "1") {
      const redirectUrl = companyId
        ? `/agency/jobs/new?company=${companyId}`
        : "/agency/jobs/new"
      router.replace(redirectUrl)
      return
    }

    setShouldRender(true)
  }, [isLoaded, settings.job_post_workflow, router, companyId, preview])

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

  return <QuickJobPostV3 initialCompanyId={initialCompanyId} />
}

export default function QuickJobPostV3Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <QuickJobPostV3Content />
    </Suspense>
  )
}

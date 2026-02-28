"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Agency Job Edit Page - Redirects to detail page with edit mode
 * The detail page (/agency/jobs/[id]) handles both viewing and editing
 * This page exists for direct edit links and URL consistency
 */
export default function AgencyJobEditPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to detail page with edit mode query param
    router.replace(`/agency/jobs/${params.id}?edit=true`)
  }, [params.id, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-foreground-muted">Loading editor...</p>
      </div>
    </div>
  )
}

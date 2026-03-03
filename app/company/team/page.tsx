"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Team page redirect
 * Team management has moved to Settings → Team tab.
 * This redirect preserves any bookmarks or external links.
 */
export default function CompanyTeamPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/company/settings?tab=team")
  }, [router])
  return null
}

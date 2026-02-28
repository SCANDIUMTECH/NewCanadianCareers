"use client"

import { useEffect } from "react"
import { RUM_CONFIG } from "@/lib/rum/config"

/**
 * RUM Provider — Initializes web vitals collection on mount.
 * Renders nothing (invisible). Add to root layout.
 */
export function RUMProvider() {
  useEffect(() => {
    if (!RUM_CONFIG.enabled) return

    // Lazy-load the web vitals initializer
    import("@/lib/rum/web-vitals").then(({ initWebVitals }) => {
      initWebVitals()
    }).catch(() => {
      // Fail silently — RUM should never break the app
    })
  }, [])

  return null
}

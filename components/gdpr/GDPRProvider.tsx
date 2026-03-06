"use client"

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import type {
  GDPRContextValue,
  GDPRPublicSettings,
  Service,
  ServiceCategory,
  ServiceConsentState,
} from "@/lib/gdpr/types"
import {
  bulkConsent,
  checkConsent,
  deleteCookies,
  fetchGDPRPublicSettings,
  isBot,
  isEUVisitor,
  updateConsent as apiUpdateConsent,
} from "@/lib/api/gdpr"

export const GDPRContext = createContext<GDPRContextValue | null>(null)

const STORAGE_KEY = "gdpr_consents"
const VERSION_KEY = "gdpr_consent_version"
const CHOICE_KEY = "gdpr_choice_made"
const CONSENT_TIMESTAMP_KEY = "gdpr_consent_given_at"

interface Props {
  children: React.ReactNode
}

export function GDPRProvider({ children }: Props) {
  const [settings, setSettings] = useState<GDPRPublicSettings | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [consents, setConsents] = useState<Record<string, ServiceConsentState>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isBannerVisible, setIsBannerVisible] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [consentVersion, setConsentVersion] = useState<string | null>(null)

  // ─── Cookie Cleanup ────────────────────────────────────────────────────────
  const cleanupRevokedCookies = useCallback(
    (
      newConsents: Record<string, ServiceConsentState>,
      oldConsents: Record<string, ServiceConsentState>,
      cookieDomain?: string
    ) => {
      Object.entries(newConsents).forEach(([id, state]) => {
        const wasAllowed = oldConsents[id]?.allowed
        if (wasAllowed && !state.allowed && state.cookies?.length) {
          deleteCookies(state.cookies, cookieDomain || undefined)
        }
      })
    },
    []
  )

  const cleanupAllOptionalCookies = useCallback(
    (serviceConsents: Record<string, ServiceConsentState>, cookieDomain?: string) => {
      Object.values(serviceConsents).forEach((state) => {
        if (!state.allowed && state.cookies?.length) {
          deleteCookies(state.cookies, cookieDomain || undefined)
        }
      })
    },
    []
  )

  // ─── Execute Allowed Scripts ───────────────────────────────────────────────

  // Allowlisted domains for third-party analytics/marketing scripts.
  // Only <script src="..."> tags from these domains are executed.
  // Inline scripts (no src) are blocked to prevent stored XSS via admin panel.
  const ALLOWED_SCRIPT_DOMAINS = [
    "www.googletagmanager.com",
    "www.google-analytics.com",
    "googletagmanager.com",
    "cdn.segment.com",
    "js.hs-scripts.com",
    "js.hs-analytics.net",
    "static.hotjar.com",
    "plausible.io",
    "cdn.jsdelivr.net",
    "unpkg.com",
  ]

  const isAllowedScript = useCallback((scriptEl: HTMLScriptElement): boolean => {
    const src = scriptEl.getAttribute("src")
    // Block inline scripts — only allow external src-based scripts
    if (!src) return false
    try {
      const url = new URL(src, window.location.origin)
      return ALLOWED_SCRIPT_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
    } catch {
      return false
    }
  }, [])

  const injectScripts = useCallback(
    (html: string, target: "head" | "body", markerId: string) => {
      const attr = `data-gdpr-${target}`
      if (document.querySelector(`[${attr}="${markerId}"]`)) return

      const wrapper = document.createElement("div")
      wrapper.setAttribute(attr, markerId)
      wrapper.innerHTML = html

      const scripts = wrapper.querySelectorAll("script")
      scripts.forEach((oldScript) => {
        if (!isAllowedScript(oldScript)) return
        const newScript = document.createElement("script")
        Array.from(oldScript.attributes).forEach((a) =>
          newScript.setAttribute(a.name, a.value)
        )
        // Do not copy textContent — only allow src-based scripts
        const container = target === "head" ? document.head : document.body
        container.appendChild(newScript)
      })

      // Append non-script elements (e.g. <noscript>, <link>)
      Array.from(wrapper.children).forEach((child) => {
        if (child.tagName !== "SCRIPT") {
          const container = target === "head" ? document.head : document.body
          container.appendChild(child)
        }
      })
    },
    [isAllowedScript]
  )

  const executeServices = useCallback(
    (serviceConsents: Record<string, ServiceConsentState>) => {
      Object.entries(serviceConsents).forEach(([id, state]) => {
        if (!state.allowed) return

        if (state.head_script) injectScripts(state.head_script, "head", id)
        if (state.body_script) injectScripts(state.body_script, "body", id)
      })

      // Google Consent Mode v2
      if (settings?.consent_mode_v2 && typeof window !== "undefined") {
        const hasAnalytics = Object.values(serviceConsents).some(
          (s) => s.allowed && s.category === "analytics"
        )
        const hasMarketing = Object.values(serviceConsents).some(
          (s) => s.allowed && s.category === "marketing"
        )

        const w = window as unknown as Record<string, unknown>
        if (typeof w.gtag === "function") {
          ;(w.gtag as Function)("consent", "update", {
            analytics_storage: hasAnalytics ? "granted" : "denied",
            ad_storage: hasMarketing ? "granted" : "denied",
            ad_user_data: hasMarketing ? "granted" : "denied",
            ad_personalization: hasMarketing ? "granted" : "denied",
          })
        }
      }

      // Push to dataLayer for GTM
      if (typeof window !== "undefined") {
        const w = window as unknown as Record<string, unknown>
        w.dataLayer = w.dataLayer || []
        Object.entries(serviceConsents).forEach(([id, state]) => {
          ;(w.dataLayer as Array<Record<string, string>>).push({
            event: `gdpr-service-${id}-${state.allowed ? "allowed" : "denied"}`,
          })
        })
      }
    },
    [settings?.consent_mode_v2]
  )

  // ─── Consent Version & Expiry Checks ───────────────────────────────────────

  const isConsentStale = useCallback(
    (serverSettings: GDPRPublicSettings): boolean => {
      const cachedVersion = localStorage.getItem(VERSION_KEY)
      const serverVersion = serverSettings.consent_version || "1"

      if (cachedVersion !== serverVersion) {
        return true
      }

      const consentTimestamp = localStorage.getItem(CONSENT_TIMESTAMP_KEY)
      if (!consentTimestamp) {
        return true
      }

      const givenAt = new Date(consentTimestamp)
      const expiryDays = serverSettings.consent_expiry_days || 395
      const expiryDate = new Date(givenAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)
      if (new Date() > expiryDate) {
        return true
      }

      return false
    },
    []
  )

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      if (isBot()) {
        setIsLoading(false)
        return
      }

      try {
        const data = await fetchGDPRPublicSettings()
        setSettings(data.settings)
        setServices(data.services)
        setCategories(data.categories)
        setConsentVersion(data.settings.consent_version || "1")

        if (!data.settings.is_enabled || !data.settings.popup_enabled) {
          setIsLoading(false)
          return
        }

        if (data.settings.geo_ip_eu_only) {
          const isEU = await isEUVisitor()
          if (!isEU) {
            setIsLoading(false)
            return
          }
        }

        const choiceMade = localStorage.getItem(CHOICE_KEY) === "true"
        const cachedConsents = localStorage.getItem(STORAGE_KEY)

        if (choiceMade && cachedConsents) {
          const stale = isConsentStale(data.settings)

          if (stale) {
            localStorage.removeItem(CHOICE_KEY)
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(CONSENT_TIMESTAMP_KEY)

            const consentData = await checkConsent()
            setConsents(consentData.services)
            setIsBannerVisible(true)
          } else {
            try {
              const parsed = JSON.parse(cachedConsents)
              setConsents(parsed)
              executeServices(parsed)
            } catch {
              localStorage.removeItem(STORAGE_KEY)
              localStorage.removeItem(CHOICE_KEY)
              setIsBannerVisible(true)
            }
          }

          setIsLoading(false)
          return
        }

        const consentData = await checkConsent()
        setConsents(consentData.services)

        if (!choiceMade) {
          setIsBannerVisible(true)
        } else {
          executeServices(consentData.services)
        }
      } catch (err) {
        console.warn("GDPR: Could not reach backend — showing banner as fail-safe.", err instanceof Error ? err.message : err)
        setIsBannerVisible(true)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [executeServices, isConsentStale])

  // ─── Allow All ─────────────────────────────────────────────────────────────

  const allowAll = useCallback(async () => {
    try {
      const result = await bulkConsent("allow_all")
      if (result.services) {
        setConsents(result.services)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.services))
        executeServices(result.services)
      }
      localStorage.setItem(CHOICE_KEY, "true")
      if (consentVersion) {
        localStorage.setItem(VERSION_KEY, consentVersion)
      }
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString())
      setIsBannerVisible(false)
      setIsPreferencesOpen(false)
    } catch (err) {
      console.error("Allow all error:", err)
    }
  }, [executeServices, consentVersion])

  // ─── Decline All ───────────────────────────────────────────────────────────

  const declineAll = useCallback(async () => {
    try {
      const oldConsents = { ...consents }
      await bulkConsent("decline_all")

      const consentData = await checkConsent()
      setConsents(consentData.services)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services))

      localStorage.setItem(CHOICE_KEY, "true")
      if (consentVersion) {
        localStorage.setItem(VERSION_KEY, consentVersion)
      }
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString())

      cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain)
      cleanupAllOptionalCookies(consentData.services, settings?.cookie_domain)

      setIsBannerVisible(false)
      setIsPreferencesOpen(false)
    } catch (err) {
      console.error("Decline all error:", err)
    }
  }, [consents, consentVersion, settings?.cookie_domain, cleanupRevokedCookies, cleanupAllOptionalCookies])

  // ─── Update Single Service Consent ─────────────────────────────────────────

  const handleUpdateConsent = useCallback(
    async (serviceId: number, allowed: boolean) => {
      try {
        const oldConsents = { ...consents }
        await apiUpdateConsent(serviceId, allowed)

        const consentData = await checkConsent()
        setConsents(consentData.services)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services))

        localStorage.setItem(CHOICE_KEY, "true")
        if (consentVersion) {
          localStorage.setItem(VERSION_KEY, consentVersion)
        }
        localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString())

        cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain)

        executeServices(consentData.services)
      } catch (err) {
        console.error("Update consent error:", err)
      }
    },
    [consents, consentVersion, executeServices, settings?.cookie_domain, cleanupRevokedCookies]
  )

  // ─── Update Category Consent ───────────────────────────────────────────────

  const updateCategoryConsent = useCallback(
    async (categorySlug: string, allowed: boolean) => {
      try {
        const oldConsents = { ...consents }
        const categoryServices = services.filter(
          (s) => s.category_slug === categorySlug && s.is_deactivatable
        )

        await Promise.all(
          categoryServices.map((s) => apiUpdateConsent(s.id, allowed))
        )

        const consentData = await checkConsent()
        setConsents(consentData.services)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services))

        localStorage.setItem(CHOICE_KEY, "true")
        if (consentVersion) {
          localStorage.setItem(VERSION_KEY, consentVersion)
        }
        localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString())

        cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain)

        executeServices(consentData.services)
      } catch (err) {
        console.error("Update category consent error:", err)
      }
    },
    [consents, consentVersion, services, executeServices, settings?.cookie_domain, cleanupRevokedCookies]
  )

  // ─── Context Value ─────────────────────────────────────────────────────────

  const value = useMemo<GDPRContextValue>(
    () => ({
      settings,
      services,
      categories,
      consents,
      isLoading,
      isBannerVisible,
      isPreferencesOpen,
      consentVersion,
      allowAll,
      declineAll,
      updateConsent: handleUpdateConsent,
      updateCategoryConsent,
      openPreferences: () => {
        setIsPreferencesOpen(true)
        setIsBannerVisible(false)
      },
      closePreferences: () => setIsPreferencesOpen(false),
      closeBanner: () => setIsBannerVisible(false),
    }),
    [
      settings,
      services,
      categories,
      consents,
      isLoading,
      isBannerVisible,
      isPreferencesOpen,
      consentVersion,
      allowAll,
      declineAll,
      handleUpdateConsent,
      updateCategoryConsent,
    ]
  )

  return <GDPRContext.Provider value={value}>{children}</GDPRContext.Provider>
}

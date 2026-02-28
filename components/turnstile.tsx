"use client"

/**
 * Cloudflare Turnstile widget component.
 *
 * Renders the Turnstile challenge only when:
 * 1. Turnstile is globally enabled in platform settings
 * 2. The specific feature guard (auth/jobs/applications) is active
 * 3. A valid site key is configured
 *
 * In managed mode, Cloudflare decides whether to show the widget visually.
 * If Turnstile is disabled or unconfigured, the component renders nothing.
 */

import { useEffect, useState, useRef, useCallback } from "react"
import { Turnstile as TurnstileWidget, type TurnstileInstance } from "@marsidev/react-turnstile"
import { getPublicSettings, type PublicSettings } from "@/lib/api/settings"

export type TurnstileFeature = "auth" | "jobs" | "applications"

interface TurnstileProps {
  /** Which feature this Turnstile protects */
  feature: TurnstileFeature
  /** Callback when a token is obtained */
  onToken: (token: string) => void
  /** Callback when token expires (optional) */
  onExpire?: () => void
  /** Callback when verification fails (optional) */
  onError?: () => void
  /** Additional class name */
  className?: string
}

export function TurnstileGuard({
  feature,
  onToken,
  onExpire,
  onError,
  className,
}: TurnstileProps) {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [settingsFailed, setSettingsFailed] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  useEffect(() => {
    getPublicSettings()
      .then(setSettings)
      .catch(() => setSettingsFailed(true))
  }, [])

  // Determine if Turnstile should render
  const shouldRender = (() => {
    // If settings failed to load, don't silently disable CAPTCHA — just skip rendering
    // The backend will still enforce Turnstile if enabled, returning a 400 on missing token
    if (settingsFailed || !settings) return false
    if (!settings.turnstile_enabled) return false
    if (!settings.turnstile_site_key) return false

    const featureToggles: Record<TurnstileFeature, boolean> = {
      auth: settings.turnstile_protect_auth,
      jobs: settings.turnstile_protect_jobs,
      applications: settings.turnstile_protect_applications,
    }
    return featureToggles[feature] ?? false
  })()

  // Notify parent when settings fail so it can disable form submission
  useEffect(() => {
    if (settingsFailed) {
      onError?.()
    }
  }, [settingsFailed, onError])

  // If settings failed to load, show a warning
  if (settingsFailed) {
    return (
      <div className={className}>
        <p className="text-xs text-amber-600">
          Security verification unavailable. Please refresh the page.
        </p>
      </div>
    )
  }

  if (!shouldRender) return null

  return (
    <div className={className}>
      <TurnstileWidget
        ref={turnstileRef}
        siteKey={settings!.turnstile_site_key}
        onSuccess={onToken}
        onExpire={() => {
          onExpire?.()
          // Auto-reset on expiry so user can re-verify
          turnstileRef.current?.reset()
        }}
        onError={onError}
        options={{
          theme: "auto",
          size: "flexible",
        }}
      />
    </div>
  )
}

/**
 * Hook to manage Turnstile token state.
 * Returns the token, a setter, and a reset function.
 */
export function useTurnstileToken() {
  const [token, setToken] = useState<string>("")

  const reset = useCallback(() => setToken(""), [])

  return { turnstileToken: token, setTurnstileToken: setToken, resetTurnstileToken: reset }
}

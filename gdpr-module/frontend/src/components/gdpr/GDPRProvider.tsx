"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  GDPRContextValue,
  GDPRPublicSettings,
  Service,
  ServiceCategory,
  ServiceConsentState,
} from "@/types/gdpr";
import {
  bulkConsent,
  checkConsent,
  deleteCookies,
  fetchPublicSettings,
  isBot,
  isEUVisitor,
  updateConsent as apiUpdateConsent,
} from "@/lib/gdpr-api";

export const GDPRContext = createContext<GDPRContextValue | null>(null);

const STORAGE_KEY = "gdpr_consents";
const VERSION_KEY = "gdpr_consent_version";
const CHOICE_KEY = "gdpr_choice_made";
const CONSENT_TIMESTAMP_KEY = "gdpr_consent_given_at";

interface Props {
  children: React.ReactNode;
}

export function GDPRProvider({ children }: Props) {
  const [settings, setSettings] = useState<GDPRPublicSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [consents, setConsents] = useState<Record<string, ServiceConsentState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [consentVersion, setConsentVersion] = useState<string | null>(null);

  // ─── Cookie Cleanup ────────────────────────────────────────────────────────
  // When consent is revoked for a service, immediately delete the cookies it set.
  const cleanupRevokedCookies = useCallback(
    (
      newConsents: Record<string, ServiceConsentState>,
      oldConsents: Record<string, ServiceConsentState>,
      cookieDomain?: string
    ) => {
      Object.entries(newConsents).forEach(([id, state]) => {
        const wasAllowed = oldConsents[id]?.allowed;
        // Service was just revoked (was allowed, now denied)
        if (wasAllowed && !state.allowed && state.cookies?.length) {
          deleteCookies(state.cookies, cookieDomain || undefined);
        }
      });
    },
    []
  );

  // Delete all non-essential cookies when user declines all
  const cleanupAllOptionalCookies = useCallback(
    (serviceConsents: Record<string, ServiceConsentState>, cookieDomain?: string) => {
      Object.values(serviceConsents).forEach((state) => {
        if (!state.allowed && state.cookies?.length) {
          deleteCookies(state.cookies, cookieDomain || undefined);
        }
      });
    },
    []
  );

  // ─── Execute Allowed Scripts ───────────────────────────────────────────────

  const executeServices = useCallback(
    (serviceConsents: Record<string, ServiceConsentState>) => {
      Object.entries(serviceConsents).forEach(([id, state]) => {
        if (!state.allowed) return;

        if (state.head_script && !document.querySelector(`[data-gdpr-head="${id}"]`)) {
          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-gdpr-head", id);
          wrapper.innerHTML = state.head_script;
          const scripts = wrapper.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) =>
              newScript.setAttribute(attr.name, attr.value)
            );
            newScript.textContent = oldScript.textContent;
            document.head.appendChild(newScript);
          });
          // Append non-script elements too
          Array.from(wrapper.children).forEach((child) => {
            if (child.tagName !== "SCRIPT") {
              document.head.appendChild(child);
            }
          });
        }

        if (state.body_script && !document.querySelector(`[data-gdpr-body="${id}"]`)) {
          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-gdpr-body", id);
          wrapper.innerHTML = state.body_script;
          const scripts = wrapper.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) =>
              newScript.setAttribute(attr.name, attr.value)
            );
            newScript.textContent = oldScript.textContent;
            document.body.appendChild(newScript);
          });
          Array.from(wrapper.children).forEach((child) => {
            if (child.tagName !== "SCRIPT") {
              document.body.appendChild(child);
            }
          });
        }
      });

      // Google Consent Mode v2
      if (settings?.consent_mode_v2 && typeof window !== "undefined") {
        const hasAnalytics = Object.values(serviceConsents).some(
          (s) => s.allowed && s.category === "analytics"
        );
        const hasMarketing = Object.values(serviceConsents).some(
          (s) => s.allowed && s.category === "marketing"
        );

        const w = window as any;
        if (typeof w.gtag === "function") {
          w.gtag("consent", "update", {
            analytics_storage: hasAnalytics ? "granted" : "denied",
            ad_storage: hasMarketing ? "granted" : "denied",
            ad_user_data: hasMarketing ? "granted" : "denied",
            ad_personalization: hasMarketing ? "granted" : "denied",
          });
        }
      }

      // Push to dataLayer for GTM
      if (typeof window !== "undefined") {
        const w = window as any;
        w.dataLayer = w.dataLayer || [];
        Object.entries(serviceConsents).forEach(([id, state]) => {
          w.dataLayer.push({
            event: `gdpr-service-${id}-${state.allowed ? "allowed" : "denied"}`,
          });
        });
      }
    },
    [settings?.consent_mode_v2]
  );

  // ─── Consent Version & Expiry Checks ───────────────────────────────────────

  /**
   * Check if the cached consent is still valid:
   * 1. Server consent_version must match the cached version
   * 2. Consent must not have expired (CNIL 13-month rule)
   */
  const isConsentStale = useCallback(
    (serverSettings: GDPRPublicSettings): boolean => {
      const cachedVersion = localStorage.getItem(VERSION_KEY);
      const serverVersion = serverSettings.consent_version || "1";

      // Version mismatch → re-consent required (services changed)
      if (cachedVersion !== serverVersion) {
        return true;
      }

      // Check expiry (CNIL 13-month / configurable consent_expiry_days)
      const consentTimestamp = localStorage.getItem(CONSENT_TIMESTAMP_KEY);
      if (!consentTimestamp) {
        // No timestamp recorded — treat as expired to enforce CNIL 13-month rule
        return true;
      }

      const givenAt = new Date(consentTimestamp);
      const expiryDays = serverSettings.consent_expiry_days || 395;
      const expiryDate = new Date(givenAt.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        return true;
      }

      return false;
    },
    []
  );

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      if (isBot()) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchPublicSettings();
        setSettings(data.settings);
        setServices(data.services);
        setCategories(data.categories);
        setConsentVersion(data.settings.consent_version || "1");

        if (!data.settings.is_enabled || !data.settings.popup_enabled) {
          setIsLoading(false);
          return;
        }

        // Check GeoIP via backend if enabled
        if (data.settings.geo_ip_eu_only) {
          const isEU = await isEUVisitor();
          if (!isEU) {
            setIsLoading(false);
            return;
          }
        }

        // Check if user has previously made a choice
        const choiceMade = localStorage.getItem(CHOICE_KEY) === "true";
        const cachedConsents = localStorage.getItem(STORAGE_KEY);

        // If user already made a choice, check if consent is still valid
        if (choiceMade && cachedConsents) {
          const stale = isConsentStale(data.settings);

          if (stale) {
            // Consent version changed or expired — require re-consent
            localStorage.removeItem(CHOICE_KEY);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CONSENT_TIMESTAMP_KEY);

            // Fetch fresh consent state from server
            const consentData = await checkConsent();
            setConsents(consentData.services);
            setIsBannerVisible(true);
          } else {
            // Valid cached consent — use it
            const parsed = JSON.parse(cachedConsents);
            setConsents(parsed);
            executeServices(parsed);
          }

          setIsLoading(false);
          return;
        }

        // No choice made yet — fetch from server and show banner
        const consentData = await checkConsent();
        setConsents(consentData.services);

        if (!choiceMade) {
          setIsBannerVisible(true);
        } else {
          executeServices(consentData.services);
        }
      } catch (err) {
        console.error("GDPR init error:", err);
        // Fail-safe: show banner if initialization fails (compliance risk to not show it)
        setIsBannerVisible(true);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [executeServices, isConsentStale]);

  // ─── Allow All ─────────────────────────────────────────────────────────────

  const allowAll = useCallback(async () => {
    try {
      const result = await bulkConsent("allow_all");
      if (result.services) {
        setConsents(result.services);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.services));
        executeServices(result.services);
      }
      // Store consent metadata
      localStorage.setItem(CHOICE_KEY, "true");
      if (consentVersion) {
        localStorage.setItem(VERSION_KEY, consentVersion);
      }
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString());
      setIsBannerVisible(false);
      setIsPreferencesOpen(false);
    } catch (err) {
      console.error("Allow all error:", err);
    }
  }, [executeServices, consentVersion]);

  // ─── Decline All ───────────────────────────────────────────────────────────

  const declineAll = useCallback(async () => {
    try {
      const oldConsents = { ...consents };
      await bulkConsent("decline_all");

      // Re-fetch consent state
      const consentData = await checkConsent();
      setConsents(consentData.services);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services));

      // Store consent metadata
      localStorage.setItem(CHOICE_KEY, "true");
      if (consentVersion) {
        localStorage.setItem(VERSION_KEY, consentVersion);
      }
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString());

      // Cookie cleanup: delete cookies for all revoked services
      cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain);
      cleanupAllOptionalCookies(consentData.services, settings?.cookie_domain);

      setIsBannerVisible(false);
      setIsPreferencesOpen(false);
    } catch (err) {
      console.error("Decline all error:", err);
    }
  }, [consents, consentVersion, settings?.cookie_domain, cleanupRevokedCookies, cleanupAllOptionalCookies]);

  // ─── Update Single Service Consent ─────────────────────────────────────────

  const handleUpdateConsent = useCallback(
    async (serviceId: number, allowed: boolean) => {
      try {
        const oldConsents = { ...consents };
        await apiUpdateConsent(serviceId, allowed);

        // Re-fetch all consent states
        const consentData = await checkConsent();
        setConsents(consentData.services);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services));

        // Mark that a consent choice has been made (granular consent counts)
        localStorage.setItem(CHOICE_KEY, "true");
        if (consentVersion) {
          localStorage.setItem(VERSION_KEY, consentVersion);
        }
        localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString());

        // Cookie cleanup if a service was just revoked
        cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain);

        executeServices(consentData.services);
      } catch (err) {
        console.error("Update consent error:", err);
      }
    },
    [consents, consentVersion, executeServices, settings?.cookie_domain, cleanupRevokedCookies]
  );

  // ─── Update Category Consent (all services in category) ────────────────────

  const updateCategoryConsent = useCallback(
    async (categorySlug: string, allowed: boolean) => {
      try {
        const oldConsents = { ...consents };
        const categoryServices = services.filter(
          (s) => s.category_slug === categorySlug && s.is_deactivatable
        );

        // Update all services in the category in parallel
        await Promise.all(
          categoryServices.map((s) => apiUpdateConsent(s.id, allowed))
        );

        // Re-fetch all consent states once
        const consentData = await checkConsent();
        setConsents(consentData.services);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData.services));

        // Mark that a consent choice has been made
        localStorage.setItem(CHOICE_KEY, "true");
        if (consentVersion) {
          localStorage.setItem(VERSION_KEY, consentVersion);
        }
        localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString());

        // Cookie cleanup for revoked services
        cleanupRevokedCookies(consentData.services, oldConsents, settings?.cookie_domain);

        executeServices(consentData.services);
      } catch (err) {
        console.error("Update category consent error:", err);
      }
    },
    [consents, consentVersion, services, executeServices, settings?.cookie_domain, cleanupRevokedCookies]
  );

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
        setIsPreferencesOpen(true);
        setIsBannerVisible(false);
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
  );

  return <GDPRContext.Provider value={value}>{children}</GDPRContext.Provider>;
}

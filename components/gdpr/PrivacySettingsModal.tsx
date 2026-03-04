"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Shield, Check, Lock } from "lucide-react"
import { useGDPR } from "@/hooks/use-gdpr"
import { cn } from "@/lib/utils"

export function PrivacySettingsModal() {
  const {
    settings,
    services,
    categories,
    consents,
    isPreferencesOpen,
    closePreferences,
    updateConsent,
    updateCategoryConsent,
    allowAll,
    declineAll,
  } = useGDPR()

  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  if (!isPreferencesOpen || !settings) return null

  const activeCatSlug = activeCategory || categories[0]?.slug || ""
  const filteredServices = services.filter(
    (s) => s.category_slug === activeCatSlug
  )

  const isCategoryAllowed =
    filteredServices.length > 0 &&
    filteredServices
      .filter((s) => s.is_deactivatable)
      .every((s) => {
        const state = consents[String(s.id)]
        return state?.allowed ?? s.default_enabled
      })

  const isCategoryToggleable = filteredServices.some((s) => s.is_deactivatable)

  return (
    <AnimatePresence>
      {isPreferencesOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm"
            onClick={
              settings.privacy_settings_backdrop_close
                ? closePreferences
                : undefined
            }
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "fixed inset-x-4 top-[10%] bottom-[10%] z-[10001] mx-auto max-w-[780px]",
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:w-[90%] sm:h-[520px] sm:max-h-[80vh]",
              "flex flex-col overflow-hidden",
              "rounded-2xl bg-white",
              "shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_32px_80px_rgba(0,0,0,0.16),0_12px_40px_rgba(0,0,0,0.08)]"
            )}
            role="dialog"
            aria-label="Privacy Settings"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B5BDB]/8 ring-1 ring-[#3B5BDB]/10">
                  <Shield className="h-4 w-4 text-[#3B5BDB]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-gray-900">
                    Privacy Preferences
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Manage how we use cookies and data
                  </p>
                </div>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                onClick={closePreferences}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1">
              {/* Category Sidebar */}
              <nav className="hidden w-[200px] flex-shrink-0 border-r border-gray-100 bg-gray-50/50 p-2 sm:block overflow-y-auto">
                {categories.map((cat) => {
                  const isActive = activeCatSlug === cat.slug
                  const catServices = services.filter(
                    (s) => s.category_slug === cat.slug
                  )
                  const enabledCount = catServices.filter((s) => {
                    const state = consents[String(s.id)]
                    return state?.allowed ?? s.default_enabled
                  }).length

                  return (
                    <button
                      key={cat.slug}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all mb-0.5",
                        isActive
                          ? "bg-[#3B5BDB]/8 text-[#3B5BDB]"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      )}
                      onClick={() => setActiveCategory(cat.slug)}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span
                        className={cn(
                          "flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[10px] font-semibold tabular-nums",
                          isActive
                            ? "bg-[#3B5BDB]/10 text-[#3B5BDB]"
                            : "bg-gray-100 text-gray-400"
                        )}
                      >
                        {enabledCount}/{catServices.length}
                      </span>
                    </button>
                  )
                })}
              </nav>

              {/* Mobile Category Tabs */}
              <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 p-1.5 sm:hidden">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    className={cn(
                      "flex-shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
                      activeCatSlug === cat.slug
                        ? "bg-[#3B5BDB]/8 text-[#3B5BDB]"
                        : "text-gray-400 hover:text-gray-600"
                    )}
                    onClick={() => setActiveCategory(cat.slug)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Services Panel */}
              <div className="flex-1 overflow-y-auto p-5">
                {categories
                  .filter((c) => c.slug === activeCatSlug)
                  .map((cat) => (
                    <div key={cat.slug} className="mb-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-[15px] font-semibold tracking-tight text-gray-900">
                            {cat.name}
                          </h3>
                          {cat.description && (
                            <p className="mt-1 text-[13px] leading-relaxed text-gray-400">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        {isCategoryToggleable && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[11px] font-medium text-gray-300">
                              {isCategoryAllowed ? "All on" : "All off"}
                            </span>
                            <ToggleSwitch
                              checked={isCategoryAllowed}
                              onChange={(checked) =>
                                updateCategoryConsent(cat.slug, checked)
                              }
                              label={`Toggle all ${cat.name} services`}
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-4 h-px bg-gray-100" />
                    </div>
                  ))}

                <div className="flex flex-col gap-2.5">
                  {filteredServices.map((service) => {
                    const consentState = consents[String(service.id)]
                    const isAllowed =
                      consentState?.allowed ?? service.default_enabled
                    const isLocked = !service.is_deactivatable

                    return (
                      <div
                        key={service.id}
                        className={cn(
                          "flex items-center justify-between gap-4 rounded-xl border p-4 transition-all",
                          isAllowed
                            ? "border-gray-200/80 bg-white"
                            : "border-gray-100 bg-gray-50/50"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-gray-800 tracking-tight">
                              {service.name}
                            </span>
                            {isLocked && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                                <Lock className="h-2.5 w-2.5" />
                                Required
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-400">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <ToggleSwitch
                          checked={isAllowed}
                          disabled={isLocked}
                          onChange={(checked) =>
                            updateConsent(service.id, checked)
                          }
                          label={`Toggle ${service.name}`}
                        />
                      </div>
                    )
                  })}
                  {filteredServices.length === 0 && (
                    <div className="py-8 text-center text-[13px] text-gray-300">
                      No services in this category.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-3.5">
              <button
                onClick={closePreferences}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-[13px] font-semibold",
                  "text-[#3B5BDB] bg-[#3B5BDB]/6",
                  "border border-[#3B5BDB]/10",
                  "transition-all hover:bg-[#3B5BDB]/10 active:scale-[0.98]"
                )}
              >
                Save Preferences
              </button>
              <div className="flex gap-2">
                <button
                  onClick={declineAll}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-[13px] font-semibold",
                    "text-gray-500 bg-gray-50",
                    "border border-gray-200/80",
                    "transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-[0.98]"
                  )}
                >
                  Decline All
                </button>
                <button
                  onClick={allowAll}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-[13px] font-semibold",
                    "bg-[#3B5BDB] text-white",
                    "shadow-[0_1px_2px_rgba(59,91,219,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
                    "transition-all hover:bg-[#2F4BC7] hover:shadow-[0_4px_12px_rgba(59,91,219,0.25)] active:scale-[0.98]"
                  )}
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] flex-shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-200",
        checked ? "bg-[#3B5BDB]" : "bg-gray-200",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  )
}

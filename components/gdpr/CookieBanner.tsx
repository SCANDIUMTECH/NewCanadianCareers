"use client"

import React, { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DOMPurify from "dompurify"
import Image from "next/image"
import { Settings2, X } from "lucide-react"
import { useGDPR } from "@/hooks/use-gdpr"
import { cn } from "@/lib/utils"

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "span", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  })
}

export function CookieBanner() {
  const {
    settings,
    isBannerVisible,
    allowAll,
    declineAll,
    openPreferences,
    closeBanner,
  } = useGDPR()

  const sanitizedText = useMemo(
    () => (settings?.popup_text ? sanitizeHTML(settings.popup_text) : ""),
    [settings?.popup_text]
  )

  const isOverlay = settings?.popup_style === "overlay"

  return (
    <AnimatePresence>
      {isBannerVisible && settings && (
        <>
          {/* Backdrop — only for overlay mode */}
          {isOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[6px]"
              onClick={closeBanner}
            />
          )}

          {/* Banner Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
              mass: 1,
            }}
            className={cn(
              "fixed z-[9999]",
              isOverlay
                ? "inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-[460px]"
                : "bottom-5 left-5 w-full max-w-[400px]"
            )}
            role="dialog"
            aria-label="Cookie consent"
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl",
                "bg-white/95 backdrop-blur-2xl backdrop-saturate-[1.8]",
                "border border-gray-200/60",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_24px_68px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)]"
              )}
            >
              {/* Subtle top gradient accent */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#FF4500] via-[#FF6B35] to-[#FF4500] opacity-60" />

              <div className="p-5 pt-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/favicon-ncc.svg"
                      alt="New Canadian Careers"
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-lg object-contain"
                    />
                    <div>
                      <h3 className="text-[14px] font-semibold tracking-tight text-gray-900">
                        Privacy & Cookies
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium">
                        New Canadian Careers
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeBanner}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 transition-all hover:bg-gray-100 hover:text-gray-500"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Body text */}
                <div
                  className="text-[13px] leading-[1.6] text-gray-500 mb-4 [&_a]:text-[#FF4500] [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[#FF4500]/30 hover:[&_a]:decoration-[#FF4500]/60 [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: sanitizedText }}
                />

                {/* Privacy Policy link */}
                {settings.privacy_policy_url && (
                  <a
                    href={settings.privacy_policy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 inline-flex items-center gap-1 text-[12px] font-medium text-[#FF4500]/70 transition-colors hover:text-[#FF4500]"
                  >
                    Read our Privacy Policy →
                  </a>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Primary: Accept All */}
                  <button
                    onClick={allowAll}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5",
                      "bg-[#FF4500] text-white text-[13px] font-semibold",
                      "shadow-[0_1px_2px_rgba(255,69,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
                      "transition-all duration-200",
                      "hover:bg-[#E03D00] hover:shadow-[0_4px_16px_rgba(255,69,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
                      "active:scale-[0.98]"
                    )}
                  >
                    {settings.popup_agree_text || "Accept All"}
                  </button>

                  <div className="flex gap-2">
                    {/* Secondary: Decline */}
                    <button
                      onClick={declineAll}
                      className={cn(
                        "flex-1 rounded-xl px-4 py-2.5",
                        "bg-gray-50 text-gray-600 text-[13px] font-semibold",
                        "border border-gray-200/80",
                        "transition-all duration-200",
                        "hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300/80",
                        "active:scale-[0.98]"
                      )}
                    >
                      {settings.popup_decline_text || "Decline"}
                    </button>

                    {/* Tertiary: Preferences */}
                    <button
                      onClick={openPreferences}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5",
                        "text-gray-400 text-[13px] font-medium",
                        "border border-transparent",
                        "transition-all duration-200",
                        "hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200/60",
                        "active:scale-[0.98]"
                      )}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {settings.popup_preferences_text || "Preferences"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

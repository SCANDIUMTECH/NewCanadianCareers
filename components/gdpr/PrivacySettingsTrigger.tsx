"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield } from "lucide-react"
import { useGDPR } from "@/hooks/use-gdpr"
import { cn } from "@/lib/utils"

export function PrivacySettingsTrigger() {
  const { settings, openPreferences, isBannerVisible } = useGDPR()

  if (!settings?.privacy_settings_trigger_enabled || isBannerVisible) {
    return null
  }

  const positionClasses: Record<string, string> = {
    bottom_left: "bottom-5 left-5",
    bottom_right: "bottom-5 right-5",
    top_left: "top-5 left-5",
    top_right: "top-5 right-5",
  }

  const posClass =
    positionClasses[settings.privacy_settings_trigger_position] ||
    positionClasses.bottom_left

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed z-[9997]",
          posClass,
          "flex h-10 w-10 items-center justify-center",
          "rounded-[12px] bg-white/90 backdrop-blur-xl",
          "border border-gray-200/60",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]",
          "text-gray-400 transition-colors hover:text-[#3B5BDB] hover:border-[#3B5BDB]/20",
          "hover:shadow-[0_0_0_1px_rgba(59,91,219,0.06),0_8px_24px_rgba(59,91,219,0.12),0_2px_8px_rgba(0,0,0,0.04)]"
        )}
        onClick={openPreferences}
        aria-label="Privacy Settings"
      >
        <Shield className="h-4 w-4" />
      </motion.button>
    </AnimatePresence>
  )
}

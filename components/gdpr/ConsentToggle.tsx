"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ConsentToggleProps {
  serviceId: number
  serviceName: string
  checked: boolean
  disabled?: boolean
  onChange: (serviceId: number, allowed: boolean) => void
}

export function ConsentToggle({
  serviceId,
  serviceName,
  checked,
  disabled = false,
  onChange,
}: ConsentToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${serviceName}`}
      disabled={disabled}
      onClick={() => !disabled && onChange(serviceId, !checked)}
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

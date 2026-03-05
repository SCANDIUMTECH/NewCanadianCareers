"use client"

import { useState, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

/**
 * Premium Auth Input
 * - Floating label animation
 * - Focus ring with brand color
 * - Error state styling
 */
export function AuthInput({ label, error, className, id, ...props }: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="relative">
      <input
        id={inputId}
        {...props}
        className={cn(
          "peer w-full px-4 py-4 pt-6 bg-card border rounded-lg text-foreground placeholder-transparent",
          "transition-all duration-300 outline-none",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
          error 
            ? "border-destructive focus:ring-destructive/20 focus:border-destructive" 
            : "border-border hover:border-foreground-muted/50",
          className
        )}
        placeholder={label}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          setHasValue(!!e.target.value)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value)
          props.onChange?.(e)
        }}
      />
      
      {/* Floating label */}
      <label
        htmlFor={inputId}
        className={cn(
          "absolute left-4 transition-all duration-300 pointer-events-none",
          "font-secondary text-foreground-muted",
          (isFocused || hasValue || props.value)
            ? "top-2 text-xs"
            : "top-1/2 -translate-y-1/2 text-base",
          isFocused && "text-primary",
          error && "text-destructive"
        )}
      >
        {label}
      </label>

      {/* Error message */}
      {error && (
        <p role="alert" className="font-secondary mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

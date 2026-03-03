"use client"

import { useState } from "react"
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface AIGenerateButtonProps {
  onClick: () => Promise<void>
  label?: string
  size?: "sm" | "default" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost" | "secondary"
  disabled?: boolean
  className?: string
}

/**
 * Reusable AI generation button with loading, success, and error states.
 * Shows a sparkles icon and handles the async generation flow.
 */
export function AIGenerateButton({
  onClick,
  label = "Generate with AI",
  size = "sm",
  variant = "outline",
  disabled = false,
  className,
}: AIGenerateButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setStatus("loading")
    setError(null)

    try {
      await onClick()
      setStatus("success")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed"
      setError(message)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  const icon = {
    idle: <Sparkles className="h-3.5 w-3.5" />,
    loading: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    success: <Check className="h-3.5 w-3.5" />,
    error: <AlertCircle className="h-3.5 w-3.5" />,
  }[status]

  const statusLabel = {
    idle: label,
    loading: "Generating...",
    success: "Generated",
    error: "Failed",
  }[status]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size={size}
            variant={variant}
            disabled={disabled || status === "loading"}
            onClick={handleClick}
            className={cn(
              "gap-1.5 transition-colors",
              status === "success" && "border-emerald-300 text-emerald-600 bg-emerald-50",
              status === "error" && "border-red-300 text-red-600 bg-red-50",
              className
            )}
          >
            {icon}
            {size !== "icon" && (
              <span className="text-xs font-medium">
                {statusLabel}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        {error && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{error}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

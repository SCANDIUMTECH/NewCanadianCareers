"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CoreWebVitalsGaugeProps {
  label: string
  value: number
  unit: string
  target: number
  description: string
}

export function CoreWebVitalsGauge({ label, value, unit, target, description }: CoreWebVitalsGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    // Reset to 0 then animate to target value
    setAnimatedValue(0)
    const raf = requestAnimationFrame(() => {
      setAnimatedValue(value)
    })
    return () => cancelAnimationFrame(raf)
  }, [value])

  // Determine status based on actual value (not animated)
  const isGood = value <= target
  const isNeedsImprovement = value > target && value <= target * 1.5
  const isPoor = value > target * 1.5

  const getStatus = () => {
    if (isGood) return { color: "text-emerald-600", label: "Good" }
    if (isNeedsImprovement) return { color: "text-amber-600", label: "Needs Improvement" }
    return { color: "text-red-600", label: "Poor" }
  }

  const status = getStatus()

  // Calculate percentage for gauge (capped at 200% of target) — use animated value for the arc
  const percentage = Math.min((animatedValue / (target * 2)) * 100, 100)

  // Calculate the stroke-dasharray for the circular gauge
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border/50">
      {/* Circular Gauge */}
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-1000 ease-out",
              isGood && "text-emerald-500",
              isNeedsImprovement && "text-amber-500",
              isPoor && "text-red-500"
            )}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-semibold", status.color)}>
            {value.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Status Badge */}
      <div className={cn(
        "mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium",
        isGood && "bg-emerald-500/10 text-emerald-600",
        isNeedsImprovement && "bg-amber-500/10 text-amber-600",
        isPoor && "bg-red-500/10 text-red-600"
      )}>
        {status.label} (Target: ≤{target}{unit})
      </div>
    </div>
  )
}

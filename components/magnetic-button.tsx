"use client"

import { useRef, useState, type ReactNode, type MouseEvent } from "react"
import { cn } from "@/lib/utils"

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  variant?: "primary" | "ghost"
  onClick?: () => void
}

/**
 * Magnetic Button
 * Premium hover effect that follows cursor movement
 * Button subtly moves toward the cursor position
 */
export function MagneticButton({ 
  children, 
  className, 
  variant = "primary",
  onClick 
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    
    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate distance from center (capped for subtle effect)
    const maxMove = 8
    const x = Math.max(-maxMove, Math.min(maxMove, (e.clientX - centerX) * 0.15))
    const y = Math.max(-maxMove, Math.min(maxMove, (e.clientY - centerY) * 0.15))
    
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
    setIsHovered(false)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const baseStyles = "relative overflow-hidden font-medium transition-all duration-300 ease-out"
  
  const variantStyles = {
    primary: cn(
      "bg-primary text-primary-foreground px-8 py-4 rounded-lg",
      "hover:shadow-lg hover:shadow-primary/20"
    ),
    ghost: cn(
      "text-foreground px-4 py-3",
      "hover:text-primary"
    ),
  }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Hover shimmer effect for primary variant */}
      {variant === "primary" && (
        <span 
          className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-500",
            "bg-gradient-to-r from-transparent via-white/10 to-transparent",
            isHovered && "opacity-100 animate-shimmer"
          )}
          style={{ backgroundSize: "200% 100%" }}
        />
      )}
      
      {/* Text with subtle lift on hover */}
      <span 
        className={cn(
          "relative z-10 inline-flex items-center gap-2",
          "transition-transform duration-300",
          isHovered && variant === "ghost" && "translate-x-1"
        )}
      >
        {children}
        {variant === "ghost" && (
          <span 
            className={cn(
              "inline-block transition-all duration-300",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
            )}
          >
            →
          </span>
        )}
      </span>
    </button>
  )
}

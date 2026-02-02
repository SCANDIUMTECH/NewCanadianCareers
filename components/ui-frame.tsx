"use client"

import { useRef, useState, type MouseEvent } from "react"
import { cn } from "@/lib/utils"

interface UIFrameProps {
  label: string
  variant?: "candidate" | "employer"
  className?: string
}

/**
 * Premium UI Frame
 * Wireframe placeholder with 3D tilt effect on hover
 * No fake dashboards - just elegant wireframe aesthetic
 */
export function UIFrame({ label, variant = "candidate", className }: UIFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!frameRef.current) return
    
    const rect = frameRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate rotation (subtle tilt effect)
    const rotateY = ((e.clientX - centerX) / rect.width) * 8
    const rotateX = -((e.clientY - centerY) / rect.height) * 8
    
    setTransform({ rotateX, rotateY })
  }

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 })
    setIsHovered(false)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  return (
    <div
      ref={frameRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "relative aspect-[4/3] w-full rounded-2xl overflow-hidden",
        "bg-card border border-border/50",
        "transition-all duration-500 ease-out",
        isHovered && "shadow-2xl shadow-primary/5 border-border",
        className
      )}
      style={{
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Gradient overlay on hover */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          "bg-gradient-to-br from-primary/5 via-transparent to-transparent",
          isHovered && "opacity-100"
        )}
      />

      {/* Inner glow effect */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          isHovered && "opacity-100"
        )}
        style={{
          background: "radial-gradient(circle at center, rgba(59, 91, 219, 0.03) 0%, transparent 70%)"
        }}
      />

      {/* Wireframe content */}
      <div className="absolute inset-6 md:inset-8 space-y-5">
        {variant === "candidate" ? (
          <CandidateWireframe isHovered={isHovered} />
        ) : (
          <EmployerWireframe isHovered={isHovered} />
        )}
      </div>

      {/* Frame label */}
      <div className="absolute bottom-4 right-4">
        <span 
          className={cn(
            "text-xs transition-colors duration-300",
            isHovered ? "text-foreground-muted/70" : "text-foreground-muted/40"
          )}
        >
          {label}
        </span>
      </div>

      {/* Subtle scan line effect */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700",
          isHovered && "opacity-100"
        )}
        style={{
          background: "linear-gradient(transparent 50%, rgba(59, 91, 219, 0.02) 50%)",
          backgroundSize: "100% 4px",
        }}
      />
    </div>
  )
}

function CandidateWireframe({ isHovered }: { isHovered: boolean }) {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div 
          className={cn(
            "h-2.5 rounded-full transition-all duration-500",
            isHovered ? "bg-primary/30 w-20" : "bg-border/50 w-16"
          )} 
        />
        <div 
          className={cn(
            "h-2.5 rounded-full transition-all duration-500 delay-75",
            isHovered ? "bg-border/40 w-14" : "bg-border/30 w-12"
          )} 
        />
      </div>

      {/* Profile area */}
      <div className="pt-4 flex items-start gap-4">
        <div 
          className={cn(
            "w-14 h-14 rounded-full transition-all duration-500",
            isHovered ? "bg-primary/15 scale-105" : "bg-border/40"
          )} 
        />
        <div className="flex-1 space-y-2 pt-1">
          <div 
            className={cn(
              "h-3 rounded-full transition-all duration-500",
              isHovered ? "bg-border/50 w-32" : "bg-border/35 w-28"
            )} 
          />
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-500 delay-100",
              isHovered ? "bg-border/30 w-24" : "bg-border/20 w-20"
            )} 
          />
        </div>
      </div>

      {/* Content lines */}
      <div className="pt-6 space-y-3">
        {[0.85, 0.7, 0.55].map((width, i) => (
          <div 
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              isHovered ? "bg-border/35" : "bg-border/25"
            )}
            style={{ 
              width: `${width * 100}%`,
              transitionDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      {/* Action cards */}
      <div className="pt-6 space-y-2.5">
        {[1, 2, 3].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-12 rounded-lg transition-all duration-500",
              isHovered ? "bg-border/20 translate-x-1" : "bg-border/15"
            )}
            style={{ transitionDelay: `${150 + i * 50}ms` }}
          />
        ))}
      </div>
    </>
  )
}

function EmployerWireframe({ isHovered }: { isHovered: boolean }) {
  return (
    <>
      {/* Nav bar skeleton */}
      <div className="flex items-center gap-3">
        {[16, 12, 14, 12].map((w, i) => (
          <div 
            key={i}
            className={cn(
              "h-2.5 rounded-full transition-all duration-500",
              i === 0 
                ? (isHovered ? "bg-primary/30" : "bg-border/50")
                : (isHovered ? "bg-border/35" : "bg-border/30")
            )}
            style={{ 
              width: `${w * 4}px`,
              transitionDelay: `${i * 30}ms`
            }}
          />
        ))}
      </div>

      {/* Title area */}
      <div className="pt-6 space-y-3">
        <div 
          className={cn(
            "h-3.5 rounded-full transition-all duration-500",
            isHovered ? "bg-border/50 w-2/5" : "bg-border/40 w-1/3"
          )} 
        />
        <div 
          className={cn(
            "h-2.5 rounded-full transition-all duration-500 delay-75",
            isHovered ? "bg-border/30 w-4/5" : "bg-border/25 w-3/4"
          )} 
        />
      </div>

      {/* Grid cards */}
      <div className="pt-6 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i}
            className={cn(
              "h-16 rounded-lg transition-all duration-500",
              isHovered ? "bg-border/20 scale-[1.02]" : "bg-border/15"
            )}
            style={{ transitionDelay: `${100 + i * 40}ms` }}
          />
        ))}
      </div>

      {/* Bottom bar */}
      <div className="pt-4 flex items-center gap-2">
        <div 
          className={cn(
            "h-8 rounded-md flex-1 transition-all duration-500",
            isHovered ? "bg-primary/10" : "bg-border/15"
          )} 
        />
        <div 
          className={cn(
            "h-8 w-20 rounded-md transition-all duration-500 delay-100",
            isHovered ? "bg-border/25" : "bg-border/15"
          )} 
        />
      </div>
    </>
  )
}

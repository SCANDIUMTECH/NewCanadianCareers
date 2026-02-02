"use client"

import React from "react"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TextRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  as?: "h1" | "h2" | "h3" | "p" | "span"
  splitBy?: "word" | "line"
}

/**
 * Text Reveal Component
 * Premium staggered text reveal animation
 * Words animate in sequence with subtle y-offset and opacity
 */
export function TextReveal({ 
  children, 
  className, 
  delay = 0,
  as: Component = "span",
  splitBy = "word"
}: TextRevealProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  // If reduced motion, just show the content
  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  // Split text into words
  const text = typeof children === "string" ? children : ""
  const words = text.split(" ")

  return (
    <Component
      ref={containerRef as React.RefObject<HTMLHeadingElement>}
      className={cn("overflow-hidden", className)}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden"
        >
          <span
            className="inline-block transition-all duration-700"
            style={{
              transitionDelay: `${i * 50}ms`,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transform: isVisible ? "translateY(0)" : "translateY(100%)",
              opacity: isVisible ? 1 : 0,
            }}
          >
            {word}
          </span>
          {i < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </Component>
  )
}

/**
 * Line Reveal Component
 * For revealing multiple lines of text with staggered animation
 */
interface LineRevealProps {
  lines: string[]
  className?: string
  lineClassName?: string
  delay?: number
}

export function LineReveal({ lines, className, lineClassName, delay = 0 }: LineRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  if (prefersReducedMotion) {
    return (
      <div className={className}>
        {lines.map((line, i) => (
          <p key={i} className={lineClassName}>{line}</p>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className}>
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <p
            className={cn("transition-all duration-700", lineClassName)}
            style={{
              transitionDelay: `${i * 100}ms`,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transform: isVisible ? "translateY(0)" : "translateY(100%)",
              opacity: isVisible ? 1 : 0,
            }}
          >
            {line}
          </p>
        </div>
      ))}
    </div>
  )
}

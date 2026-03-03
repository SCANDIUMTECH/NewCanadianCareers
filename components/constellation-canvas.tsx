"use client"

import { useEffect, useRef, useState } from "react"
import { BRAND } from "@/lib/constants/colors"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  pulsePhase: number
}

export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const nodesRef = useRef<Node[]>([])
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set up canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Initialize nodes
    const initNodes = () => {
      const nodeCount = prefersReducedMotion ? 12 : 24
      const nodes: Node[] = []
      const rect = canvas.getBoundingClientRect()
      
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2 + 1.5,
          opacity: Math.random() * 0.5 + 0.3,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
      nodesRef.current = nodes
    }
    initNodes()

    // Mouse tracking for interactivity
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      }
    }
    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    // Animation loop
    let time = 0
    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      
      time += 0.01

      const nodes = nodesRef.current
      const mouse = mouseRef.current

      // Update and draw nodes
      nodes.forEach((node, i) => {
        if (!prefersReducedMotion) {
          // Update position
          node.x += node.vx
          node.y += node.vy

          // Bounce off edges
          if (node.x < 0 || node.x > rect.width) node.vx *= -1
          if (node.y < 0 || node.y > rect.height) node.vy *= -1

          // Mouse interaction - nodes gravitate slightly toward mouse
          if (mouse.active) {
            const dx = mouse.x - node.x
            const dy = mouse.y - node.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 150) {
              node.vx += dx * 0.00005
              node.vy += dy * 0.00005
            }
          }

          // Limit velocity
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
          if (speed > 0.5) {
            node.vx = (node.vx / speed) * 0.5
            node.vy = (node.vy / speed) * 0.5
          }
        }

        // Pulsing opacity
        const pulseOpacity = prefersReducedMotion 
          ? node.opacity 
          : node.opacity * (0.7 + 0.3 * Math.sin(time * 2 + node.pulsePhase))

        // Draw node with glow
        ctx.beginPath()
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        )
        gradient.addColorStop(0, `rgba(${BRAND.primaryRgb}, ${pulseOpacity})`)
        gradient.addColorStop(0.5, `rgba(${BRAND.primaryRgb}, ${pulseOpacity * 0.3})`)
        gradient.addColorStop(1, `rgba(${BRAND.primaryRgb}, 0)`)
        ctx.fillStyle = gradient
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2)
        ctx.fill()

        // Draw core
        ctx.beginPath()
        ctx.fillStyle = `rgba(${BRAND.primaryRgb}, ${pulseOpacity})`
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw connections to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dx = other.x - node.x
          const dy = other.y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 120) {
            const connectionOpacity = (1 - dist / 120) * 0.15
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${BRAND.primaryRgb}, ${connectionOpacity})`
            ctx.lineWidth = 1
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [prefersReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
      aria-hidden="true"
    />
  )
}

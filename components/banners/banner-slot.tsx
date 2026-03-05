"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  getBannersByPlacement,
  recordBannerImpression,
  recordBannerClick,
  type PublicBanner,
  type BannerPlacement,
} from "@/lib/api/banners"

const ROTATE_INTERVAL = 6000 // 6 seconds per banner
const PROGRESS_TICK = 50 // progress bar update interval

interface BannerSlotProps {
  placement: BannerPlacement
  className?: string
}

export function BannerSlot({ placement, className }: BannerSlotProps) {
  const [banners, setBanners] = useState<PublicBanner[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const impressionRecorded = useRef<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const isMultiple = banners.length > 1

  // Fetch banners
  useEffect(() => {
    let cancelled = false
    getBannersByPlacement(placement)
      .then((data) => {
        if (!cancelled) {
          setBanners(data)
          setLoaded(true)
        }
      })
      .catch(() => {
        // Silently handle — banners are optional; endpoint may not exist yet
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [placement])

  // Record impression when a banner becomes the active slide
  useEffect(() => {
    if (banners.length === 0) return
    const banner = banners[activeIndex]
    if (!banner || impressionRecorded.current.has(banner.id)) return

    // Only record when the container is in viewport
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !impressionRecorded.current.has(banner.id)) {
          impressionRecorded.current.add(banner.id)
          recordBannerImpression(banner.id).catch(() => {})
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [banners, activeIndex])

  // Auto-rotate + progress bar
  useEffect(() => {
    if (!isMultiple || paused) {
      setProgress(0)
      return
    }

    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += PROGRESS_TICK
      setProgress(Math.min((elapsed / ROTATE_INTERVAL) * 100, 100))

      if (elapsed >= ROTATE_INTERVAL) {
        setActiveIndex((prev) => (prev + 1) % banners.length)
        elapsed = 0
        setProgress(0)
      }
    }, PROGRESS_TICK)

    return () => clearInterval(interval)
  }, [isMultiple, paused, banners.length, activeIndex])

  const handleClick = useCallback((banner: PublicBanner) => {
    recordBannerClick(banner.id).catch(() => {})
    window.open(banner.target_url, "_blank", "noopener,noreferrer")
  }, [])

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index)
    setProgress(0)
  }, [])

  // Render nothing if no banners or still loading
  if (!loaded || banners.length === 0) return null

  const activeBanner = banners[activeIndex]

  return (
    <div
      ref={containerRef}
      className={cn("relative print:hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Banner container with fixed aspect ratio */}
      <div className="relative rounded-xl overflow-hidden border border-border/50 cursor-pointer group">
        <div className="relative w-full" style={{ aspectRatio: "4/1" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
              onClick={() => handleClick(activeBanner)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleClick(activeBanner) }}
            >
              {activeBanner.image_url ? (
                <img
                  src={activeBanner.image_url}
                  alt={activeBanner.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">{activeBanner.title}</span>
                </div>
              )}

              {/* Sponsored overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2">
                <span className="text-[11px] text-white/80">
                  Sponsored{activeBanner.sponsor ? ` · ${activeBanner.sponsor}` : ""}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar — only for multiple banners */}
        {isMultiple && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
            <motion.div
              className="h-full bg-white/60"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05, ease: "linear" }}
            />
          </div>
        )}
      </div>

      {/* Dot indicators — only for multiple banners */}
      {isMultiple && (
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goToSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              )}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

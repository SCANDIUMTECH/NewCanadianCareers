"use client"

import { useState } from "react"
import { Monitor, Tablet, Smartphone, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BannerPlacement } from "@/lib/api/admin-banners"
import { DeviceFrame } from "./device-frame"
import { HomepageMockup } from "./placement-mockups/homepage-mockup"
import { SearchPageMockup } from "./placement-mockups/search-page-mockup"
import { JobDetailMockup } from "./placement-mockups/job-detail-mockup"

type Device = "desktop" | "tablet" | "mobile"

interface BannerPreviewPanelProps {
  placement: BannerPlacement
  imageUrl?: string
  title?: string
  sponsor?: string
}

const deviceConfig: { value: Device; label: string; icon: React.ReactNode }[] = [
  { value: "desktop", label: "Desktop", icon: <Monitor className="h-4 w-4" /> },
  { value: "tablet", label: "Tablet", icon: <Tablet className="h-4 w-4" /> },
  { value: "mobile", label: "Mobile", icon: <Smartphone className="h-4 w-4" /> },
]

const placementUrls: Record<BannerPlacement, string> = {
  homepage: "orion.com",
  search_top: "orion.com/jobs",
  search_sidebar: "orion.com/jobs",
  job_detail: "orion.com/jobs/product-designer",
}

const placementDimensions: Record<BannerPlacement, string> = {
  homepage: "Recommended: 1400×350px (4:1 ratio, full-width)",
  search_top: "Recommended: 1200×300px (4:1 ratio, content-width)",
  search_sidebar: "Recommended: 288×72px (4:1 ratio, sidebar)",
  job_detail: "Recommended: 320×80px (4:1 ratio, sidebar)",
}

const sidebarPlacements: BannerPlacement[] = ["search_sidebar", "job_detail"]

export function BannerPreviewPanel({ placement, imageUrl, title, sponsor }: BannerPreviewPanelProps) {
  const [device, setDevice] = useState<Device>("desktop")

  const isMobileHidden = device === "mobile" && sidebarPlacements.includes(placement)

  return (
    <div className="space-y-4">
      {/* Device Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Preview</p>
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
          {deviceConfig.map((d) => (
            <Button
              key={d.value}
              variant="ghost"
              size="sm"
              onClick={() => setDevice(d.value)}
              className={cn(
                "h-7 px-2.5 gap-1.5 text-xs",
                device === d.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d.icon}
              <span className="hidden sm:inline">{d.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile Hidden Indicator */}
      {isMobileHidden && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
          <EyeOff className="h-4 w-4 shrink-0" />
          <span>Sidebar banners are hidden on mobile devices</span>
        </div>
      )}

      {/* Device Frame with Mockup */}
      <DeviceFrame url={placementUrls[placement]} device={device}>
        {isMobileHidden ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <EyeOff className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Hidden on mobile</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Switch to Desktop or Tablet to preview</p>
          </div>
        ) : (
          <MockupForPlacement
            placement={placement}
            imageUrl={imageUrl}
            title={title}
            sponsor={sponsor}
          />
        )}
      </DeviceFrame>

      {/* Dimension Info */}
      <p className="text-xs text-center text-muted-foreground">
        {placementDimensions[placement]}
      </p>
    </div>
  )
}

function MockupForPlacement({
  placement,
  imageUrl,
  title,
  sponsor,
}: {
  placement: BannerPlacement
  imageUrl?: string
  title?: string
  sponsor?: string
}) {
  switch (placement) {
    case "homepage":
      return <HomepageMockup imageUrl={imageUrl} title={title} sponsor={sponsor} />
    case "search_top":
      return <SearchPageMockup imageUrl={imageUrl} title={title} sponsor={sponsor} highlight="top" />
    case "search_sidebar":
      return <SearchPageMockup imageUrl={imageUrl} title={title} sponsor={sponsor} highlight="sidebar" />
    case "job_detail":
      return <JobDetailMockup imageUrl={imageUrl} title={title} sponsor={sponsor} />
  }
}

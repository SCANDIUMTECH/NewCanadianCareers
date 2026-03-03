"use client"

import { cn } from "@/lib/utils"
import type { BannerPlacement } from "@/lib/api/admin-banners"

interface PlacementSelectorProps {
  value: BannerPlacement
  onChange: (placement: BannerPlacement) => void
}

const placements: {
  value: BannerPlacement
  label: string
  badge: string
  dimensions: string
}[] = [
  { value: "homepage", label: "Homepage", badge: "Full-width", dimensions: "1400×350px" },
  { value: "search_top", label: "Search Top", badge: "Content-width", dimensions: "1200×300px" },
  { value: "search_sidebar", label: "Search Sidebar", badge: "Sidebar", dimensions: "288×72px" },
  { value: "job_detail", label: "Job Detail", badge: "Sidebar", dimensions: "320×80px" },
]

function MiniWireframe({ placement, selected }: { placement: BannerPlacement; selected: boolean }) {
  const bannerColor = selected ? "bg-primary/25 border border-primary/50" : "bg-muted-foreground/10"
  const blockColor = "bg-muted-foreground/8"

  if (placement === "homepage") {
    return (
      <div className="w-full aspect-[16/10] rounded border border-border/30 bg-muted/30 p-1 space-y-0.5 overflow-hidden">
        <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
        <div className={cn("h-5 w-full rounded-sm", blockColor)} />
        <div className={cn("h-2.5 w-full rounded-sm", bannerColor)} />
        <div className="grid grid-cols-3 gap-0.5 flex-1">
          <div className={cn("h-3 rounded-sm", blockColor)} />
          <div className={cn("h-3 rounded-sm", blockColor)} />
          <div className={cn("h-3 rounded-sm", blockColor)} />
        </div>
      </div>
    )
  }

  if (placement === "search_top") {
    return (
      <div className="w-full aspect-[16/10] rounded border border-border/30 bg-muted/30 p-1 space-y-0.5 overflow-hidden">
        <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
        <div className={cn("h-2 w-full rounded-sm", blockColor)} />
        <div className={cn("h-2.5 w-full rounded-sm", bannerColor)} />
        <div className="flex gap-0.5 flex-1">
          <div className={cn("w-1/4 h-4 rounded-sm", blockColor)} />
          <div className="flex-1 space-y-0.5">
            <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
            <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
          </div>
        </div>
      </div>
    )
  }

  if (placement === "search_sidebar") {
    return (
      <div className="w-full aspect-[16/10] rounded border border-border/30 bg-muted/30 p-1 space-y-0.5 overflow-hidden">
        <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
        <div className={cn("h-2 w-full rounded-sm", blockColor)} />
        <div className="flex gap-0.5 flex-1">
          <div className="w-1/4 space-y-0.5">
            <div className={cn("h-3 rounded-sm", blockColor)} />
            <div className={cn("h-2 rounded-sm", bannerColor)} />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
            <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
            <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
          </div>
        </div>
      </div>
    )
  }

  // job_detail
  return (
    <div className="w-full aspect-[16/10] rounded border border-border/30 bg-muted/30 p-1 space-y-0.5 overflow-hidden">
      <div className={cn("h-1.5 w-full rounded-sm", blockColor)} />
      <div className="flex gap-0.5 flex-1">
        <div className="flex-1 space-y-0.5">
          <div className={cn("h-2 w-full rounded-sm", blockColor)} />
          <div className={cn("h-4 w-full rounded-sm", blockColor)} />
        </div>
        <div className="w-1/3 space-y-0.5">
          <div className={cn("h-2 rounded-sm", blockColor)} />
          <div className={cn("h-2 rounded-sm", blockColor)} />
          <div className={cn("h-2 rounded-sm", bannerColor)} />
        </div>
      </div>
    </div>
  )
}

export function PlacementSelector({ value, onChange }: PlacementSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {placements.map((p) => {
        const selected = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
              selected
                ? "ring-2 ring-primary bg-primary/5 border-primary/20"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
            )}
          >
            <MiniWireframe placement={p.value} selected={selected} />

            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.badge} &middot; 4:1
                </p>
              </div>
              <div className={cn(
                "h-4 w-4 rounded-full border-2 transition-colors shrink-0",
                selected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}>
                {selected && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface SearchPageMockupProps {
  imageUrl?: string
  title?: string
  sponsor?: string
  highlight: "top" | "sidebar"
}

function BannerZone({
  active,
  imageUrl,
  title,
  sponsor,
}: {
  active: boolean
  imageUrl?: string
  title?: string
  sponsor?: string
}) {
  return (
    <div className={cn("relative", active && "pt-4")}>
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
          Your Banner
        </span>
      )}
      <div className={cn(
        "rounded overflow-hidden",
        active ? "ring-2 ring-primary/60" : "border border-border/30"
      )}>
        <div className="relative" style={{ aspectRatio: "4/1" }}>
          {active && imageUrl ? (
            <>
              <img src={imageUrl} alt={title || "Banner preview"} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-0.5">
                <span className="text-[8px] text-white/80">
                  Sponsored{sponsor ? ` · ${sponsor}` : ""}
                </span>
              </div>
            </>
          ) : (
            <div className={cn(
              "absolute inset-0 flex items-center justify-center",
              active ? "bg-primary/10" : "bg-muted/50"
            )}>
              <span className={cn(
                "text-[8px] font-medium",
                active ? "text-primary/60" : "text-muted-foreground/40"
              )}>
                {active ? "Your Banner" : "Ad Space"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function SearchPageMockup({ imageUrl, title, sponsor, highlight }: SearchPageMockupProps) {
  return (
    <div className="w-full space-y-0 text-[10px]">
      {/* Header */}
      <div className="h-10 bg-muted rounded-t-md flex items-center px-3 gap-2">
        <div className="h-4 w-16 bg-muted-foreground/30 rounded" />
        <div className="flex-1" />
        <div className="flex gap-1.5">
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 bg-muted/50">
        <div className="h-7 bg-background rounded-md border border-border/50 flex items-center px-2">
          <div className="h-3 w-3 rounded-full bg-muted-foreground/25 mr-1.5" />
          <div className="h-2 w-20 bg-muted-foreground/18 rounded" />
          <div className="flex-1" />
          <div className="h-4 w-12 bg-primary/20 rounded" />
        </div>
      </div>

      {/* Top Banner Zone */}
      <div className="px-3 py-1.5">
        <BannerZone
          active={highlight === "top"}
          imageUrl={imageUrl}
          title={title}
          sponsor={sponsor}
        />
      </div>

      {/* Results count */}
      <div className="px-3 pb-1">
        <div className="h-1.5 w-24 bg-muted-foreground/18 rounded" />
      </div>

      {/* Content Area: Filter Sidebar + Job List */}
      <div className="px-3 pb-3 flex gap-2">
        {/* Filter Sidebar */}
        <div className="w-[30%] shrink-0 space-y-2">
          <div className="p-2 bg-muted/60 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-12 bg-muted-foreground/25 rounded" />
            <div className="h-4 bg-muted-foreground/12 rounded border border-border/20" />
            <div className="h-2 w-10 bg-muted-foreground/25 rounded mt-1.5" />
            <div className="h-4 bg-muted-foreground/12 rounded border border-border/20" />
            <div className="h-2 w-14 bg-muted-foreground/25 rounded mt-1.5" />
            <div className="h-4 bg-muted-foreground/12 rounded border border-border/20" />
            <div className="h-2 w-11 bg-muted-foreground/25 rounded mt-1.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-muted-foreground/20 rounded-sm" />
                <div className="h-1.5 w-14 bg-muted-foreground/15 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-muted-foreground/20 rounded-sm" />
                <div className="h-1.5 w-12 bg-muted-foreground/15 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-muted-foreground/20 rounded-sm" />
                <div className="h-1.5 w-16 bg-muted-foreground/15 rounded" />
              </div>
            </div>
          </div>

          {/* Sidebar Banner Zone */}
          <BannerZone
            active={highlight === "sidebar"}
            imageUrl={imageUrl}
            title={title}
            sponsor={sponsor}
          />
        </div>

        {/* Job Cards */}
        <div className="flex-1 space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-2 bg-muted/40 rounded border border-border/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 bg-muted-foreground/18 rounded shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <div className="h-2 w-3/4 bg-muted-foreground/22 rounded" />
                  <div className="h-1.5 w-1/2 bg-muted-foreground/15 rounded" />
                </div>
              </div>
              <div className="flex gap-1 mt-0.5">
                <div className="h-2.5 w-10 bg-muted-foreground/12 rounded-full border border-muted-foreground/8" />
                <div className="h-2.5 w-12 bg-muted-foreground/12 rounded-full border border-muted-foreground/8" />
                <div className="h-2.5 w-8 bg-muted-foreground/12 rounded-full border border-muted-foreground/8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface HomepageMockupProps {
  imageUrl?: string
  title?: string
  sponsor?: string
}

export function HomepageMockup({ imageUrl, title, sponsor }: HomepageMockupProps) {
  return (
    <div className="w-full space-y-0 text-[10px]">
      {/* Header */}
      <div className="h-10 bg-muted rounded-t-md flex items-center px-3 gap-2">
        <div className="h-4 w-16 bg-muted-foreground/30 rounded" />
        <div className="flex-1" />
        <div className="flex gap-1.5">
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
        </div>
      </div>

      {/* Hero */}
      <div className="h-28 bg-muted/70 flex items-center justify-center">
        <div className="text-center space-y-1.5">
          <div className="h-3 w-32 bg-muted-foreground/25 rounded mx-auto" />
          <div className="h-2 w-48 bg-muted-foreground/18 rounded mx-auto" />
          <div className="h-5 w-20 bg-primary/20 rounded-full mx-auto mt-2" />
        </div>
      </div>

      {/* Banner Zone */}
      <div className="px-3 pt-5 pb-2">
        <div className="relative">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
            Your Banner
          </span>
          <div className="rounded-lg overflow-hidden ring-2 ring-primary/60">
            <div className="relative" style={{ aspectRatio: "4/1" }}>
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt={title || "Banner preview"} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-2 py-1">
                    <span className="text-[9px] text-white/80">
                      Sponsored{sponsor ? ` · ${sponsor}` : ""}
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <span className="text-primary/60 text-xs font-medium">Your Banner</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="px-3 pt-1 pb-1">
        <div className="h-2.5 w-28 bg-muted-foreground/25 rounded" />
      </div>

      {/* Content Grid - Job Cards */}
      <div className="px-3 pb-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5 p-2 bg-muted/60 rounded border border-border/30">
              <div className="aspect-[3/2] bg-muted-foreground/15 rounded" />
              <div className="h-2 w-full bg-muted-foreground/20 rounded" />
              <div className="h-1.5 w-3/4 bg-muted-foreground/15 rounded" />
              <div className="flex gap-1">
                <div className="h-2 w-8 bg-muted-foreground/12 rounded-full" />
                <div className="h-2 w-10 bg-muted-foreground/12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

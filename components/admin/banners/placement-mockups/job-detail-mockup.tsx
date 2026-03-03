"use client"

import { cn } from "@/lib/utils"

interface JobDetailMockupProps {
  imageUrl?: string
  title?: string
  sponsor?: string
}

export function JobDetailMockup({ imageUrl, title, sponsor }: JobDetailMockupProps) {
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

      {/* Breadcrumb */}
      <div className="px-3 py-1.5 bg-muted/50">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-8 bg-muted-foreground/20 rounded" />
          <span className="text-[7px] text-muted-foreground/40">/</span>
          <div className="h-1.5 w-12 bg-muted-foreground/20 rounded" />
          <span className="text-[7px] text-muted-foreground/40">/</span>
          <div className="h-1.5 w-16 bg-muted-foreground/30 rounded" />
        </div>
      </div>

      {/* Content: Main + Sidebar */}
      <div className="px-3 pb-3 flex gap-2 pt-2">
        {/* Main Content */}
        <div className="flex-1 space-y-2">
          {/* Job Header */}
          <div className="p-2 bg-muted/50 rounded border border-border/30 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-muted-foreground/20 rounded" />
              <div className="space-y-1 flex-1">
                <div className="h-2.5 w-3/4 bg-muted-foreground/25 rounded" />
                <div className="h-1.5 w-1/2 bg-muted-foreground/18 rounded" />
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              <div className="h-3 w-12 bg-muted-foreground/15 rounded-full border border-muted-foreground/10" />
              <div className="h-3 w-14 bg-muted-foreground/15 rounded-full border border-muted-foreground/10" />
              <div className="h-3 w-10 bg-muted-foreground/15 rounded-full border border-muted-foreground/10" />
            </div>
          </div>

          {/* Description */}
          <div className="p-2 bg-muted/50 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-20 bg-muted-foreground/25 rounded" />
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted-foreground/15 rounded" />
              <div className="h-1.5 w-full bg-muted-foreground/15 rounded" />
              <div className="h-1.5 w-5/6 bg-muted-foreground/15 rounded" />
              <div className="h-1.5 w-4/5 bg-muted-foreground/12 rounded" />
              <div className="h-1.5 w-full bg-muted-foreground/15 rounded" />
              <div className="h-1.5 w-3/4 bg-muted-foreground/12 rounded" />
            </div>
          </div>

          {/* Requirements */}
          <div className="p-2 bg-muted/50 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-24 bg-muted-foreground/25 rounded" />
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                <div className="h-1.5 w-5/6 bg-muted-foreground/15 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                <div className="h-1.5 w-4/6 bg-muted-foreground/15 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                <div className="h-1.5 w-3/4 bg-muted-foreground/15 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                <div className="h-1.5 w-2/3 bg-muted-foreground/12 rounded" />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-2 bg-muted/50 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-16 bg-muted-foreground/25 rounded" />
            <div className="flex flex-wrap gap-1">
              <div className="h-3 w-14 bg-muted-foreground/12 rounded-full" />
              <div className="h-3 w-16 bg-muted-foreground/12 rounded-full" />
              <div className="h-3 w-12 bg-muted-foreground/12 rounded-full" />
              <div className="h-3 w-18 bg-muted-foreground/12 rounded-full" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[35%] shrink-0 space-y-2">
          {/* Apply Card */}
          <div className="p-2 bg-muted/60 rounded border border-border/30 space-y-1.5">
            <div className="h-5 w-full bg-primary/20 rounded flex items-center justify-center">
              <div className="h-1.5 w-10 bg-primary/40 rounded" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-1.5 w-8 bg-muted-foreground/20 rounded" />
                <div className="h-1.5 w-12 bg-muted-foreground/18 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-1.5 w-10 bg-muted-foreground/20 rounded" />
                <div className="h-1.5 w-10 bg-muted-foreground/18 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-1.5 w-12 bg-muted-foreground/20 rounded" />
                <div className="h-1.5 w-8 bg-muted-foreground/18 rounded" />
              </div>
            </div>
          </div>

          {/* Company Card */}
          <div className="p-2 bg-muted/60 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-14 bg-muted-foreground/25 rounded" />
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 bg-muted-foreground/20 rounded" />
              <div className="space-y-0.5 flex-1">
                <div className="h-1.5 w-3/4 bg-muted-foreground/20 rounded" />
                <div className="h-1 w-1/2 bg-muted-foreground/15 rounded" />
              </div>
            </div>
          </div>

          {/* Similar Jobs */}
          <div className="p-2 bg-muted/60 rounded border border-border/30 space-y-1.5">
            <div className="h-2 w-16 bg-muted-foreground/25 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-1.5 bg-background/80 rounded border border-border/20 space-y-0.5">
                <div className="h-1.5 w-4/5 bg-muted-foreground/18 rounded" />
                <div className="h-1 w-2/3 bg-muted-foreground/12 rounded" />
              </div>
            ))}
          </div>

          {/* Banner Zone */}
          <div className="relative pt-4">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
              Your Banner
            </span>
            <div className="rounded overflow-hidden ring-2 ring-primary/60">
              <div className="relative" style={{ aspectRatio: "4/1" }}>
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt={title || "Banner preview"} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-0.5">
                      <span className="text-[8px] text-white/80">
                        Sponsored{sponsor ? ` · ${sponsor}` : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <span className="text-primary/60 text-[8px] font-medium">Your Banner</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

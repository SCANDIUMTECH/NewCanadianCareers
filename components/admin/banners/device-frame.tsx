"use client"

import { cn } from "@/lib/utils"

interface DeviceFrameProps {
  url: string
  device: "desktop" | "tablet" | "mobile"
  children: React.ReactNode
}

export function DeviceFrame({ url, device, children }: DeviceFrameProps) {
  return (
    <div className={cn(
      "mx-auto transition-all duration-300",
      device === "desktop" && "w-full",
      device === "tablet" && "max-w-md",
      device === "mobile" && "max-w-xs"
    )}>
      <div className={cn(
        "bg-card border border-border/60 shadow-xl overflow-hidden",
        device === "desktop" && "rounded-xl",
        device === "tablet" && "rounded-2xl",
        device === "mobile" && "rounded-3xl"
      )}>
        {/* Browser Toolbar */}
        <div className={cn(
          "flex items-center gap-2 bg-muted/60 border-b border-border/40",
          device === "mobile" ? "px-3 py-2" : "px-3 py-1.5"
        )}>
          {/* Traffic Lights */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="h-2 w-2 rounded-full bg-red-400/60" />
            <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
            <div className="h-2 w-2 rounded-full bg-green-400/60" />
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex justify-center">
            <div className="bg-background/80 rounded-md px-3 py-0.5 text-[10px] text-muted-foreground/70 max-w-[200px] truncate border border-border/30">
              {url}
            </div>
          </div>

          {/* Spacer for symmetry */}
          <div className="w-[36px] shrink-0" />
        </div>

        {/* Page Content */}
        <div className={cn(
          "bg-background overflow-hidden",
          device === "mobile" && "max-h-[500px] overflow-y-auto"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}

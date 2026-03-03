"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"
import {
  getAffiliateLinksByPlacement,
  recordAffiliateLinkClick,
  type PublicAffiliateLink,
  type AffiliatePlacement,
} from "@/lib/api/affiliates"

interface AffiliateSlotProps {
  placement: AffiliatePlacement
  className?: string
  variant?: "card" | "inline" | "footer"
}

export function AffiliateSlot({ placement, className, variant = "card" }: AffiliateSlotProps) {
  const [links, setLinks] = useState<PublicAffiliateLink[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAffiliateLinksByPlacement(placement)
      .then((data) => {
        if (!cancelled) {
          setLinks(data)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [placement])

  const handleClick = useCallback(async (link: PublicAffiliateLink) => {
    recordAffiliateLinkClick(link.id).catch(() => {})
    window.open(link.url, "_blank", "noopener,noreferrer")
  }, [])

  // Render nothing if no links
  if (loaded && links.length === 0) return null
  if (!loaded) return null

  if (variant === "footer") {
    return <FooterVariant links={links} onClick={handleClick} className={className} />
  }

  if (variant === "inline") {
    return <InlineVariant links={links} onClick={handleClick} className={className} />
  }

  return <CardVariant links={links} onClick={handleClick} className={className} />
}

// ── Card variant (job detail sidebar) ───────────────────────────────────
function CardVariant({
  links,
  onClick,
  className,
}: {
  links: PublicAffiliateLink[]
  onClick: (link: PublicAffiliateLink) => void
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl bg-card border border-border/50 p-6 print:hidden", className)}>
      <h3 className="font-semibold text-foreground mb-4">Recommended Resources</h3>
      <div className="space-y-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => onClick(link)}
            className="w-full text-left p-3 rounded-xl hover:bg-foreground/[0.02] transition-colors group"
          >
            <p className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
              {link.company}
            </p>
            <p className="text-xs text-foreground-muted mt-0.5">{link.name}</p>
            <div className="flex items-center gap-1 mt-1.5 text-primary text-xs font-medium">
              <span>Visit</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/30">
        <span className="text-[11px] text-foreground-muted/60">
          {links[0]?.disclosure_label || "Sponsored"}
        </span>
      </div>
    </div>
  )
}

// ── Inline variant (between search results) ─────────────────────────────
function InlineVariant({
  links,
  onClick,
  className,
}: {
  links: PublicAffiliateLink[]
  onClick: (link: PublicAffiliateLink) => void
  className?: string
}) {
  const link = links[0]
  if (!link) return null

  return (
    <div className={cn("print:hidden", className)}>
      <button
        onClick={() => onClick(link)}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-colors text-left group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-foreground-muted/60 font-medium shrink-0">
            {link.disclosure_label || "Sponsored"}
          </span>
          <span className="text-sm text-foreground-muted truncate">
            {link.company} — {link.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary text-sm font-medium shrink-0 ml-4">
          <span>Learn more</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      </button>
    </div>
  )
}

// ── Footer variant (horizontal links row) ───────────────────────────────
function FooterVariant({
  links,
  onClick,
  className,
}: {
  links: PublicAffiliateLink[]
  onClick: (link: PublicAffiliateLink) => void
  className?: string
}) {
  const disclosure = links[0]?.disclosure_label || "Sponsored"

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 text-sm text-foreground-muted/60 print:hidden", className)}>
      <span className="text-[11px] font-medium mr-1">{disclosure}:</span>
      {links.map((link, i) => (
        <span key={link.id} className="inline-flex items-center">
          {i > 0 && <span className="mx-1.5">&middot;</span>}
          <button
            onClick={() => onClick(link)}
            className="text-[11px] hover:text-foreground transition-colors"
          >
            {link.company}
          </button>
        </span>
      ))}
    </div>
  )
}

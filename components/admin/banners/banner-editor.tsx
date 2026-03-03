"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SponsoredBanner, BannerPlacement, CreateBannerData } from "@/lib/api/admin-banners"
import { searchJobs } from "@/lib/api/public"
import { BannerForm } from "./banner-form"
import { BannerPreviewPanel } from "./banner-preview-panel"

/** Parse a YYYY-MM-DD string (or null) into a Date or undefined */
function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value + "T00:00:00")
  return isNaN(d.getTime()) ? undefined : d
}

/** Open the public page where the banner placement actually appears */
async function openPlacementPreview(placement: BannerPlacement) {
  if (placement === "homepage") {
    window.open("/", "_blank", "noopener,noreferrer")
    return
  }
  if (placement === "search_top" || placement === "search_sidebar") {
    window.open("/jobs", "_blank", "noopener,noreferrer")
    return
  }
  // job_detail — fetch a real job to link to an actual detail page
  try {
    const { results } = await searchJobs({ page_size: 1 })
    if (results.length > 0) {
      window.open(`/jobs/${results[0].id}`, "_blank", "noopener,noreferrer")
    } else {
      window.open("/jobs", "_blank", "noopener,noreferrer")
    }
  } catch {
    window.open("/jobs", "_blank", "noopener,noreferrer")
  }
}

interface BannerEditorProps {
  mode: "create" | "edit"
  initialData?: SponsoredBanner
  onSave: (data: CreateBannerData) => Promise<void>
  saving: boolean
  stats?: { impressions: number; clicks: number; ctr: number }
}

export function BannerEditor({ mode, initialData, onSave, saving, stats }: BannerEditorProps) {
  const router = useRouter()

  // Form state
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "")
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [targetUrl, setTargetUrl] = useState(initialData?.target_url ?? "")
  const [sponsor, setSponsor] = useState(initialData?.sponsor ?? "")
  const [placement, setPlacement] = useState<BannerPlacement>(initialData?.placement ?? "homepage")
  const [startDate, setStartDate] = useState<Date | undefined>(parseDate(initialData?.start_date))
  const [endDate, setEndDate] = useState<Date | undefined>(parseDate(initialData?.end_date))
  const [active, setActive] = useState(initialData?.is_active ?? true)

  // Sync form when initialData arrives (edit mode async load)
  useEffect(() => {
    if (initialData) {
      setImageUrl(initialData.image_url ?? "")
      setTitle(initialData.title ?? "")
      setTargetUrl(initialData.target_url ?? "")
      setSponsor(initialData.sponsor ?? "")
      setPlacement(initialData.placement ?? "homepage")
      setStartDate(parseDate(initialData.start_date))
      setEndDate(parseDate(initialData.end_date))
      setActive(initialData.is_active ?? true)
    }
  }, [initialData])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSave = title && targetUrl && imageUrl

  const handleSave = () => {
    if (!canSave) return
    onSave({
      title,
      image_url: imageUrl,
      target_url: targetUrl,
      placement,
      sponsor: sponsor || undefined,
      is_active: active,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    })
  }

  return (
    <div className="min-h-screen">
      {/* ── Sticky Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/banners">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {mode === "create" ? "Create Banner" : "Edit Banner"}
              </h1>
              {mode === "edit" && initialData && (
                <p className="text-xs text-muted-foreground">ID: {initialData.id}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openPlacementPreview(placement)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview on Site
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/banners")}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create Banner"
                  : "Save Changes"
              }
            </Button>
          </div>
        </div>
      </div>

      {/* ── Split Panels ───────────────────────────────────────── */}
      {/* Inline styles for Safari compatibility — Tailwind v4 grid classes
          break inside nested flex+overflow-x-hidden admin layout on WebKit */}
      <div
        className="p-6"
        style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "1.5rem" }}
      >
        {/* Left: Form */}
        <div style={{ minWidth: 0 }}>
          <BannerForm
            imageUrl={imageUrl}
            onImageUrlChange={setImageUrl}
            title={title}
            onTitleChange={setTitle}
            targetUrl={targetUrl}
            onTargetUrlChange={setTargetUrl}
            sponsor={sponsor}
            onSponsorChange={setSponsor}
            placement={placement}
            onPlacementChange={setPlacement}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            active={active}
            onActiveChange={setActive}
            stats={stats}
          />
        </div>

        {/* Right: Preview */}
        <div style={{ minWidth: 0 }}>
          <div className="lg:sticky lg:top-24">
            <BannerPreviewPanel
              placement={placement}
              imageUrl={imageUrl}
              title={title}
              sponsor={sponsor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

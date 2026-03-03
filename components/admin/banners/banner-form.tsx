"use client"

import { useRef, useState } from "react"
import {
  Upload,
  ImageIcon,
  Info,
  AlertTriangle,
  ChevronDown,
  Eye,
  Loader2,
  MousePointer,
  Trash2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"
import type { BannerPlacement } from "@/lib/api/admin-banners"
import { uploadBannerImage } from "@/lib/api/admin-banners"
import { PlacementSelector } from "./placement-selector"

interface BannerFormProps {
  // Image
  imageUrl: string
  onImageUrlChange: (url: string) => void
  // Details
  title: string
  onTitleChange: (title: string) => void
  targetUrl: string
  onTargetUrlChange: (url: string) => void
  sponsor: string
  onSponsorChange: (sponsor: string) => void
  // Placement
  placement: BannerPlacement
  onPlacementChange: (placement: BannerPlacement) => void
  // Schedule
  startDate: Date | undefined
  onStartDateChange: (date: Date | undefined) => void
  endDate: Date | undefined
  onEndDateChange: (date: Date | undefined) => void
  active: boolean
  onActiveChange: (active: boolean) => void
  // Stats (edit mode only)
  stats?: { impressions: number; clicks: number; ctr: number }
}

const ACCEPTED_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

const placementGuidance: Record<BannerPlacement, string> = {
  homepage: "Recommended: 1400×350px (4:1 ratio, full-width)",
  search_top: "Recommended: 1200×300px (4:1 ratio, content-width)",
  search_sidebar: "Recommended: 288×72px (4:1 ratio, sidebar)",
  job_detail: "Recommended: 320×80px (4:1 ratio, sidebar)",
}

export function BannerForm({
  imageUrl,
  onImageUrlChange,
  title,
  onTitleChange,
  targetUrl,
  onTargetUrlChange,
  sponsor,
  onSponsorChange,
  placement,
  onPlacementChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  active,
  onActiveChange,
  stats,
}: BannerFormProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "url">("url")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(
    !!(startDate || endDate || !active)
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setUploadError("Invalid file type. Please upload PNG, JPEG, or WebP.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 10MB.")
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadBannerImage(file)
      onImageUrlChange(url)
    } catch {
      setUploadError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    onImageUrlChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: Image ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Banner Image</Label>
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "url")}>
            <TabsList className="h-8">
              <TabsTrigger value="url" className="text-xs px-3">URL</TabsTrigger>
              <TabsTrigger value="file" className="text-xs px-3">Upload</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {uploadMode === "url" ? (
          <div className="space-y-3">
            <Input
              value={imageUrl}
              onChange={(e) => onImageUrlChange(e.target.value)}
              placeholder="https://example.com/banner.png"
            />
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                uploading ? "border-muted-foreground/15 cursor-wait" : "cursor-pointer hover:border-muted-foreground/50",
                uploadError ? "border-destructive" : "border-muted-foreground/25"
              )}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-1.5 animate-spin" />
                  <p className="text-sm font-medium">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, WebP &bull; Max 10MB</p>
                </>
              )}
              {uploadError && <p className="text-xs text-destructive mt-2">{uploadError}</p>}
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imageUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border/50 group" style={{ aspectRatio: "4/1" }}>
            <img
              src={imageUrl}
              alt="Banner preview"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => {}}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={handleRemoveImage}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Placement-aware dimension guidance */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/40 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">{placementGuidance[placement]}</p>
        </div>
      </div>

      {/* ── Section 2: Details ───────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Details</h3>
        <div className="space-y-2">
          <Label htmlFor="banner-title">Title</Label>
          <Input
            id="banner-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Banner title"
          />
          <p className="text-xs text-muted-foreground">Used for internal reference and sponsored label</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner-target-url">Target URL</Label>
          <Input
            id="banner-target-url"
            value={targetUrl}
            onChange={(e) => onTargetUrlChange(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner-sponsor">Sponsor</Label>
          <Input
            id="banner-sponsor"
            value={sponsor}
            onChange={(e) => onSponsorChange(e.target.value)}
            placeholder="Company name"
          />
        </div>
      </div>

      {/* ── Section 3: Placement ─────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Placement</h3>
        <PlacementSelector value={placement} onChange={onPlacementChange} />
      </div>

      {/* ── Section 4: Schedule & Settings (Collapsible) ────── */}
      <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <h3 className="text-sm font-medium">Schedule & Settings</h3>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            scheduleOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={startDate}
                onChange={onStartDateChange}
                placeholder="No start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                value={endDate}
                onChange={onEndDateChange}
                placeholder="No end date"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={onActiveChange} />
            <Label>Active</Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Section 5: Performance (edit mode only) ──────────── */}
      {stats && (
        <div className="pt-4 border-t space-y-3">
          <h3 className="text-sm font-medium">Performance</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
              <p className="text-lg font-semibold tabular-nums">{stats.impressions.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
              <p className="text-lg font-semibold tabular-nums">{stats.clicks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">CTR</p>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {stats.impressions > 0
                  ? ((stats.clicks / stats.impressions) * 100).toFixed(2)
                  : "0.00"}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

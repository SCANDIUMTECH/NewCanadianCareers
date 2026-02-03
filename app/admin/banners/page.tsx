"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface SponsoredBanner {
  id: string
  sponsor_company_id: string | null
  sponsor_company?: { id: string; name: string; logo?: string }
  placement: "home_hero" | "jobs_search" | "company_spotlight"
  image_url: string
  target_url: string
  start_at: string
  end_at: string
  is_active: boolean
  impressions: number
  clicks: number
}

const banners: SponsoredBanner[] = [
  {
    id: "1",
    sponsor_company_id: "c1",
    sponsor_company: { id: "c1", name: "TechCorp", logo: undefined },
    placement: "home_hero",
    image_url: "https://placehold.co/1200x300/3B5BDB/white?text=TechCorp+Banner",
    target_url: "https://techcorp.example.com/careers",
    start_at: "2026-01-01",
    end_at: "2026-03-01",
    is_active: true,
    impressions: 45230,
    clicks: 1205,
  },
  {
    id: "2",
    sponsor_company_id: "c2",
    sponsor_company: { id: "c2", name: "StartupXYZ", logo: undefined },
    placement: "jobs_search",
    image_url: "https://placehold.co/1200x300/7C3AED/white?text=StartupXYZ+Hiring",
    target_url: "https://startupxyz.io/jobs",
    start_at: "2026-01-15",
    end_at: "2026-04-15",
    is_active: true,
    impressions: 28450,
    clicks: 892,
  },
  {
    id: "3",
    sponsor_company_id: "c3",
    sponsor_company: { id: "c3", name: "Global Innovations", logo: undefined },
    placement: "company_spotlight",
    image_url: "https://placehold.co/1200x300/F59E0B/white?text=Global+Innovations",
    target_url: "https://globalinnovations.com",
    start_at: "2026-02-01",
    end_at: "2026-02-28",
    is_active: true,
    impressions: 12340,
    clicks: 456,
  },
  {
    id: "4",
    sponsor_company_id: null,
    placement: "home_hero",
    image_url: "https://placehold.co/1200x300/10B981/white?text=Platform+Promotion",
    target_url: "https://orion.example.com/premium",
    start_at: "2026-03-01",
    end_at: "2026-05-01",
    is_active: true,
    impressions: 0,
    clicks: 0,
  },
  {
    id: "5",
    sponsor_company_id: "c4",
    sponsor_company: { id: "c4", name: "DesignCo Studio", logo: undefined },
    placement: "jobs_search",
    image_url: "https://placehold.co/1200x300/EC4899/white?text=DesignCo+Jobs",
    target_url: "https://designco.studio/careers",
    start_at: "2025-10-01",
    end_at: "2025-12-31",
    is_active: false,
    impressions: 67890,
    clicks: 2341,
  },
  {
    id: "6",
    sponsor_company_id: "c5",
    sponsor_company: { id: "c5", name: "QuickHire Solutions", logo: undefined },
    placement: "company_spotlight",
    image_url: "https://placehold.co/1200x300/6366F1/white?text=QuickHire",
    target_url: "https://quickhire.net",
    start_at: "2026-01-01",
    end_at: "2026-01-31",
    is_active: false,
    impressions: 15670,
    clicks: 523,
  },
]

const companies = [
  { id: "c1", name: "TechCorp" },
  { id: "c2", name: "StartupXYZ" },
  { id: "c3", name: "Global Innovations" },
  { id: "c4", name: "DesignCo Studio" },
  { id: "c5", name: "QuickHire Solutions" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

type BannerStatus = "active" | "scheduled" | "expired" | "inactive"

function getBannerStatus(banner: SponsoredBanner): BannerStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(banner.start_at)
  const endDate = new Date(banner.end_at)

  if (!banner.is_active) return "inactive"
  if (endDate < today) return "expired"
  if (startDate > today) return "scheduled"
  return "active"
}

function getPlacementLabel(placement: SponsoredBanner["placement"]) {
  switch (placement) {
    case "home_hero":
      return "Home Hero"
    case "jobs_search":
      return "Jobs Search"
    case "company_spotlight":
      return "Company Spotlight"
  }
}

export default function BannersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [placementFilter, setPlacementFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editingBanner, setEditingBanner] = useState<SponsoredBanner | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredBanners = useMemo(() => {
    return banners.filter((banner) => {
      const matchesSearch =
        searchQuery === "" ||
        (banner.sponsor_company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      const matchesPlacement = placementFilter === "all" || banner.placement === placementFilter
      const status = getBannerStatus(banner)
      const matchesStatus = statusFilter === "all" || status === statusFilter
      return matchesSearch && matchesPlacement && matchesStatus
    })
  }, [searchQuery, placementFilter, statusFilter])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let activeCount = 0
    let scheduledCount = 0
    let totalImpressions = 0
    let totalClicks = 0

    banners.forEach((banner) => {
      const status = getBannerStatus(banner)
      if (status === "active") activeCount++
      if (status === "scheduled") scheduledCount++
      totalImpressions += banner.impressions
      totalClicks += banner.clicks
    })

    return {
      total: banners.length,
      active: activeCount,
      scheduled: scheduledCount,
      impressions: totalImpressions,
      clicks: totalClicks,
    }
  }, [])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banner Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage sponsored banners and placements
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Banners</p>
            <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Scheduled</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Impressions</p>
            <p className="mt-1 text-2xl font-semibold">{stats.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Clicks</p>
            <p className="mt-1 text-2xl font-semibold">{stats.clicks.toLocaleString()}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sponsor company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={placementFilter} onValueChange={setPlacementFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="home_hero">Home Hero</SelectItem>
                  <SelectItem value="jobs_search">Jobs Search</SelectItem>
                  <SelectItem value="company_spotlight">Company Spotlight</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Banner Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBanners.map((banner) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            onEdit={() => setEditingBanner(banner)}
          />
        ))}
        {filteredBanners.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No banners found matching your filters.
          </div>
        )}
      </motion.div>

      {/* Edit Banner Dialog */}
      <BannerDialog
        banner={editingBanner}
        open={!!editingBanner}
        onOpenChange={(open) => !open && setEditingBanner(null)}
        companies={companies}
      />

      {/* Create Banner Dialog */}
      <BannerDialog
        banner={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        companies={companies}
      />
    </motion.div>
  )
}

function BannerCard({
  banner,
  onEdit,
}: {
  banner: SponsoredBanner
  onEdit: () => void
}) {
  const status = getBannerStatus(banner)
  const ctr = banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : "0.00"

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      {/* Banner Image Preview */}
      <div className="relative aspect-[4/1] bg-muted">
        <img
          src={banner.image_url}
          alt="Banner preview"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge
            variant="secondary"
            className={cn(
              banner.placement === "home_hero" && "bg-blue-100 text-blue-700",
              banner.placement === "jobs_search" && "bg-purple-100 text-purple-700",
              banner.placement === "company_spotlight" && "bg-amber-100 text-amber-700"
            )}
          >
            {getPlacementLabel(banner.placement)}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            className={cn(
              status === "active" && "bg-green-100 text-green-700",
              status === "scheduled" && "bg-blue-100 text-blue-700",
              status === "expired" && "bg-gray-100 text-gray-700",
              status === "inactive" && "bg-red-100 text-red-700"
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Sponsor Company */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {banner.sponsor_company ? (
              <>
                <Avatar className="h-6 w-6">
                  {banner.sponsor_company.logo ? (
                    <AvatarImage src={banner.sponsor_company.logo} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {banner.sponsor_company.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{banner.sponsor_company.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No Sponsor</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <EditIcon className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ToggleIcon className="mr-2 h-4 w-4" />
                {banner.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>
            {new Date(banner.start_at).toLocaleDateString()} - {new Date(banner.end_at).toLocaleDateString()}
          </span>
        </div>

        {/* Performance Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <EyeIcon className="h-4 w-4 text-muted-foreground" />
              <span>{banner.impressions.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MousePointerIcon className="h-4 w-4 text-muted-foreground" />
              <span>{banner.clicks.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {ctr}% CTR
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

const ACCEPTED_FILE_TYPES = ["image/svg+xml", "image/png", "image/jpeg"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function BannerDialog({
  banner,
  open,
  onOpenChange,
  companies,
}: {
  banner: SponsoredBanner | null
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
}) {
  const isEdit = !!banner
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadMode, setUploadMode] = useState<"file" | "url">("file")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(banner?.image_url || "")
  const [imageUrlInput, setImageUrlInput] = useState(banner?.image_url || "")
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Reset state when dialog opens/closes or banner changes
  useEffect(() => {
    if (open) {
      setUploadMode("file")
      setUploadedFile(null)
      setPreviewUrl(banner?.image_url || "")
      setImageUrlInput(banner?.image_url || "")
      setUploadError(null)
    }
  }, [open, banner])

  // Cleanup object URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload SVG, PNG, or JPEG."
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    }
    return null
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    setUploadError(null)
    setUploadedFile(file)

    // Revoke previous blob URL if exists
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }, [validateFile, previewUrl])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleUrlInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrlInput(url)
    setPreviewUrl(url)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const currentPreviewUrl = uploadMode === "file" ? previewUrl : imageUrlInput

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Banner" : "Create Banner"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update banner details and settings"
              : "Configure the new banner placement"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Banner Image</Label>
              <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "url")}>
                <TabsList className="h-8">
                  <TabsTrigger value="file" className="text-xs px-3">Upload File</TabsTrigger>
                  <TabsTrigger value="url" className="text-xs px-3">Enter URL</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {uploadMode === "file" ? (
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  uploadError && "border-destructive"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {currentPreviewUrl && !uploadError ? (
                  <div className="relative aspect-[4/1] bg-muted rounded-lg overflow-hidden">
                    <img
                      src={currentPreviewUrl}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="text-white text-sm font-medium flex items-center gap-2">
                        <UploadIcon className="h-4 w-4" />
                        Click to replace
                      </div>
                    </div>
                    {uploadedFile && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center mb-3",
                      isDragging ? "bg-primary/10" : "bg-muted"
                    )}>
                      <UploadIcon className={cn(
                        "h-6 w-6",
                        isDragging ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <p className="text-sm font-medium">
                      {isDragging ? "Drop your image here" : "Drag and drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      SVG, PNG, JPEG • Max 5MB
                    </p>
                    {uploadError && (
                      <p className="text-xs text-destructive mt-2">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={imageUrlInput}
                  onChange={handleUrlInputChange}
                  placeholder="https://example.com/banner.png"
                />
                <div className="relative aspect-[4/1] bg-muted rounded-lg overflow-hidden">
                  {currentPreviewUrl ? (
                    <img
                      src={currentPreviewUrl}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                      onError={() => {}}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_url">Target URL</Label>
            <Input
              id="target_url"
              defaultValue={banner?.target_url}
              placeholder="https://example.com"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="placement">Placement</Label>
              <Select defaultValue={banner?.placement || "home_hero"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_hero">Home Hero</SelectItem>
                  <SelectItem value="jobs_search">Jobs Search</SelectItem>
                  <SelectItem value="company_spotlight">Company Spotlight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor">Sponsor Company (Optional)</Label>
              <Select defaultValue={banner?.sponsor_company_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sponsor</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_at">Start Date</Label>
              <Input
                id="start_at"
                type="date"
                defaultValue={banner?.start_at}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">End Date</Label>
              <Input
                id="end_at"
                type="date"
                defaultValue={banner?.end_at}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch defaultChecked={banner?.is_active ?? true} />
            <Label>Active</Label>
          </div>

          {/* Performance Stats (Edit only) */}
          {isEdit && (
            <div className="pt-4 border-t">
              <Label className="mb-3 block">Performance</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Impressions</p>
                  <p className="text-lg font-semibold">{banner.impressions.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Clicks</p>
                  <p className="text-lg font-semibold">{banner.clicks.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-semibold">
                    {banner.impressions > 0
                      ? ((banner.clicks / banner.impressions) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>{isEdit ? "Save Changes" : "Create Banner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function ToggleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="6" ry="6" />
      <circle cx="8" cy="12" r="2" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function MousePointerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 12.586 19 19" />
      <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

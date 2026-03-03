"use client"

import { useState, useEffect, Suspense, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { BannerEditor } from "@/components/admin/banners/banner-editor"
import { getAdminBanner, updateBanner } from "@/lib/api/admin-banners"
import type { SponsoredBanner, CreateBannerData } from "@/lib/api/admin-banners"

function EditBannerContent({ id }: { id: string }) {
  const router = useRouter()
  const [banner, setBanner] = useState<SponsoredBanner | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminBanner(Number(id))
      .then((data) => {
        if (!cancelled) {
          setBanner(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Banner not found")
          router.push("/admin/banners")
        }
      })
    return () => { cancelled = true }
  }, [id, router])

  const handleSave = async (data: CreateBannerData) => {
    setSaving(true)
    try {
      await updateBanner(Number(id), data)
      toast.success("Banner updated successfully")
      router.push("/admin/banners")
    } catch {
      toast.error("Failed to update banner")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !banner) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <BannerEditor
      mode="edit"
      initialData={banner}
      onSave={handleSave}
      saving={saving}
      stats={{
        impressions: banner.impressions,
        clicks: banner.clicks,
        ctr: banner.ctr,
      }}
    />
  )
}

export default function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <Suspense fallback={null}>
      <EditBannerContent id={id} />
    </Suspense>
  )
}

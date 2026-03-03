"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BannerEditor } from "@/components/admin/banners/banner-editor"
import { createBanner } from "@/lib/api/admin-banners"
import type { CreateBannerData } from "@/lib/api/admin-banners"

function NewBannerContent() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: CreateBannerData) => {
    setSaving(true)
    try {
      await createBanner(data)
      toast.success("Banner created successfully")
      router.push("/admin/banners")
    } catch {
      toast.error("Failed to create banner")
    } finally {
      setSaving(false)
    }
  }

  return <BannerEditor mode="create" onSave={handleSave} saving={saving} />
}

export default function NewBannerPage() {
  return (
    <Suspense fallback={null}>
      <NewBannerContent />
    </Suspense>
  )
}

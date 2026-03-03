"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Save, Send, Archive, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  getLegalDocument,
  updateLegalDocument,
  publishLegalDocument,
  archiveLegalDocument,
} from "@/lib/api/admin-compliance"
import type { LegalDocument, LegalDocumentType, UpdateLegalDocumentData } from "@/lib/admin/types"
import { ArticleTiptapEditor } from "@/components/articles/article-tiptap-editor"

const DOCUMENT_TYPES: { value: LegalDocumentType; label: string }[] = [
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "terms_of_service", label: "Terms of Service" },
  { value: "cookie_policy", label: "Cookie Policy" },
  { value: "dpa", label: "Data Processing Agreement" },
  { value: "acceptable_use", label: "Acceptable Use Policy" },
  { value: "other", label: "Other" },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", color: "bg-amber-100 text-amber-700" },
}

export default function EditLegalDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [doc, setDoc] = useState<LegalDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [documentType, setDocumentType] = useState<LegalDocumentType>("privacy_policy")
  const [version, setVersion] = useState("1.0")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [publicUrl, setPublicUrl] = useState("")

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true)
      try {
        const data = await getLegalDocument(id)
        setDoc(data)
        setTitle(data.title)
        setContent(data.content)
        setDocumentType(data.document_type)
        setVersion(data.version)
        setEffectiveDate(data.effective_date || "")
        setPublicUrl(data.public_url || "")
      } catch (err) {
        console.error("Failed to fetch document:", err)
        toast.error("Failed to load document")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocument()
  }, [id])

  const handleSave = async () => {
    if (!doc || !title.trim()) return
    setIsSubmitting(true)
    try {
      const data: UpdateLegalDocumentData = {
        title: title.trim(),
        document_type: documentType,
        content,
        version,
        effective_date: effectiveDate || null,
        public_url: publicUrl,
      }
      const updated = await updateLegalDocument(doc.id, data)
      setDoc(updated)
      toast.success("Document saved")
    } catch (err) {
      console.error("Failed to save document:", err)
      toast.error("Failed to save document")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async () => {
    if (!doc) return
    setIsSubmitting(true)
    try {
      // Save first, then publish
      const data: UpdateLegalDocumentData = {
        title: title.trim(),
        document_type: documentType,
        content,
        version,
        effective_date: effectiveDate || null,
        public_url: publicUrl,
      }
      await updateLegalDocument(doc.id, data)
      const updated = await publishLegalDocument(doc.id)
      setDoc(updated)
      toast.success("Document published")
    } catch (err) {
      console.error("Failed to publish document:", err)
      toast.error("Failed to publish document")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!doc) return
    setIsSubmitting(true)
    try {
      const updated = await archiveLegalDocument(doc.id)
      setDoc(updated)
      toast.success("Document archived")
    } catch (err) {
      console.error("Failed to archive document:", err)
      toast.error("Failed to archive document")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Document not found.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Edit Document</h1>
              <Badge className={statusConfig[doc.status]?.color || ""}>
                {statusConfig[doc.status]?.label || doc.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">Last updated {new Date(doc.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.status === "published" && (
            <Button variant="outline" onClick={handleArchive} disabled={isSubmitting}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          )}
          <Button variant="outline" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
          {doc.status !== "published" && (
            <Button onClick={handlePublish} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main content - Editor */}
        <div className="space-y-4">
          <Input
            placeholder="Document title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium h-12"
          />
          <ArticleTiptapEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your legal document..."
            minHeight={500}
          />
        </div>

        {/* Sidebar - Metadata */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as LegalDocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  placeholder="1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Public URL (optional)</Label>
                <Input
                  placeholder="https://..."
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  External URL override for this document
                </p>
              </div>

              {doc.reviewed_by_name && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Reviewed by</p>
                  <p className="text-sm">{doc.reviewed_by_name}</p>
                </div>
              )}
              {doc.published_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Published</p>
                  <p className="text-sm">{new Date(doc.published_at).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

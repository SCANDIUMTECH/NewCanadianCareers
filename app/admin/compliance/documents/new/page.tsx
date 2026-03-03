"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createLegalDocument, publishLegalDocument } from "@/lib/api/admin-compliance"
import type { LegalDocumentType, CreateLegalDocumentData } from "@/lib/admin/types"
import { ArticleTiptapEditor } from "@/components/articles/article-tiptap-editor"

const DOCUMENT_TYPES: { value: LegalDocumentType; label: string }[] = [
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "terms_of_service", label: "Terms of Service" },
  { value: "cookie_policy", label: "Cookie Policy" },
  { value: "dpa", label: "Data Processing Agreement" },
  { value: "acceptable_use", label: "Acceptable Use Policy" },
  { value: "other", label: "Other" },
]

export default function NewLegalDocumentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [documentType, setDocumentType] = useState<LegalDocumentType>("privacy_policy")
  const [version, setVersion] = useState("1.0")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [publicUrl, setPublicUrl] = useState("")

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    setIsSubmitting(true)
    try {
      const data: CreateLegalDocumentData = {
        title: title.trim(),
        document_type: documentType,
        content,
        version,
        effective_date: effectiveDate || null,
        public_url: publicUrl,
      }

      const doc = await createLegalDocument(data)

      if (publish) {
        await publishLegalDocument(doc.id)
        toast.success("Document created and published")
      } else {
        toast.success("Document saved as draft")
      }

      router.push("/admin/compliance?tab=policies")
    } catch (err) {
      console.error("Failed to create document:", err)
      toast.error("Failed to create document")
    } finally {
      setIsSubmitting(false)
    }
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
            <h1 className="text-2xl font-bold tracking-tight">New Legal Document</h1>
            <p className="text-muted-foreground">Create a new legal document</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Save & Publish
          </Button>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

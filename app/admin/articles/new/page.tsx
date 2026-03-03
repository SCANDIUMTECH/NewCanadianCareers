"use client"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  ImageIcon,
  Tag,
  Search as SearchIcon,
  ChevronDown,
  X,
  Star,
  Eye,
  Globe,
  Megaphone,
  Upload,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createArticle, getArticleCategories, uploadArticleCoverImage, uploadArticleOgImage, uploadArticleBodyImage } from "@/lib/api/admin-articles"
import type { AdminArticleCategory, ArticleTemplate, CreateArticleData } from "@/lib/admin/types"
import { ArticleTiptapEditor } from "@/components/articles/article-tiptap-editor"

const TEMPLATE_OPTIONS: { value: ArticleTemplate; label: string; description: string }[] = [
  { value: "editorial_hero", label: "Editorial Hero", description: "Full-width cover image with centered body" },
  { value: "split_magazine", label: "Split Magazine", description: "50/50 hero with sticky sidebar" },
  { value: "minimal_luxury", label: "Minimal Luxury", description: "Centered narrow column, generous whitespace" },
  { value: "bold_typography", label: "Bold Typography", description: "Oversized heading, multi-column body" },
  { value: "image_led", label: "Image-Led Immersive", description: "Full-bleed hero with title overlay" },
  { value: "modern_grid", label: "Modern News Grid", description: "12-column grid with sidebar" },
]

function NewArticleContent() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<AdminArticleCategory[]>([])

  // Form state
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState("")
  const [ogImageFile, setOgImageFile] = useState<File | null>(null)
  const [ogImagePreview, setOgImagePreview] = useState("")
  const coverInputRef = useRef<HTMLInputElement>(null)
  const ogInputRef = useRef<HTMLInputElement>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ArticleTemplate>("editorial_hero")
  const [categoryId, setCategoryId] = useState<string>("")
  const [tagsInput, setTagsInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [featured, setFeatured] = useState(false)
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [canonicalUrl, setCanonicalUrl] = useState("")
  const [allowInlineBanners, setAllowInlineBanners] = useState(true)
  const [affiliateDisclosure, setAffiliateDisclosure] = useState<"auto" | "manual" | "none">("auto")
  const [sponsoredBy, setSponsoredBy] = useState("")

  useEffect(() => {
    getArticleCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])


  const handleCoverImageSelect = useCallback((file: File) => {
    setCoverImageFile(file)
    setCoverImagePreview(URL.createObjectURL(file))
  }, [])

  const handleCoverImageRemove = useCallback(() => {
    setCoverImageFile(null)
    setCoverImagePreview("")
    if (coverInputRef.current) coverInputRef.current.value = ""
  }, [])

  const handleOgImageSelect = useCallback((file: File) => {
    setOgImageFile(file)
    setOgImagePreview(URL.createObjectURL(file))
  }, [])

  const handleOgImageRemove = useCallback(() => {
    setOgImageFile(null)
    setOgImagePreview("")
    if (ogInputRef.current) ogInputRef.current.value = ""
  }, [])

  const handleAddTag = useCallback(() => {
    const trimmed = tagsInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
      setTagsInput("")
    }
  }, [tagsInput, tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove))
  }, [])

  const handleSubmit = useCallback(async (publish: boolean) => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    setIsSubmitting(true)
    try {
      const data: CreateArticleData = {
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        content: content || undefined,
        category: categoryId ? Number(categoryId) : null,
        tags,
        featured,
        selected_template: selectedTemplate,
        meta_title: metaTitle || undefined,
        meta_description: metaDescription || undefined,
        canonical_url: canonicalUrl || undefined,
        allow_inline_banners: allowInlineBanners,
        affiliate_disclosure: affiliateDisclosure,
        sponsored_by: sponsoredBy || undefined,
      }

      const article = await createArticle(data)

      // Upload images if selected
      if (coverImageFile) {
        await uploadArticleCoverImage(article.id, coverImageFile)
      }
      if (ogImageFile) {
        await uploadArticleOgImage(article.id, ogImageFile)
      }

      if (publish) {
        const { publishArticle } = await import("@/lib/api/admin-articles")
        await publishArticle(article.id)
        toast.success("Article created and published")
      } else {
        toast.success("Article saved as draft")
      }

      router.push("/admin/articles")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create article")
    } finally {
      setIsSubmitting(false)
    }
  }, [title, excerpt, content, coverImageFile, ogImageFile, categoryId, tags, featured, selectedTemplate, metaTitle, metaDescription, canonicalUrl, allowInlineBanners, affiliateDisclosure, sponsoredBy, router])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/articles">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">New Article</h1>
              <p className="text-xs text-muted-foreground">Create a new article</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left column — Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article title"
              className="text-2xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 h-auto py-2"
            />
          </div>

          {/* Excerpt */}
          <div>
            <Label className="text-xs text-muted-foreground">Excerpt</Label>
            <Textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Brief summary of the article (max 500 characters)"
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/500</p>
          </div>

          {/* Content Editor */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Content</Label>
            <ArticleTiptapEditor
              value={content}
              onChange={setContent}
              onImageUpload={async (file) => {
                const result = await uploadArticleBodyImage(file)
                return result.url
              }}
              placeholder="Write your article content..."
              minHeight={600}
            />
          </div>
        </div>

        {/* Right sidebar — Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="lg:sticky lg:top-20">
            {/* Media */}
            <Card className="mb-4">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Cover Image
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleCoverImageSelect(file)
                  }}
                />
                {coverImagePreview ? (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImagePreview} alt="Cover preview" className="object-cover w-full h-full" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={handleCoverImageRemove}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Click to upload cover image</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP, SVG</span>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Template */}
            <Card className="mb-4">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Template
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedTemplate(opt.value)}
                      className={cn(
                        "p-2.5 rounded-lg border text-left text-xs transition-all",
                        selectedTemplate === opt.value
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categorization */}
            <Card className="mb-4">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categorization
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag() } }}
                      placeholder="Add tag..."
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={handleAddTag} type="button">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs gap-1">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Featured */}
            <Card className="mb-4">
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-medium">Featured</Label>
                  </div>
                  <Switch checked={featured} onCheckedChange={setFeatured} />
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Collapsible>
              <Card className="mb-4">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <SearchIcon className="h-4 w-4" />
                        SEO Settings
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Title (max 70)</Label>
                      <Input
                        value={metaTitle}
                        onChange={e => setMetaTitle(e.target.value)}
                        maxLength={70}
                        placeholder="SEO title"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Description (max 160)</Label>
                      <Textarea
                        value={metaDescription}
                        onChange={e => setMetaDescription(e.target.value)}
                        maxLength={160}
                        rows={2}
                        placeholder="SEO description"
                        className="text-sm resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">OG Image</Label>
                      <input
                        ref={ogInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleOgImageSelect(file)
                        }}
                      />
                      {ogImagePreview ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-10 w-16 rounded border overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ogImagePreview} alt="OG preview" className="object-cover w-full h-full" />
                          </div>
                          <span className="text-xs text-muted-foreground truncate flex-1">{ogImageFile?.name}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleOgImageRemove}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-1 text-xs"
                          onClick={() => ogInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload OG Image
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Canonical URL</Label>
                      <Input
                        value={canonicalUrl}
                        onChange={e => setCanonicalUrl(e.target.value)}
                        placeholder="https://..."
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Commercial */}
            <Collapsible>
              <Card className="mb-4">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        Commercial
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Allow Inline Banners</Label>
                      <Switch checked={allowInlineBanners} onCheckedChange={setAllowInlineBanners} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Affiliate Disclosure</Label>
                      <Select value={affiliateDisclosure} onValueChange={(v: "auto" | "manual" | "none") => setAffiliateDisclosure(v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Sponsored By</Label>
                      <Input
                        value={sponsoredBy}
                        onChange={e => setSponsoredBy(e.target.value)}
                        placeholder="Sponsor name"
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewArticleContent />
    </Suspense>
  )
}

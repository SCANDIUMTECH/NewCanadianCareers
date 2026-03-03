"use client"

import { useState, useEffect, useCallback } from "react"
import { Share2, Copy, Check, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getPublicArticles } from "@/lib/api/articles"
import { TEMPLATE_COMPONENTS } from "@/components/articles/templates"
import type { PublicArticleDetail, PublicArticle } from "@/lib/admin/types"

interface ArticleDetailClientProps {
  article: PublicArticleDetail
}

export function ArticleDetailClient({ article }: ArticleDetailClientProps) {
  const [relatedArticles, setRelatedArticles] = useState<PublicArticle[]>([])
  const [copied, setCopied] = useState(false)

  // Fetch related articles
  useEffect(() => {
    async function fetchRelated() {
      try {
        const categorySlug = article.category?.slug
        const response = await getPublicArticles({
          category: categorySlug || undefined,
          page_size: 4,
          ordering: "-published_at",
        })
        // Filter out current article
        setRelatedArticles(
          response.results.filter(a => a.slug !== article.slug).slice(0, 3)
        )
      } catch {
        // Silently handle
      }
    }
    fetchRelated()
  }, [article.slug, article.category?.slug])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    const shareData = {
      title: article.title,
      text: article.excerpt || article.title,
      url,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or unsupported
      }
    } else {
      // Fallback: copy URL
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard unavailable
      }
    }
  }, [article.title, article.excerpt])

  // Resolve template
  const TemplateComponent = TEMPLATE_COMPONENTS[article.selected_template] || TEMPLATE_COMPONENTS.editorial_hero

  return (
    <div className="relative">
      {/* Back nav */}
      <div className="fixed top-4 left-4 z-40">
        <Button
          variant="secondary"
          size="sm"
          asChild
          className="bg-white/80 backdrop-blur-sm shadow-sm"
        >
          <Link href="/news">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      {/* Share floating pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="bg-white/90 backdrop-blur-sm shadow-lg rounded-full gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Share
            </>
          )}
        </Button>
      </div>

      {/* Render the selected template */}
      <TemplateComponent
        article={article}
        relatedArticles={relatedArticles}
      />

      {/* Affiliate disclosure */}
      {article.affiliate_disclosure !== "none" && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <p className="text-xs text-muted-foreground/60 text-center">
            This article may contain affiliate links. Orion may earn a commission at no extra cost to you.
          </p>
        </div>
      )}
    </div>
  )
}

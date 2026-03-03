"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Clock, Eye } from "lucide-react"
import { ArticleCard } from "@/components/articles/article-card"
import { sanitizeHtml } from "@/lib/sanitize"
import type { ArticleTemplateProps } from "./types"

function formatDate(dateString: string | null) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function BoldTypographyTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article>
      {/* Oversized title section */}
      <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12">
        <div className="flex items-center gap-3 mb-6">
          {article.category?.name && (
            <Badge variant="secondary">{article.category.name}</Badge>
          )}
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {article.reading_time} min read
          </span>
        </div>

        <h1 className="font-secondary text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-8">
          {article.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {article.author_name && (
            <span className="font-medium text-foreground text-base">{article.author_name}</span>
          )}
          <span>{formatDate(article.published_at)}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.views}
          </span>
        </div>
      </div>

      {/* Cover image */}
      {article.cover_image && (
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <div className="relative aspect-[21/9] rounded-2xl overflow-hidden">
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Excerpt as pull quote */}
      {article.excerpt && (
        <div className="max-w-4xl mx-auto px-6 mb-12">
          <p className="text-2xl italic font-secondary border-l-4 border-primary pl-6 text-muted-foreground leading-relaxed">
            {article.excerpt}
          </p>
        </div>
      )}

      {/* Multi-column body */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div
          className="prose prose-lg max-w-none columns-1 md:columns-2 gap-12 prose-headings:font-secondary prose-h2:text-2xl prose-h2:break-after-avoid prose-h3:text-xl prose-h3:break-after-avoid prose-p:break-inside-avoid prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-6 prose-blockquote:italic prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
            {article.tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Sponsored */}
        {article.sponsored_by && (
          <p className="text-xs text-muted-foreground mt-6">
            Sponsored by {article.sponsored_by}
          </p>
        )}
      </div>

      {/* Related articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="font-secondary text-3xl font-black mb-6">Keep Reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.slice(0, 3).map(a => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

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

export function EditorialHeroTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article>
      {/* Full-width cover image */}
      {article.cover_image && (
        <div className="relative w-full aspect-[21/9] max-h-[560px] overflow-hidden">
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      {/* Centered body column */}
      <div className="max-w-[720px] mx-auto px-6 py-12 md:py-16">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          {article.category?.name && (
            <Badge variant="secondary">{article.category.name}</Badge>
          )}
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {article.reading_time} min read
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.views}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-secondary text-5xl md:text-6xl font-black tracking-tight leading-[1.08] mb-6">
          {article.title}
        </h1>

        {/* Author & date */}
        <div className="flex items-center gap-3 mb-10 pb-10 border-b">
          {article.author_name && (
            <span className="text-sm font-medium">{article.author_name}</span>
          )}
          <span className="text-sm text-muted-foreground">{formatDate(article.published_at)}</span>
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xl leading-relaxed text-muted-foreground mb-10 font-secondary">
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-secondary prose-h2:text-2xl prose-h3:text-xl prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-6 prose-blockquote:italic prose-img:rounded-xl"
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
          <h2 className="font-secondary text-2xl font-bold mb-6">Related Articles</h2>
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

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

export function MinimalLuxuryTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article className="pt-24 md:pt-32">
      {/* Centered title block */}
      <div className="max-w-[680px] mx-auto px-6 text-center mb-12">
        {article.category?.name && (
          <Badge variant="secondary" className="mb-6">{article.category.name}</Badge>
        )}
        <h1 className="font-secondary text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="text-xl leading-relaxed text-muted-foreground mb-8">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {article.author_name && (
            <span className="font-medium text-foreground">{article.author_name}</span>
          )}
          <span>{formatDate(article.published_at)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {article.reading_time} min read
          </span>
        </div>
      </div>

      {/* Cover image */}
      {article.cover_image && (
        <div className="max-w-4xl mx-auto px-6 mb-16">
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
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

      {/* Narrow single column content */}
      <div className="max-w-[680px] mx-auto px-6 pb-16">
        <div
          className="prose prose-lg max-w-none prose-headings:font-secondary prose-h2:text-2xl prose-h3:text-xl prose-p:leading-[1.8] prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-6 prose-blockquote:italic prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-16 pt-8 border-t">
            {article.tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Sponsored */}
        {article.sponsored_by && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Sponsored by {article.sponsored_by}
          </p>
        )}
      </div>

      {/* Related articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="font-secondary text-2xl font-bold text-center mb-8">More to Read</h2>
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

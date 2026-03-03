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

export function ImageLedImmersiveTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article>
      {/* Full-bleed hero with title overlay */}
      <div className="relative min-h-screen flex items-end">
        {article.cover_image ? (
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 to-purple-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="relative z-10 max-w-4xl px-8 pb-16 md:pb-24">
          <div className="flex items-center gap-3 mb-4">
            {article.category?.name && (
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                {article.category.name}
              </Badge>
            )}
            <span className="text-sm text-white/70 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time} min read
            </span>
          </div>
          <h1 className="font-secondary text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white mb-6">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/70">
            {article.author_name && (
              <span className="font-medium text-white">{article.author_name}</span>
            )}
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-6 py-16">
        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xl leading-relaxed text-muted-foreground mb-12 font-secondary">
            {article.excerpt}
          </p>
        )}

        <div
          className="prose prose-lg max-w-none prose-headings:font-secondary prose-h2:text-2xl prose-h3:text-xl prose-p:leading-[1.7] prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-6 prose-blockquote:italic prose-img:rounded-xl prose-img:my-10"
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
          <h2 className="font-secondary text-2xl font-bold mb-6">More Stories</h2>
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

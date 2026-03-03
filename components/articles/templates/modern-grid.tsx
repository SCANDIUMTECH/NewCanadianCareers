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

export function ModernGridTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-12 md:pt-16 pb-8">
        <div className="flex items-center gap-3 mb-4">
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
        <h1 className="font-secondary text-4xl md:text-5xl font-black tracking-tight leading-[1.08] mb-4 max-w-4xl">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {article.author_name && (
            <span className="font-medium text-foreground">{article.author_name}</span>
          )}
          <span>{formatDate(article.published_at)}</span>
        </div>
      </div>

      {/* Cover image full width */}
      {article.cover_image && (
        <div className="max-w-6xl mx-auto px-6 mb-10">
          <div className="relative aspect-[21/9] rounded-xl overflow-hidden">
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

      {/* 12-column grid: main (8) + sidebar (4) */}
      <div className="max-w-6xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Main content (8 cols) */}
        <div className="md:col-span-8">
          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-lg leading-relaxed text-muted-foreground mb-8 pb-8 border-b">
              {article.excerpt}
            </p>
          )}

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
        </div>

        {/* Sidebar (4 cols) */}
        <aside className="md:col-span-4">
          <div className="sticky top-24 space-y-6">
            {/* Article info card */}
            <div className="p-5 rounded-xl bg-muted/30 border space-y-3">
              <h3 className="font-secondary font-bold text-sm">About this article</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Published</span>
                  <span className="text-foreground">{formatDate(article.published_at)}</span>
                </div>
                {article.updated_at && article.updated_at !== article.published_at && (
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span className="text-foreground">{formatDate(article.updated_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Reading time</span>
                  <span className="text-foreground">{article.reading_time} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Views</span>
                  <span className="text-foreground">{article.views.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Sponsored */}
            {article.sponsored_by && (
              <div className="p-4 rounded-xl bg-muted/30 border">
                <p className="text-xs text-muted-foreground">
                  Sponsored by {article.sponsored_by}
                </p>
              </div>
            )}

            {/* Related articles */}
            {relatedArticles && relatedArticles.length > 0 && (
              <div>
                <h3 className="font-secondary font-bold text-sm mb-3">Related Articles</h3>
                <div className="space-y-1">
                  {relatedArticles.slice(0, 5).map(a => (
                    <ArticleCard key={a.id} article={a} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}

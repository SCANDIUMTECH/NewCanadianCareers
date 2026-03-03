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

export function SplitMagazineTemplate({ article, relatedArticles }: ArticleTemplateProps) {
  return (
    <article>
      {/* 50/50 Hero */}
      <div className="grid md:grid-cols-2 min-h-[500px]">
        {/* Image side */}
        <div className="relative overflow-hidden">
          {article.cover_image ? (
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20" />
          )}
        </div>

        {/* Text side */}
        <div className="flex flex-col justify-center p-10 md:p-16">
          <div className="flex items-center gap-3 mb-4">
            {article.category?.name && (
              <Badge variant="secondary">{article.category.name}</Badge>
            )}
          </div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black tracking-tight leading-[1.08] mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            {article.author_name && (
              <span className="font-medium text-foreground">{article.author_name}</span>
            )}
            <span>{formatDate(article.published_at)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time} min
            </span>
          </div>
          {article.excerpt && (
            <p className="text-lg leading-relaxed text-muted-foreground">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-12 gap-12">
        {/* Main content */}
        <div className="md:col-span-8">
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

        {/* Sticky sidebar */}
        <aside className="md:col-span-4">
          <div className="sticky top-24 space-y-6">
            {/* Stats */}
            <div className="p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Eye className="h-4 w-4" />
                {article.views} views
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {article.reading_time} min read
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

            {/* Related in sidebar */}
            {relatedArticles && relatedArticles.length > 0 && (
              <div>
                <h3 className="font-secondary font-bold mb-3">Related</h3>
                <div className="space-y-1">
                  {relatedArticles.slice(0, 4).map(a => (
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

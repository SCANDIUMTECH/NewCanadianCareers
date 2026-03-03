"use client"

import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Clock, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicArticle } from "@/lib/admin/types"

interface ArticleCardProps {
  article: PublicArticle
  variant?: "default" | "featured" | "compact" | "hero" | "overlay" | "trending"
  index?: number
  className?: string
}

function formatDate(dateString: string | null) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function ShareButton({ article }: { article: PublicArticle }) {
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/news/${article.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url })
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // Clipboard not available
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/30 backdrop-blur-sm rounded-full p-2.5 text-white hover:bg-black/50 cursor-pointer"
      aria-label="Share article"
    >
      <Share2 className="h-4 w-4" />
    </button>
  )
}

export function ArticleCard({ article, variant = "default", index, className }: ArticleCardProps) {
  // ─── Hero variant: full-bleed image with overlay text ───
  if (variant === "hero") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className={cn(
          "group block relative overflow-hidden rounded-2xl transition-shadow duration-500 hover:shadow-2xl",
          className
        )}
      >
        <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden">
          {article.cover_image ? (
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#3B5BDB]/40 to-[#5C7CFA]/60" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5" />

          <ShareButton article={article} />

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-10">
            {article.category_name && (
              <span className="inline-block text-[11px] font-semibold tracking-[0.15em] uppercase text-white/80 font-secondary mb-3">
                {article.category_name}
              </span>
            )}
            <h2 className="font-secondary text-2xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight mb-3">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="text-white/70 text-sm md:text-base leading-relaxed line-clamp-2 mb-4 max-w-2xl">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-white/60">
              {article.author_name && (
                <span className="font-medium text-white/80">{article.author_name}</span>
              )}
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span>{formatDate(article.published_at)}</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.reading_time} min read
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ─── Overlay variant: medium image card with overlay text ───
  if (variant === "overlay") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className={cn(
          "group block relative overflow-hidden rounded-xl transition-shadow duration-500 hover:shadow-xl",
          className
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden h-full">
          {article.cover_image ? (
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#3B5BDB]/30 to-[#5C7CFA]/50" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <ShareButton article={article} />

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            {article.category_name && (
              <span className="inline-block text-[10px] font-semibold tracking-[0.15em] uppercase text-white/70 font-secondary mb-2">
                {article.category_name}
              </span>
            )}
            <h3 className="font-secondary text-lg md:text-xl font-bold text-white leading-snug tracking-tight mb-2 line-clamp-2">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{formatDate(article.published_at)}</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span>{article.reading_time} min read</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ─── Trending variant: portrait overlay card ───
  if (variant === "trending") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className={cn(
          "group block relative overflow-hidden rounded-xl",
          className
        )}
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          {article.cover_image ? (
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

          {index !== undefined && (
            <span className="absolute top-3 left-3.5 text-[11px] font-bold text-white/50 font-secondary tracking-wide">
              {String(index).padStart(2, "0")}
            </span>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            {article.category_name && (
              <span className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-white/50 mb-1.5">
                {article.category_name}
              </span>
            )}
            <h4 className="font-secondary text-sm font-bold text-white leading-snug line-clamp-2">
              {article.title}
            </h4>
          </div>
        </div>
      </Link>
    )
  }

  // ─── Featured variant (kept unchanged) ───
  if (variant === "featured") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className="group block relative overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl hover:-translate-y-0.5"
      >
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[360px] overflow-hidden">
            {article.cover_image ? (
              <Image
                src={article.cover_image}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20" />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center p-8 md:p-10">
            <div className="flex items-center gap-2 mb-4">
              {article.category_name && (
                <Badge variant="secondary" className="text-xs">
                  {article.category_name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Featured
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3 group-hover:text-primary transition-colors">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        </div>
      </Link>
    )
  }

  // ─── Compact variant (kept unchanged) ───
  if (variant === "compact") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className="group flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
      >
        {article.cover_image && (
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{formatDate(article.published_at)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.reading_time} min
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // ─── Default variant: borderless editorial card ───
  return (
    <Link
      href={`/news/${article.slug}`}
      className={cn("group block", className)}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
        {article.cover_image ? (
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-xl">
            <span className="text-4xl text-muted-foreground/20 font-secondary font-bold">
              {article.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-4">
        {article.category_name && (
          <span className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-primary/70 mb-2">
            {article.category_name}
          </span>
        )}
        <h3 className="font-secondary text-lg font-bold leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors tracking-tight">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {article.author_name && (
            <span className="font-medium text-foreground/70">{article.author_name}</span>
          )}
          <span>{formatDate(article.published_at)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.reading_time} min
          </span>
        </div>
      </div>
    </Link>
  )
}

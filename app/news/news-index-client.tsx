"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Mail,
  ArrowRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getPublicArticles, getFeaturedArticles, getArticleCategories } from "@/lib/api/articles"
import type { PublicArticle, AdminArticleCategory } from "@/lib/admin/types"
import { ArticleCard } from "@/components/articles/article-card"

// ─── Animation variants ───

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

// ─── Skeleton loaders ───

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Skeleton className="aspect-[16/10] md:aspect-[2/1] rounded-2xl" />
      </div>
      <Skeleton className="aspect-[4/3] lg:aspect-auto lg:min-h-0 rounded-xl" />
    </div>
  )
}

function TrendingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
      ))}
    </div>
  )
}

function ArticleCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Skeleton className="aspect-[16/9]" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

// ─── Newsletter CTA ───

function NewsletterCTA() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <div className="border border-border/60 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Mail className="h-4 w-4 text-primary" />
          <span className="font-secondary text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">Newsletter</span>
        </div>
        <h3 className="font-secondary text-lg font-bold tracking-tight mb-1">
          Stay in the loop
        </h3>
        <p className="font-secondary text-sm text-muted-foreground leading-relaxed">
          The latest career insights and hiring trends, delivered weekly.
        </p>
      </div>
      {submitted ? (
        <div className="flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          You&apos;re subscribed!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto flex-shrink-0">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email"
            className="h-10 text-sm w-full md:w-56"
            required
          />
          <Button
            type="submit"
            className="h-10 px-5 font-semibold text-sm flex-shrink-0"
          >
            Subscribe
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </form>
      )}
    </div>
  )
}

// ─── Main component ───

export function NewsIndexClient() {
  const searchParams = useSearchParams()

  const [articles, setArticles] = useState<PublicArticle[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<PublicArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<PublicArticle[]>([])
  const [categories, setCategories] = useState<AdminArticleCategory[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "all")
  const [sortBy, setSortBy] = useState("-published_at")
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Debounced search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  // Load categories, featured, and trending
  useEffect(() => {
    getArticleCategories().then(setCategories).catch(() => {})
    getFeaturedArticles().then(featured => {
      setFeaturedArticles(featured)
      // Fetch trending (most viewed), excluding featured articles
      const featuredIds = new Set(featured.map(a => a.id))
      getPublicArticles({ ordering: "-views", page_size: 8 })
        .then(res => setTrendingArticles(res.results.filter(a => !featuredIds.has(a.id)).slice(0, 5)))
        .catch(() => {})
    }).catch(() => {})
  }, [])

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getPublicArticles({
        search: debouncedSearch || undefined,
        category: activeCategory !== "all" ? activeCategory : undefined,
        page: currentPage,
        page_size: pageSize,
        ordering: sortBy,
      })
      setArticles(response.results)
      setTotalCount(response.count)
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }, [debouncedSearch, activeCategory, currentPage, sortBy])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasActiveSearch = debouncedSearch.length > 0
  const showMagazine = !hasActiveSearch && activeCategory === "all" && currentPage === 1

  // Compute hero articles: prefer featured, fall back to first article(s)
  const heroArticles = featuredArticles.length > 0
    ? featuredArticles.slice(0, 3)
    : articles.slice(0, Math.min(articles.length, 1))

  // Articles for the grid = all articles minus those used as heroes (when not from featured)
  const heroArticleIds = featuredArticles.length > 0
    ? new Set<number>()  // featured are separate, don't exclude from grid
    : new Set(heroArticles.map(a => a.id))
  const gridArticles = articles.filter(a => !heroArticleIds.has(a.id))

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sub-bar: Search + Categories ─── */}
      <div className="sticky top-16 md:top-20 z-40 bg-white/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 py-4">
            <h1 className="font-secondary text-2xl font-bold tracking-tight">
              News & Insights
            </h1>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="pl-10 rounded-full bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-border h-9 text-sm"
              />
            </div>
          </div>

          {/* Category navigation */}
          <div className="flex items-center justify-between gap-4 border-t border-border/40">
            <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide -mb-px">
              <button
                onClick={() => { setActiveCategory("all"); setCurrentPage(1) }}
                className={cn(
                  "px-4 py-3 font-secondary text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap transition-colors border-b-2",
                  activeCategory === "all"
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.slug); setCurrentPage(1) }}
                  className={cn(
                    "px-4 py-3 font-secondary text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap transition-colors border-b-2",
                    activeCategory === cat.slug
                      ? "text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </nav>

            {/* Sort — subtle */}
            <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[140px] text-xs border-0 bg-transparent shadow-none h-8 text-muted-foreground">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-published_at">Newest First</SelectItem>
                <SelectItem value="published_at">Oldest First</SelectItem>
                <SelectItem value="-views">Most Read</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">

        {/* ─── Initial loading ─── */}
        {isInitialLoad && isLoading ? (
          <div className="space-y-10">
            <HeroSkeleton />
            <div>
              <Skeleton className="h-5 w-32 mb-4" />
              <TrendingSkeleton />
            </div>
            <div>
              <Skeleton className="h-5 w-28 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : articles.length === 0 && !isLoading ? (
          /* ─── Empty state ─── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-secondary text-lg font-semibold mb-1">No articles found</h3>
            <p className="font-secondary text-sm text-muted-foreground">
              {hasActiveSearch
                ? "Try adjusting your search or filters"
                : "Check back soon for new content"}
            </p>
          </div>
        ) : (
          <>
            {/* ─── Hero Section ─── */}
            {showMagazine && heroArticles.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mb-14"
              >
                {/* Row 1: Main hero + optional side card */}
                {heroArticles.length === 1 ? (
                  <ArticleCard article={heroArticles[0]} variant="hero" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <ArticleCard article={heroArticles[0]} variant="hero" />
                    </div>
                    <div className="lg:col-span-1">
                      <ArticleCard article={heroArticles[1]} variant="overlay" className="h-full" />
                    </div>
                  </div>
                )}

                {/* Row 2: Third hero article */}
                {heroArticles[2] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <ArticleCard article={heroArticles[2]} variant="overlay" />
                  </div>
                )}
              </motion.section>
            )}

            {/* ─── Trending Section ─── */}
            {showMagazine && trendingArticles.length >= 3 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="mb-14"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-secondary text-lg font-bold tracking-tight">
                    Trending Now
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible">
                  {trendingArticles.map((article, i) => (
                    <div key={article.id} className="min-w-[160px] lg:min-w-0">
                      <ArticleCard article={article} variant="trending" index={i + 1} />
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ─── Newsletter CTA ─── */}
            {showMagazine && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mb-14"
              >
                <NewsletterCTA />
              </motion.section>
            )}

            {/* ─── Latest Stories ─── */}
            <section>
              {showMagazine && gridArticles.length > 0 && (
                <div className="flex items-center gap-3 mb-8">
                  <h2 className="font-secondary text-lg font-bold tracking-tight">
                    Latest Stories
                  </h2>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* First 2 grid articles as overlay cards when in magazine mode */}
                  {showMagazine && gridArticles.length >= 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                      {gridArticles.slice(0, 2).map(article => (
                        <motion.div key={article.id} variants={itemVariants}>
                          <ArticleCard article={article} variant="overlay" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Remaining articles in standard grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                    {(showMagazine ? gridArticles.slice(gridArticles.length >= 2 ? 2 : 0) : articles).map(article => (
                      <motion.div key={article.id} variants={itemVariants}>
                        <ArticleCard article={article} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </section>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-secondary text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ─── Newsletter at bottom (shown when not in featured mode) ─── */}
            {!showMagazine && articles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-12 max-w-xl mx-auto"
              >
                <NewsletterCTA />
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

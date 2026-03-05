"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Newspaper,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Star,
  Archive,
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
  ExternalLink,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getAdminArticles,
  getAdminArticleStats,
  deleteArticle,
  publishArticle,
  unpublishArticle,
  archiveArticle,
  featureArticle,
  unfeatureArticle,
  getArticleCategories,
} from "@/lib/api/admin-articles"
import type {
  AdminArticle,
  AdminArticleStats,
  AdminArticleFilters,
  AdminArticleCategory,
  ArticleStatus,
  ArticleTemplate,
} from "@/lib/admin/types"

// =============================================================================
// Config
// =============================================================================

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Scheduled", color: "bg-primary/10 text-primary" },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", color: "bg-amber-100 text-amber-700" },
}

const templateLabels: Record<string, string> = {
  editorial_hero: "Editorial Hero",
  split_magazine: "Split Magazine",
  minimal_luxury: "Minimal Luxury",
  bold_typography: "Bold Typography",
  image_led: "Image-Led",
  modern_grid: "Modern Grid",
}

// =============================================================================
// Animation variants
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// =============================================================================
// Page export — outer Suspense wrapper
// =============================================================================

export default function ArticlesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ArticlesContent />
    </Suspense>
  )
}

// =============================================================================
// Main content component
// =============================================================================

function ArticlesContent() {
  const searchParams = useSearchParams()

  // Data state
  const [articles, setArticles] = useState<AdminArticle[]>([])
  const [stats, setStats] = useState<AdminArticleStats | null>(null)
  const [categories, setCategories] = useState<AdminArticleCategory[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Filter state — initialize from URL params if present
  const [activeTab, setActiveTab] = useState<ArticleStatus | "all">(() => {
    const status = searchParams.get("status")
    if (status === "draft") return "draft"
    if (status === "scheduled") return "scheduled"
    if (status === "published") return "published"
    if (status === "archived") return "archived"
    return "all"
  })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") || "")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [templateFilter, setTemplateFilter] = useState<string>("all")
  const [sortOrdering, setSortOrdering] = useState<string>("-created_at")

  // Selection state
  const [selectedArticles, setSelectedArticles] = useState<number[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: AdminArticleFilters = {
        page: currentPage,
        page_size: pageSize,
        ordering: sortOrdering,
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (activeTab !== "all") filters.status = activeTab
      if (categoryFilter !== "all") filters.category = Number(categoryFilter)

      const response = await getAdminArticles(filters)
      setArticles(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, activeTab, categoryFilter, sortOrdering])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminArticleStats()
      setStats(data)
    } catch {
      console.error("Failed to load article stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await getArticleCategories()
      setCategories(data)
    } catch {
      console.error("Failed to load categories")
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, activeTab, categoryFilter, templateFilter, pageSize])

  // Handle sync
  const handleSync = async () => {
    setIsSyncing(true)
    await Promise.all([fetchArticles(), fetchStats()])
    setIsSyncing(false)
  }

  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = articles.map(a => a.id)
    setSelectedArticles(prev => {
      const allSelected = visibleIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !visibleIds.includes(id))
      }
      return [...new Set([...prev, ...visibleIds])]
    })
  }

  // Article actions
  const handlePublish = async (article: AdminArticle) => {
    setActionLoading(`publish-${article.id}`)
    try {
      await publishArticle(article.id)
      toast.success(`"${article.title}" published`)
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to publish article")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnpublish = async (article: AdminArticle) => {
    setActionLoading(`unpublish-${article.id}`)
    try {
      await unpublishArticle(article.id)
      toast.success(`"${article.title}" moved to draft`)
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to unpublish article")
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (article: AdminArticle) => {
    setActionLoading(`archive-${article.id}`)
    try {
      await archiveArticle(article.id)
      toast.success(`"${article.title}" archived`)
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to archive article")
    } finally {
      setActionLoading(null)
    }
  }

  const handleFeatureToggle = async (article: AdminArticle) => {
    setActionLoading(`feature-${article.id}`)
    try {
      if (article.featured) {
        await unfeatureArticle(article.id)
        toast.success(`"${article.title}" unfeatured`)
      } else {
        await featureArticle(article.id)
        toast.success(`"${article.title}" featured`)
      }
      fetchArticles()
    } catch {
      toast.error("Failed to update feature status")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (article: AdminArticle) => {
    setActionLoading(`delete-${article.id}`)
    try {
      await deleteArticle(article.id)
      toast.success(`"${article.title}" deleted`)
      setSelectedArticles(prev => prev.filter(id => id !== article.id))
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to delete article")
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedArticles.length === 0) return
    setActionLoading("bulk-delete")
    try {
      await Promise.all(selectedArticles.map(id => deleteArticle(id)))
      toast.success(`${selectedArticles.length} article${selectedArticles.length > 1 ? "s" : ""} deleted`)
      setSelectedArticles([])
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to delete selected articles")
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk archive
  const handleBulkArchive = async () => {
    if (selectedArticles.length === 0) return
    setActionLoading("bulk-archive")
    try {
      const targets = articles.filter(a => selectedArticles.includes(a.id))
      await Promise.all(targets.map(a => archiveArticle(a.id)))
      toast.success(`${selectedArticles.length} article${selectedArticles.length > 1 ? "s" : ""} archived`)
      setSelectedArticles([])
      fetchArticles()
      fetchStats()
    } catch {
      toast.error("Failed to archive selected articles")
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  // Filter articles by template client-side (no backend param for template filter)
  const filteredArticles = templateFilter === "all"
    ? articles
    : articles.filter(a => a.selected_template === templateFilter)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                  {totalCount.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and publish editorial content across the platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isSyncing ? "Syncing..." : "Refresh"}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/articles/new">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-red-600 hover:text-red-700"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Articles"
              value={stats?.total || 0}
              icon={<BookOpen className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              subtitle={stats ? `${stats.total_views.toLocaleString()} total views` : undefined}
            />
            <StatCard
              title="Published"
              value={stats?.published || 0}
              color="green"
              icon={<CheckCircle className="h-4 w-4" />}
              gradient="from-green-500 to-emerald-600"
              active={activeTab === "published"}
              onClick={() => setActiveTab("published")}
            />
            <StatCard
              title="Drafts"
              value={stats?.draft || 0}
              icon={<FileText className="h-4 w-4" />}
              gradient="from-slate-500 to-slate-700"
              active={activeTab === "draft"}
              onClick={() => setActiveTab("draft")}
            />
            <StatCard
              title="Scheduled"
              value={stats?.scheduled || 0}
              color="purple"
              icon={<Clock className="h-4 w-4" />}
              gradient="from-destructive to-destructive-deep"
              active={activeTab === "scheduled"}
              onClick={() => setActiveTab("scheduled")}
            />
          </>
        )}
      </motion.div>

      {/* Status Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
          {(["all", "draft", "scheduled", "published", "archived"] as const).map((tab) => {
            const count =
              tab === "all" ? stats?.total :
              tab === "draft" ? stats?.draft :
              tab === "scheduled" ? stats?.scheduled :
              tab === "published" ? stats?.published :
              tab === "archived" ? stats?.archived : undefined
            const label =
              tab === "all" ? "All" :
              tab === "draft" ? "Draft" :
              tab === "scheduled" ? "Scheduled" :
              tab === "published" ? "Published" :
              "Archived"
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium tabular-nums h-4 px-1",
                      activeTab === tab && "bg-primary/10 text-primary"
                    )}
                  >
                    {count.toLocaleString()}
                  </Badge>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Filter Bar + Table */}
      <motion.div variants={itemVariants}>
        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Template */}
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {Object.entries(templateLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortOrdering} onValueChange={setSortOrdering}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Newest First</SelectItem>
                <SelectItem value="created_at">Oldest First</SelectItem>
                <SelectItem value="-published_at">Recently Published</SelectItem>
                <SelectItem value="-views">Most Views</SelectItem>
                <SelectItem value="title">Title A–Z</SelectItem>
                <SelectItem value="-title">Title Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={val => setPageSize(Number(val))}>
              <SelectTrigger className="h-8 w-[68px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {[20, 50, 100].map(size => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedArticles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 sm:py-2 mb-4"
            >
              <span className="text-sm font-medium">
                {selectedArticles.length.toLocaleString()} article{selectedArticles.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleBulkArchive}
                  disabled={actionLoading === "bulk-archive"}
                >
                  {actionLoading === "bulk-archive" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs text-red-600 bg-transparent"
                  onClick={handleBulkDelete}
                  disabled={actionLoading === "bulk-delete"}
                >
                  {actionLoading === "bulk-delete" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </Button>
                <div className="h-4 w-px bg-border mx-0.5" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setSelectedArticles([])}
                >
                  Clear
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden sm:grid grid-cols-[36px_minmax(0,3fr)_minmax(0,1fr)_minmax(120px,1fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(100px,0.8fr)_44px] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground items-center">
            <div>
              <Checkbox
                checked={articles.length > 0 && articles.every(a => selectedArticles.includes(a.id))}
                onCheckedChange={selectAllVisible}
              />
            </div>
            <div>Article</div>
            <div>Category</div>
            <div>Template</div>
            <div>Status</div>
            <div>Views</div>
            <div>Published</div>
            <div />
          </div>

          {/* Mobile header */}
          <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={articles.length > 0 && articles.every(a => selectedArticles.includes(a.id))}
                onCheckedChange={selectAllVisible}
              />
              <span className="text-sm font-medium text-muted-foreground">Select All</span>
            </div>
            <span className="text-sm text-muted-foreground">{totalCount.toLocaleString()} articles</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Newspaper className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No articles found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || categoryFilter !== "all" || templateFilter !== "all" || activeTab !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first article to get started"}
                </p>
                {activeTab === "all" && !searchQuery && (
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/admin/articles/new">
                      <Plus className="w-4 h-4 mr-2" />
                      New Article
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              filteredArticles.map((article, index) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  index={index}
                  selected={selectedArticles.includes(article.id)}
                  onSelect={id => {
                    setSelectedArticles(prev =>
                      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                    )
                  }}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onArchive={handleArchive}
                  onFeatureToggle={handleFeatureToggle}
                  onDelete={handleDelete}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalCount > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                Showing{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {((currentPage - 1) * pageSize + 1).toLocaleString()}
                </span>
                –
                <span className="font-medium text-foreground tabular-nums">
                  {Math.min(currentPage * pageSize, totalCount).toLocaleString()}
                </span>
                {" "}of{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {totalCount.toLocaleString()}
                </span>
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {(() => {
                    const pages: (number | string)[] = []
                    const total = totalPages
                    const current = currentPage
                    if (total <= 7) {
                      for (let i = 1; i <= total; i++) pages.push(i)
                    } else {
                      pages.push(1)
                      if (current > 3) pages.push("…")
                      const start = Math.max(2, current - 1)
                      const end = Math.min(total - 1, current + 1)
                      for (let i = start; i <= end; i++) pages.push(i)
                      if (current < total - 2) pages.push("…")
                      pages.push(total)
                    }
                    return pages.map((p, idx) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                          {p}
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === current ? "default" : "outline"}
                          size="icon"
                          className={cn("h-7 w-7 text-xs", p === current && "pointer-events-none")}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )
                  })()}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// =============================================================================
// StatCard
// =============================================================================

function StatCard({
  title,
  value,
  color,
  icon,
  gradient,
  active,
  onClick,
  subtitle,
}: {
  title: string
  value: number
  color?: string
  icon?: React.ReactNode
  gradient?: string
  active?: boolean
  onClick?: () => void
  subtitle?: string
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md",
        active && "ring-2 ring-primary/40 shadow-md"
      )}
      onClick={onClick}
    >
      {gradient && (
        <>
          <div className={cn(
            "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
            color === "green" ? "bg-green-500" : color === "purple" ? "bg-primary" : "bg-slate-500"
          )} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
        </>
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p className={cn(
          "text-2xl font-bold mt-2 tabular-nums",
          color === "green" && "text-emerald-600",
          color === "purple" && "text-primary",
        )}>
          {value.toLocaleString()}
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-16" />
      </CardContent>
    </Card>
  )
}

// =============================================================================
// ArticleRow
// =============================================================================

function ArticleRow({
  article,
  index,
  selected,
  onSelect,
  onPublish,
  onUnpublish,
  onArchive,
  onFeatureToggle,
  onDelete,
  actionLoading,
}: {
  article: AdminArticle
  index: number
  selected: boolean
  onSelect: (id: number) => void
  onPublish: (article: AdminArticle) => void
  onUnpublish: (article: AdminArticle) => void
  onArchive: (article: AdminArticle) => void
  onFeatureToggle: (article: AdminArticle) => void
  onDelete: (article: AdminArticle) => void
  actionLoading: string | null
}) {
  const status = statusConfig[article.status] || statusConfig.draft
  const isActionLoading = (suffix: string) => actionLoading === `${suffix}-${article.id}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      {/* Mobile Card Layout */}
      <div className={cn(
        "sm:hidden p-4 hover:bg-muted/30 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary"
      )}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(article.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-foreground leading-tight truncate">{article.title}</h3>
                  {article.featured && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                </div>
                {article.excerpt && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.excerpt}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                  {article.category_name && (
                    <span className="text-xs text-muted-foreground">{article.category_name}</span>
                  )}
                </div>
              </div>
              <ArticleActionsDropdown
                article={article}
                onPublish={onPublish}
                onUnpublish={onUnpublish}
                onArchive={onArchive}
                onFeatureToggle={onFeatureToggle}
                onDelete={onDelete}
                isActionLoading={isActionLoading}
              />
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50">
              <div className="flex items-center gap-4 text-sm text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {article.reading_time}m read
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(article.published_at || article.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Row Layout */}
      <div className={cn(
        "hidden sm:grid grid-cols-[36px_minmax(0,3fr)_minmax(0,1fr)_minmax(120px,1fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(100px,0.8fr)_44px] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors group",
        selected && "bg-primary/5 border-l-2 border-l-primary"
      )}>
        {/* Checkbox */}
        <div>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(article.id)}
          />
        </div>

        {/* Title + excerpt */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {article.cover_image && (
              <img
                src={article.cover_image}
                alt=""
                className="w-8 h-8 rounded-md object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="font-medium text-foreground hover:text-primary truncate block transition-colors"
                >
                  {article.title}
                </Link>
                {article.featured && (
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                )}
              </div>
              {article.excerpt && (
                <p className="text-xs text-muted-foreground truncate">{article.excerpt}</p>
              )}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="min-w-0">
          {article.category_name ? (
            <span className="text-sm text-muted-foreground truncate block">{article.category_name}</span>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Template badge */}
        <div>
          <Badge variant="outline" className="text-xs font-normal">
            {templateLabels[article.selected_template] || article.selected_template}
          </Badge>
        </div>

        {/* Status badge */}
        <div>
          <Badge className={cn("text-xs", status.color)}>
            {status.label}
          </Badge>
        </div>

        {/* Views */}
        <div className="tabular-nums">
          <span className="text-sm text-muted-foreground">{article.views.toLocaleString()}</span>
        </div>

        {/* Published date */}
        <div>
          <span className="text-sm text-muted-foreground">
            {article.status === "scheduled" && article.scheduled_publish_at
              ? formatDate(article.scheduled_publish_at)
              : formatDate(article.published_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end">
          <ArticleActionsDropdown
            article={article}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onArchive={onArchive}
            onFeatureToggle={onFeatureToggle}
            onDelete={onDelete}
            isActionLoading={isActionLoading}
          />
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// ArticleActionsDropdown
// =============================================================================

function ArticleActionsDropdown({
  article,
  onPublish,
  onUnpublish,
  onArchive,
  onFeatureToggle,
  onDelete,
  isActionLoading,
}: {
  article: AdminArticle
  onPublish: (article: AdminArticle) => void
  onUnpublish: (article: AdminArticle) => void
  onArchive: (article: AdminArticle) => void
  onFeatureToggle: (article: AdminArticle) => void
  onDelete: (article: AdminArticle) => void
  isActionLoading: (suffix: string) => boolean
}) {
  const anyLoading =
    isActionLoading("publish") ||
    isActionLoading("unpublish") ||
    isActionLoading("archive") ||
    isActionLoading("feature") ||
    isActionLoading("delete")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={anyLoading}>
          {anyLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/admin/articles/${article.id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </DropdownMenuItem>

        {article.status === "published" && (
          <DropdownMenuItem
            onClick={() => window.open(`/news/${article.slug}`, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Live
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {article.status !== "published" && article.status !== "archived" && (
          <DropdownMenuItem onClick={() => onPublish(article)}>
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
            Publish
          </DropdownMenuItem>
        )}

        {article.status === "published" && (
          <DropdownMenuItem onClick={() => onUnpublish(article)}>
            <FileText className="w-4 h-4 mr-2" />
            Unpublish
          </DropdownMenuItem>
        )}

        {article.status === "published" && (
          <DropdownMenuItem onClick={() => onArchive(article)}>
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => onFeatureToggle(article)}>
          <Star className={cn("w-4 h-4 mr-2", article.featured && "fill-amber-400 text-amber-400")} />
          {article.featured ? "Unfeature" : "Feature"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => onDelete(article)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

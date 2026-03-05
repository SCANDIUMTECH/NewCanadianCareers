"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Tags,
  FolderOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getArticleCategories,
  createArticleCategory,
  updateArticleCategory,
  deleteArticleCategory,
} from "@/lib/api/admin-articles"
import type { AdminArticleCategory } from "@/lib/admin/types"

// ── Animation Variants ──────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// ── Slug helper ─────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// ═════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═════════════════════════════════════════════════════════════════════════
export default function ArticleCategoriesPage() {
  const [categories, setCategories] = useState<AdminArticleCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [editingCategory, setEditingCategory] = useState<AdminArticleCategory | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<AdminArticleCategory | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getArticleCategories()
      setCategories(data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      setCategories([])
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !searchQuery ||
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? cat.is_active : !cat.is_active)
      return matchesSearch && matchesStatus
    })
  }, [categories, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const total = categories.length
    const active = categories.filter((c) => c.is_active).length
    const inactive = total - active
    const totalArticles = categories.reduce((sum, c) => sum + c.article_count, 0)
    return { total, active, inactive, totalArticles }
  }, [categories])

  const openEditDialog = (category: AdminArticleCategory) => {
    setEditingCategory(category)
    setFormName(category.name)
    setFormSlug(category.slug)
    setFormDescription(category.description)
    setFormSortOrder(category.sort_order)
    setFormActive(category.is_active)
    setSlugManuallyEdited(true)
  }

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormSortOrder(0)
    setFormActive(true)
    setSlugManuallyEdited(false)
  }

  const closeDialog = () => {
    setEditingCategory(null)
    setIsCreateDialogOpen(false)
  }

  const handleNameChange = (value: string) => {
    setFormName(value)
    if (!slugManuallyEdited) {
      setFormSlug(slugify(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    setFormSlug(value)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        name: formName,
        slug: formSlug,
        description: formDescription,
        sort_order: formSortOrder,
        is_active: formActive,
      }

      if (editingCategory) {
        const updated = await updateArticleCategory(editingCategory.id, data)
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast.success("Category updated successfully")
      } else {
        const created = await createArticleCategory(data)
        setCategories((prev) => [...prev, created])
        toast.success("Category created successfully")
      }
      closeDialog()
    } catch (error) {
      console.error("Failed to save category:", error)
      toast.error("Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    try {
      await deleteArticleCategory(deletingCategory.id)
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id))
      setDeletingCategory(null)
      toast.success("Category deleted successfully")
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast.error("Failed to delete category")
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Tags className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Article Categories</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage article categories and organization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Categories"
              value={stats.total}
              icon={<FolderOpen className="h-4 w-4" />}
              gradient="from-slate-600 to-slate-800"
              bgAccent="bg-slate-500"
            />
            <StatCard
              title="Active"
              value={stats.active}
              color="green"
              icon={<CheckCircle2 className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
            />
            <StatCard
              title="Inactive"
              value={stats.inactive}
              icon={<XCircle className="h-4 w-4" />}
              gradient="from-gray-500 to-gray-600"
              bgAccent="bg-gray-500"
            />
            <StatCard
              title="Total Articles"
              value={stats.totalArticles}
              icon={<Tags className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
            />
          </>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-5 w-[80px] rounded-full" />
                    <Skeleton className="h-4 w-[60px] ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center">
                <Tags className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No categories found</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery ? "Try adjusting your filters" : "Create your first category to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Slug</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Articles</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Order</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-medium">{category.name}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground font-mono">{category.slug}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {category.description || "—"}
                        </td>
                        <td className="px-4 py-4 text-center text-sm tabular-nums">{category.article_count}</td>
                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              category.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right text-sm tabular-nums">{category.sort_order}</td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingCategory(category)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={!!editingCategory || isCreateDialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Create a new article category"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Career Tips"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="e.g., career-tips"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from name. Edit to customize.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Category description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>Active</Label>
              </div>
            </div>

            {editingCategory && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>{editingCategory.article_count}</strong> article{editingCategory.article_count !== 1 ? "s" : ""} in this category
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formSlug}>
              {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?
              {deletingCategory && deletingCategory.article_count > 0 && (
                <> This category has <strong>{deletingCategory.article_count}</strong> article{deletingCategory.article_count !== 1 ? "s" : ""}.</>
              )}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════

function StatCard({
  title,
  value,
  color,
  icon,
  gradient,
  bgAccent,
}: {
  title: string
  value: number
  color?: string
  icon?: React.ReactNode
  gradient?: string
  bgAccent?: string
}) {
  return (
    <Card className="relative overflow-hidden group">
      {bgAccent && (
        <div className={cn(
          "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
          bgAccent
        )} />
      )}
      {gradient && (
        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          color === "green" && "text-green-600"
        )}>
          {value.toLocaleString()}
        </p>
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
        <Skeleton className="mt-1 h-8 w-16" />
      </CardContent>
    </Card>
  )
}

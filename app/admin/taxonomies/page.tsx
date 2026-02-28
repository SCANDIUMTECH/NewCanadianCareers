"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Tags,
  Building2,
  Briefcase,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  ListPlus,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminIndustries,
  createIndustry,
  updateIndustry,
  deleteIndustry,
} from "@/lib/api/admin-taxonomies"
import type { Category, Industry } from "@/lib/api/admin-taxonomies"

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

type Tab = "categories" | "industries"
type SortField = "name" | "slug" | "sort_order" | "count" | "created_at"
type SortDir = "asc" | "desc"
type TaxonomyItem = Category | Industry

function getCount(item: TaxonomyItem): number {
  return "job_count" in item ? item.job_count : (item as Industry).company_count
}

export default function TaxonomiesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("categories")

  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [industries, setIndustries] = useState<Industry[]>([])
  const [industriesLoading, setIndustriesLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<TaxonomyItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  // Form state (single item)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formIcon, setFormIcon] = useState("")
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formIsActive, setFormIsActive] = useState(true)

  // Bulk add state
  const [bulkNames, setBulkNames] = useState("")
  const [bulkAddResult, setBulkAddResult] = useState<{
    added: number; skipped: number; errors: string[]; inputDupes: string[]; alreadyExist: string[]
  } | null>(null)

  // Import state
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState("")
  const [importResult, setImportResult] = useState<{
    added: number; failed: string[]; skipped: string[]; inputDupes: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const data = await getAdminCategories()
      setCategories(data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const fetchIndustries = useCallback(async () => {
    setIndustriesLoading(true)
    try {
      const data = await getAdminIndustries()
      setIndustries(data)
    } catch (error) {
      console.error("Failed to fetch industries:", error)
      setIndustries([])
    } finally {
      setIndustriesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchIndustries()
  }, [fetchCategories, fetchIndustries])

  // Reset selection on tab change
  useEffect(() => {
    setSelectedIds(new Set())
    setSearchQuery("")
  }, [activeTab])

  const loading = activeTab === "categories" ? categoriesLoading : industriesLoading
  const allItems = activeTab === "categories" ? categories : industries

  const refresh = () => {
    setSelectedIds(new Set())
    if (activeTab === "categories") fetchCategories()
    else fetchIndustries()
  }

  // Filter + sort
  const filteredAndSorted = (() => {
    const items = allItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )

    items.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "slug":
          cmp = a.slug.localeCompare(b.slug)
          break
        case "sort_order":
          cmp = a.sort_order - b.sort_order
          break
        case "count":
          cmp = getCount(a) - getCount(b)
          break
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return items
  })()

  // Stats
  const stats = {
    total: allItems.length,
    active: allItems.filter((i) => i.is_active).length,
    inactive: allItems.filter((i) => !i.is_active).length,
  }

  // Sorting
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  // Selection
  const allVisibleSelected = filteredAndSorted.length > 0 && filteredAndSorted.every((i) => selectedIds.has(i.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((i) => i.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Open dialogs
  const openCreate = () => {
    setFormName("")
    setFormDescription("")
    setFormIcon("")
    setFormSortOrder(0)
    setFormIsActive(true)
    setIsCreateOpen(true)
  }

  const openEdit = (item: TaxonomyItem) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormDescription(item.description)
    setFormIcon(item.icon)
    setFormSortOrder(item.sort_order)
    setFormIsActive(item.is_active)
  }

  const closeDialog = () => {
    setIsCreateOpen(false)
    setEditingItem(null)
  }

  // Toggle active
  const handleToggleActive = async (item: TaxonomyItem) => {
    try {
      if (activeTab === "categories") {
        const updated = await updateCategory(item.id, { is_active: !item.is_active })
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const updated = await updateIndustry(item.id, { is_active: !item.is_active })
        setIndustries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      }
    } catch (error) {
      console.error("Failed to toggle active:", error)
    }
  }

  // Save single
  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        name: formName,
        description: formDescription,
        icon: formIcon,
        sort_order: formSortOrder,
        is_active: formIsActive,
      }

      if (activeTab === "categories") {
        if (editingItem) {
          const updated = await updateCategory(editingItem.id, data)
          setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        } else {
          const created = await createCategory(data)
          setCategories((prev) => [...prev, created])
        }
      } else {
        if (editingItem) {
          const updated = await updateIndustry(editingItem.id, data)
          setIndustries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        } else {
          const created = await createIndustry(data)
          setIndustries((prev) => [...prev, created])
        }
      }
      closeDialog()
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  // Delete single
  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      if (activeTab === "categories") {
        await deleteCategory(deletingItem.id)
        setCategories((prev) => prev.filter((c) => c.id !== deletingItem.id))
      } else {
        await deleteIndustry(deletingItem.id)
        setIndustries((prev) => prev.filter((i) => i.id !== deletingItem.id))
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletingItem.id)
        return next
      })
      setDeletingItem(null)
    } catch (error) {
      console.error("Failed to delete:", error)
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkSaving(true)
    try {
      const ids = Array.from(selectedIds)
      if (activeTab === "categories") {
        await Promise.all(ids.map((id) => deleteCategory(id)))
        setCategories((prev) => prev.filter((c) => !selectedIds.has(c.id)))
      } else {
        await Promise.all(ids.map((id) => deleteIndustry(id)))
        setIndustries((prev) => prev.filter((i) => !selectedIds.has(i.id)))
      }
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } catch (error) {
      console.error("Failed to bulk delete:", error)
    } finally {
      setBulkSaving(false)
    }
  }

  // Bulk activate/deactivate
  const handleBulkToggle = async (activate: boolean) => {
    const ids = Array.from(selectedIds)
    try {
      if (activeTab === "categories") {
        const results = await Promise.all(ids.map((id) => updateCategory(id, { is_active: activate })))
        setCategories((prev) => prev.map((c) => {
          const updated = results.find((r) => r.id === c.id)
          return updated || c
        }))
      } else {
        const results = await Promise.all(ids.map((id) => updateIndustry(id, { is_active: activate })))
        setIndustries((prev) => prev.map((i) => {
          const updated = results.find((r) => r.id === i.id)
          return updated || i
        }))
      }
    } catch (error) {
      console.error("Failed to bulk toggle:", error)
    }
  }

  // Bulk add (one name per line)
  const handleBulkAdd = async () => {
    let names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0)

    if (names.length === 0) return

    // Remove duplicates within the input
    const seen = new Set<string>()
    const deduped: string[] = []
    const inputDupes: string[] = []
    for (const name of names) {
      const key = name.toLowerCase()
      if (seen.has(key)) {
        inputDupes.push(name)
      } else {
        seen.add(key)
        deduped.push(name)
      }
    }
    names = deduped

    // Check against existing items
    const existingNames = new Set(allItems.map((i) => i.name.toLowerCase()))
    const alreadyExist = names.filter((n) => existingNames.has(n.toLowerCase()))
    const toCreate = names.filter((n) => !existingNames.has(n.toLowerCase()))

    if (toCreate.length === 0) {
      setBulkAddResult({ added: 0, skipped: names.length, errors: [], inputDupes, alreadyExist })
      return
    }

    setBulkSaving(true)
    const errors: string[] = []
    const added: TaxonomyItem[] = []

    const results = await Promise.allSettled(
      toCreate.map((name) =>
        activeTab === "categories"
          ? createCategory({ name, is_active: true })
          : createIndustry({ name, is_active: true })
      )
    )

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        added.push(result.value)
      } else {
        errors.push(toCreate[idx])
      }
    })

    if (added.length > 0) {
      if (activeTab === "categories") {
        setCategories((prev) => [...prev, ...(added as Category[])])
      } else {
        setIndustries((prev) => [...prev, ...(added as Industry[])])
      }
    }

    setBulkSaving(false)
    setBulkAddResult({
      added: added.length,
      skipped: alreadyExist.length + inputDupes.length,
      errors,
      inputDupes,
      alreadyExist,
    })

    if (errors.length === 0 && alreadyExist.length === 0 && inputDupes.length === 0) {
      setBulkNames("")
      setIsBulkAddOpen(false)
      setBulkAddResult(null)
    }
  }

  // JSON Import
  const handleImport = async () => {
    setImportError("")
    setImportResult(null)

    type ImportItem = { name: string; description?: string; icon?: string; sort_order?: number; is_active?: boolean }
    let items: ImportItem[]
    try {
      const parsed = JSON.parse(importJson)
      if (!Array.isArray(parsed)) {
        setImportError("JSON must be an array of objects with at least a \"name\" field.")
        return
      }
      items = parsed
    } catch {
      setImportError("Invalid JSON. Expected an array like: [{\"name\": \"...\"}]")
      return
    }

    // Validate: every item needs a name string
    const invalidRows = items
      .map((item, idx) => (!item.name || typeof item.name !== "string") ? idx + 1 : null)
      .filter((i): i is number => i !== null)
    if (invalidRows.length > 0) {
      setImportError(`Missing or invalid "name" on row${invalidRows.length > 1 ? "s" : ""}: ${invalidRows.slice(0, 10).join(", ")}${invalidRows.length > 10 ? "..." : ""}`)
      return
    }

    // Dedupe within the JSON input
    const seen = new Set<string>()
    const deduped: ImportItem[] = []
    const inputDupes: string[] = []
    for (const item of items) {
      const key = item.name.toLowerCase()
      if (seen.has(key)) {
        inputDupes.push(item.name)
      } else {
        seen.add(key)
        deduped.push(item)
      }
    }

    // Check against existing items in DB
    const existingNames = new Set(allItems.map((i) => i.name.toLowerCase()))
    const alreadyExist = deduped.filter((i) => existingNames.has(i.name.toLowerCase())).map((i) => i.name)
    const toCreate = deduped.filter((i) => !existingNames.has(i.name.toLowerCase()))

    if (toCreate.length === 0) {
      setImportResult({ added: 0, failed: [], skipped: alreadyExist, inputDupes })
      return
    }

    setBulkSaving(true)
    const added: TaxonomyItem[] = []
    const failed: string[] = []

    const results = await Promise.allSettled(
      toCreate.map((item) =>
        activeTab === "categories"
          ? createCategory({ name: item.name, description: item.description, icon: item.icon, sort_order: item.sort_order, is_active: item.is_active ?? true })
          : createIndustry({ name: item.name, description: item.description, icon: item.icon, sort_order: item.sort_order, is_active: item.is_active ?? true })
      )
    )

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        added.push(result.value)
      } else {
        failed.push(toCreate[idx].name)
      }
    })

    if (added.length > 0) {
      if (activeTab === "categories") {
        setCategories((prev) => [...prev, ...(added as Category[])])
      } else {
        setIndustries((prev) => [...prev, ...(added as Industry[])])
      }
    }

    setBulkSaving(false)
    setImportResult({ added: added.length, failed, skipped: alreadyExist, inputDupes })

    if (failed.length === 0 && alreadyExist.length === 0 && inputDupes.length === 0) {
      setImportJson("")
      setIsImportOpen(false)
      setImportResult(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string || "")
      setImportError("")
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Export
  const handleExport = () => {
    const data = allItems.map((item) => ({
      name: item.name,
      slug: item.slug,
      description: item.description,
      icon: item.icon,
      is_active: item.is_active,
      sort_order: item.sort_order,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTab}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabLabel = activeTab === "categories" ? "Category" : "Industry"
  const countLabel = activeTab === "categories" ? "Jobs" : "Companies"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Tags className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="mt-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">Categories & Industries</h1>
            <p className="text-muted-foreground mt-1">
              Manage job categories and company industries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Single {tabLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBulkNames(""); setBulkAddResult(null); setIsBulkAddOpen(true) }}>
                <ListPlus className="mr-2 h-4 w-4" />
                Bulk Add (Names)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setImportJson(""); setImportError(""); setImportResult(null); setIsImportOpen(true) }}>
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Tabs + Stats */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("categories")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "categories"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Briefcase className="h-4 w-4" />
            Categories
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {categories.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("industries")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "industries"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="h-4 w-4" />
            Industries
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {industries.length}
            </Badge>
          </button>
        </div>
        {!loading && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats.total} total</span>
            <span className="text-green-600">{stats.active} active</span>
            {stats.inactive > 0 && <span className="text-amber-600">{stats.inactive} inactive</span>}
          </div>
        )}
      </motion.div>

      {/* Search + Bulk Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              {someSelected && (
                <div className="flex items-center gap-2 border-l pl-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {selectedIds.size} selected
                  </span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => handleBulkToggle(true)}>
                    Activate
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => handleBulkToggle(false)}>
                    Deactivate
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIds(new Set())}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-[40px_1fr_140px_80px_80px_80px_80px] items-center h-9 px-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </div>
            <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors px-2">
              Name <SortIcon field="name" />
            </button>
            <button onClick={() => toggleSort("slug")} className="flex items-center gap-1 hover:text-foreground transition-colors">
              Slug <SortIcon field="slug" />
            </button>
            <button onClick={() => toggleSort("count")} className="flex items-center gap-1 hover:text-foreground transition-colors justify-end">
              {countLabel} <SortIcon field="count" />
            </button>
            <button onClick={() => toggleSort("sort_order")} className="flex items-center gap-1 hover:text-foreground transition-colors justify-end">
              Order <SortIcon field="sort_order" />
            </button>
            <div className="text-center">Status</div>
            <div className="text-center">Actions</div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_140px_80px_80px_80px_80px] items-center h-10 px-3">
                  <div />
                  <Skeleton className="h-3.5 w-32 mx-2" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-8 ml-auto" />
                  <Skeleton className="h-3.5 w-6 ml-auto" />
                  <Skeleton className="h-4 w-8 mx-auto rounded-full" />
                  <div />
                </div>
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="py-16 text-center">
              <Tags className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No results match your search" : `No ${activeTab} yet`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredAndSorted.map((item) => {
                const count = getCount(item)
                const isSelected = selectedIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid grid-cols-[40px_1fr_140px_80px_80px_80px_80px] items-center h-10 px-3 text-sm transition-colors hover:bg-muted/30",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 px-2">
                      <span className={cn("font-medium truncate", !item.is_active && "text-muted-foreground")}>
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground truncate hidden xl:inline">
                          — {item.description}
                        </span>
                      )}
                    </div>
                    <div>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.slug}
                      </code>
                    </div>
                    <div className="text-right tabular-nums text-muted-foreground">
                      {count}
                    </div>
                    <div className="text-right tabular-nums text-muted-foreground">
                      {item.sort_order}
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => handleToggleActive(item)}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && filteredAndSorted.length > 0 && (
            <div className="h-9 px-4 flex items-center border-t bg-muted/20 text-xs text-muted-foreground">
              Showing {filteredAndSorted.length} of {allItems.length} {activeTab}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ---- Dialogs ---- */}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingItem}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${tabLabel}` : `Add ${tabLabel}`}</DialogTitle>
            <DialogDescription>
              {editingItem ? `Update the ${tabLabel.toLowerCase()} details` : `Create a new ${tabLabel.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={activeTab === "categories" ? "e.g., Engineering" : "e.g., Technology"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={`Describe this ${tabLabel.toLowerCase()}...`}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-icon">Icon Name</Label>
                <Input
                  id="item-icon"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder="e.g., code"
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">Lucide icon name</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-order">Sort Order</Label>
                <Input
                  id="item-order"
                  type="number"
                  min="0"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">Lower = first</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Saving..." : editingItem ? "Save Changes" : `Add ${tabLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkAddOpen} onOpenChange={(open) => { setIsBulkAddOpen(open); if (!open) setBulkAddResult(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Bulk Add {activeTab === "categories" ? "Categories" : "Industries"}</DialogTitle>
            <DialogDescription>
              Enter one name per line. Each will be created as an active item with auto-generated slug.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-2">
            <Textarea
              value={bulkNames}
              onChange={(e) => { setBulkNames(e.target.value); setBulkAddResult(null) }}
              placeholder={"Cybersecurity\nBlockchain\nQuantum Computing\nRobotics"}
              rows={8}
              className="font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {bulkNames.split("\n").filter((n) => n.trim()).length} items to add
            </p>
            {bulkAddResult && (
              <div className="mt-3 rounded-lg border p-3 space-y-2 text-sm">
                {bulkAddResult.added > 0 && (
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{bulkAddResult.added} item{bulkAddResult.added !== 1 ? "s" : ""} added successfully.</span>
                  </div>
                )}
                {bulkAddResult.alreadyExist.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Skipped {bulkAddResult.alreadyExist.length} already existing:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {bulkAddResult.alreadyExist.slice(0, 10).join(", ")}
                        {bulkAddResult.alreadyExist.length > 10 ? ` and ${bulkAddResult.alreadyExist.length - 10} more` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {bulkAddResult.inputDupes.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Removed {bulkAddResult.inputDupes.length} duplicate{bulkAddResult.inputDupes.length !== 1 ? "s" : ""} in input:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {bulkAddResult.inputDupes.slice(0, 10).join(", ")}
                      </span>
                    </div>
                  </div>
                )}
                {bulkAddResult.errors.length > 0 && (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Failed to create {bulkAddResult.errors.length}:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {bulkAddResult.errors.slice(0, 10).join(", ")}
                        {bulkAddResult.errors.length > 10 ? ` and ${bulkAddResult.errors.length - 10} more` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {bulkAddResult.added === 0 && bulkAddResult.errors.length === 0 && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No new items were added — all names already exist or are duplicates.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
              {bulkAddResult ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleBulkAdd}
              disabled={bulkSaving || !bulkNames.trim()}
            >
              {bulkSaving ? "Adding..." : `Add ${bulkNames.split("\n").filter((n) => n.trim()).length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) setImportResult(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Import {activeTab === "categories" ? "Categories" : "Industries"} from JSON</DialogTitle>
            <DialogDescription>
              Upload a JSON file or paste JSON. Expected format: an array of objects with at least a &quot;name&quot; field.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Choose JSON File
              </Button>
              <span className="text-xs text-muted-foreground">or paste below</span>
            </div>
            <Textarea
              value={importJson}
              onChange={(e) => { setImportJson(e.target.value); setImportError(""); setImportResult(null) }}
              placeholder={'[\n  { "name": "Cybersecurity", "description": "...", "icon": "shield" },\n  { "name": "Blockchain" }\n]'}
              rows={8}
              className="font-mono text-xs resize-y"
            />
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            {importResult && (
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                {importResult.added > 0 && (
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{importResult.added} item{importResult.added !== 1 ? "s" : ""} imported successfully.</span>
                  </div>
                )}
                {importResult.skipped.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Skipped {importResult.skipped.length} already existing:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {importResult.skipped.slice(0, 10).join(", ")}
                        {importResult.skipped.length > 10 ? ` and ${importResult.skipped.length - 10} more` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {importResult.inputDupes.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Removed {importResult.inputDupes.length} duplicate{importResult.inputDupes.length !== 1 ? "s" : ""} in JSON:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {importResult.inputDupes.slice(0, 10).join(", ")}
                      </span>
                    </div>
                  </div>
                )}
                {importResult.failed.length > 0 && (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span>Failed to import {importResult.failed.length}:</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {importResult.failed.slice(0, 10).join(", ")}
                        {importResult.failed.length > 10 ? ` and ${importResult.failed.length - 10} more` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {importResult.added === 0 && importResult.failed.length === 0 && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No new items were imported — all names already exist or are duplicates.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            <Button onClick={handleImport} disabled={bulkSaving || !importJson.trim()}>
              {bulkSaving ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {tabLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingItem?.name}&quot;?
              {activeTab === "categories" && deletingItem && "job_count" in deletingItem && deletingItem.job_count > 0 && (
                <span className="block mt-2 text-amber-600">
                  This category has {deletingItem.job_count} published job(s) using it.
                </span>
              )}
              {activeTab === "industries" && deletingItem && "company_count" in deletingItem && (deletingItem as Industry).company_count > 0 && (
                <span className="block mt-2 text-amber-600">
                  This industry has {(deletingItem as Industry).company_count} company(ies) using it.
                </span>
              )}
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} {activeTab}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected {activeTab}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkSaving ? "Deleting..." : `Delete ${selectedIds.size} Items`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

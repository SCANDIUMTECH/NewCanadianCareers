"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  Cookie,
  FileText,
  AlertTriangle,
  ClipboardList,
  Settings,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  Clock,
  Check,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
  Users,
  ScrollText,
  Bell,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getGDPRSettings,
  updateGDPRSettings,
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getServices,
  createService,
  updateService,
  deleteService,
  getConsentLogs,
  getUserConsents,
  getConsentHistory,
  getDataRequests,
  processDataRequestAction,
  extendDataRequestDeadline,
  getDataBreaches,
  createDataBreach,
  updateDataBreach,
  deleteDataBreach,
  sendBreachNotification,
  sendPolicyUpdateNotification,
  getProcessingActivities,
  createProcessingActivity,
  updateProcessingActivity,
  deleteProcessingActivity,
  getAuditLogs,
  getGDPRAnalytics,
} from "@/lib/api/admin-gdpr"
import type {
  GDPRAdminSettings,
  ServiceCategory,
  Service,
  ConsentLogEntry,
  UserConsentEntry,
  ConsentHistoryEntry,
  DataRequest,
  DataBreachEntry,
  ProcessingActivityEntry,
  AdminAuditLogEntry,
  GDPRAnalytics,
  PaginatedResponse,
} from "@/lib/gdpr/types"

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

// ─── Config Maps ─────────────────────────────────────────────────────────────

const legalBasisLabels: Record<string, string> = {
  consent: "Consent",
  legitimate_interest: "Legitimate Interest",
  contract: "Contract",
  legal_obligation: "Legal Obligation",
  vital_interests: "Vital Interests",
  public_task: "Public Task",
}

const requestStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700" },
  done: { label: "Done", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
}

const requestTypeLabels: Record<string, string> = {
  forget_me: "Forget Me",
  request_data: "Data Request",
  rectification: "Rectification",
  dpo_contact: "DPO Contact",
}

const severityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-gray-100 text-gray-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Pagination Controls ─────────────────────────────────────────────────────

interface PaginationControlsProps {
  page: number
  count: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}

function PaginationControls({ page, count, pageSize, onPrev, onNext }: PaginationControlsProps) {
  const totalPages = Math.ceil(count / pageSize)
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-500">
      <span>
        {count === 0 ? "No results" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Cookie Services Tab ─────────────────────────────────────────────────────

function CookieServicesTab() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Category dialog
  const [catDialog, setCatDialog] = useState<{ open: boolean; cat: ServiceCategory | null }>({ open: false, cat: null })
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "", order: 0 })
  const [isCatSaving, setIsCatSaving] = useState(false)
  const [catDeleteDialog, setCatDeleteDialog] = useState<{ open: boolean; cat: ServiceCategory | null }>({ open: false, cat: null })
  const [isCatDeleting, setIsCatDeleting] = useState(false)

  // Service dialog
  const [svcDialog, setSvcDialog] = useState<{ open: boolean; svc: Service | null }>({ open: false, svc: null })
  const [svcForm, setSvcForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: 0,
    is_deactivatable: true,
    default_enabled: false,
    legal_basis: "consent",
    is_active: true,
  })
  const [isSvcSaving, setIsSvcSaving] = useState(false)
  const [svcDeleteDialog, setSvcDeleteDialog] = useState<{ open: boolean; svc: Service | null }>({ open: false, svc: null })
  const [isSvcDeleting, setIsSvcDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cats, svcs] = await Promise.all([getServiceCategories(), getServices()])
      setCategories(cats)
      setServices(svcs)
    } catch {
      toast.error("Failed to load cookie services")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNewCat = () => {
    setCatForm({ name: "", slug: "", description: "", order: 0 })
    setCatDialog({ open: true, cat: null })
  }

  const openEditCat = (cat: ServiceCategory) => {
    setCatForm({ name: cat.name, slug: cat.slug, description: cat.description, order: cat.order })
    setCatDialog({ open: true, cat })
  }

  const saveCat = async () => {
    setIsCatSaving(true)
    try {
      if (catDialog.cat) {
        await updateServiceCategory(catDialog.cat.id, catForm)
        toast.success("Category updated")
      } else {
        await createServiceCategory(catForm)
        toast.success("Category created")
      }
      setCatDialog({ open: false, cat: null })
      load()
    } catch {
      toast.error("Failed to save category")
    } finally {
      setIsCatSaving(false)
    }
  }

  const deleteCat = async () => {
    if (!catDeleteDialog.cat) return
    setIsCatDeleting(true)
    try {
      await deleteServiceCategory(catDeleteDialog.cat.id)
      toast.success("Category deleted")
      setCatDeleteDialog({ open: false, cat: null })
      load()
    } catch {
      toast.error("Failed to delete category")
    } finally {
      setIsCatDeleting(false)
    }
  }

  const openNewSvc = () => {
    setSvcForm({ name: "", slug: "", description: "", category: categories[0]?.id ?? 0, is_deactivatable: true, default_enabled: false, legal_basis: "consent", is_active: true })
    setSvcDialog({ open: true, svc: null })
  }

  const openEditSvc = (svc: Service) => {
    setSvcForm({
      name: svc.name,
      slug: svc.slug,
      description: svc.description,
      category: svc.category,
      is_deactivatable: svc.is_deactivatable,
      default_enabled: svc.default_enabled,
      legal_basis: svc.legal_basis,
      is_active: svc.is_active,
    })
    setSvcDialog({ open: true, svc })
  }

  const saveSvc = async () => {
    setIsSvcSaving(true)
    try {
      if (svcDialog.svc) {
        await updateService(svcDialog.svc.id, svcForm)
        toast.success("Service updated")
      } else {
        await createService(svcForm)
        toast.success("Service created")
      }
      setSvcDialog({ open: false, svc: null })
      load()
    } catch {
      toast.error("Failed to save service")
    } finally {
      setIsSvcSaving(false)
    }
  }

  const deleteSvc = async () => {
    if (!svcDeleteDialog.svc) return
    setIsSvcDeleting(true)
    try {
      await deleteService(svcDeleteDialog.svc.id)
      toast.success("Service deleted")
      setSvcDeleteDialog({ open: false, svc: null })
      load()
    } catch {
      toast.error("Failed to delete service")
    } finally {
      setIsSvcDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Categories */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Service Categories</CardTitle>
              <Button size="sm" onClick={openNewCat}>
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{cat.slug}</TableCell>
                      <TableCell>{cat.order}</TableCell>
                      <TableCell className="max-w-xs truncate text-gray-500">{cat.description || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditCat(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setCatDeleteDialog({ open: true, cat })}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Services */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cookie Services</CardTitle>
              <Button size="sm" onClick={openNewSvc} disabled={categories.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Legal Basis</TableHead>
                  <TableHead>Default On</TableHead>
                  <TableHead>Deactivatable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium">{svc.name}</TableCell>
                      <TableCell>{svc.category_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {legalBasisLabels[svc.legal_basis] ?? svc.legal_basis}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium", svc.default_enabled ? "text-emerald-600" : "text-gray-400")}>
                          {svc.default_enabled ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium", svc.is_deactivatable ? "text-blue-600" : "text-gray-400")}>
                          {svc.is_deactivatable ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", svc.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                          {svc.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditSvc(svc)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setSvcDeleteDialog({ open: true, svc })}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Dialog */}
      <Dialog open={catDialog.open} onOpenChange={(o) => !o && setCatDialog({ open: false, cat: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{catDialog.cat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Analytics" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={catForm.slug} onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))} placeholder="e.g. analytics" />
            </div>
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Input type="number" value={catForm.order} onChange={(e) => setCatForm((f) => ({ ...f, order: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog({ open: false, cat: null })}>Cancel</Button>
            <Button onClick={saveCat} disabled={isCatSaving}>
              {isCatSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Dialog */}
      <Dialog open={catDeleteDialog.open} onOpenChange={(o) => !o && setCatDeleteDialog({ open: false, cat: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete <strong>{catDeleteDialog.cat?.name}</strong>? This may affect associated services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDeleteDialog({ open: false, cat: null })}>Cancel</Button>
            <Button variant="destructive" onClick={deleteCat} disabled={isCatDeleting}>
              {isCatDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={svcDialog.open} onOpenChange={(o) => !o && setSvcDialog({ open: false, svc: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{svcDialog.svc ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={svcForm.slug} onChange={(e) => setSvcForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={svcForm.description} onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={String(svcForm.category)} onValueChange={(v) => setSvcForm((f) => ({ ...f, category: Number(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Legal Basis</Label>
              <Select value={svcForm.legal_basis} onValueChange={(v) => setSvcForm((f) => ({ ...f, legal_basis: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(legalBasisLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={svcForm.is_deactivatable} onChange={(e) => setSvcForm((f) => ({ ...f, is_deactivatable: e.target.checked }))} className="h-4 w-4 rounded" />
                <span className="text-sm">Deactivatable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={svcForm.default_enabled} onChange={(e) => setSvcForm((f) => ({ ...f, default_enabled: e.target.checked }))} className="h-4 w-4 rounded" />
                <span className="text-sm">Default On</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={svcForm.is_active} onChange={(e) => setSvcForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcDialog({ open: false, svc: null })}>Cancel</Button>
            <Button onClick={saveSvc} disabled={isSvcSaving}>
              {isSvcSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Delete Dialog */}
      <Dialog open={svcDeleteDialog.open} onOpenChange={(o) => !o && setSvcDeleteDialog({ open: false, svc: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Delete <strong>{svcDeleteDialog.svc?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcDeleteDialog({ open: false, svc: null })}>Cancel</Button>
            <Button variant="destructive" onClick={deleteSvc} disabled={isSvcDeleting}>
              {isSvcDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Consent Dashboard Tab ────────────────────────────────────────────────────

function ConsentDashboardTab() {
  const PAGE_SIZE = 20
  const [section, setSection] = useState<"logs" | "users" | "history">("logs")

  // Consent Logs
  const [logs, setLogs] = useState<ConsentLogEntry[]>([])
  const [logsCount, setLogsCount] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsSearch, setLogsSearch] = useState("")
  const [isLogsLoading, setIsLogsLoading] = useState(true)

  // User Consents
  const [userConsents, setUserConsents] = useState<UserConsentEntry[]>([])
  const [ucCount, setUcCount] = useState(0)
  const [ucPage, setUcPage] = useState(1)
  const [ucSearch, setUcSearch] = useState("")
  const [isUcLoading, setIsUcLoading] = useState(false)

  // Consent History
  const [history, setHistory] = useState<ConsentHistoryEntry[]>([])
  const [histCount, setHistCount] = useState(0)
  const [histPage, setHistPage] = useState(1)
  const [histSearch, setHistSearch] = useState("")
  const [isHistLoading, setIsHistLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setIsLogsLoading(true)
    try {
      const params = [`page=${logsPage}`, `page_size=${PAGE_SIZE}`, logsSearch && `search=${logsSearch}`].filter(Boolean).join("&")
      const res = await getConsentLogs(params)
      setLogs(res.results)
      setLogsCount(res.count)
    } catch {
      toast.error("Failed to load consent logs")
    } finally {
      setIsLogsLoading(false)
    }
  }, [logsPage, logsSearch])

  const fetchUserConsents = useCallback(async () => {
    setIsUcLoading(true)
    try {
      const params = [`page=${ucPage}`, `page_size=${PAGE_SIZE}`, ucSearch && `search=${ucSearch}`].filter(Boolean).join("&")
      const res = await getUserConsents(params)
      setUserConsents(res.results)
      setUcCount(res.count)
    } catch {
      toast.error("Failed to load user consents")
    } finally {
      setIsUcLoading(false)
    }
  }, [ucPage, ucSearch])

  const fetchHistory = useCallback(async () => {
    setIsHistLoading(true)
    try {
      const params = [`page=${histPage}`, `page_size=${PAGE_SIZE}`, histSearch && `search=${histSearch}`].filter(Boolean).join("&")
      const res = await getConsentHistory(params)
      setHistory(res.results)
      setHistCount(res.count)
    } catch {
      toast.error("Failed to load consent history")
    } finally {
      setIsHistLoading(false)
    }
  }, [histPage, histSearch])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (section === "users") fetchUserConsents()
    if (section === "history") fetchHistory()
  }, [section, fetchUserConsents, fetchHistory])

  const renderSectionButtons = () => (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      {([
        { key: "logs", label: "Consent Logs", icon: ScrollText },
        { key: "users", label: "User Consents", icon: Users },
        { key: "history", label: "History", icon: History },
      ] as const).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setSection(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            section === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>{renderSectionButtons()}</motion.div>

      {/* Consent Logs */}
      {section === "logs" && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Consent Logs</CardTitle>
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Search IP..."
                    value={logsSearch}
                    onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1) }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLogsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Consent Given At</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-400 py-8">No logs found</TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{log.consent_version}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDateTime(log.consent_given_at)}</TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDateTime(log.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="px-4 pb-3">
                    <PaginationControls page={logsPage} count={logsCount} pageSize={PAGE_SIZE} onPrev={() => setLogsPage((p) => p - 1)} onNext={() => setLogsPage((p) => p + 1)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* User Consents */}
      {section === "users" && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">User Consents</CardTitle>
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Search email..."
                    value={ucSearch}
                    onChange={(e) => { setUcSearch(e.target.value); setUcPage(1) }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isUcLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Privacy Policy</TableHead>
                        <TableHead>Terms</TableHead>
                        <TableHead>Consent Given</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userConsents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-400 py-8">No user consents found</TableCell>
                        </TableRow>
                      ) : (
                        userConsents.map((uc) => (
                          <TableRow key={uc.id}>
                            <TableCell className="font-medium text-sm">{uc.email}</TableCell>
                            <TableCell className="text-sm text-gray-600">{uc.full_name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{uc.consent_version}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", uc.privacy_policy_accepted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                                {uc.privacy_policy_accepted ? "Accepted" : "Not accepted"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", uc.terms_accepted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                                {uc.terms_accepted ? "Accepted" : "Not accepted"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDateTime(uc.consent_given_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="px-4 pb-3">
                    <PaginationControls page={ucPage} count={ucCount} pageSize={PAGE_SIZE} onPrev={() => setUcPage((p) => p - 1)} onNext={() => setUcPage((p) => p + 1)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Consent History */}
      {section === "history" && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Consent History</CardTitle>
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Search..."
                    value={histSearch}
                    onChange={(e) => { setHistSearch(e.target.value); setHistPage(1) }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isHistLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Version</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-8">No history found</TableCell>
                        </TableRow>
                      ) : (
                        history.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs text-gray-500">{formatDateTime(h.timestamp)}</TableCell>
                            <TableCell className="font-mono text-xs">{h.ip_address}</TableCell>
                            <TableCell className="text-sm">{h.service_name || h.service_id}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", h.action === "granted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                {h.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{h.consent_version}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="px-4 pb-3">
                    <PaginationControls page={histPage} count={histCount} pageSize={PAGE_SIZE} onPrev={() => setHistPage((p) => p - 1)} onNext={() => setHistPage((p) => p + 1)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Data Requests Tab ────────────────────────────────────────────────────────

function DataRequestsTab() {
  const PAGE_SIZE = 20
  const [requests, setRequests] = useState<DataRequest[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [detailDialog, setDetailDialog] = useState<{ open: boolean; req: DataRequest | null }>({ open: false, req: null })
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; req: DataRequest | null }>({ open: false, req: null })
  const [extendReason, setExtendReason] = useState("")
  const [extendDays, setExtendDays] = useState(30)
  const [isExtending, setIsExtending] = useState(false)
  const [isActioning, setIsActioning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = [`page=${page}`, `page_size=${PAGE_SIZE}`, search && `search=${search}`].filter(Boolean).join("&")
      const res = await getDataRequests(params)
      setRequests(res.results)
      setCount(res.count)
    } catch {
      toast.error("Failed to load data requests")
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleAction = async (req: DataRequest, action: string) => {
    setIsActioning(req.id)
    try {
      await processDataRequestAction(req.id, action)
      toast.success(`Request ${action} successfully`)
      load()
    } catch {
      toast.error("Failed to process action")
    } finally {
      setIsActioning(null)
    }
  }

  const handleExtend = async () => {
    if (!extendDialog.req) return
    setIsExtending(true)
    try {
      await extendDataRequestDeadline(extendDialog.req.id, extendDays, extendReason)
      toast.success("Deadline extended")
      setExtendDialog({ open: false, req: null })
      setExtendReason("")
      load()
    } catch {
      toast.error("Failed to extend deadline")
    } finally {
      setIsExtending(false)
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Data Subject Access Requests</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400 py-8">No data requests found</TableCell>
                      </TableRow>
                    ) : (
                      requests.map((req) => {
                        const statusCfg = requestStatusConfig[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-600" }
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium text-sm">{req.first_name} {req.last_name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{req.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{requestTypeLabels[req.request_type] ?? req.request_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Badge className={cn("text-xs", statusCfg.color)}>{statusCfg.label}</Badge>
                                {req.is_overdue && <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {req.deadline ? (
                                <div>
                                  <div className="text-gray-700">{formatDate(req.deadline)}</div>
                                  {req.days_until_deadline !== null && (
                                    <div className={cn("text-xs", req.days_until_deadline < 0 ? "text-red-500" : req.days_until_deadline <= 3 ? "text-amber-500" : "text-gray-400")}>
                                      {req.days_until_deadline < 0
                                        ? `${Math.abs(req.days_until_deadline)}d overdue`
                                        : `${req.days_until_deadline}d left`}
                                    </div>
                                  )}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDate(req.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setDetailDialog({ open: true, req })}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isActioning === req.id}>
                                      {isActioning === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleAction(req, "approve")}>Approve</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAction(req, "start_processing")}>Start Processing</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAction(req, "complete")}>Complete</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAction(req, "reject")} className="text-red-600">Reject</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setExtendDialog({ open: true, req }); setExtendReason(""); setExtendDays(30) }}>Extend Deadline</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 pb-3">
                  <PaginationControls page={page} count={count} pageSize={PAGE_SIZE} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(o) => !o && setDetailDialog({ open: false, req: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {detailDialog.req && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Name</span><div className="font-medium mt-0.5">{detailDialog.req.first_name} {detailDialog.req.last_name}</div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Email</span><div className="font-medium mt-0.5">{detailDialog.req.email}</div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Type</span><div className="mt-0.5"><Badge variant="secondary">{requestTypeLabels[detailDialog.req.request_type] ?? detailDialog.req.request_type}</Badge></div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Status</span><div className="mt-0.5"><Badge className={cn(requestStatusConfig[detailDialog.req.status]?.color)}>{requestStatusConfig[detailDialog.req.status]?.label}</Badge></div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Email Confirmed</span><div className="font-medium mt-0.5">{detailDialog.req.is_email_confirmed ? "Yes" : "No"}</div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Deadline</span><div className="font-medium mt-0.5">{formatDate(detailDialog.req.deadline)}</div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Created</span><div className="font-medium mt-0.5">{formatDateTime(detailDialog.req.created_at)}</div></div>
                <div><span className="text-gray-500 text-xs uppercase tracking-wide">Updated</span><div className="font-medium mt-0.5">{formatDateTime(detailDialog.req.updated_at)}</div></div>
              </div>
              {detailDialog.req.message && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Message</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-700">{detailDialog.req.message}</div>
                </div>
              )}
              {detailDialog.req.deadline_extended && detailDialog.req.deadline_extension_reason && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Extension Reason</span>
                  <div className="mt-1 p-3 bg-amber-50 rounded-lg text-amber-800">{detailDialog.req.deadline_extension_reason}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog({ open: false, req: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Deadline Dialog */}
      <Dialog open={extendDialog.open} onOpenChange={(o) => !o && setExtendDialog({ open: false, req: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Deadline</DialogTitle>
            <DialogDescription>Extend the DSAR deadline per Art. 12(3) — max 60 additional days.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Extension (days)</Label>
              <Input type="number" min={1} max={60} value={extendDays} onChange={(e) => setExtendDays(Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))} />
              <p className="text-xs text-muted-foreground">Between 1 and 60 days (Art. 12(3) allows up to 2 additional months).</p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={extendReason} onChange={(e) => setExtendReason(e.target.value)} rows={3} placeholder="Reason for extending the deadline (required by Art. 12(3))..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog({ open: false, req: null })}>Cancel</Button>
            <Button onClick={handleExtend} disabled={isExtending || !extendReason.trim() || extendDays < 1}>
              {isExtending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Extend by {extendDays} days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Data Breaches Tab ────────────────────────────────────────────────────────

function DataBreachesTab() {
  const PAGE_SIZE = 20
  const [breaches, setBreaches] = useState<DataBreachEntry[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const emptyBreachForm = {
    title: "",
    nature_of_breach: "",
    severity: "medium" as DataBreachEntry["severity"],
    categories_of_data: "",
    approximate_records_affected: "" as string | number,
    consequences: "",
    measures_taken: "",
    discovered_at: new Date().toISOString().slice(0, 16),
  }

  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; breach: DataBreachEntry | null }>({ open: false, breach: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; breach: DataBreachEntry | null }>({ open: false, breach: null })
  const [form, setForm] = useState(emptyBreachForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isNotifying, setIsNotifying] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = `page=${page}&page_size=${PAGE_SIZE}`
      const res = await getDataBreaches(params)
      setBreaches(res.results)
      setCount(res.count)
    } catch {
      toast.error("Failed to load data breaches")
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(emptyBreachForm)
    setCreateDialog(true)
  }

  const openEdit = (breach: DataBreachEntry) => {
    setForm({
      title: breach.title,
      nature_of_breach: breach.nature_of_breach,
      severity: breach.severity,
      categories_of_data: breach.categories_of_data,
      approximate_records_affected: breach.approximate_records_affected ?? "",
      consequences: breach.consequences,
      measures_taken: breach.measures_taken,
      discovered_at: breach.discovered_at ? breach.discovered_at.slice(0, 16) : "",
    })
    setEditDialog({ open: true, breach })
  }

  const saveCreate = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...form,
        approximate_records_affected: form.approximate_records_affected === "" ? null : Number(form.approximate_records_affected),
      }
      await createDataBreach(payload)
      toast.success("Data breach recorded")
      setCreateDialog(false)
      load()
    } catch {
      toast.error("Failed to create data breach record")
    } finally {
      setIsSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editDialog.breach) return
    setIsSaving(true)
    try {
      const payload = {
        ...form,
        approximate_records_affected: form.approximate_records_affected === "" ? null : Number(form.approximate_records_affected),
      }
      await updateDataBreach(editDialog.breach.id, payload)
      toast.success("Data breach updated")
      setEditDialog({ open: false, breach: null })
      load()
    } catch {
      toast.error("Failed to update data breach")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.breach) return
    setIsDeleting(true)
    try {
      await deleteDataBreach(deleteDialog.breach.id)
      toast.success("Data breach deleted")
      setDeleteDialog({ open: false, breach: null })
      load()
    } catch {
      toast.error("Failed to delete data breach")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkDPANotified = async (breach: DataBreachEntry) => {
    try {
      await updateDataBreach(breach.id, { dpa_notified_at: new Date().toISOString() })
      toast.success("Marked as DPA notified")
      load()
    } catch {
      toast.error("Failed to update breach")
    }
  }

  const handleNotifyUsers = async (breach: DataBreachEntry) => {
    setIsNotifying(breach.id)
    try {
      const res = await sendBreachNotification(breach.id)
      toast.success(`Notified ${res.count} users`)
      load()
    } catch {
      toast.error("Failed to send notifications")
    } finally {
      setIsNotifying(null)
    }
  }

  const handleResolve = async (breach: DataBreachEntry) => {
    try {
      await updateDataBreach(breach.id, { is_resolved: true, resolved_at: new Date().toISOString() })
      toast.success("Breach marked as resolved")
      load()
    } catch {
      toast.error("Failed to resolve breach")
    }
  }

  const BreachForm = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief title for this breach" />
      </div>
      <div className="space-y-1.5">
        <Label>Nature of Breach</Label>
        <Textarea value={form.nature_of_breach} onChange={(e) => setForm((f) => ({ ...f, nature_of_breach: e.target.value }))} rows={3} placeholder="Describe what happened..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as DataBreachEntry["severity"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Records Affected</Label>
          <Input type="number" value={form.approximate_records_affected} onChange={(e) => setForm((f) => ({ ...f, approximate_records_affected: e.target.value }))} placeholder="Approx. count" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Categories of Data</Label>
        <Input value={form.categories_of_data} onChange={(e) => setForm((f) => ({ ...f, categories_of_data: e.target.value }))} placeholder="e.g. names, emails, addresses" />
      </div>
      <div className="space-y-1.5">
        <Label>Consequences</Label>
        <Textarea value={form.consequences} onChange={(e) => setForm((f) => ({ ...f, consequences: e.target.value }))} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Measures Taken</Label>
        <Textarea value={form.measures_taken} onChange={(e) => setForm((f) => ({ ...f, measures_taken: e.target.value }))} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Discovered At</Label>
        <Input type="datetime-local" value={form.discovered_at} onChange={(e) => setForm((f) => ({ ...f, discovered_at: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Data Breaches</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Record Breach
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>DPA Deadline</TableHead>
                      <TableHead>DPA Notified</TableHead>
                      <TableHead>Users Notified</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breaches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-8">No data breaches recorded</TableCell>
                      </TableRow>
                    ) : (
                      breaches.map((breach) => {
                        const sevCfg = severityConfig[breach.severity] ?? { label: breach.severity, color: "bg-gray-100 text-gray-600" }
                        const dpaDeadlinePast = breach.dpa_notification_deadline && new Date(breach.dpa_notification_deadline) < new Date()
                        return (
                          <TableRow key={breach.id}>
                            <TableCell className="font-medium text-sm max-w-xs truncate">{breach.title}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", sevCfg.color)}>{sevCfg.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{breach.approximate_records_affected ?? "—"}</TableCell>
                            <TableCell>
                              {breach.dpa_notification_deadline ? (
                                <div className={cn("text-xs", !breach.dpa_notified_at && dpaDeadlinePast ? "text-red-600 font-medium" : "text-gray-500")}>
                                  {formatDate(breach.dpa_notification_deadline)}
                                  {!breach.dpa_notified_at && dpaDeadlinePast && <div className="text-red-600">Overdue</div>}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {breach.dpa_notified_at ? (
                                <Badge className="text-xs bg-emerald-100 text-emerald-700">
                                  <Check className="h-3 w-3 mr-1" />{formatDate(breach.dpa_notified_at)}
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-amber-100 text-amber-700">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {breach.users_notified_at ? (
                                <span className="text-xs text-emerald-600">{breach.users_notified_count} users</span>
                              ) : (
                                <span className="text-xs text-gray-400">Not sent</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", breach.is_resolved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                {breach.is_resolved ? "Resolved" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(breach)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  {!breach.dpa_notified_at && (
                                    <DropdownMenuItem onClick={() => handleMarkDPANotified(breach)}>
                                      <Check className="h-3.5 w-3.5 mr-2" /> Mark DPA Notified
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleNotifyUsers(breach)} disabled={isNotifying === breach.id}>
                                    {isNotifying === breach.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                                    Notify Users
                                  </DropdownMenuItem>
                                  {!breach.is_resolved && (
                                    <DropdownMenuItem onClick={() => handleResolve(breach)}>
                                      <Check className="h-3.5 w-3.5 mr-2" /> Resolve
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, breach })} className="text-red-600">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 pb-3">
                  <PaginationControls page={page} count={count} pageSize={PAGE_SIZE} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Data Breach</DialogTitle>
            <DialogDescription>Document a data breach incident for compliance records.</DialogDescription>
          </DialogHeader>
          <BreachForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={saveCreate} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Breach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({ open: false, breach: null })}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Breach</DialogTitle>
          </DialogHeader>
          <BreachForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, breach: null })}>Cancel</Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false, breach: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Data Breach</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{deleteDialog.breach?.title}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, breach: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Processing Activities Tab ────────────────────────────────────────────────

function ProcessingActivitiesTab() {
  const PAGE_SIZE = 20
  const [activities, setActivities] = useState<ProcessingActivityEntry[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const emptyForm = {
    name: "",
    purpose: "",
    legal_basis: "consent",
    categories_of_data_subjects: "",
    categories_of_personal_data: "",
    recipients: "",
    third_country_transfers: "",
    retention_period: "",
    security_measures: "",
    is_active: true,
  }

  const [dialog, setDialog] = useState<{ open: boolean; activity: ProcessingActivityEntry | null }>({ open: false, activity: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: ProcessingActivityEntry | null }>({ open: false, activity: null })
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = `page=${page}&page_size=${PAGE_SIZE}`
      const res = await getProcessingActivities(params)
      setActivities(res.results)
      setCount(res.count)
    } catch {
      toast.error("Failed to load processing activities")
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setDialog({ open: true, activity: null })
  }

  const openEdit = (activity: ProcessingActivityEntry) => {
    setForm({
      name: activity.name,
      purpose: activity.purpose,
      legal_basis: activity.legal_basis,
      categories_of_data_subjects: activity.categories_of_data_subjects,
      categories_of_personal_data: activity.categories_of_personal_data,
      recipients: activity.recipients,
      third_country_transfers: activity.third_country_transfers,
      retention_period: activity.retention_period,
      security_measures: activity.security_measures,
      is_active: activity.is_active,
    })
    setDialog({ open: true, activity })
  }

  const save = async () => {
    setIsSaving(true)
    try {
      if (dialog.activity) {
        await updateProcessingActivity(dialog.activity.id, form)
        toast.success("Activity updated")
      } else {
        await createProcessingActivity(form)
        toast.success("Activity created")
      }
      setDialog({ open: false, activity: null })
      load()
    } catch {
      toast.error("Failed to save activity")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.activity) return
    setIsDeleting(true)
    try {
      await deleteProcessingActivity(deleteDialog.activity.id)
      toast.success("Activity deleted")
      setDeleteDialog({ open: false, activity: null })
      load()
    } catch {
      toast.error("Failed to delete activity")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Record of Processing Activities (RoPA)</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Legal Basis</TableHead>
                      <TableHead>Retention</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-8">No processing activities recorded</TableCell>
                      </TableRow>
                    ) : (
                      activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium text-sm">{a.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">{a.purpose}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{legalBasisLabels[a.legal_basis] ?? a.legal_basis}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{a.retention_period || "—"}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                              {a.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, activity: a })}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 pb-3">
                  <PaginationControls page={page} count={count} pageSize={PAGE_SIZE} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false, activity: null })}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.activity ? "Edit Processing Activity" : "New Processing Activity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. User Registration Processing" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Purpose</Label>
                <Textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Legal Basis</Label>
                <Select value={form.legal_basis} onValueChange={(v) => setForm((f) => ({ ...f, legal_basis: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(legalBasisLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Retention Period</Label>
                <Input value={form.retention_period} onChange={(e) => setForm((f) => ({ ...f, retention_period: e.target.value }))} placeholder="e.g. 3 years" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Categories of Data Subjects</Label>
                <Input value={form.categories_of_data_subjects} onChange={(e) => setForm((f) => ({ ...f, categories_of_data_subjects: e.target.value }))} placeholder="e.g. Employees, Candidates, Clients" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Categories of Personal Data</Label>
                <Input value={form.categories_of_personal_data} onChange={(e) => setForm((f) => ({ ...f, categories_of_personal_data: e.target.value }))} placeholder="e.g. Names, emails, phone numbers" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Recipients</Label>
                <Input value={form.recipients} onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))} placeholder="e.g. Internal staff, third-party processors" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Third Country Transfers</Label>
                <Input value={form.third_country_transfers} onChange={(e) => setForm((f) => ({ ...f, third_country_transfers: e.target.value }))} placeholder="e.g. None, or US via SCCs" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Security Measures</Label>
                <Textarea value={form.security_measures} onChange={(e) => setForm((f) => ({ ...f, security_measures: e.target.value }))} rows={2} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, activity: null })}>Cancel</Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false, activity: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteDialog.activity?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, activity: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── GDPR Settings Tab ────────────────────────────────────────────────────────

function GDPRSettingsTab() {
  const [settings, setSettings] = useState<GDPRAdminSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingPolicy, setIsSendingPolicy] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getGDPRSettings()
      setSettings(data)
    } catch {
      toast.error("Failed to load GDPR settings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const updated = await updateGDPRSettings(settings)
      setSettings(updated)
      toast.success("GDPR settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const sendPolicyUpdate = async () => {
    setIsSendingPolicy(true)
    try {
      const res = await sendPolicyUpdateNotification()
      toast.success(`Policy update notification sent to ${res.count} users`)
    } catch {
      toast.error("Failed to send policy update notification")
    } finally {
      setIsSendingPolicy(false)
    }
  }

  const set = <K extends keyof GDPRAdminSettings>(key: K, value: GDPRAdminSettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    )
  }

  if (!settings) return null

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )

  const BoolField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      <span className="text-sm">{label}</span>
    </label>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* General */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="General">
          <div className="grid grid-cols-2 gap-4">
            <BoolField label="GDPR Module Enabled" checked={settings.is_enabled} onChange={(v) => set("is_enabled", v)} />
            <BoolField label="Consent Logging Enabled" checked={settings.consent_logging_enabled} onChange={(v) => set("consent_logging_enabled", v)} />
            <BoolField label="Consent Mode v2" checked={settings.consent_mode_v2} onChange={(v) => set("consent_mode_v2", v)} />
            <div />
            <Field label="Cookie Lifetime (days)">
              <Input type="number" value={settings.cookie_lifetime_days} onChange={(e) => set("cookie_lifetime_days", Number(e.target.value))} />
            </Field>
            <Field label="Cookie Domain">
              <Input value={settings.cookie_domain} onChange={(e) => set("cookie_domain", e.target.value)} placeholder=".example.com" />
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Consent */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Consent">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Consent Version">
              <Input value={settings.consent_version} onChange={(e) => set("consent_version", e.target.value)} placeholder="1.0" />
            </Field>
            <Field label="Consent Expiry (days)">
              <Input type="number" value={settings.consent_expiry_days} onChange={(e) => set("consent_expiry_days", Number(e.target.value))} />
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Popup */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Popup">
          <div className="grid grid-cols-2 gap-4">
            <BoolField label="Popup Enabled" checked={settings.popup_enabled} onChange={(v) => set("popup_enabled", v)} />
            <div />
            <Field label="Popup Style">
              <Select value={settings.popup_style} onValueChange={(v) => set("popup_style", v as GDPRAdminSettings["popup_style"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_width">Full Width</SelectItem>
                  <SelectItem value="full_width_right">Full Width Right</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Popup Position">
              <Select value={settings.popup_position} onValueChange={(v) => set("popup_position", v as GDPRAdminSettings["popup_position"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Popup Text">
              <Textarea value={settings.popup_text} onChange={(e) => set("popup_text", e.target.value)} rows={3} />
            </Field>
            <div className="space-y-4">
              <Field label="Agree Button Text">
                <Input value={settings.popup_agree_text} onChange={(e) => set("popup_agree_text", e.target.value)} />
              </Field>
              <Field label="Decline Button Text">
                <Input value={settings.popup_decline_text} onChange={(e) => set("popup_decline_text", e.target.value)} />
              </Field>
              <Field label="Preferences Button Text">
                <Input value={settings.popup_preferences_text} onChange={(e) => set("popup_preferences_text", e.target.value)} />
              </Field>
            </div>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Colors */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Colors">
          <div className="grid grid-cols-2 gap-4">
            {([
              ["Popup Background", "popup_bg_color"],
              ["Popup Text", "popup_text_color"],
              ["Agree Button Background", "agree_btn_bg_color"],
              ["Agree Button Text", "agree_btn_text_color"],
              ["Decline Button Background", "decline_btn_bg_color"],
              ["Decline Button Text", "decline_btn_text_color"],
              ["Preferences Button Background", "preferences_btn_bg_color"],
              ["Preferences Button Text", "preferences_btn_text_color"],
            ] as [string, keyof GDPRAdminSettings][]).map(([label, key]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings[key] as string}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-9 w-14 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={settings[key] as string}
                    onChange={(e) => set(key, e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </Field>
            ))}
          </div>
        </SettingsSection>
      </motion.div>

      {/* Privacy Settings Trigger */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Privacy Settings Trigger">
          <div className="grid grid-cols-2 gap-4">
            <BoolField label="Trigger Enabled" checked={settings.privacy_settings_trigger_enabled} onChange={(v) => set("privacy_settings_trigger_enabled", v)} />
            <BoolField label="Close on Backdrop Click" checked={settings.privacy_settings_backdrop_close} onChange={(v) => set("privacy_settings_backdrop_close", v)} />
            <Field label="Trigger Position">
              <Select value={settings.privacy_settings_trigger_position} onValueChange={(v) => set("privacy_settings_trigger_position", v as GDPRAdminSettings["privacy_settings_trigger_position"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom_left">Bottom Left</SelectItem>
                  <SelectItem value="bottom_right">Bottom Right</SelectItem>
                  <SelectItem value="top_left">Top Left</SelectItem>
                  <SelectItem value="top_right">Top Right</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Behavior */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Behavior">
          <div className="grid grid-cols-2 gap-4">
            <BoolField label="Allow All on First Visit" checked={settings.first_visit_allow_all} onChange={(v) => set("first_visit_allow_all", v)} />
            <BoolField label="Allow All for Returning Visitors" checked={settings.returning_visitor_allow_all} onChange={(v) => set("returning_visitor_allow_all", v)} />
            <BoolField label="EU Only (Geo IP)" checked={settings.geo_ip_eu_only} onChange={(v) => set("geo_ip_eu_only", v)} />
          </div>
        </SettingsSection>
      </motion.div>

      {/* Features */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Features">
          <div className="grid grid-cols-2 gap-4">
            <BoolField label="Forget Me Enabled" checked={settings.forget_me_enabled} onChange={(v) => set("forget_me_enabled", v)} />
            <BoolField label="Request Data Enabled" checked={settings.request_data_enabled} onChange={(v) => set("request_data_enabled", v)} />
            <BoolField label="Contact DPO Enabled" checked={settings.contact_dpo_enabled} onChange={(v) => set("contact_dpo_enabled", v)} />
            <BoolField label="Data Rectification Enabled" checked={settings.data_rectification_enabled} onChange={(v) => set("data_rectification_enabled", v)} />
            <BoolField label="Data Breach Notifications" checked={settings.data_breach_notification_enabled} onChange={(v) => set("data_breach_notification_enabled", v)} />
            <BoolField label="Data Retention Enabled" checked={settings.data_retention_enabled} onChange={(v) => set("data_retention_enabled", v)} />
            <BoolField label="Privacy Policy Acceptance" checked={settings.privacy_policy_acceptance_enabled} onChange={(v) => set("privacy_policy_acceptance_enabled", v)} />
            <BoolField label="Terms Acceptance" checked={settings.terms_acceptance_enabled} onChange={(v) => set("terms_acceptance_enabled", v)} />
            <Field label="Data Retention Days">
              <Input type="number" value={settings.data_retention_days} onChange={(e) => set("data_retention_days", Number(e.target.value))} />
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Email Templates */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Email Templates">
          <div className="space-y-4">
            <Field label="DPO Email">
              <Input type="email" value={settings.dpo_email} onChange={(e) => set("dpo_email", e.target.value)} placeholder="dpo@example.com" />
            </Field>
            <Field label="Data Breach Email Subject">
              <Input value={settings.data_breach_subject} onChange={(e) => set("data_breach_subject", e.target.value)} />
            </Field>
            <Field label="Data Breach Email Body">
              <Textarea value={settings.data_breach_body} onChange={(e) => set("data_breach_body", e.target.value)} rows={5} className="font-mono text-xs" />
            </Field>
            <Field label="Policy Update Email Subject">
              <Input value={settings.policy_update_subject} onChange={(e) => set("policy_update_subject", e.target.value)} />
            </Field>
            <Field label="Policy Update Email Body">
              <Textarea value={settings.policy_update_body} onChange={(e) => set("policy_update_body", e.target.value)} rows={5} className="font-mono text-xs" />
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Integrations */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Integrations">
          <div className="grid grid-cols-2 gap-4">
            <Field label="GTM ID">
              <Input value={settings.gtm_id} onChange={(e) => set("gtm_id", e.target.value)} placeholder="GTM-XXXXXXX" />
            </Field>
            <Field label="Privacy Policy URL">
              <Input value={settings.privacy_policy_url} onChange={(e) => set("privacy_policy_url", e.target.value)} placeholder="https://example.com/privacy" />
            </Field>
          </div>
        </SettingsSection>
      </motion.div>

      {/* Custom CSS */}
      <motion.div variants={itemVariants}>
        <SettingsSection title="Custom CSS">
          <Field label="">
            <Textarea
              value={settings.custom_css}
              onChange={(e) => set("custom_css", e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder="/* Custom styles for the consent banner */"
            />
          </Field>
        </SettingsSection>
      </motion.div>

      {/* Actions */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 pt-2 pb-4">
          <Button onClick={save} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
          <Button variant="outline" onClick={sendPolicyUpdate} disabled={isSendingPolicy}>
            {isSendingPolicy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Send Policy Update
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Audit Logs Tab ───────────────────────────────────────────────────────────

function AuditLogsTab() {
  const PAGE_SIZE = 20
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = [`page=${page}`, `page_size=${PAGE_SIZE}`, search && `search=${search}`].filter(Boolean).join("&")
      const res = await getAuditLogs(params)
      setLogs(res.results)
      setCount(res.count)
    } catch {
      toast.error("Failed to load audit logs")
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Admin Audit Logs</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-8">No audit logs found</TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</TableCell>
                          <TableCell className="text-sm">{log.user ?? "System"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-mono">{log.action_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">{log.description}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {log.target_model && <span className="font-medium">{log.target_model}</span>}
                            {log.target_id && <span className="text-gray-400"> #{log.target_id}</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-400">{log.ip_address || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 pb-3">
                  <PaginationControls page={page} count={count} pageSize={PAGE_SIZE} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ─── Analytics Overview Tab ────────────────────────────────────────────────────

function AnalyticsOverviewTab() {
  const [analytics, setAnalytics] = useState<GDPRAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await getGDPRAnalytics()
        setAnalytics(data)
      } catch {
        toast.error("Failed to load analytics")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  if (!analytics) return null

  const statCards = [
    {
      label: "Consent Rate",
      value: `${analytics.consent_rate}%`,
      sub: `${analytics.total_with_consent} of ${analytics.total_consent_records} records`,
      icon: TrendingUp,
      color: analytics.consent_rate >= 80 ? "text-emerald-600" : analytics.consent_rate >= 50 ? "text-amber-600" : "text-red-600",
      bg: analytics.consent_rate >= 80 ? "bg-emerald-50" : analytics.consent_rate >= 50 ? "bg-amber-50" : "bg-red-50",
    },
    {
      label: "Accept Rate (30d)",
      value: `${analytics.accept_rate_30d}%`,
      sub: `${analytics.actions_30d.total} total actions`,
      icon: Check,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Open DSARs",
      value: String(analytics.dsars.open),
      sub: analytics.dsars.overdue > 0 ? `${analytics.dsars.overdue} overdue` : "None overdue",
      icon: FileText,
      color: analytics.dsars.overdue > 0 ? "text-red-600" : "text-gray-600",
      bg: analytics.dsars.overdue > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      label: "Active Breaches",
      value: String(analytics.breaches.active),
      sub: analytics.breaches.overdue_dpa > 0 ? `${analytics.breaches.overdue_dpa} DPA overdue` : "No DPA overdue",
      icon: AlertTriangle,
      color: analytics.breaches.active > 0 ? "text-orange-600" : "text-gray-600",
      bg: analytics.breaches.active > 0 ? "bg-orange-50" : "bg-gray-50",
    },
  ]

  const consentActions = [
    { label: "Accept All", value: analytics.actions_30d.allow_all, color: "bg-emerald-500" },
    { label: "Decline All", value: analytics.actions_30d.decline_all, color: "bg-red-400" },
    { label: "Individual Grant", value: analytics.actions_30d.grant, color: "bg-blue-500" },
    { label: "Individual Revoke", value: analytics.actions_30d.revoke, color: "bg-amber-500" },
  ]

  const maxAction = Math.max(...consentActions.map(a => a.value), 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <motion.div key={card.label} variants={itemVariants}>
            <Card className="border-gray-200/80">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{card.label}</p>
                    <p className={cn("mt-1.5 text-2xl font-bold tracking-tight", card.color)}>{card.value}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
                  </div>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", card.bg)}>
                    <card.icon className={cn("h-4.5 w-4.5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consent Actions (30d) */}
        <motion.div variants={itemVariants}>
          <Card className="border-gray-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                Consent Actions (Last 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {consentActions.map((action) => (
                <div key={action.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{action.label}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={cn("h-full rounded-lg transition-all duration-500", action.color)}
                      style={{ width: `${Math.max((action.value / maxAction) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-10 text-right tabular-nums">{action.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Authenticated users</span>
                <span className="text-xs font-medium text-gray-600">{analytics.authenticated_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Anonymous visitors</span>
                <span className="text-xs font-medium text-gray-600">{analytics.anonymous_visitors}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Total audit entries</span>
                <span className="text-xs font-medium text-gray-600">{analytics.history.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Per-Service Opt-In Rates */}
        <motion.div variants={itemVariants}>
          <Card className="border-gray-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                Service Opt-In Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.service_opt_in_rates.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">No deactivatable services configured</p>
              )}
              {analytics.service_opt_in_rates.map((svc) => (
                <div key={svc.id} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <span className="text-xs font-medium text-gray-700 block truncate">{svc.name}</span>
                    <span className="text-[10px] text-gray-400">{svc.category}</span>
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg bg-[#3B5BDB] transition-all duration-500"
                      style={{ width: `${Math.max(svc.opt_in_rate, 2)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="text-xs font-semibold text-gray-600 tabular-nums">{svc.opt_in_rate}%</span>
                    <span className="text-[10px] text-gray-400 block">{svc.opted_in}/{svc.opted_in + svc.opted_out}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Compliance Summary */}
      <motion.div variants={itemVariants}>
        <Card className="border-gray-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              Enterprise Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ComplianceItem
                label="Consent Recording"
                status="active"
                detail="Authenticated + anonymous, with immutable audit trail"
              />
              <ComplianceItem
                label="Consent Expiry"
                status="active"
                detail="Auto-expires per CNIL 13-month rule (395 days)"
              />
              <ComplianceItem
                label="Version Tracking"
                status="active"
                detail="Re-consent triggered on version bump"
              />
              <ComplianceItem
                label="Data Retention"
                status="active"
                detail="730-day retention, automated soft-delete"
              />
              <ComplianceItem
                label="DSAR Deadlines"
                status="active"
                detail="30-day default, Art. 12(3) extension, DPO email alerts"
              />
              <ComplianceItem
                label="Data Export"
                status="active"
                detail="Full consent history (no caps), JSON format"
              />
              <ComplianceItem
                label="Consent Log Cleanup"
                status="active"
                detail="Anonymous logs purged after 5 years (weekly task)"
              />
              <ComplianceItem
                label="Google Consent Mode v2"
                status="active"
                detail="gtag consent update + GTM DataLayer events"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function ComplianceItem({ label, status, detail }: { label: string; status: "active" | "warning" | "inactive"; detail: string }) {
  const colors = {
    active: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    warning: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    inactive: { badge: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("h-1.5 w-1.5 rounded-full", colors[status].dot)} />
        <span className="text-xs font-semibold text-gray-700">{label}</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{detail}</p>
    </div>
  )
}

// ─── Main GDPRAdmin Component ─────────────────────────────────────────────────

export default function GDPRAdmin() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <Cookie className="h-4 w-4" />
            Cookie Services
          </TabsTrigger>
          <TabsTrigger value="consent" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <Check className="h-4 w-4" />
            Consent Dashboard
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <FileText className="h-4 w-4" />
            Data Requests
          </TabsTrigger>
          <TabsTrigger value="breaches" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4" />
            Data Breaches
          </TabsTrigger>
          <TabsTrigger value="ropa" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <ClipboardList className="h-4 w-4" />
            Processing Activities
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
            <Shield className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="analytics" className="mt-0">
            <AnalyticsOverviewTab />
          </TabsContent>
          <TabsContent value="services" className="mt-0">
            <CookieServicesTab />
          </TabsContent>
          <TabsContent value="consent" className="mt-0">
            <ConsentDashboardTab />
          </TabsContent>
          <TabsContent value="requests" className="mt-0">
            <DataRequestsTab />
          </TabsContent>
          <TabsContent value="breaches" className="mt-0">
            <DataBreachesTab />
          </TabsContent>
          <TabsContent value="ropa" className="mt-0">
            <ProcessingActivitiesTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <GDPRSettingsTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-0">
            <AuditLogsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

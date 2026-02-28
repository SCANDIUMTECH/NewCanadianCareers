"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { SegmentRuleBuilder } from "@/components/admin/segment-rule-builder"
import {
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegment,
  refreshSegment,
  getSuppressionList,
  addSuppression,
  removeSuppression,
  importSuppressions,
  getConsents,
  updateConsent,
  getAudienceOverview,
} from "@/lib/api/admin-marketing"
import type {
  Segment,
  SegmentFilterRules,
  SegmentPreview,
  SuppressionEntry,
  SuppressionReason,
  MarketingConsent,
  ConsentStatus,
  AudienceOverview,
} from "@/lib/api/admin-marketing"
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Edit2,
  Upload,
  Users,
  UsersRound,
  ShieldCheck,
  MailCheck,
  UserMinus,
} from "lucide-react"
import { toast } from "sonner"

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

export default function AudiencesPage() {
  const [activeTab, setActiveTab] = useState("segments")
  const [overview, setOverview] = useState<AudienceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAudienceOverview()
      setOverview(data)
    } catch (err) {
      console.error("Failed to fetch overview:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <UsersRound className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Audiences</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage segments, suppression lists, and consent records
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Contacts"
              value={overview?.total_contacts ?? 0}
              icon={<Users className="h-4 w-4" />}
              gradient="from-slate-600 to-slate-800"
              bgAccent="bg-slate-500"
            />
            <StatCard
              title="Opted In"
              value={overview?.opted_in ?? 0}
              icon={<MailCheck className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
            />
            <StatCard
              title="Suppressed"
              value={overview?.suppressed_count ?? 0}
              icon={<ShieldCheck className="h-4 w-4" />}
              gradient="from-red-500 to-rose-600"
              bgAccent="bg-red-500"
            />
            <StatCard
              title="Segments"
              value={overview?.segment_count ?? 0}
              icon={<UserMinus className="h-4 w-4" />}
              gradient="from-blue-500 to-indigo-600"
              bgAccent="bg-blue-500"
            />
          </>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="suppression">Suppression List</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
          </TabsList>

          <TabsContent value="segments" className="mt-6">
            <SegmentsTab onRefreshOverview={fetchOverview} />
          </TabsContent>

          <TabsContent value="suppression" className="mt-6">
            <SuppressionTab onRefreshOverview={fetchOverview} />
          </TabsContent>

          <TabsContent value="consents" className="mt-6">
            <ConsentsTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// ─── Stat Card (Standard Admin Pattern) ──────────────────────────────

function StatCard({
  title,
  value,
  icon,
  gradient,
  bgAccent,
}: {
  title: string
  value: number
  icon: React.ReactNode
  gradient: string
  bgAccent: string
}) {
  return (
    <Card className="relative overflow-hidden group">
      <div className={cn(
        "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
        bgAccent
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        gradient
      )} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            gradient
          )}>
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-20" />
      </CardContent>
    </Card>
  )
}

// ─── Segments Tab ────────────────────────────────────────────────────

function SegmentsTab({ onRefreshOverview }: { onRefreshOverview: () => void }) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [previewData, setPreviewData] = useState<SegmentPreview | null>(null)
  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const fetchSegments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getSegments({
        search: search || undefined,
        segment_type: typeFilter !== "all" ? (typeFilter as "static" | "dynamic") : undefined,
      })
      setSegments(res.results)
    } catch (err) {
      console.error("Failed to fetch segments:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    fetchSegments()
  }, [fetchSegments])

  const handlePreview = async (id: number) => {
    setPreviewingId(id)
    try {
      const data = await previewSegment(id)
      setPreviewData(data)
    } catch (err) {
      console.error("Failed to preview segment:", err)
    } finally {
      setPreviewingId(null)
    }
  }

  const handleRefresh = async (id: number) => {
    setRefreshingId(id)
    try {
      await refreshSegment(id)
      fetchSegments()
    } catch (err) {
      console.error("Failed to refresh segment:", err)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this segment? This action cannot be undone.")) return
    try {
      await deleteSegment(id)
      fetchSegments()
      onRefreshOverview()
    } catch (err) {
      console.error("Failed to delete segment:", err)
    }
  }

  const handleCreated = () => {
    setShowCreate(false)
    setEditingSegment(null)
    fetchSegments()
    onRefreshOverview()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search segments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="static">Static</SelectItem>
                <SelectItem value="dynamic">Dynamic</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Create Segment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Est. Size</TableHead>
              <TableHead>Last Computed</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No segments found
                </TableCell>
              </TableRow>
            ) : (
              segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{seg.name}</p>
                      {seg.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                          {seg.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        seg.segment_type === "dynamic"
                          ? "border-blue-200 text-blue-600 bg-blue-50"
                          : "border-gray-200 text-gray-600 bg-gray-50"
                      )}
                    >
                      {seg.segment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {new Intl.NumberFormat("en-US").format(seg.estimated_size)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {seg.last_computed_at
                      ? new Date(seg.last_computed_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {new Date(seg.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreview(seg.id)}
                        disabled={previewingId === seg.id}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {seg.segment_type === "dynamic" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRefresh(seg.id)}
                          disabled={refreshingId === seg.id}
                        >
                          <RefreshCw className={cn("h-4 w-4", refreshingId === seg.id && "animate-spin")} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingSegment(seg)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(seg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Segment Preview</DialogTitle>
            <DialogDescription>
              Estimated {previewData?.estimated_count.toLocaleString()} matching contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sample users:</p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData?.sample_users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!previewData?.sample_users || previewData.sample_users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        No matching users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewData(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <SegmentFormDialog
        open={showCreate || !!editingSegment}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false)
            setEditingSegment(null)
          }
        }}
        segment={editingSegment}
        onSaved={handleCreated}
      />
    </div>
  )
}

function SegmentFormDialog({
  open,
  onOpenChange,
  segment,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: Segment | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [segmentType, setSegmentType] = useState<"static" | "dynamic">("dynamic")
  const [filterRules, setFilterRules] = useState<SegmentFilterRules>({
    rules: [],
    logic: "AND",
  })
  const [isSaving, setIsSaving] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (segment) {
        setName(segment.name)
        setDescription(segment.description || "")
        setSegmentType(segment.segment_type)
        setFilterRules(segment.filter_rules || { rules: [], logic: "AND" })
      } else {
        setName("")
        setDescription("")
        setSegmentType("dynamic")
        setFilterRules({ rules: [], logic: "AND" })
      }
    }
  }, [open, segment])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      if (segment) {
        await updateSegment(segment.id, {
          name,
          description,
          filter_rules: segmentType === "dynamic" ? filterRules : undefined,
        })
      } else {
        await createSegment({
          name,
          description,
          segment_type: segmentType,
          filter_rules: segmentType === "dynamic" ? filterRules : undefined,
        })
      }
      onSaved()
    } catch (err) {
      console.error("Failed to save segment:", err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" ref={dialogRef}>
        <DialogHeader>
          <DialogTitle>{segment ? "Edit Segment" : "Create Segment"}</DialogTitle>
          <DialogDescription>
            {segment
              ? "Update the segment name, description, or filter rules."
              : "Define a new audience segment for targeting."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seg-name">Name</Label>
              <Input
                id="seg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Active Employers"
              />
            </div>
            {!segment && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={segmentType}
                  onValueChange={(v) => setSegmentType(v as "static" | "dynamic")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dynamic (rule-based)</SelectItem>
                    <SelectItem value="static">Static (manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="seg-desc">Description</Label>
            <Textarea
              id="seg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {segmentType === "dynamic" && (
            <div className="space-y-2">
              <Label>Filter Rules</Label>
              <div className="rounded-lg border p-4 bg-muted/30">
                <SegmentRuleBuilder
                  value={filterRules}
                  onChange={setFilterRules}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving ? "Saving..." : segment ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Suppression Tab ─────────────────────────────────────────────────

function SuppressionTab({ onRefreshOverview }: { onRefreshOverview: () => void }) {
  const [entries, setEntries] = useState<SuppressionEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [reasonFilter, setReasonFilter] = useState<string>("all")
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Add form
  const [addEmail, setAddEmail] = useState("")
  const [addReason, setAddReason] = useState<SuppressionReason>("admin")
  const [addNotes, setAddNotes] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  // Import form
  const [importEmails, setImportEmails] = useState("")
  const [importReason, setImportReason] = useState<SuppressionReason>("admin")
  const [isImporting, setIsImporting] = useState(false)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getSuppressionList({
        search: search || undefined,
        reason: reasonFilter !== "all" ? (reasonFilter as SuppressionReason) : undefined,
      })
      setEntries(res.results)
    } catch (err) {
      console.error("Failed to fetch suppression list:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, reasonFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAdd = async () => {
    if (!addEmail.trim()) return
    setIsAdding(true)
    try {
      await addSuppression({ email: addEmail, reason: addReason, notes: addNotes || undefined })
      setShowAdd(false)
      setAddEmail("")
      setAddNotes("")
      fetchEntries()
      onRefreshOverview()
    } catch (err) {
      console.error("Failed to add suppression:", err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this entry from the suppression list?")) return
    try {
      await removeSuppression(id)
      fetchEntries()
      onRefreshOverview()
    } catch (err) {
      console.error("Failed to remove suppression:", err)
    }
  }

  const handleImport = async () => {
    const emails = importEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length === 0) return
    setIsImporting(true)
    try {
      const result = await importSuppressions({ emails, reason: importReason })
      toast.success(`Import complete: ${result.created} created, ${result.skipped} skipped`)
      setShowImport(false)
      setImportEmails("")
      fetchEntries()
      onRefreshOverview()
    } catch (err) {
      console.error("Failed to import suppressions:", err)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="bounce_hard">Hard Bounce</SelectItem>
                <SelectItem value="bounce_soft">Soft Bounce</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowImport(true)}>
              <Upload className="mr-1 h-4 w-4" />
              Import
            </Button>
            <Button size="sm" className="h-9" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No suppression entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatReason(entry.reason)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.source || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {entry.notes || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Suppression Entry</DialogTitle>
            <DialogDescription>Add an email to the suppression list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={addReason} onValueChange={(v) => setAddReason(v as SuppressionReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="bounce_hard">Hard Bounce</SelectItem>
                  <SelectItem value="bounce_soft">Soft Bounce</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isAdding || !addEmail.trim()}>
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Suppression Entries</DialogTitle>
            <DialogDescription>
              Paste email addresses separated by commas, semicolons, or new lines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emails</Label>
              <Textarea
                value={importEmails}
                onChange={(e) => setImportEmails(e.target.value)}
                placeholder={"user1@example.com\nuser2@example.com"}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={importReason}
                onValueChange={(v) => setImportReason(v as SuppressionReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="bounce_hard">Hard Bounce</SelectItem>
                  <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !importEmails.trim()}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Consents Tab ────────────────────────────────────────────────────

function ConsentsTab() {
  const [consents, setConsents] = useState<MarketingConsent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const fetchConsents = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getConsents({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as ConsentStatus) : undefined,
      })
      setConsents(res.results)
    } catch (err) {
      console.error("Failed to fetch consents:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchConsents()
  }, [fetchConsents])

  const handleUpdateStatus = async (id: number, status: ConsentStatus) => {
    setUpdatingId(id)
    try {
      await updateConsent(id, { status, source: "admin_manual" })
      fetchConsents()
    } catch (err) {
      console.error("Failed to update consent:", err)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="opted_in">Opted In</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Express Consent</TableHead>
              <TableHead>Consented At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : consents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No consent records found
                </TableCell>
              </TableRow>
            ) : (
              consents.map((consent) => (
                <TableRow key={consent.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{consent.user_name}</p>
                      <p className="text-xs text-muted-foreground">{consent.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        consent.status === "opted_in" && "border-green-200 text-green-600 bg-green-50",
                        consent.status === "opted_out" && "border-gray-200 text-gray-600 bg-gray-50",
                        consent.status === "unsubscribed" && "border-amber-200 text-amber-600 bg-amber-50",
                        consent.status === "bounced" && "border-red-200 text-red-600 bg-red-50",
                        consent.status === "complained" && "border-red-200 text-red-600 bg-red-50"
                      )}
                    >
                      {consent.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {consent.source || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={consent.express_consent ? "default" : "secondary"} className="text-xs">
                      {consent.express_consent ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {consent.consented_at
                      ? new Date(consent.consented_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={consent.status}
                      onValueChange={(v) => handleUpdateStatus(consent.id, v as ConsentStatus)}
                      disabled={updatingId === consent.id}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opted_in">Opt In</SelectItem>
                        <SelectItem value="opted_out">Opt Out</SelectItem>
                        <SelectItem value="unsubscribed">Unsubscribe</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatReason(reason: string): string {
  return reason
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

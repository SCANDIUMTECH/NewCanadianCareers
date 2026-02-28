"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  getJourneys,
  deleteJourney,
  duplicateJourney,
  activateJourney,
  pauseJourney,
  archiveJourney,
} from "@/lib/api/admin-marketing"
import type { JourneyListItem, JourneyStatus } from "@/lib/api/admin-marketing"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Archive,
  Trash2,
  GitBranchPlus,
  Users,
} from "lucide-react"

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

const STATUS_COLORS: Record<JourneyStatus, string> = {
  draft: "border-gray-200 text-gray-500 bg-gray-50",
  active: "border-green-200 text-green-600 bg-green-50",
  paused: "border-amber-200 text-amber-600 bg-amber-50",
  archived: "border-red-200 text-red-500 bg-red-50",
}

const TRIGGER_LABELS: Record<string, string> = {
  user_signup: "User Signup",
  package_purchase: "Package Purchase",
  job_published: "Job Published",
  manual: "Manual",
  segment_entry: "Segment Entry",
}

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<JourneyListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchJourneys = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getJourneys({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as JourneyStatus) : undefined,
      })
      setJourneys(res.results)
    } catch (err) {
      console.error("Failed to fetch journeys:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchJourneys()
  }, [fetchJourneys])

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateJourney(id)
      fetchJourneys()
    } catch (err) {
      console.error("Failed to duplicate:", err)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await activateJourney(id)
      fetchJourneys()
    } catch (err) {
      console.error("Failed to activate:", err)
    }
  }

  const handlePause = async (id: number) => {
    try {
      await pauseJourney(id)
      fetchJourneys()
    } catch (err) {
      console.error("Failed to pause:", err)
    }
  }

  const handleArchive = async (id: number) => {
    try {
      await archiveJourney(id)
      fetchJourneys()
    } catch (err) {
      console.error("Failed to archive:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this journey? This action cannot be undone.")) return
    try {
      await deleteJourney(id)
      fetchJourneys()
    } catch (err) {
      console.error("Failed to delete:", err)
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <GitBranchPlus className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Journeys</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Automated workflows that guide users through multi-step sequences
            </p>
          </div>
        </div>
        <Button asChild className="gap-1.5 shadow-sm">
          <Link href="/admin/marketing/journeys/new">
            <Plus className="h-4 w-4" />
            Create Journey
          </Link>
        </Button>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search journeys..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Steps</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : journeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
                        <GitBranchPlus className="h-8 w-8 text-violet-400" />
                      </div>
                      <p className="font-semibold text-foreground text-lg">No journeys yet</p>
                      <p className="text-sm mt-1 mb-6 max-w-sm">Create your first automation journey to get started</p>
                      <Button asChild size="sm" className="gap-1.5">
                        <Link href="/admin/marketing/journeys/new">
                          <Plus className="h-4 w-4" />
                          Create Journey
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                journeys.map((journey) => (
                  <TableRow key={journey.id}>
                    <TableCell>
                      <Link
                        href={`/admin/marketing/journeys/${journey.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {journey.name}
                      </Link>
                      {journey.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {journey.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs capitalize", STATUS_COLORS[journey.status])}
                      >
                        {journey.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TRIGGER_LABELS[journey.trigger_type] || journey.trigger_type}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {journey.step_count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="flex items-center justify-end gap-1 text-sm">
                        <Users className="h-3 w-3 text-green-500" />
                        {journey.active_enrollments_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {journey.completed_enrollments_count}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                      {journey.total_enrollments_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(journey.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/marketing/journeys/${journey.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(journey.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {journey.status === "active" && (
                            <DropdownMenuItem onClick={() => handlePause(journey.id)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {(journey.status === "draft" || journey.status === "paused") && (
                            <DropdownMenuItem onClick={() => handleActivate(journey.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {(journey.status === "draft" || journey.status === "paused") && (
                            <DropdownMenuItem onClick={() => handleArchive(journey.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(journey.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </motion.div>
  )
}

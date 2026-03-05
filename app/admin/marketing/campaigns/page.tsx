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
  getCampaigns,
  deleteCampaign,
  duplicateCampaign,
  pauseCampaign,
  cancelCampaign,
  sendCampaign,
} from "@/lib/api/admin-marketing"
import type { Campaign, CampaignStatus } from "@/lib/api/admin-marketing"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  XCircle,
  Trash2,
  Send,
  Megaphone,
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

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "border-slate-200 text-slate-600 bg-slate-50",
  scheduled: "border-sky/20 text-sky bg-sky/10",
  pending_approval: "border-amber-200 text-amber-600 bg-amber-50",
  approved: "border-emerald-200 text-emerald-600 bg-emerald-50",
  sending: "border-primary/20 text-primary bg-primary/5",
  sent: "border-green-200 text-green-700 bg-green-50",
  paused: "border-amber-200 text-amber-700 bg-amber-50",
  canceled: "border-slate-200 text-slate-500 bg-slate-50",
  failed: "border-red-200 text-red-600 bg-red-50",
}

const STATUS_DOTS: Record<CampaignStatus, string> = {
  draft: "bg-slate-400",
  scheduled: "bg-sky",
  pending_approval: "bg-amber-500",
  approved: "bg-emerald-500",
  sending: "bg-primary animate-pulse",
  sent: "bg-green-600",
  paused: "bg-amber-600",
  canceled: "bg-slate-400",
  failed: "bg-red-500",
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getCampaigns({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as CampaignStatus) : undefined,
      })
      setCampaigns(res.results)
    } catch (err) {
      console.error("Failed to fetch campaigns:", err)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateCampaign(id)
      fetchCampaigns()
    } catch (err) {
      console.error("Failed to duplicate:", err)
    }
  }

  const handlePause = async (id: number) => {
    try {
      await pauseCampaign(id)
      fetchCampaigns()
    } catch (err) {
      console.error("Failed to pause:", err)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this campaign? Pending emails will not be sent.")) return
    try {
      await cancelCampaign(id)
      fetchCampaigns()
    } catch (err) {
      console.error("Failed to cancel:", err)
    }
  }

  const handleSend = async (id: number) => {
    if (!confirm("Send this campaign now?")) return
    try {
      await sendCampaign(id)
      fetchCampaigns()
    } catch (err) {
      console.error("Failed to send:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this campaign? This action cannot be undone.")) return
    try {
      await deleteCampaign(id)
      fetchCampaigns()
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center shadow-lg shadow-sky/20">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Create and manage email campaigns
            </p>
          </div>
        </div>
        <Button asChild className="gap-1.5 shadow-sm">
          <Link href="/admin/marketing/campaigns/new">
            <Plus className="h-4 w-4" />
            Create Campaign
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
                  placeholder="Search campaigns..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead className="text-right">Click Rate</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky/10 to-sky/5 mb-4">
                        <Megaphone className="h-8 w-8 text-sky/60" />
                      </div>
                      <p className="font-semibold text-foreground text-lg">No campaigns yet</p>
                      <p className="text-sm mt-1 mb-6 max-w-sm">Create your first email campaign to start engaging with your audience</p>
                      <Button asChild size="sm" className="gap-1.5">
                        <Link href="/admin/marketing/campaigns/new">
                          <Plus className="h-4 w-4" />
                          Create Campaign
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="group">
                    <TableCell>
                      <Link
                        href={`/admin/marketing/campaigns/${campaign.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {campaign.name}
                      </Link>
                      {campaign.is_ab_test && (
                        <Badge variant="outline" className="ml-2 text-[10px] border-primary/20 text-primary bg-primary/5">
                          A/B
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs gap-1.5", STATUS_COLORS[campaign.status])}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOTS[campaign.status])} />
                        {formatStatus(campaign.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.segment_name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {campaign.total_recipients > 0
                        ? campaign.total_recipients.toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {campaign.delivered_count > 0 ? (
                        <span className={cn(
                          "font-medium",
                          Number(campaign.open_rate) >= 25 ? "text-green-600" :
                          Number(campaign.open_rate) >= 15 ? "text-foreground" :
                          "text-amber-600"
                        )}>
                          {campaign.open_rate}%
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {campaign.delivered_count > 0 ? (
                        <span className={cn(
                          "font-medium",
                          Number(campaign.click_rate) >= 5 ? "text-green-600" :
                          Number(campaign.click_rate) >= 2 ? "text-foreground" :
                          "text-amber-600"
                        )}>
                          {campaign.click_rate}%
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.scheduled_at
                        ? new Date(campaign.scheduled_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/marketing/campaigns/${campaign.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(campaign.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {campaign.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleSend(campaign.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                          {campaign.status === "sending" && (
                            <DropdownMenuItem onClick={() => handlePause(campaign.id)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {["draft", "scheduled", "sending", "paused"].includes(campaign.status) && (
                            <DropdownMenuItem onClick={() => handleCancel(campaign.id)}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          {campaign.status === "draft" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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

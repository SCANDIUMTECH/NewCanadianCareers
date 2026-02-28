"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  getAdminJobs,
  getAdminJobStats,
  approveJob,
  rejectJob,
} from "@/lib/api/admin-jobs"
import type { AdminJob, AdminJobStats } from "@/lib/admin/types"
import {
  Shield,
  Check,
  X,
  Flag,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  Loader2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

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

interface ModerationItem {
  id: number
  type: "new_job" | "flagged" | "reported"
  title: string
  company: string
  submittedAt: string
  flags: string[]
  content: string
  salary: string | null
  location: string
  reports?: number
}

function mapAdminJobToModerationItem(job: AdminJob): ModerationItem {
  const flags: string[] = []
  if (!job.salary_min && !job.salary_max) flags.push("salary_missing")
  if (job.report_count > 0) flags.push("has_reports")

  const type: ModerationItem["type"] = job.report_count > 0 ? "reported" : "new_job"
  const salaryStr = job.salary_min && job.salary_max
    ? `${job.salary_currency || "$"}${job.salary_min.toLocaleString()} - ${job.salary_currency || "$"}${job.salary_max.toLocaleString()}`
    : job.salary_min
      ? `${job.salary_currency || "$"}${job.salary_min.toLocaleString()}+`
      : null

  return {
    id: job.id,
    type,
    title: job.title,
    company: job.company.name,
    submittedAt: job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "",
    flags,
    content: `${job.title} at ${job.company.name} - ${job.location_type} position in ${job.location}`,
    salary: salaryStr,
    location: job.location,
    reports: job.report_count > 0 ? job.report_count : undefined,
  }
}

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = useState("")
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([])
  const [stats, setStats] = useState<AdminJobStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPending, setTotalPending] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        getAdminJobs({ status: "pending", page, page_size: pageSize }),
        getAdminJobStats(),
      ])
      setModerationQueue(jobsResponse.results.map(mapAdminJobToModerationItem))
      setTotalPending(jobsResponse.count)
      setStats(statsResponse)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load moderation data"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pendingItems = moderationQueue.filter((item) => item.type === "new_job" || item.type === "flagged")
  const reportedItems = moderationQueue.filter((item) => item.type === "reported" || item.reports)

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      if (action === "approve") {
        await approveJob(selectedItem.id, { reason: reason || undefined })
      } else {
        await rejectJob(selectedItem.id, { reason: reason || "Rejected by admin", notify_poster: true })
      }
      // Remove the item from the local queue
      setModerationQueue(prev => prev.filter(item => item.id !== selectedItem.id))
      setActionDialog(null)
      setSelectedItem(null)
      setReason("")
      // Refresh stats
      getAdminJobStats().then(setStats).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} job`
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Moderation Queue</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Review and moderate job postings
              {totalPending > moderationQueue.length && (
                <span className="ml-1 text-amber-600 font-medium">
                  (showing {moderationQueue.length} of {totalPending})
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <StatCard title="Pending Review" value={stats ? String(stats.pending) : "--"} color="amber" icon={<Clock className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" />
        <StatCard title="Flagged Jobs" value={stats ? String(stats.flagged) : "--"} color="red" icon={<AlertTriangle className="h-4 w-4" />} gradient="from-red-500 to-rose-600" />
        <StatCard title="Published" value={stats ? String(stats.published) : "--"} color="green" icon={<Check className="h-4 w-4" />} gradient="from-green-500 to-emerald-600" />
        <StatCard title="Total Jobs" value={stats ? String(stats.total) : "--"} icon={<FileText className="h-4 w-4" />} gradient="from-slate-600 to-slate-800" />
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Review
              <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-amber-500">{pendingItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reported">
              Reported
              <Badge className="ml-2 h-5 px-1.5 text-[10px]" variant="destructive">{reportedItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Queue List */}
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <ModerationCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>

              {/* Detail Panel */}
              <AnimatePresence mode="wait">
                {selectedItem ? (
                  <motion.div
                    key={selectedItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="sticky top-20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{selectedItem.title}</CardTitle>
                            <CardDescription>{selectedItem.company}</CardDescription>
                          </div>
                          {selectedItem.reports && (
                            <Badge variant="destructive">
                              {selectedItem.reports} reports
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Flags */}
                        {selectedItem.flags.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Flags Detected</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedItem.flags.map((flag) => (
                                <Badge
                                  key={flag}
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-700"
                                >
                                  {formatFlag(flag)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Job Details */}
                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Location</span>
                            <span>{selectedItem.location}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Salary</span>
                            <span>{selectedItem.salary || "Not specified"}</span>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="space-y-2 pt-2">
                          <p className="text-sm font-medium">Job Description</p>
                          <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            {selectedItem.content}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setActionDialog("approve")}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={() => setActionDialog("reject")}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Flag className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center rounded-lg border border-dashed h-[400px]"
                  >
                    <p className="text-muted-foreground">Select an item to review</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="reported" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {reportedItems.map((item) => (
                  <ModerationCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
              {selectedItem && reportedItems.includes(selectedItem) && (
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedItem.title}</CardTitle>
                    <CardDescription>{selectedItem.company}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Detailed view for reported item
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Moderation history will be displayed here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPending > pageSize && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalPending)} of {totalPending}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= totalPending}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "approve" ? "Approve Job Posting" : "Reject Job Posting"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === "approve"
                ? "This job will be published immediately."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog === "reject" && (
            <Textarea
              placeholder="Enter reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog === "approve" ? "default" : "destructive"}
              onClick={() => handleAction(actionDialog!)}
              disabled={isSubmitting || (actionDialog === "reject" && !reason.trim())}
            >
              {isSubmitting ? "Processing..." : actionDialog === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function ModerationCard({
  item,
  isSelected,
  onClick,
}: {
  item: ModerationItem
  isSelected: boolean
  onClick: () => void
}) {
  const borderColor = item.type === "reported" ? "border-l-red-500" : item.flags.length > 0 ? "border-l-amber-500" : "border-l-blue-500"
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4 group/card relative overflow-hidden",
        borderColor,
        isSelected && "ring-2 ring-primary shadow-md"
      )}
      onClick={onClick}
    >
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn(
                "text-xs font-medium",
                item.type === "reported" ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              )}>
                {item.company.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-tight">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.company}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground">{item.submittedAt}</span>
                {item.flags.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-200 bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                    {item.flags.length} flag{item.flags.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {item.reports && (
            <Badge variant="destructive" className="text-[10px]">
              {item.reports} reports
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value, color, icon, gradient }: { title: string; value: string; color?: string; icon?: React.ReactNode; gradient?: string }) {
  return (
    <Card className="relative overflow-hidden group">
      {gradient && (
        <>
          <div className={cn(
            "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]",
            color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : color === "red" ? "bg-red-500" : "bg-slate-500"
          )} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
        </>
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
          color === "green" && "text-green-600",
          color === "amber" && "text-amber-600",
          color === "red" && "text-red-600"
        )}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function formatFlag(flag: string): string {
  return flag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

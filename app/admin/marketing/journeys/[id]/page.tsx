"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  getJourney,
  getJourneyStats,
  getJourneyEnrollments,
  deleteJourney,
  activateJourney,
  pauseJourney,
  archiveJourney,
  duplicateJourney,
  createJourneyStep,
  deleteJourneyStep,
} from "@/lib/api/admin-marketing"
import type {
  Journey,
  JourneyStep,
  JourneyStats,
  JourneyEnrollment,
  JourneyStepType,
  JourneyStatus,
} from "@/lib/api/admin-marketing"
import {
  ArrowLeft,
  Play,
  Pause,
  Archive,
  Copy,
  Trash2,
  MoreHorizontal,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Target,
  Mail,
  Clock,
  GitBranch,
  Ticket,
  Tag,
  Webhook,
  UserPlus,
  Settings2,
  GripVertical,
  ArrowDown,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
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

const STEP_ICONS: Record<JourneyStepType, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  issue_coupon: <Ticket className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
  update_attribute: <Settings2 className="h-4 w-4" />,
  add_to_segment: <UserPlus className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
}

const STEP_COLORS: Record<JourneyStepType, string> = {
  send_email: "bg-sky/5 text-sky border-l-sky",
  wait: "bg-amber-50 text-amber-700 border-l-amber-500",
  condition: "bg-primary/5 text-primary border-l-primary",
  issue_coupon: "bg-green-50 text-green-700 border-l-green-500",
  add_tag: "bg-teal-50 text-teal-700 border-l-teal-500",
  remove_tag: "bg-orange-50 text-orange-700 border-l-orange-500",
  update_attribute: "bg-gray-50 text-gray-700 border-l-gray-500",
  add_to_segment: "bg-sky/5 text-sky border-l-sky",
  webhook: "bg-destructive/10 text-destructive border-l-destructive",
}

const STEP_LABELS: Record<JourneyStepType, string> = {
  send_email: "Send Email",
  wait: "Wait",
  condition: "Condition",
  issue_coupon: "Issue Coupon",
  add_tag: "Add Tag",
  remove_tag: "Remove Tag",
  update_attribute: "Update Attribute",
  add_to_segment: "Add to Segment",
  webhook: "Webhook",
}

const TRIGGER_LABELS: Record<string, string> = {
  user_signup: "User Signup",
  package_purchase: "Package Purchase",
  job_published: "Job Published",
  manual: "Manual Enrollment",
  segment_entry: "Segment Entry",
}

export default function JourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [journey, setJourney] = useState<Journey | null>(null)
  const [stats, setStats] = useState<JourneyStats | null>(null)
  const [enrollments, setEnrollments] = useState<JourneyEnrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState("steps")
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [newStepType, setNewStepType] = useState<JourneyStepType>("send_email")
  const [newStepName, setNewStepName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const journeyId = parseInt(id)

  const fetchJourney = useCallback(async () => {
    setIsLoading(true)
    try {
      const [j, s] = await Promise.all([
        getJourney(journeyId),
        getJourneyStats(journeyId),
      ])
      setJourney(j)
      setStats(s)
    } catch (err) {
      console.error("Failed to fetch journey:", err)
    } finally {
      setIsLoading(false)
    }
  }, [journeyId])

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await getJourneyEnrollments(journeyId)
      setEnrollments(res.results)
    } catch (err) {
      console.error("Failed to fetch enrollments:", err)
    }
  }, [journeyId])

  useEffect(() => {
    fetchJourney()
  }, [fetchJourney])

  useEffect(() => {
    if (tab === "enrollments") {
      fetchEnrollments()
    }
  }, [tab, fetchEnrollments])

  const handleActivate = async () => {
    if (!journey) return
    try {
      const updated = await activateJourney(journey.id)
      setJourney(updated)
    } catch (err) {
      console.error("Failed to activate:", err)
    }
  }

  const handlePause = async () => {
    if (!journey) return
    try {
      const updated = await pauseJourney(journey.id)
      setJourney(updated)
    } catch (err) {
      console.error("Failed to pause:", err)
    }
  }

  const handleArchive = async () => {
    if (!journey) return
    try {
      const updated = await archiveJourney(journey.id)
      setJourney(updated)
    } catch (err) {
      console.error("Failed to archive:", err)
    }
  }

  const handleDuplicate = async () => {
    if (!journey) return
    try {
      const dup = await duplicateJourney(journey.id)
      router.push(`/admin/marketing/journeys/${dup.id}`)
    } catch (err) {
      console.error("Failed to duplicate:", err)
    }
  }

  const handleDelete = async () => {
    if (!journey) return
    if (!confirm("Delete this journey? This action cannot be undone.")) return
    try {
      await deleteJourney(journey.id)
      router.push("/admin/marketing/journeys")
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  const handleAddStep = async () => {
    if (!journey) return
    setIsSaving(true)
    try {
      await createJourneyStep(journey.id, {
        step_type: newStepType,
        name: newStepName || STEP_LABELS[newStepType],
        sort_order: (journey.steps?.length || 0) * 10 + 10,
        config: {},
      })
      setAddStepOpen(false)
      setNewStepName("")
      setNewStepType("send_email")
      fetchJourney()
    } catch (err) {
      console.error("Failed to add step:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStep = async (stepId: number) => {
    if (!journey) return
    if (!confirm("Delete this step?")) return
    try {
      await deleteJourneyStep(journey.id, stepId)
      fetchJourney()
    } catch (err) {
      console.error("Failed to delete step:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!journey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Journey not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/admin/marketing/journeys">Back to Journeys</Link>
        </Button>
      </div>
    )
  }

  const isEditable = journey.status === "draft" || journey.status === "paused"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link href="/admin/marketing/journeys">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-sm shadow-primary/20 flex-shrink-0">
            <GitBranch className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{journey.name}</h1>
              <Badge
                variant="outline"
                className={cn("text-xs capitalize", STATUS_COLORS[journey.status])}
              >
                {journey.status}
              </Badge>
            </div>
            {journey.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{journey.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {journey.status === "active" && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="mr-1 h-4 w-4" />
              Pause
            </Button>
          )}
          {(journey.status === "draft" || journey.status === "paused") && (
            <Button size="sm" onClick={handleActivate}>
              <Play className="mr-1 h-4 w-4" />
              Activate
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {isEditable && (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-4 pb-4 relative">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <div className="h-8 w-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                Active
              </div>
              <p className="text-2xl font-semibold tabular-nums">{stats.active_enrollments}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-sky rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-4 pb-4 relative">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <div className="h-8 w-8 rounded-lg bg-sky/10 text-sky flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                Completed
              </div>
              <p className="text-2xl font-semibold tabular-nums">{stats.completed_enrollments}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-4 pb-4 relative">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                Emails Sent
              </div>
              <p className="text-2xl font-semibold tabular-nums">{stats.emails_sent}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]" />
            <CardContent className="pt-4 pb-4 relative">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Ticket className="h-4 w-4" />
                </div>
                Coupons Issued
              </div>
              <p className="text-2xl font-semibold tabular-nums">{stats.coupons_issued}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>

          {/* Steps Tab */}
          <TabsContent value="steps" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {journey.steps.length} step{journey.steps.length !== 1 ? "s" : ""} in this journey
              </p>
              {isEditable && (
                <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1 h-4 w-4" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Journey Step</DialogTitle>
                      <DialogDescription>
                        Choose a step type and configure it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Step Type</Label>
                        <Select value={newStepType} onValueChange={(v) => setNewStepType(v as JourneyStepType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_email">Send Email</SelectItem>
                            <SelectItem value="wait">Wait</SelectItem>
                            <SelectItem value="condition">Condition</SelectItem>
                            <SelectItem value="issue_coupon">Issue Coupon</SelectItem>
                            <SelectItem value="add_tag">Add Tag</SelectItem>
                            <SelectItem value="remove_tag">Remove Tag</SelectItem>
                            <SelectItem value="update_attribute">Update Attribute</SelectItem>
                            <SelectItem value="add_to_segment">Add to Segment</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Step Name</Label>
                        <Input
                          placeholder={STEP_LABELS[newStepType]}
                          value={newStepName}
                          onChange={(e) => setNewStepName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleAddStep} disabled={isSaving}>
                        {isSaving ? "Adding..." : "Add Step"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Step List (visual) */}
            <div className="space-y-2">
              {journey.steps.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <GitBranch className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">No steps yet</p>
                    <p className="text-sm mt-1">Add steps to build your automation flow</p>
                  </CardContent>
                </Card>
              ) : (
                journey.steps
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((step, idx) => (
                    <div key={step.id}>
                      {idx > 0 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <Card className={cn("border-l-[3px] transition-shadow hover:shadow-md", STEP_COLORS[step.step_type])}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isEditable && (
                                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                              )}
                              <div className="flex items-center gap-2">
                                {STEP_ICONS[step.step_type]}
                                <div>
                                  <p className="font-medium text-sm">
                                    {step.name || STEP_LABELS[step.step_type]}
                                  </p>
                                  <p className="text-xs opacity-70">
                                    {STEP_LABELS[step.step_type]}
                                    {step.step_type === "condition" && (
                                      <span> (branches: {step.true_branch ? "Yes" : "No"} / {step.false_branch ? "Yes" : "No"})</span>
                                    )}
                                    {step.step_type === "wait" && !!(step.config as Record<string, unknown>)?.duration_seconds && (
                                      <span> ({Math.round(Number((step.config as Record<string, unknown>).duration_seconds) / 3600)}h)</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {isEditable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteStep(step.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trigger</CardTitle>
                  <CardDescription>What starts this journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Trigger Type</Label>
                    <p className="font-medium">
                      {TRIGGER_LABELS[journey.trigger_type] || journey.trigger_type}
                    </p>
                  </div>
                  {journey.trigger_config && Object.keys(journey.trigger_config).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Trigger Config</Label>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(journey.trigger_config, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entry Limits</CardTitle>
                  <CardDescription>Control how users enter this journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Entries per User</Label>
                    <p className="font-medium">{journey.max_entries_per_user}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cooldown (hours)</Label>
                    <p className="font-medium">{journey.cooldown_hours || "None"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Goal</CardTitle>
                  <CardDescription>Optional exit condition for the journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Goal Type</Label>
                    <p className="font-medium">{journey.goal_type || "None"}</p>
                  </div>
                  {journey.goal_config && Object.keys(journey.goal_config).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Goal Config</Label>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(journey.goal_config, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Info</CardTitle>
                  <CardDescription>Journey metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created by</Label>
                    <p className="font-medium">{journey.created_by_email || "Unknown"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="font-medium">{new Date(journey.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">{new Date(journey.updated_at).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead>Entered</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="text-muted-foreground">
                          <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          <p className="font-medium">No enrollments yet</p>
                          <p className="text-sm mt-1">
                            Users will appear here once they enter the journey
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{enrollment.user_name}</p>
                            <p className="text-xs text-muted-foreground">{enrollment.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {enrollment.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {enrollment.current_step_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {enrollment.next_action_at
                            ? new Date(enrollment.next_action_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(enrollment.entered_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {enrollment.completed_at
                            ? new Date(enrollment.completed_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

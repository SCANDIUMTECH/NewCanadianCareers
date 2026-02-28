"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getSegments,
  createCampaign,
  scheduleCampaign,
  sendCampaign,
} from "@/lib/api/admin-marketing"
import type { Segment, CampaignCreateData } from "@/lib/api/admin-marketing"
import { getEmailTemplates } from "@/lib/api/admin-email"
import type { EmailTemplate } from "@/lib/api/admin-email"
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Mail,
  Send,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react"

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

const stepContentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

const STEPS = [
  { id: 1, label: "Audience", description: "Choose recipients", icon: Users, color: "from-blue-500 to-indigo-600" },
  { id: 2, label: "Content", description: "Compose email", icon: Mail, color: "from-violet-500 to-purple-600" },
  { id: 3, label: "Review & Send", description: "Finalize", icon: Send, color: "from-emerald-500 to-teal-600" },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Data for dropdowns
  const [segments, setSegments] = useState<Segment[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Form state
  const [name, setName] = useState("")
  const [segmentId, setSegmentId] = useState<string>("")
  const [templateId, setTemplateId] = useState<string>("")
  const [subjectLine, setSubjectLine] = useState("")
  const [preheader, setPreheader] = useState("")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [isAbTest, setIsAbTest] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      try {
        const [segRes, tplRes] = await Promise.all([
          getSegments(),
          getEmailTemplates(),
        ])
        setSegments(segRes.results)
        setTemplates(tplRes)
      } catch (err) {
        console.error("Failed to load data:", err)
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [])

  const selectedSegment = segments.find((s) => String(s.id) === segmentId)
  const selectedTemplate = templates.find((t) => String(t.id) === templateId)

  const canProceedStep1 = name.trim() && segmentId
  const canProceedStep2 = (templateId || subjectLine.trim())
  const canSubmit = canProceedStep1 && canProceedStep2

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const data: CampaignCreateData = {
        name,
        segment: segmentId ? Number(segmentId) : null,
        template: templateId ? Number(templateId) : null,
        subject_line: subjectLine,
        preheader,
        from_name: fromName,
        from_email: fromEmail,
        reply_to: replyTo,
        is_ab_test: isAbTest,
        requires_approval: requiresApproval,
      }

      const campaign = await createCampaign(data)

      if (sendMode === "schedule" && scheduledDate && scheduledTime) {
        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        await scheduleCampaign(campaign.id, scheduledAt)
        router.push(`/admin/marketing/campaigns/${campaign.id}`)
      } else if (sendMode === "now" && !requiresApproval) {
        await sendCampaign(campaign.id)
        router.push(`/admin/marketing/campaigns/${campaign.id}`)
      } else {
        router.push(`/admin/marketing/campaigns/${campaign.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign")
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl"
    >
      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/marketing/campaigns" className="hover:text-foreground transition-colors">
          Campaigns
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">New Campaign</span>
      </motion.nav>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
          <Send className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground text-sm">
            Set up your email campaign step by step
          </p>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isCompleted = step > s.id
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id)
                }}
                disabled={s.id > step}
                className={cn(
                  "flex items-center gap-3 w-full group relative rounded-xl p-3 transition-all duration-300",
                  isActive && "bg-primary/5 ring-1 ring-primary/20",
                  isCompleted && "bg-green-50/50 dark:bg-green-950/10",
                  (isActive || isCompleted) && "cursor-pointer",
                  !isActive && !isCompleted && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300",
                      isActive && "bg-gradient-to-br text-white shadow-lg shadow-primary/25",
                      isActive && s.color,
                      isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <p className={cn(
                    "text-sm font-medium transition-colors truncate",
                    isActive ? "text-foreground" :
                    isCompleted ? "text-green-700 dark:text-green-400" :
                    "text-muted-foreground"
                  )}>
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-shrink-0 w-8 h-[2px] mx-1 relative">
                  <div className="absolute inset-0 bg-muted rounded-full" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </motion.div>

      {/* Step Content */}
      <motion.div variants={itemVariants}>
        {isLoadingData ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="wait">
            {/* Step 1: Audience */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className="border-l-2 border-l-blue-400">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Select Audience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="campaign-name">Campaign Name *</Label>
                      <Input
                        id="campaign-name"
                        placeholder="e.g., Monthly Newsletter - Feb 2026"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Segment *</Label>
                      <Select value={segmentId} onValueChange={setSegmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a segment" />
                        </SelectTrigger>
                        <SelectContent>
                          {segments.map((seg) => (
                            <SelectItem key={seg.id} value={String(seg.id)}>
                              <div className="flex items-center gap-2">
                                <span>{seg.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({seg.estimated_size.toLocaleString()} contacts)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSegment && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg">
                          <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span>
                            {selectedSegment.segment_type === "dynamic" ? "Dynamic" : "Static"} segment
                            · ~{selectedSegment.estimated_size.toLocaleString()} eligible recipients
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>A/B Test</Label>
                          <p className="text-xs text-muted-foreground">Test different subject lines or content</p>
                        </div>
                        <Switch checked={isAbTest} onCheckedChange={setIsAbTest} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Requires Approval</Label>
                          <p className="text-xs text-muted-foreground">Campaign must be approved before sending</p>
                        </div>
                        <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Content */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className="border-l-2 border-l-violet-400">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-violet-500" />
                      Email Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label>Email Template</Label>
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((tpl) => (
                            <SelectItem key={tpl.id} value={String(tpl.id)}>
                              <div className="flex items-center gap-2">
                                <span>{tpl.name}</span>
                                <span className="text-xs text-muted-foreground">({tpl.type})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <p className="text-sm text-muted-foreground">
                          {selectedTemplate.status} · Last updated {new Date(selectedTemplate.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject-line">Subject Line *</Label>
                      <Input
                        id="subject-line"
                        placeholder="Enter email subject line..."
                        value={subjectLine}
                        onChange={(e) => setSubjectLine(e.target.value)}
                      />
                      {subjectLine && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {subjectLine.length} characters
                          {subjectLine.length > 60 && (
                            <span className="text-amber-600 ml-1">(recommended: under 60)</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preheader">Preheader</Label>
                      <Input
                        id="preheader"
                        placeholder="Preview text shown in inbox..."
                        value={preheader}
                        onChange={(e) => setPreheader(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Appears after the subject in most email clients
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="from-name">From Name</Label>
                        <Input
                          id="from-name"
                          placeholder="e.g., Orion Jobs"
                          value={fromName}
                          onChange={(e) => setFromName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="from-email">From Email</Label>
                        <Input
                          id="from-email"
                          type="email"
                          placeholder="e.g., hello@orion.jobs"
                          value={fromEmail}
                          onChange={(e) => setFromEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reply-to">Reply-To</Label>
                      <Input
                        id="reply-to"
                        type="email"
                        placeholder="e.g., support@orion.jobs"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Review & Send */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <Card className="border-l-2 border-l-emerald-400">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      Review Campaign
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <ReviewItem label="Campaign Name" value={name} />
                      <ReviewItem
                        label="Segment"
                        value={selectedSegment ? `${selectedSegment.name} (${selectedSegment.estimated_size.toLocaleString()} contacts)` : "—"}
                      />
                      <ReviewItem label="Subject Line" value={subjectLine || "—"} />
                      <ReviewItem label="Template" value={selectedTemplate?.name || "None"} />
                      <ReviewItem
                        label="From"
                        value={fromName ? `${fromName} <${fromEmail || "default"}>` : fromEmail || "Default"}
                      />
                      <ReviewItem label="Reply-To" value={replyTo || "Default"} />
                    </div>
                    {(isAbTest || requiresApproval) && (
                      <div className="flex gap-2 pt-4 mt-4 border-t">
                        {isAbTest && (
                          <span className="text-xs text-violet-600 bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1 rounded-md font-medium">
                            A/B Test enabled
                          </span>
                        )}
                        {requiresApproval && (
                          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md font-medium">
                            Requires approval
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Send Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <Button
                        variant={sendMode === "now" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSendMode("now")}
                        className="gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        Send Immediately
                      </Button>
                      <Button
                        variant={sendMode === "schedule" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSendMode("schedule")}
                        className="gap-1.5"
                      >
                        <Clock className="h-4 w-4" />
                        Schedule
                      </Button>
                    </div>
                    <AnimatePresence>
                      {sendMode === "schedule" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-2 gap-4 overflow-hidden"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="schedule-date">Date</Label>
                            <Input
                              id="schedule-date"
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="schedule-time">Time</Label>
                            <Input
                              id="schedule-time"
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {requiresApproval && sendMode === "now" && (
                      <div className="flex items-start gap-2.5 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-3 rounded-lg border border-amber-200/50">
                        <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>This campaign requires approval. It will be created as &quot;Pending Approval&quot; and must be approved before sending.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Navigation */}
      <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 1) {
              router.push("/admin/marketing/campaigns")
            } else {
              setStep((s) => s - 1)
            }
          }}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
            }
            className="gap-1.5"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="gap-1.5 min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : sendMode === "schedule" ? (
              <>
                <Clock className="h-4 w-4" />
                Schedule Campaign
              </>
            ) : requiresApproval ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Create for Approval
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create & Send
              </>
            )}
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

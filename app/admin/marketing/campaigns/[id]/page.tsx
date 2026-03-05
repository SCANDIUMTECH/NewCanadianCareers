"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CampaignFunnelData } from "@/components/charts/campaign-funnel-chart"
import {
  getCampaign,
  getCampaignRecipients,
  getCampaignStats,
  sendCampaign,
  pauseCampaign,
  cancelCampaign,
  duplicateCampaign,
  approveCampaign,
  testSendCampaign,
  selectABWinner,
} from "@/lib/api/admin-marketing"
import type {
  Campaign,
  CampaignRecipient,
  CampaignStats,
  CampaignStatus,
} from "@/lib/api/admin-marketing"
import {
  ArrowLeft,
  Send,
  Pause,
  XCircle,
  Copy,
  CheckCircle,
  Mail,
  MousePointerClick,
  AlertTriangle,
  Users,
  Eye,
  Loader2,
  Play,
  Trophy,
  MailX,
  UserMinus,
  Ban,
  BarChart3,
} from "lucide-react"

const CampaignFunnelChart = dynamic(() => import("@/components/charts/campaign-funnel-chart"), { ssr: false })

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = Number(params.id)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [recipientPage, setRecipientPage] = useState(1)
  const [recipientCount, setRecipientCount] = useState(0)
  const [recipientFilter, setRecipientFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  // Test send dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [campaignData, statsData] = await Promise.all([
        getCampaign(campaignId),
        getCampaignStats(campaignId),
      ])
      setCampaign(campaignData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign")
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await getCampaignRecipients(campaignId, {
        status: recipientFilter !== "all" ? recipientFilter : undefined,
        page: recipientPage,
      })
      setRecipients(res.results)
      setRecipientCount(res.count)
    } catch (err) {
      console.error("Failed to fetch recipients:", err)
    }
  }, [campaignId, recipientFilter, recipientPage])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  useEffect(() => {
    if (!isLoading && campaign) {
      fetchRecipients()
    }
  }, [fetchRecipients, isLoading, campaign])

  const handleSend = async () => {
    if (!confirm("Send this campaign now?")) return
    setIsActing(true)
    try {
      await sendCampaign(campaignId)
      await fetchCampaign()
    } catch (err) {
      console.error("Failed to send:", err)
    } finally {
      setIsActing(false)
    }
  }

  const handlePause = async () => {
    setIsActing(true)
    try {
      await pauseCampaign(campaignId)
      await fetchCampaign()
    } catch (err) {
      console.error("Failed to pause:", err)
    } finally {
      setIsActing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Cancel this campaign? Pending emails will not be sent.")) return
    setIsActing(true)
    try {
      await cancelCampaign(campaignId)
      await fetchCampaign()
    } catch (err) {
      console.error("Failed to cancel:", err)
    } finally {
      setIsActing(false)
    }
  }

  const handleDuplicate = async () => {
    setIsActing(true)
    try {
      const dup = await duplicateCampaign(campaignId)
      router.push(`/admin/marketing/campaigns/${dup.id}`)
    } catch (err) {
      console.error("Failed to duplicate:", err)
    } finally {
      setIsActing(false)
    }
  }

  const handleApprove = async () => {
    setIsActing(true)
    try {
      await approveCampaign(campaignId)
      await fetchCampaign()
    } catch (err) {
      console.error("Failed to approve:", err)
    } finally {
      setIsActing(false)
    }
  }

  const handleTestSend = async () => {
    if (!testEmail) return
    setIsSendingTest(true)
    try {
      await testSendCampaign(campaignId, testEmail)
      setTestDialogOpen(false)
      setTestEmail("")
    } catch (err) {
      console.error("Failed to send test:", err)
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleSelectWinner = async (variantId: number) => {
    if (!confirm("Select this variant as the winner?")) return
    setIsActing(true)
    try {
      await selectABWinner(campaignId, variantId)
      await fetchCampaign()
    } catch (err) {
      console.error("Failed to select winner:", err)
    } finally {
      setIsActing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/admin/marketing/campaigns">Campaigns</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-muted-foreground">{error || "Campaign not found"}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/admin/marketing/campaigns")}>
                Back to Campaigns
              </Button>
              <Button onClick={fetchCampaign}>Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const metricCards = [
    {
      label: "Recipients",
      value: (stats?.total_recipients ?? campaign.total_recipients).toLocaleString(),
      icon: <Users className="h-4 w-4" />,
      gradient: "from-sky to-sky-deep",
    },
    {
      label: "Delivered",
      value: (stats?.delivered_count ?? campaign.delivered_count).toLocaleString(),
      subtitle: `of ${(stats?.sent_count ?? campaign.sent_count).toLocaleString()} sent`,
      icon: <Send className="h-4 w-4" />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      label: "Opens",
      value: (stats?.opened_count ?? campaign.opened_count).toLocaleString(),
      subtitle: `${stats?.open_rate ?? campaign.open_rate}% open rate`,
      icon: <Eye className="h-4 w-4" />,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Clicks",
      value: (stats?.clicked_count ?? campaign.clicked_count).toLocaleString(),
      subtitle: `${stats?.click_rate ?? campaign.click_rate}% click rate`,
      icon: <MousePointerClick className="h-4 w-4" />,
      gradient: "from-primary-light to-primary",
    },
    {
      label: "Bounced",
      value: (stats?.bounced_count ?? campaign.bounced_count).toLocaleString(),
      subtitle: `${stats?.bounce_rate ?? campaign.bounce_rate}% bounce rate`,
      icon: <MailX className="h-4 w-4" />,
      gradient: "from-red-500 to-rose-600",
      alert: Number(stats?.bounce_rate ?? campaign.bounce_rate) > 5,
    },
    {
      label: "Complained",
      value: (stats?.complained_count ?? campaign.complained_count).toLocaleString(),
      icon: <Ban className="h-4 w-4" />,
      gradient: "from-red-400 to-red-600",
    },
    {
      label: "Unsubscribed",
      value: (stats?.unsubscribed_count ?? campaign.unsubscribed_count).toLocaleString(),
      icon: <UserMinus className="h-4 w-4" />,
      gradient: "from-slate-500 to-slate-600",
    },
    {
      label: "Failed",
      value: (stats?.failed_count ?? campaign.failed_count).toLocaleString(),
      icon: <AlertTriangle className="h-4 w-4" />,
      gradient: "from-slate-400 to-slate-500",
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/marketing/campaigns" className="hover:text-foreground transition-colors">
          Campaigns
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">{campaign.name}</span>
      </motion.nav>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center shadow-sm shadow-sky/20 flex-shrink-0 mt-0.5">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              <Badge variant="outline" className={cn("text-xs gap-1.5", STATUS_COLORS[campaign.status])}>
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOTS[campaign.status])} />
                {formatStatus(campaign.status)}
              </Badge>
              {campaign.is_ab_test && (
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">A/B Test</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
              {campaign.segment_name && <span>Segment: {campaign.segment_name}</span>}
              {campaign.template_name && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span>Template: {campaign.template_name}</span>
                </>
              )}
              <span className="text-muted-foreground/30">|</span>
              <span>Created {formatDate(campaign.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setTestDialogOpen(true)} className="gap-1.5">
            <Mail className="h-4 w-4" />
            Test Send
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isActing} className="gap-1.5">
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          {campaign.status === "pending_approval" && (
            <Button size="sm" onClick={handleApprove} disabled={isActing} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button size="sm" onClick={handleSend} disabled={isActing} className="gap-1.5">
              <Send className="h-4 w-4" />
              Send Now
            </Button>
          )}
          {campaign.status === "sending" && (
            <Button variant="outline" size="sm" onClick={handlePause} disabled={isActing} className="gap-1.5">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button size="sm" onClick={handleSend} disabled={isActing} className="gap-1.5">
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          {["draft", "scheduled", "sending", "paused"].includes(campaign.status) && (
            <Button variant="outline" size="sm" className="text-destructive gap-1.5" onClick={handleCancel} disabled={isActing}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <Card key={m.label} className={cn("relative overflow-hidden group", m.alert && "ring-1 ring-red-200")}>
            <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06] bg-gradient-to-br transition-opacity group-hover:opacity-[0.10]", m.gradient)} />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white", m.gradient)}>
                  {m.icon}
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{m.value}</p>
              {m.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{m.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Delivery Funnel */}
      {stats && (stats.sent_count > 0 || campaign.sent_count > 0) && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Delivery Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignFunnelChart
                data={{
                  sent: stats?.sent_count ?? campaign.sent_count,
                  delivered: stats?.delivered_count ?? campaign.delivered_count,
                  opened: stats?.opened_count ?? campaign.opened_count,
                  clicked: stats?.clicked_count ?? campaign.clicked_count,
                  bounced: stats?.bounced_count ?? campaign.bounced_count,
                  unsubscribed: stats?.unsubscribed_count ?? campaign.unsubscribed_count,
                } satisfies CampaignFunnelData}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs: Details / Recipients / A/B Variants */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="recipients">Recipients ({recipientCount})</TabsTrigger>
            {campaign.is_ab_test && (
              <TabsTrigger value="variants">A/B Variants ({campaign.variants.length})</TabsTrigger>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Campaign Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow label="Subject Line" value={campaign.subject_line || "—"} />
                  <DetailRow label="Preheader" value={campaign.preheader || "—"} />
                  <DetailRow
                    label="From"
                    value={campaign.from_name ? `${campaign.from_name} <${campaign.from_email}>` : campaign.from_email || "—"}
                  />
                  <DetailRow label="Reply To" value={campaign.reply_to || "—"} />
                  <DetailRow label="Segment" value={campaign.segment_name || "—"} />
                  <DetailRow label="Template" value={campaign.template_name || "—"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow label="Created" value={formatDate(campaign.created_at)} />
                  {campaign.created_by_email && (
                    <DetailRow label="Created By" value={campaign.created_by_email} />
                  )}
                  {campaign.scheduled_at && (
                    <DetailRow label="Scheduled" value={formatDate(campaign.scheduled_at)} />
                  )}
                  {campaign.started_at && (
                    <DetailRow label="Started" value={formatDate(campaign.started_at)} />
                  )}
                  {campaign.completed_at && (
                    <DetailRow label="Completed" value={formatDate(campaign.completed_at)} />
                  )}
                  {campaign.approved_by_email && (
                    <DetailRow label="Approved By" value={campaign.approved_by_email} />
                  )}
                  {campaign.approved_at && (
                    <DetailRow label="Approved At" value={formatDate(campaign.approved_at)} />
                  )}
                  <DetailRow label="Requires Approval" value={campaign.requires_approval ? "Yes" : "No"} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={recipientFilter} onValueChange={(v) => { setRecipientFilter(v); setRecipientPage(1) }}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground/30" />
                          <p>No recipients found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.user_name}</p>
                            <p className="text-xs text-muted-foreground">{r.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.sent_at ? formatDate(r.sent_at) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.opened_at ? formatDate(r.opened_at) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.clicked_at ? formatDate(r.clicked_at) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            {recipientCount > 20 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Page {recipientPage} of {Math.ceil(recipientCount / 20)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={recipientPage <= 1}
                    onClick={() => setRecipientPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={recipientPage >= Math.ceil(recipientCount / 20)}
                    onClick={() => setRecipientPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* A/B Variants Tab */}
          {campaign.is_ab_test && (
            <TabsContent value="variants" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaign.variants.map((v) => (
                  <Card key={v.id} className={cn(
                    "relative overflow-hidden transition-all",
                    v.is_winner && "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10"
                  )}>
                    {v.is_winner && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          Variant {v.name}
                          {v.is_winner && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <Trophy className="h-3 w-3" />
                              Winner
                            </Badge>
                          )}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs tabular-nums">{v.weight}% traffic</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Subject Line</p>
                        <p className="font-medium">{v.subject_line || "—"}</p>
                      </div>
                      {v.preheader && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Preheader</p>
                          <p>{v.preheader}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div>
                          <p className="text-muted-foreground text-xs">Sent</p>
                          <p className="font-semibold tabular-nums">{v.sent_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Delivered</p>
                          <p className="font-semibold tabular-nums">{v.delivered_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Opened</p>
                          <p className="font-semibold tabular-nums">{v.opened_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Clicked</p>
                          <p className="font-semibold tabular-nums">{v.clicked_count.toLocaleString()}</p>
                        </div>
                      </div>
                      {!v.is_winner && campaign.status === "sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 gap-1.5"
                          onClick={() => handleSelectWinner(v.id)}
                          disabled={isActing}
                        >
                          <Trophy className="h-4 w-4" />
                          Select as Winner
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* Test Send Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center shadow-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Send a preview of this campaign to verify it looks correct.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testEmail) handleTestSend()
                }}
              />
              <p className="text-xs text-muted-foreground">
                The test email will use the campaign&apos;s current content and template.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestSend} disabled={!testEmail || isSendingTest} className="gap-1.5">
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}

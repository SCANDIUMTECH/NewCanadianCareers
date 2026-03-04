"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CHART } from "@/lib/constants/colors"
import dynamic from "next/dynamic"
import {
  AlertTriangle,
  Bold,
  Calendar,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  Image,
  Info,
  Italic,
  Lightbulb,
  Link,
  Mail,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  Smartphone,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react"

import type {
  EmailTemplate, EmailTemplateDetail, EmailTemplateVersion,
  TemplateFilters, TemplateType, TemplateStatus
} from '@/lib/api/admin-email'
import {
  getEmailTemplatesFiltered, getEmailTemplate, getEmailTemplateVersions
} from '@/lib/api/admin-email'

const SparklineChart = dynamic(() => import("@/components/charts/sparkline-chart"), { ssr: false })

// =============================================================================
// MOCK DATA
// =============================================================================

const providers = [
  {
    id: "resend",
    name: "Resend",
    logo: "R",
    connected: true,
    apiKey: "re_••••••••••••••••",
    status: "active",
    lastSync: "2 min ago",
    sendingDomain: "mail.newcanadian.careers",
    spf: "verified",
    dkim: "verified",
    dmarc: "warning",
    webhookEnabled: true,
    rateLimit: "100/sec",
    region: "US East",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpUseTls: true,
    smtpUseSsl: false,
  },
  {
    id: "zeptomail",
    name: "Zoho ZeptoMail",
    logo: "Z",
    connected: false,
    apiKey: "",
    status: "disconnected",
    lastSync: null,
    sendingDomain: "",
    spf: "missing",
    dkim: "missing",
    dmarc: "missing",
    webhookEnabled: false,
    rateLimit: "50/sec",
    region: "EU",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpUseTls: true,
    smtpUseSsl: false,
  },
  {
    id: "smtp",
    name: "SMTP",
    logo: "S",
    connected: false,
    apiKey: "",
    status: "disconnected",
    lastSync: null,
    sendingDomain: "",
    spf: "missing",
    dkim: "missing",
    dmarc: "missing",
    webhookEnabled: false,
    rateLimit: "N/A",
    region: "Custom",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpUseTls: true,
    smtpUseSsl: false,
  },
]

const triggerCategories = [
  "Onboarding",
  "Activation",
  "Billing",
  "Trust & Safety",
  "Support",
  "Notifications",
  "Marketing",
  "System",
]

const audienceTypes = ["Admin", "Agency", "Company", "Candidate", "Recruiter"]

const triggers = [
  { id: 1, name: "Welcome Email", category: "Onboarding", eventKey: "user.welcome", status: true, audience: "Candidate", provider: "resend", template: "welcome_v3", lastUpdated: "Mar 15, 2024", lastSent: "2 min ago", sends7d: 1245, errors7d: 3 },
  { id: 2, name: "Email Verification", category: "Onboarding", eventKey: "user.verify_email", status: true, audience: "Candidate", provider: "resend", template: "verify_email", lastUpdated: "Mar 10, 2024", lastSent: "5 min ago", sends7d: 1180, errors7d: 0 },
  { id: 3, name: "Company Welcome", category: "Onboarding", eventKey: "company.welcome", status: true, audience: "Company", provider: "resend", template: "company_welcome", lastUpdated: "Mar 12, 2024", lastSent: "1 hr ago", sends7d: 89, errors7d: 1 },
  { id: 4, name: "Agency Onboarding", category: "Onboarding", eventKey: "agency.welcome", status: true, audience: "Agency", provider: "resend", template: "agency_welcome", lastUpdated: "Mar 8, 2024", lastSent: "3 hr ago", sends7d: 12, errors7d: 0 },
  { id: 5, name: "First Job Posted", category: "Activation", eventKey: "job.first_posted", status: true, audience: "Company", provider: "resend", template: "first_job_congrats", lastUpdated: "Mar 14, 2024", lastSent: "30 min ago", sends7d: 67, errors7d: 0 },
  { id: 6, name: "Profile Completed", category: "Activation", eventKey: "user.profile_complete", status: true, audience: "Candidate", provider: "resend", template: "profile_complete", lastUpdated: "Mar 11, 2024", lastSent: "15 min ago", sends7d: 234, errors7d: 2 },
  { id: 7, name: "Package Purchased", category: "Billing", eventKey: "billing.package_purchased", status: true, audience: "Company", provider: "resend", template: "package_confirmation", lastUpdated: "Mar 13, 2024", lastSent: "45 min ago", sends7d: 156, errors7d: 0 },
  { id: 8, name: "Invoice Generated", category: "Billing", eventKey: "billing.invoice_created", status: true, audience: "Company", provider: "resend", template: "invoice_generated", lastUpdated: "Mar 9, 2024", lastSent: "2 hr ago", sends7d: 78, errors7d: 1 },
  { id: 9, name: "Payment Failed", category: "Billing", eventKey: "billing.payment_failed", status: true, audience: "Company", provider: "resend", template: "payment_failed", lastUpdated: "Mar 7, 2024", lastSent: "6 hr ago", sends7d: 12, errors7d: 0 },
  { id: 10, name: "Job Flagged", category: "Trust & Safety", eventKey: "moderation.job_flagged", status: true, audience: "Admin", provider: "resend", template: "job_flagged_admin", lastUpdated: "Mar 14, 2024", lastSent: "20 min ago", sends7d: 34, errors7d: 0 },
  { id: 11, name: "Account Suspended", category: "Trust & Safety", eventKey: "user.suspended", status: true, audience: "Candidate", provider: "resend", template: "account_suspended", lastUpdated: "Mar 6, 2024", lastSent: "1 day ago", sends7d: 5, errors7d: 0 },
  { id: 12, name: "Fraud Alert", category: "Trust & Safety", eventKey: "security.fraud_detected", status: true, audience: "Admin", provider: "resend", template: "fraud_alert", lastUpdated: "Mar 15, 2024", lastSent: "4 hr ago", sends7d: 8, errors7d: 0 },
  { id: 13, name: "Support Ticket Created", category: "Support", eventKey: "support.ticket_created", status: true, audience: "Candidate", provider: "resend", template: "ticket_created", lastUpdated: "Mar 12, 2024", lastSent: "10 min ago", sends7d: 189, errors7d: 4 },
  { id: 14, name: "Support Reply", category: "Support", eventKey: "support.ticket_reply", status: true, audience: "Candidate", provider: "resend", template: "ticket_reply", lastUpdated: "Mar 11, 2024", lastSent: "8 min ago", sends7d: 456, errors7d: 2 },
  { id: 15, name: "Application Received", category: "Notifications", eventKey: "application.received", status: true, audience: "Company", provider: "resend", template: "application_received", lastUpdated: "Mar 15, 2024", lastSent: "1 min ago", sends7d: 3456, errors7d: 12 },
  { id: 16, name: "Application Status Update", category: "Notifications", eventKey: "application.status_changed", status: true, audience: "Candidate", provider: "resend", template: "application_status", lastUpdated: "Mar 14, 2024", lastSent: "3 min ago", sends7d: 2890, errors7d: 8 },
  { id: 17, name: "Job Expiring Soon", category: "Notifications", eventKey: "job.expiring_soon", status: true, audience: "Company", provider: "resend", template: "job_expiring", lastUpdated: "Mar 10, 2024", lastSent: "6 hr ago", sends7d: 123, errors7d: 0 },
  { id: 18, name: "New Job Match", category: "Notifications", eventKey: "job.new_match", status: false, audience: "Candidate", provider: "resend", template: "job_match", lastUpdated: "Mar 8, 2024", lastSent: "2 days ago", sends7d: 0, errors7d: 0 },
  { id: 19, name: "Weekly Digest", category: "Marketing", eventKey: "marketing.weekly_digest", status: false, audience: "Candidate", provider: "resend", template: "weekly_digest", lastUpdated: "Mar 5, 2024", lastSent: "7 days ago", sends7d: 0, errors7d: 0 },
  { id: 20, name: "System Maintenance", category: "System", eventKey: "system.maintenance", status: true, audience: "Admin", provider: "resend", template: "system_maintenance", lastUpdated: "Mar 1, 2024", lastSent: "14 days ago", sends7d: 2, errors7d: 0 },
]


const emailLogs = [
  { id: 1, timestamp: "2024-03-15 14:32:45", recipient: "john@example.com", trigger: "application.received", template: "application_received", provider: "resend", status: "Delivered", errorCode: null, traceId: "tr_abc123" },
  { id: 2, timestamp: "2024-03-15 14:32:12", recipient: "sarah@company.com", trigger: "job.expiring_soon", template: "job_expiring", provider: "resend", status: "Delivered", errorCode: null, traceId: "tr_def456" },
  { id: 3, timestamp: "2024-03-15 14:31:58", recipient: "mike@test.com", trigger: "user.welcome", template: "welcome_v3", provider: "resend", status: "Bounced", errorCode: "550", traceId: "tr_ghi789" },
  { id: 4, timestamp: "2024-03-15 14:31:30", recipient: "lisa@startup.io", trigger: "billing.package_purchased", template: "package_confirmation", provider: "resend", status: "Delivered", errorCode: null, traceId: "tr_jkl012" },
  { id: 5, timestamp: "2024-03-15 14:30:55", recipient: "alex@tech.co", trigger: "application.status_changed", template: "application_status", provider: "resend", status: "Sent", errorCode: null, traceId: "tr_mno345" },
  { id: 6, timestamp: "2024-03-15 14:30:22", recipient: "emma@design.com", trigger: "support.ticket_reply", template: "ticket_reply", provider: "resend", status: "Delivered", errorCode: null, traceId: "tr_pqr678" },
  { id: 7, timestamp: "2024-03-15 14:29:48", recipient: "invalid@fake", trigger: "user.verify_email", template: "verify_email", provider: "resend", status: "Failed", errorCode: "421", traceId: "tr_stu901" },
  { id: 8, timestamp: "2024-03-15 14:29:15", recipient: "chris@agency.net", trigger: "agency.welcome", template: "agency_welcome", provider: "resend", status: "Delivered", errorCode: null, traceId: "tr_vwx234" },
]

const smartSuggestions = [
  { type: "warning", title: "High bounce trigger", description: "\"Application Received\" has 12 errors in 7 days", action: "Review" },
  { type: "error", title: "Missing template", description: "\"job_match\" template is in draft state but trigger is active", action: "Fix" },
  { type: "info", title: "Disabled critical flow", description: "\"New Job Match\" is disabled - candidates won't receive matches", action: "Enable" },
]

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

// =============================================================================
// SPARKLINE HELPERS (matches marketing page pattern)
// =============================================================================

function generateTrend(
  finalValue: number,
  points: number,
  variance: number,
  direction: "up" | "down" | "steady"
): { v: number }[] {
  const data: { v: number }[] = []
  const raw = typeof finalValue === "number" ? finalValue : 0
  const base = Math.max(raw, 10)
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    let modifier: number
    if (direction === "up") {
      modifier = 0.7 + 0.3 * progress
    } else if (direction === "down") {
      modifier = 1.3 - 0.3 * progress
    } else {
      modifier = 1
    }
    const noise = Math.sin(i * 4.7 + base * 0.01) * variance * base
    data.push({ v: Math.max(0, base * modifier + noise) })
  }
  return data
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  bgAccent,
  sparkColor,
  sparkData,
  chartType = "area",
  isPercentage,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  gradient: string
  bgAccent: string
  sparkColor: string
  sparkData: { v: number }[]
  chartType?: "area" | "bar"
  isPercentage?: boolean
}) {
  const formattedValue = isPercentage
    ? value
    : typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value

  return (
    <Card className="relative overflow-hidden group">
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{formattedValue}</p>
        <div className="mt-2 h-10 -mx-1">
          <SparklineChart
            data={sparkData}
            color={sparkColor}
            type={chartType}
            gradientId={`spark-${title.replace(/\s/g, "")}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EmailModulePage() {
  const [activeTab, setActiveTab] = useState("overview")
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage email providers, triggers, and templates</p>
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="triggers">Triggers</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="m-0"><OverviewTab /></TabsContent>
            <TabsContent value="providers" className="m-0"><ProvidersTab /></TabsContent>
            <TabsContent value="triggers" className="m-0"><TriggersTab /></TabsContent>
            <TabsContent value="templates" className="m-0"><TemplatesTab /></TabsContent>
            <TabsContent value="logs" className="m-0"><LogsTab /></TabsContent>
            <TabsContent value="settings" className="m-0"><SettingsTab /></TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// =============================================================================
// 1) OVERVIEW TAB
// =============================================================================

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Emails Sent (24h)"
          value={1247}
          icon={<Send className="h-4 w-4" />}
          gradient="from-blue-500 to-indigo-600"
          bgAccent="bg-blue-500"
          sparkColor={CHART.primary}
          sparkData={generateTrend(1247, 12, 0.08, "up")}
        />
        <StatCard
          title="Delivery Rate"
          value="98.2%"
          icon={<CheckCircle className="h-4 w-4" />}
          gradient="from-emerald-500 to-teal-600"
          bgAccent="bg-emerald-500"
          sparkColor={CHART.success}
          sparkData={generateTrend(98.2, 8, 0.03, "steady")}
          isPercentage
        />
        <StatCard
          title="Bounce Rate"
          value="1.4%"
          icon={<AlertTriangle className="h-4 w-4" />}
          gradient="from-amber-500 to-orange-600"
          bgAccent="bg-amber-500"
          sparkColor={CHART.warning}
          sparkData={generateTrend(1.4, 8, 0.1, "down")}
          isPercentage
        />
        <StatCard
          title="Active Triggers"
          value="18/20"
          icon={<Zap className="h-4 w-4" />}
          gradient="from-violet-500 to-purple-600"
          bgAccent="bg-violet-500"
          sparkColor={CHART.purple}
          sparkData={generateTrend(18, 12, 0.06, "up")}
        />
      </div>

      {/* Health Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Provider Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold">Resend</span>
              <Badge variant="outline" className="ml-auto text-green-600 border-green-200 bg-green-50">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last sync: 2 min ago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deliverability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Delivery rate</span>
                <span className="font-semibold text-green-600">98.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Bounce rate</span>
                <span className="font-semibold text-amber-600">1.4%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Complaint rate</span>
                <span className="font-semibold text-green-600">0.02%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Last 24h</span>
                <span className="font-semibold">1,247</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last 7d</span>
                <span className="font-semibold">8,934</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last 30d</span>
                <span className="font-semibold">34,567</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Triggers (7d)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[
                { name: "Application Received", count: 3456 },
                { name: "Status Update", count: 2890 },
                { name: "Welcome Email", count: 1245 },
              ].map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate max-w-[140px]">{t.name}</span>
                  <span className="font-medium">{t.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">DMARC Warning</p>
              <p className="text-sm text-amber-700">Your DMARC record is set to &quot;none&quot;. Consider upgrading to &quot;quarantine&quot; for better deliverability.</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent">Fix</Button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">High Bounce Rate</p>
              <p className="text-sm text-red-700">&quot;Application Received&quot; trigger has 12 bounces in the last 7 days.</p>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent">Review</Button>
          </div>
        </CardContent>
      </Card>

      {/* Send Volume Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Send Volume (7 days)</CardTitle>
          <Button variant="ghost" size="sm">View logs</Button>
        </CardHeader>
        <CardContent>
          <SendVolumeChart />
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// 2) PROVIDERS TAB
// =============================================================================

function ProvidersTab() {
  const [activeProvider, setActiveProvider] = useState("resend")
  const [testSendOpen, setTestSendOpen] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testTemplate, setTestTemplate] = useState("")
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [templateOptions, setTemplateOptions] = useState<EmailTemplate[]>([])

  // Fetch templates for test-send dropdown when dialog opens
  useEffect(() => {
    if (!testSendOpen) return
    let cancelled = false
    async function load() {
      try {
        const res = await getEmailTemplatesFiltered({ page_size: 100, status: "Published" })
        if (!cancelled) {
          setTemplateOptions(res.results)
          if (res.results.length > 0) setTestTemplate(prev => prev || res.results[0].slug)
        }
      } catch { /* templates will be empty */ }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testSendOpen])

  const providerLogoColor = (id: string) =>
    id === "resend" ? "bg-black text-white" : id === "smtp" ? "bg-slate-600 text-white" : "bg-orange-500 text-white"

  const providerLogo = (id: string, logo: string, size: "sm" | "lg") => {
    const iconClass = size === "sm" ? "w-5 h-5" : "w-6 h-6"
    return id === "smtp" ? <Server className={iconClass} /> : <span>{logo}</span>
  }

  const handleTestSend = async () => {
    if (!selectedProvider || !testEmail) return
    setTestSending(true)
    setTestResult(null)
    try {
      const { testProvider } = await import("@/lib/api/admin-email")
      const result = await testProvider(selectedProvider, {
        templateSlug: testTemplate,
        recipientEmail: testEmail,
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "Failed to send test email" })
    } finally {
      setTestSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Active Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Provider</CardTitle>
          <CardDescription>Select which provider handles email delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => p.connected && setActiveProvider(p.id)}
                disabled={!p.connected}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all flex-1",
                  activeProvider === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30",
                  !p.connected && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg", providerLogoColor(p.id))}>
                  {providerLogo(p.id, p.logo, "sm")}
                </div>
                <div className="text-left">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.connected ? "Connected" : "Not connected"}</p>
                </div>
                {activeProvider === p.id && (
                  <Badge className="ml-auto">Active</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl", providerLogoColor(provider.id))}>
                  {providerLogo(provider.id, provider.logo, "lg")}
                </div>
                <div>
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <CardDescription>{provider.connected ? `Last sync: ${provider.lastSync}` : "Not connected"}</CardDescription>
                </div>
              </div>
              {provider.connected ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Disconnected</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              {provider.connected ? (
                <>
                  {/* Connected: show read-only summary */}
                  {provider.id === "smtp" ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Host</p>
                        <p className="font-medium font-mono">{provider.smtpHost || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Port</p>
                        <p className="font-medium font-mono">{provider.smtpPort}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Username</p>
                        <p className="font-medium font-mono">{provider.smtpUsername || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Security</p>
                        <p className="font-medium">{provider.smtpUseSsl ? "SSL" : provider.smtpUseTls ? "TLS" : "None"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          defaultValue={provider.apiKey}
                          className="font-mono"
                          readOnly
                        />
                        <Button variant="outline" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sending Domain */}
                  {provider.sendingDomain && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Sending Domain</p>
                      <p className="font-medium font-mono">{provider.sendingDomain}</p>
                    </div>
                  )}

                  {/* DNS Verification (API providers only) */}
                  {provider.id !== "smtp" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Domain Verification</Label>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={provider.spf === "verified" ? "default" : provider.spf === "warning" ? "secondary" : "destructive"} className={cn(provider.spf === "verified" && "bg-green-600")}>
                                SPF {provider.spf === "verified" ? "✓" : provider.spf === "warning" ? "!" : "✗"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>SPF record {provider.spf}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={provider.dkim === "verified" ? "default" : provider.dkim === "warning" ? "secondary" : "destructive"} className={cn(provider.dkim === "verified" && "bg-green-600")}>
                                DKIM {provider.dkim === "verified" ? "✓" : provider.dkim === "warning" ? "!" : "✗"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>DKIM record {provider.dkim}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={provider.dmarc === "verified" ? "default" : provider.dmarc === "warning" ? "secondary" : "destructive"} className={cn(provider.dmarc === "verified" && "bg-green-600", provider.dmarc === "warning" && "bg-amber-500")}>
                                DMARC {provider.dmarc === "verified" ? "✓" : provider.dmarc === "warning" ? "!" : "✗"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>DMARC record {provider.dmarc}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}

                  {/* Connection Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {provider.id !== "smtp" && (
                      <div>
                        <p className="text-muted-foreground">Webhook</p>
                        <p className="font-medium">{provider.webhookEnabled ? "Enabled" : "Disabled"}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Rate Limit</p>
                      <p className="font-medium">{provider.rateLimit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium">{provider.region}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Disconnected: show type summary + connect prompt */}
                  <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-3 opacity-20", providerLogoColor(provider.id))}>
                      {providerLogo(provider.id, provider.logo, "lg")}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.id === "smtp"
                        ? "Connect any SMTP server (Gmail, Outlook, custom)"
                        : `Connect your ${provider.name} account to start sending`}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-auto pt-2">
                <Separator className="mb-4" />
                {/* Actions */}
                <div className="flex gap-2">
                  {provider.connected ? (
                    <>
                      <Button variant="outline" className="flex-1 bg-transparent" onClick={() => { setSelectedProvider(provider.id); setTestResult(null); setTestEmail(""); setTestSendOpen(true) }}>
                        <Send className="w-4 h-4 mr-2" />
                        Test Send
                      </Button>
                      <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent">
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button className="flex-1" onClick={() => { setSelectedProvider(provider.id); setConnectDialogOpen(true) }}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fallback Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fallback Mode</CardTitle>
          <CardDescription>Automatically retry with secondary provider if primary fails</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Enable Fallback</p>
              <p className="text-sm text-muted-foreground">Queue failed emails for retry with a secondary provider if the primary fails</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Test Send Dialog */}
      <Dialog open={testSendOpen} onOpenChange={(open) => { setTestSendOpen(open); if (!open) setTestResult(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Send a test email via {providers.find((p) => p.id === selectedProvider)?.name ?? selectedProvider} to verify delivery</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={testTemplate} onValueChange={setTestTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            {testResult && (
              <div className={cn(
                "flex items-start gap-2 p-3 rounded-lg border text-sm",
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                {testResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <p>{testResult.message}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendOpen(false)}>Cancel</Button>
            <Button onClick={handleTestSend} disabled={testSending || !testEmail}>
              {testSending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {testSending ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider === "resend" ? "Resend" : selectedProvider === "smtp" ? "SMTP Provider" : "ZeptoMail"}</DialogTitle>
            <DialogDescription>
              {selectedProvider === "smtp"
                ? "Enter your SMTP server credentials to connect"
                : "Enter your API credentials to connect"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedProvider === "smtp" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.example.com" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input type="number" defaultValue={587} placeholder="587" className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="user@example.com" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="Enter SMTP password" className="font-mono" />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <Label className="text-sm">Use TLS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch />
                    <Label className="text-sm">Use SSL</Label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" placeholder="Enter your API key" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Sending Domain</Label>
                  <Input placeholder="mail.yourdomain.com" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button>Connect Provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 3) TRIGGERS TAB
// =============================================================================

function TriggersTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [audienceFilter, setAudienceFilter] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<string>("none")
  const [selectedTriggers, setSelectedTriggers] = useState<number[]>([])
  const [editTriggerOpen, setEditTriggerOpen] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<typeof triggers[0] | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [triggersData, setTriggersData] = useState(triggers)
  const [templateOptions, setTemplateOptions] = useState<EmailTemplate[]>([])

  // Fetch templates for the edit trigger template dropdown
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getEmailTemplatesFiltered({ page_size: 100 })
        if (!cancelled) setTemplateOptions(res.results)
      } catch { /* dropdown will be empty */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Filter triggers
  const filteredTriggers = useMemo(() => {
    return triggersData.filter((t) => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.eventKey.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (statusFilter !== "all" && (statusFilter === "enabled" ? !t.status : t.status)) return false
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false
      if (audienceFilter !== "all" && t.audience !== audienceFilter) return false
      return true
    })
  }, [triggersData, searchQuery, statusFilter, categoryFilter, audienceFilter])

  // Group triggers
  const groupedTriggers = useMemo(() => {
    if (groupBy === "none") return { "All Triggers": filteredTriggers }
    
    return filteredTriggers.reduce((acc, trigger) => {
      const key = groupBy === "category" ? trigger.category 
        : groupBy === "audience" ? trigger.audience 
        : groupBy === "provider" ? trigger.provider 
        : trigger.category
      if (!acc[key]) acc[key] = []
      acc[key].push(trigger)
      return acc
    }, {} as Record<string, typeof triggers>)
  }, [filteredTriggers, groupBy])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group])
  }

  const toggleTriggerStatus = (id: number) => {
    setTriggersData((prev) => prev.map((t) => t.id === id ? { ...t, status: !t.status } : t))
  }

  const toggleSelectTrigger = (id: number) => {
    setSelectedTriggers((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const selectAllInGroup = (groupTriggers: typeof triggers) => {
    const ids = groupTriggers.map((t) => t.id)
    const allSelected = ids.every((id) => selectedTriggers.includes(id))
    if (allSelected) {
      setSelectedTriggers((prev) => prev.filter((id) => !ids.includes(id)))
    } else {
      setSelectedTriggers((prev) => [...new Set([...prev, ...ids])])
    }
  }

  return (
    <div className="space-y-6">
      {/* Smart Suggestions Banner */}
      {smartSuggestions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {smartSuggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border">
                  <div className="flex items-center gap-3">
                    {s.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {s.type === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                    {s.type === "info" && <Info className="w-4 h-4 text-blue-500" />}
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">{s.action}</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {triggerCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Audience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audiences</SelectItem>
            {audienceTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-8" />

        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Group by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
            <SelectItem value="audience">By Audience</SelectItem>
            <SelectItem value="provider">By Provider</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          {selectedTriggers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Bulk Actions ({selectedTriggers.length})</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Enable Selected</DropdownMenuItem>
                <DropdownMenuItem>Disable Selected</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Move Category</DropdownMenuItem>
                <DropdownMenuItem>Assign Template</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
        </div>
      </div>

      {/* Triggers Table */}
      <Card>
        {Object.entries(groupedTriggers).map(([group, groupTriggers]) => (
          <Collapsible key={group} open={groupBy === "none" || expandedGroups.includes(group)} onOpenChange={() => toggleGroup(group)}>
            {groupBy !== "none" && (
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b cursor-pointer hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <ChevronRight className={cn("w-4 h-4 transition-transform", expandedGroups.includes(group) && "rotate-90")} />
                    <span className="font-medium">{group}</span>
                    <Badge variant="secondary">{groupTriggers.length}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{groupTriggers.filter((t) => t.status).length} enabled</span>
                    <span>{groupTriggers.reduce((acc, t) => acc + t.errors7d, 0)} errors</span>
                    <span>{groupTriggers.reduce((acc, t) => acc + t.sends7d, 0).toLocaleString()} sends</span>
                  </div>
                </div>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={groupTriggers.every((t) => selectedTriggers.includes(t.id))}
                        onCheckedChange={() => selectAllInGroup(groupTriggers)}
                      />
                    </TableHead>
                    <TableHead>Trigger Name</TableHead>
                    <TableHead>Event Key</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Sends (7d)</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupTriggers.map((trigger) => (
                    <TableRow key={trigger.id} className={cn(selectedTriggers.includes(trigger.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTriggers.includes(trigger.id)}
                          onCheckedChange={() => toggleSelectTrigger(trigger.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trigger.name}</p>
                          <p className="text-xs text-muted-foreground">{trigger.category}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{trigger.eventKey}</code>
                      </TableCell>
                      <TableCell>
                        <Switch checked={trigger.status} onCheckedChange={() => toggleTriggerStatus(trigger.id)} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trigger.audience}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{trigger.provider}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{trigger.template}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{trigger.sends7d.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {trigger.errors7d > 0 ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">{trigger.errors7d}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingTrigger(trigger); setEditTriggerOpen(true) }}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>View Logs</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Disable</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </Card>

      {/* Edit Trigger Sheet */}
      <Sheet open={editTriggerOpen} onOpenChange={setEditTriggerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Edit Trigger</SheetTitle>
            <SheetDescription>Configure trigger settings and behavior</SheetDescription>
          </SheetHeader>
          {editingTrigger && (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>Trigger Name</Label>
                <Input defaultValue={editingTrigger.name} />
              </div>
              <div className="space-y-2">
                <Label>Event Key</Label>
                <Input defaultValue={editingTrigger.eventKey} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue={editingTrigger.category}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {triggerCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select defaultValue={editingTrigger.audience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audienceTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select defaultValue={editingTrigger.template}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((t) => <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select defaultValue={editingTrigger.provider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.filter((p) => p.connected).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">Toggle trigger on/off</p>
                </div>
                <Switch defaultChecked={editingTrigger.status} />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setEditTriggerOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// =============================================================================
// 4) TEMPLATES TAB
// =============================================================================

function TemplatesTab() {
  // API data state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter/pagination state
  const [templateSearch, setTemplateSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 15

  // Selected template detail
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Versions
  const [versions, setVersions] = useState<EmailTemplateVersion[]>([])
  const [versionsLoaded, setVersionsLoaded] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Editor/preview state
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light")

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(templateSearch)
      setCurrentPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [templateSearch])

  // Fetch templates on mount and when filters/page change
  useEffect(() => {
    let cancelled = false
    async function fetchTemplates() {
      setLoading(true)
      try {
        const filters: TemplateFilters = { page: currentPage, page_size: PAGE_SIZE }
        if (debouncedSearch) filters.search = debouncedSearch
        if (typeFilter !== "all") filters.type = typeFilter
        if (statusFilter !== "all") filters.status = statusFilter
        const res = await getEmailTemplatesFiltered(filters)
        if (!cancelled) {
          setTemplates(res.results)
          setTotalCount(res.count)
        }
      } catch {
        if (!cancelled) {
          setTemplates([])
          setTotalCount(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTemplates()
    return () => { cancelled = true }
  }, [currentPage, debouncedSearch, typeFilter, statusFilter])

  // Fetch full template detail when selected
  const handleSelectTemplate = useCallback(async (template: EmailTemplate) => {
    setLoadingDetail(true)
    setVersions([])
    setVersionsLoaded(false)
    try {
      const detail = await getEmailTemplate(template.id)
      setSelectedTemplate(detail)
    } catch {
      setSelectedTemplate(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // Fetch versions when Versions tab is opened
  const handleLoadVersions = useCallback(async () => {
    if (!selectedTemplate || versionsLoaded) return
    setLoadingVersions(true)
    try {
      const v = await getEmailTemplateVersions(selectedTemplate.id)
      setVersions(v)
      setVersionsLoaded(true)
    } catch {
      setVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }, [selectedTemplate, versionsLoaded])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="flex gap-6 h-[calc(100vh-240px)]">
      {/* Template List - Left */}
      <Card className="w-72 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Templates{" "}
              {!loading && <span className="text-muted-foreground font-normal">({totalCount})</span>}
            </CardTitle>
            <Button size="sm" variant="ghost"><Plus className="w-4 h-4" /></Button>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {/* Filters */}
          <div className="flex gap-2 mt-2">
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as TemplateType | "all"); setCurrentPage(1) }}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="System">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TemplateStatus | "all"); setCurrentPage(1) }}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))
              ) : templates.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No templates found
                </div>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      selectedTemplate?.id === template.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate mr-2">{template.name}</span>
                      <Badge variant={template.status === "Published" ? "default" : "secondary"} className={cn("text-xs flex-shrink-0", template.status === "Published" && "bg-green-600")}>
                        {template.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{template.type}</span>
                      <span>Used by {template.usedBy}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          {/* Pagination controls */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between p-2 border-t text-xs text-muted-foreground flex-shrink-0">
              <span>{totalCount} templates</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span>{currentPage}/{totalPages}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Editor - Right */}
      {loadingDetail ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : selectedTemplate ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTemplate.name}</CardTitle>
                <CardDescription>Last updated: {selectedTemplate.lastUpdated} · v{selectedTemplate.version}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Save Draft</Button>
                <Button>Publish</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <Tabs defaultValue="content" className="h-full flex flex-col" onValueChange={(v) => { if (v === "versions") handleLoadVersions() }}>
              <div className="px-6 border-b">
                <TabsList className="bg-transparent h-auto p-0 gap-6">
                  <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3">Content</TabsTrigger>
                  <TabsTrigger value="variables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3">Variables</TabsTrigger>
                  <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3">Preview</TabsTrigger>
                  <TabsTrigger value="test" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3">Test Send</TabsTrigger>
                  <TabsTrigger value="versions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3">Versions</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="content" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-6">
                  {/* Subject & Preheader */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input key={selectedTemplate.id + "-subject"} defaultValue={selectedTemplate.subject} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preheader</Label>
                      <Input key={selectedTemplate.id + "-preheader"} defaultValue={selectedTemplate.preheader} />
                    </div>
                  </div>

                  {/* Editor Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <Label>Email Content</Label>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        size="sm"
                        variant={editorMode === "visual" ? "secondary" : "ghost"}
                        onClick={() => setEditorMode("visual")}
                      >
                        Visual
                      </Button>
                      <Button
                        size="sm"
                        variant={editorMode === "code" ? "secondary" : "ghost"}
                        onClick={() => setEditorMode("code")}
                      >
                        HTML
                      </Button>
                    </div>
                  </div>

                  {/* Editor */}
                  {editorMode === "visual" ? (
                    <div className="space-y-3">
                      {/* WYSIWYG Toolbar */}
                      <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/30">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Bold className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Italic className="w-4 h-4" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Link className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Image className="w-4 h-4" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button size="sm" variant="ghost" className="h-8 px-2">Button</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">Divider</Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              Insert Variable
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {selectedTemplate.variables.length > 0 ? (
                              selectedTemplate.variables.map((v) => (
                                <DropdownMenuItem key={v}>{`{{${v}}}`}</DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>No variables</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Visual Editor Area */}
                      <iframe
                        sandbox=""
                        srcDoc={selectedTemplate.html}
                        className="min-h-[300px] w-full border rounded-lg bg-white"
                        title="Template preview"
                      />
                    </div>
                  ) : (
                    <Textarea
                      key={selectedTemplate.id + "-html"}
                      className="min-h-[350px] font-mono text-sm"
                      defaultValue={selectedTemplate.html}
                    />
                  )}

                  {/* Validation */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">All variables are valid</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="variables" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Available variables for this template:</p>
                  <div className="grid gap-3">
                    {selectedTemplate.variables.length > 0 ? (
                      selectedTemplate.variables.map((v) => (
                        <div key={v} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <code className="text-sm bg-muted px-2 py-0.5 rounded">{`{{${v}}}`}</code>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}>Copy</Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No variables defined for this template.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"} onClick={() => setPreviewMode("desktop")}>
                        <Monitor className="w-4 h-4 mr-1" /> Desktop
                      </Button>
                      <Button size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"} onClick={() => setPreviewMode("mobile")}>
                        <Smartphone className="w-4 h-4 mr-1" /> Mobile
                      </Button>
                    </div>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button size="sm" variant={previewTheme === "light" ? "secondary" : "ghost"} onClick={() => setPreviewTheme("light")}>Light</Button>
                      <Button size="sm" variant={previewTheme === "dark" ? "secondary" : "ghost"} onClick={() => setPreviewTheme("dark")}>Dark</Button>
                    </div>
                  </div>
                  <div className={cn(
                    "border rounded-xl overflow-hidden mx-auto",
                    previewMode === "desktop" ? "w-full max-w-2xl" : "w-[375px]",
                    previewTheme === "dark" ? "bg-gray-900" : "bg-white"
                  )}>
                    <iframe
                      sandbox=""
                      srcDoc={previewTheme === "dark"
                        ? `<div style="padding:1.5rem;color:#fff;background:#111827">${selectedTemplate.html}</div>`
                        : `<div style="padding:1.5rem;color:#111827">${selectedTemplate.html}</div>`
                      }
                      className="w-full min-h-[400px]"
                      title="Template preview"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="test" className="flex-1 overflow-auto m-0 p-6">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient Email</Label>
                    <Input type="email" placeholder="test@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Variables</Label>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map((v) => (
                        <Input key={v} placeholder={v} />
                      ))}
                    </div>
                  </div>
                  <Button><Send className="w-4 h-4 mr-2" />Send Test Email</Button>
                </div>
              </TabsContent>

              <TabsContent value="versions" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-3">
                  {loadingVersions ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))
                  ) : versions.length > 0 ? (
                    versions.map((v, i) => (
                      <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">v{v.version}{i === 0 ? " (current)" : ""}</p>
                          <p className="text-sm text-muted-foreground">{v.savedAt} by {v.savedBy}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Compare</Button>
                          {i > 0 && <Button size="sm" variant="outline">Rollback</Button>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No version history available.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a template to edit</p>
          </div>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// 5) LOGS TAB
// =============================================================================

function LogsTab() {
  const [searchEmail, setSearchEmail] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerFilter, setProviderFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<typeof emailLogs[0] | null>(null)
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null)

  const filteredLogs = emailLogs.filter((log) => {
    if (searchEmail && !log.recipient.toLowerCase().includes(searchEmail.toLowerCase())) return false
    if (statusFilter !== "all" && log.status.toLowerCase() !== statusFilter) return false
    if (providerFilter !== "all" && log.provider !== providerFilter) return false
    return true
  })

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format)
    try {
      const { exportEmailLogs } = await import("@/lib/api/admin-email")
      const filters: { status?: "Queued" | "Sent" | "Delivered" | "Bounced" | "Failed"; provider?: string; search?: string } = {}
      if (statusFilter !== "all") filters.status = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) as "Queued" | "Sent" | "Delivered" | "Bounced" | "Failed"
      if (providerFilter !== "all") filters.provider = providerFilter
      if (searchEmail) filters.search = searchEmail
      const blob = await exportEmailLogs(filters, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `email-logs-export.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Retention policy guide */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/80 to-amber-50/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-700" />
            <p className="font-semibold text-sm">These logs are automatically deleted over time</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Every email New Canadian Careers sends is logged here — who it was sent to, whether it was delivered, bounced, or failed, and the full provider response.
            To protect user privacy and meet legal requirements, the system automatically deletes old logs on a schedule.
            Not all logs are treated the same — they are split into two tiers based on what they contain and how long the law says we need to keep them.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-blue-200 bg-white/80 p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Tier 1</Badge>
                <span className="text-xs font-semibold">Delivery logs</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Sent</strong> and <strong className="text-foreground">Queued</strong> emails — these contain recipient names and addresses (personal data).
                GDPR says we shouldn&apos;t keep personal data longer than needed, so these are deleted first.
              </p>
              <p className="text-xs font-medium">Deleted after: 90 days (default)</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-white/80 p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-600 text-white text-[10px] px-1.5 py-0">Tier 2</Badge>
                <span className="text-xs font-semibold">Compliance logs</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Bounced</strong> and <strong className="text-foreground">Failed</strong> emails — these prove we handled delivery failures and opt-outs correctly.
                CAN-SPAM requires keeping this proof for up to 3 years, so these are retained much longer.
              </p>
              <p className="text-xs font-medium">Deleted after: 1,095 days / 3 years (default)</p>
            </div>
          </div>
          <div className="rounded-md bg-muted/60 p-2.5 space-y-1">
            <p className="text-xs font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> How deletion works</p>
            <p className="text-[11px] text-muted-foreground">
              A background task runs every day at midnight UTC. It finds logs older than the configured retention period and deletes them in batches of 5,000.
              <strong className="text-foreground"> Deleted logs are gone forever</strong> — there is no undo or recycle bin. If you need to keep a record permanently, export it using the Export button above before it expires.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            You can change retention periods in <strong className="text-foreground">Settings → Compliance &amp; Data Retention</strong>. Setting a period to 0 keeps logs forever (not recommended for GDPR).
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="resend">Resend</SelectItem>
            <SelectItem value="zeptomail">ZeptoMail</SelectItem>
            <SelectItem value="smtp">SMTP</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Date Range
        </Button>

        <div className="ml-auto flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting !== null}>
                {exporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retention</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Trace ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow 
                key={log.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedLog(log)}
              >
                <TableCell className="text-sm">{log.timestamp}</TableCell>
                <TableCell className="font-medium">{log.recipient}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.trigger}</code></TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.template}</TableCell>
                <TableCell className="text-sm">{log.provider}</TableCell>
                <TableCell>
                  <Badge variant={
                    log.status === "Delivered" ? "default" :
                    log.status === "Sent" ? "secondary" :
                    log.status === "Bounced" ? "destructive" :
                    log.status === "Failed" ? "destructive" : "outline"
                  } className={cn(
                    log.status === "Delivered" && "bg-green-600",
                    log.status === "Sent" && "bg-blue-600 text-white"
                  )}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.status === "Bounced" || log.status === "Failed" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      <Shield className="w-3 h-3" />
                      Tier 2
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                      <Shield className="w-3 h-3" />
                      Tier 1
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {log.errorCode ? (
                    <code className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{log.errorCode}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">{log.traceId}</code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Log Detail Drawer */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Email Log Details</SheetTitle>
            <SheetDescription>Trace ID: {selectedLog?.traceId}</SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <ScrollArea className="h-[calc(100vh-120px)] pr-4">
              <div className="space-y-6 py-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Recipient</p>
                    <p className="font-medium">{selectedLog.recipient}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedLog.status === "Delivered" ? "default" : "destructive"} className={cn(selectedLog.status === "Delivered" && "bg-green-600")}>
                      {selectedLog.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trigger</p>
                    <code className="text-sm">{selectedLog.trigger}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-medium">{selectedLog.template}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{selectedLog.provider}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">{selectedLog.timestamp}</p>
                  </div>
                </div>

                <Separator />

                {/* Retention info for this log */}
                {(selectedLog.status === "Bounced" || selectedLog.status === "Failed") ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-600 text-white text-[10px] px-1.5 py-0">Tier 2</Badge>
                      <p className="text-sm font-medium text-amber-800">This log will be kept for up to 3 years</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      Because this email <strong>{selectedLog.status.toLowerCase()}</strong>, it counts as compliance evidence — it proves New Canadian Careers
                      handled the delivery failure or bounce correctly. CAN-SPAM law requires keeping this kind of proof,
                      so it&apos;s retained for the longer <em>Compliance Retention</em> period (default 1,095 days).
                    </p>
                    <p className="text-xs text-amber-700">
                      After that period, the system will permanently delete this log during the next daily cleanup.
                      Once deleted, it cannot be recovered — export it now if you need a permanent copy.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Tier 1</Badge>
                      <p className="text-sm font-medium text-blue-800">This log will be deleted after 90 days</p>
                    </div>
                    <p className="text-xs text-blue-700">
                      This is a successful delivery log — it contains the recipient&apos;s email address and personal details.
                      Under GDPR, we don&apos;t keep personal data longer than necessary, so {selectedLog.status.toLowerCase()} logs
                      like this one are automatically deleted after the <em>Log Retention</em> period (default 90 days).
                    </p>
                    <p className="text-xs text-blue-700">
                      After that period, the system will permanently delete this log during the next daily cleanup.
                      Once deleted, it cannot be recovered — export it now if you need a permanent copy.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Raw Payload */}
                <div>
                  <p className="font-medium mb-2">Raw Payload (sanitized)</p>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
{`{
  "to": "${selectedLog.recipient}",
  "template": "${selectedLog.template}",
  "variables": {
    "first_name": "John",
    "company_name": "Acme Inc"
  }
}`}
                  </pre>
                </div>

                {/* Rendered Preview */}
                <div>
                  <p className="font-medium mb-2">Rendered HTML Preview</p>
                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="text-lg font-bold">Welcome, John!</h3>
                    <p className="mt-2 text-sm">We&apos;re excited to have you on board...</p>
                  </div>
                </div>

                {/* Provider Response */}
                <div>
                  <p className="font-medium mb-2">Provider Response</p>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
{`{
  "id": "msg_${selectedLog.traceId}",
  "status": "${selectedLog.status.toLowerCase()}",
  ${selectedLog.errorCode ? `"error_code": "${selectedLog.errorCode}",` : ""}
  "timestamp": "${selectedLog.timestamp}"
}`}
                  </pre>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button variant="outline">View User</Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// =============================================================================
// 6) SETTINGS TAB
// =============================================================================

function SettingsTab() {
  const [settings, setSettings] = useState<{
    defaultFromName: string; defaultFromEmail: string; replyToAddress: string; sendingDomain: string
    unsubscribeText: string; includeUnsubscribe: boolean
    maxEmailsPerSecond: number; maxEmailsPerMinute: number
    maxRetries: number; initialBackoff: number; backoffMultiplier: number
    productionMode: boolean; killSwitchEnabled: boolean
    logRetentionDays: number; complianceRetentionDays: number
    lastCleanupAt: string | null; lastCleanupCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmKillSwitch, setConfirmKillSwitch] = useState(false)
  const [killSwitchConfirmText, setKillSwitchConfirmText] = useState("")

  const fetchSettings = useCallback(async () => {
    try {
      const { getEmailSettings } = await import("@/lib/api/admin-email")
      const data = await getEmailSettings()
      setSettings(data)
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateField = <K extends keyof NonNullable<typeof settings>>(key: K, value: NonNullable<typeof settings>[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const { updateEmailSettings } = await import("@/lib/api/admin-email")
      const { lastCleanupAt, lastCleanupCount, killSwitchEnabled, ...saveable } = settings
      const updated = await updateEmailSettings(saveable)
      setSettings(updated)
    } catch (err) {
      console.error("Failed to save settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleKillSwitch = async () => {
    if (!settings) return
    try {
      const { toggleKillSwitch } = await import("@/lib/api/admin-email")
      const newState = !settings.killSwitchEnabled
      const result = await toggleKillSwitch(newState)
      setSettings((prev) => prev ? { ...prev, killSwitchEnabled: result.killSwitchEnabled } : prev)
    } catch (err) {
      console.error("Kill switch toggle failed:", err)
    } finally {
      setConfirmKillSwitch(false)
      setKillSwitchConfirmText("")
    }
  }

  const handleRotateKeys = async () => {
    try {
      const { rotateApiKeys } = await import("@/lib/api/admin-email")
      await rotateApiKeys()
    } catch (err) {
      console.error("Key rotation failed:", err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-48 mb-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Failed to load email settings. Check backend connection.
        </CardContent>
      </Card>
    )
  }

  const formatCleanupDate = (iso: string | null) => {
    if (!iso) return "Never"
    try {
      return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    } catch { return iso }
  }

  return (
    <div className="space-y-6">
      {/* Global Email Config */}
      <Card>
        <CardHeader>
          <CardTitle>Global Email Configuration</CardTitle>
          <CardDescription>Default settings for all outgoing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default From Name</Label>
              <Input value={settings.defaultFromName} onChange={(e) => updateField("defaultFromName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Default From Email</Label>
              <Input value={settings.defaultFromEmail} onChange={(e) => updateField("defaultFromEmail", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reply-To Address</Label>
              <Input value={settings.replyToAddress} onChange={(e) => updateField("replyToAddress", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sending Domain</Label>
              <Input value={settings.sendingDomain} onChange={(e) => updateField("sendingDomain", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsubscribe Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Unsubscribe Footer</CardTitle>
          <CardDescription>Default footer for marketing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Textarea
              value={settings.unsubscribeText}
              onChange={(e) => updateField("unsubscribeText", e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.includeUnsubscribe} onCheckedChange={(v) => updateField("includeUnsubscribe", v)} />
            <Label>Include unsubscribe link in all marketing emails</Label>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting & Throttling</CardTitle>
          <CardDescription>Control email sending rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Max emails per second</Label>
              <Input type="number" value={settings.maxEmailsPerSecond} onChange={(e) => updateField("maxEmailsPerSecond", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Max emails per minute</Label>
              <Input type="number" value={settings.maxEmailsPerMinute} onChange={(e) => updateField("maxEmailsPerMinute", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retry Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Retry Policy</CardTitle>
          <CardDescription>Configure automatic retry behavior for failed emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Select value={settings.maxRetries.toString()} onValueChange={(v) => updateField("maxRetries", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Backoff</Label>
              <Select value={settings.initialBackoff.toString()} onValueChange={(v) => updateField("initialBackoff", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backoff Multiplier</Label>
              <Select value={settings.backoffMultiplier.toString()} onValueChange={(v) => updateField("backoffMultiplier", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1.5, 2, 3].map((n) => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance & Data Retention */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Compliance & Data Retention</CardTitle>
              <CardDescription>GDPR &amp; CAN-SPAM compliant two-tier log retention with automated cleanup</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier 1 — GDPR callout */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Tier 1 — GDPR Storage Limitation</p>
                <p className="mt-1">GDPR Article 5(1)(e) requires that personal data is kept no longer than necessary. Sent and pending email logs contain recipient information and are automatically deleted after the configured retention period. Default: <strong>90 days</strong>.</p>
                <p className="mt-1 text-blue-600">Set to 0 to keep forever (not recommended for GDPR compliance).</p>
              </div>
            </div>
          </div>

          {/* Tier 2 — CAN-SPAM callout */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Tier 2 — CAN-SPAM Compliance Evidence</p>
                <p className="mt-1">The CAN-SPAM Act requires retaining proof of compliance — bounce handling, opt-out processing, and delivery failure records — for up to 3 years. Bounced and failed email logs are retained for the longer compliance period. Default: <strong>1,095 days (3 years)</strong>.</p>
                <p className="mt-1 text-amber-600">Set to 0 to keep forever. Reducing below 1,095 days may affect regulatory compliance.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Log Retention (Tier 1)</Label>
              <Select value={settings.logRetentionDays.toString()} onValueChange={(v) => updateField("logRetentionDays", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Keep forever</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days (default)</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Successful delivery logs (sent/pending) older than this are permanently deleted. GDPR Article 5(1)(e) recommends minimizing retention of personal data.</p>
            </div>
            <div className="space-y-2">
              <Label>Compliance Retention (Tier 2)</Label>
              <Select value={settings.complianceRetentionDays.toString()} onValueChange={(v) => updateField("complianceRetentionDays", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Keep forever</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                  <SelectItem value="1095">3 years (default, CAN-SPAM)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Bounce and failure records older than this are permanently deleted. CAN-SPAM requires retaining compliance evidence for up to 3 years (1,095 days).</p>
            </div>
          </div>

          <Separator />

          {/* Cleanup mechanics */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              How automated cleanup works
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Runs daily via a scheduled task (Celery Beat) — no manual intervention required.</li>
              <li>Deletions are processed in batches of 5,000 records for performance stability.</li>
              <li>Each cleanup run is logged in the audit trail for accountability (GDPR Article 5(2)).</li>
              <li>Deletions are <strong className="text-foreground">permanent and irreversible</strong> — deleted records cannot be recovered.</li>
            </ul>
          </div>

          {/* Cleanup status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">Last Automated Cleanup</p>
              <p className="text-sm text-muted-foreground">
                {settings.lastCleanupAt
                  ? `${formatCleanupDate(settings.lastCleanupAt)} — ${settings.lastCleanupCount.toLocaleString()} records removed`
                  : "No cleanup has run yet"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />
              Run Cleanup Now
            </Button>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Warning:</strong> Manual cleanup applies the same retention rules and is irreversible. Records older than the configured retention periods will be permanently deleted.
          </p>
        </CardContent>
      </Card>

      {/* Environment */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Mode</CardTitle>
          <CardDescription>Toggle between sandbox and production</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Production Mode</p>
              <p className="text-sm text-muted-foreground">Emails will be sent to real recipients</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className={settings.productionMode ? "bg-green-600" : "bg-amber-500"}>
                {settings.productionMode ? "Production" : "Sandbox"}
              </Badge>
              <Switch checked={settings.productionMode} onCheckedChange={(v) => updateField("productionMode", v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div>
              <p className="font-medium text-red-900">Disable All Sending</p>
              <p className="text-sm text-red-700">Immediately stop all outgoing emails (global kill switch)</p>
            </div>
            <Button
              variant={settings.killSwitchEnabled ? "default" : "destructive"}
              onClick={() => setConfirmKillSwitch(true)}
            >
              {settings.killSwitchEnabled ? "Re-enable Emails" : "Disable All"}
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div>
              <p className="font-medium text-red-900">Rotate API Keys</p>
              <p className="text-sm text-red-700">Generate new API keys for all connected providers</p>
            </div>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent" onClick={handleRotateKeys}>
              Rotate Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Kill Switch Confirmation */}
      <Dialog open={confirmKillSwitch} onOpenChange={(open) => { setConfirmKillSwitch(open); if (!open) setKillSwitchConfirmText("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {settings.killSwitchEnabled ? "Re-enable Email Sending" : "Confirm Kill Switch"}
            </DialogTitle>
            <DialogDescription>
              {settings.killSwitchEnabled
                ? "This will re-enable all outgoing emails."
                : "This will immediately stop ALL outgoing emails. This affects transactional, marketing, and system emails."}
            </DialogDescription>
          </DialogHeader>
          {!settings.killSwitchEnabled && (
            <div className="py-4">
              <p className="text-sm font-medium">Type &quot;DISABLE ALL&quot; to confirm:</p>
              <Input
                className="mt-2"
                placeholder="DISABLE ALL"
                value={killSwitchConfirmText}
                onChange={(e) => setKillSwitchConfirmText(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmKillSwitch(false)}>Cancel</Button>
            <Button
              variant={settings.killSwitchEnabled ? "default" : "destructive"}
              onClick={handleKillSwitch}
              disabled={!settings.killSwitchEnabled && killSwitchConfirmText !== "DISABLE ALL"}
            >
              {settings.killSwitchEnabled ? "Re-enable Emails" : "Disable All Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// SEND VOLUME CHART
// =============================================================================

const sendVolumeData = [
  { day: "Mon", sent: 1180 },
  { day: "Tue", sent: 1240 },
  { day: "Wed", sent: 1050 },
  { day: "Thu", sent: 1380 },
  { day: "Fri", sent: 1290 },
  { day: "Sat", sent: 680 },
  { day: "Sun", sent: 1247 },
]

const SendVolumeChartInner = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } = mod
      return {
        default: function SendVolumeArea() {
          return (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sendVolumeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="sendVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke={CHART.tick} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke={CHART.tick} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: `1px solid ${CHART.grid}`,
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Emails"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke={CHART.primary}
                    strokeWidth={2}
                    fill="url(#sendVolumeGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: "white", stroke: CHART.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )
        },
      }
    }),
  { ssr: false, loading: () => <div className="h-48 bg-muted/30 rounded-lg animate-pulse" /> }
)

function SendVolumeChart() {
  return <SendVolumeChartInner />
}

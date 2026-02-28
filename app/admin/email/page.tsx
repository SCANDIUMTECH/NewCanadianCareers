"use client"

import { useState, useMemo } from "react"
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
    spf: "verified",
    dkim: "verified",
    dmarc: "warning",
    webhookEnabled: true,
    rateLimit: "100/sec",
    region: "US East",
  },
  {
    id: "zeptomail",
    name: "Zoho ZeptoMail",
    logo: "Z",
    connected: false,
    apiKey: "",
    status: "disconnected",
    lastSync: null,
    spf: "missing",
    dkim: "missing",
    dmarc: "missing",
    webhookEnabled: false,
    rateLimit: "50/sec",
    region: "EU",
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

const templates = [
  { id: 1, name: "Welcome V3", slug: "welcome_v3", type: "Transactional", lastUpdated: "Mar 15, 2024", usedBy: 1, status: "Published" },
  { id: 2, name: "Verify Email", slug: "verify_email", type: "Transactional", lastUpdated: "Mar 10, 2024", usedBy: 1, status: "Published" },
  { id: 3, name: "Company Welcome", slug: "company_welcome", type: "Transactional", lastUpdated: "Mar 12, 2024", usedBy: 1, status: "Published" },
  { id: 4, name: "Agency Welcome", slug: "agency_welcome", type: "Transactional", lastUpdated: "Mar 8, 2024", usedBy: 1, status: "Published" },
  { id: 5, name: "Package Confirmation", slug: "package_confirmation", type: "Transactional", lastUpdated: "Mar 13, 2024", usedBy: 1, status: "Published" },
  { id: 6, name: "Application Received", slug: "application_received", type: "Transactional", lastUpdated: "Mar 15, 2024", usedBy: 1, status: "Published" },
  { id: 7, name: "Job Expiring", slug: "job_expiring", type: "Transactional", lastUpdated: "Mar 10, 2024", usedBy: 1, status: "Published" },
  { id: 8, name: "Weekly Digest", slug: "weekly_digest", type: "Marketing", lastUpdated: "Mar 5, 2024", usedBy: 1, status: "Draft" },
  { id: 9, name: "Job Match", slug: "job_match", type: "Marketing", lastUpdated: "Mar 8, 2024", usedBy: 1, status: "Draft" },
  { id: 10, name: "Fraud Alert", slug: "fraud_alert", type: "System", lastUpdated: "Mar 15, 2024", usedBy: 1, status: "Published" },
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
// MAIN COMPONENT
// =============================================================================

export default function EmailModulePage() {
  const [activeTab, setActiveTab] = useState("overview")
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
          <p className="text-muted-foreground mt-1">Manage email providers, triggers, and templates</p>
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
            <AlertTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">DMARC Warning</p>
              <p className="text-sm text-amber-700">Your DMARC record is set to &quot;none&quot;. Consider upgrading to &quot;quarantine&quot; for better deliverability.</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent">Fix</Button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">High Bounce Rate</p>
              <p className="text-sm text-red-700">&quot;Application Received&quot; trigger has 12 bounces in the last 7 days.</p>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent">Review</Button>
          </div>
        </CardContent>
      </Card>

      {/* Mini Chart Placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Send Volume (7 days)</CardTitle>
          <Button variant="ghost" size="sm">View logs</Button>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed">
            <span className="text-muted-foreground text-sm">Line chart placeholder</span>
          </div>
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
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg",
                  p.id === "resend" ? "bg-black text-white" : "bg-orange-500 text-white"
                )}>
                  {p.logo}
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
      <div className="grid gap-6 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl",
                  provider.id === "resend" ? "bg-black text-white" : "bg-orange-500 text-white"
                )}>
                  {provider.logo}
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
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    value={provider.apiKey || ""} 
                    placeholder="Enter API key" 
                    className="font-mono"
                    readOnly={provider.connected}
                  />
                  {provider.connected && (
                    <Button variant="outline" size="icon">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Domain Status */}
              <div className="space-y-2">
                <Label>Domain Verification</Label>
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

              {/* Webhook & Rate */}
              {provider.connected && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Webhook</p>
                    <p className="font-medium">{provider.webhookEnabled ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate Limit</p>
                    <p className="font-medium">{provider.rateLimit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Region</p>
                    <p className="font-medium">{provider.region}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                {provider.connected ? (
                  <>
                    <Button variant="outline" className="flex-1 bg-transparent" onClick={() => { setSelectedProvider(provider.id); setTestSendOpen(true) }}>
                      <SendIcon className="w-4 h-4 mr-2" />
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
              <p className="text-sm text-muted-foreground">Queue failed emails for retry with ZeptoMail if Resend fails</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Test Send Dialog */}
      <Dialog open={testSendOpen} onOpenChange={setTestSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Send a test email to verify your {selectedProvider} configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select defaultValue="welcome_v3">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input type="email" placeholder="test@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendOpen(false)}>Cancel</Button>
            <Button><SendIcon className="w-4 h-4 mr-2" />Send Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider === "resend" ? "Resend" : "ZeptoMail"}</DialogTitle>
            <DialogDescription>Enter your API credentials to connect</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" placeholder="Enter your API key" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Sending Domain</Label>
              <Input placeholder="mail.yourdomain.com" />
            </div>
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
              <LightbulbIcon className="w-5 h-5 text-amber-600" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {smartSuggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border">
                  <div className="flex items-center gap-3">
                    {s.type === "warning" && <AlertTriangleIcon className="w-4 h-4 text-amber-500" />}
                    {s.type === "error" && <XCircleIcon className="w-4 h-4 text-red-500" />}
                    {s.type === "info" && <InfoIcon className="w-4 h-4 text-blue-500" />}
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
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <PlusIcon className="w-4 h-4 mr-2" />
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
                    <ChevronRightIcon className={cn("w-4 h-4 transition-transform", expandedGroups.includes(group) && "rotate-90")} />
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
                              <MoreHorizontalIcon className="w-4 h-4" />
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
                    {templates.map((t) => <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>)}
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
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null)
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light")

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[600px]">
      {/* Template List - Left */}
      <Card className="w-72 flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Templates</CardTitle>
            <Button size="sm" variant="ghost"><PlusIcon className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="space-y-1 p-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    selectedTemplate?.id === template.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge variant={template.status === "Published" ? "default" : "secondary"} className={cn("text-xs", template.status === "Published" && "bg-green-600")}>
                      {template.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.type}</span>
                    <span>Used by {template.usedBy}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Template Editor - Right */}
      {selectedTemplate ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTemplate.name}</CardTitle>
                <CardDescription>Last updated: {selectedTemplate.lastUpdated}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Save Draft</Button>
                <Button>Publish</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <Tabs defaultValue="content" className="h-full flex flex-col">
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
                      <Input defaultValue="Welcome to Orion, {{first_name}}!" />
                    </div>
                    <div className="space-y-2">
                      <Label>Preheader</Label>
                      <Input defaultValue="Your journey to finding the perfect role starts here." />
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
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><BoldIcon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><ItalicIcon className="w-4 h-4" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><LinkIcon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><ImageIcon className="w-4 h-4" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button size="sm" variant="ghost" className="h-8 px-2">Button</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">Divider</Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              Insert Variable
                              <ChevronDownIcon className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>{"{{first_name}}"}</DropdownMenuItem>
                            <DropdownMenuItem>{"{{last_name}}"}</DropdownMenuItem>
                            <DropdownMenuItem>{"{{company_name}}"}</DropdownMenuItem>
                            <DropdownMenuItem>{"{{job_title}}"}</DropdownMenuItem>
                            <DropdownMenuItem>{"{{magic_link}}"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Visual Editor Area */}
                      <div className="min-h-[300px] border rounded-lg p-4 bg-white">
                        <p className="text-muted-foreground text-sm">[WYSIWYG Editor Placeholder]</p>
                        <p className="mt-4">Hi {"{{first_name}}"},</p>
                        <p className="mt-2">Welcome to Orion! We&apos;re excited to have you on board.</p>
                        <p className="mt-4">Best,<br/>The Orion Team</p>
                      </div>
                    </div>
                  ) : (
                    <Textarea 
                      className="min-h-[350px] font-mono text-sm"
                      defaultValue={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <h1>Welcome, {{first_name}}!</h1>
  <p>We're excited to have you on board.</p>
  <a href="{{magic_link}}">Get Started</a>
</body>
</html>`}
                    />
                  )}

                  {/* Validation */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">All variables are valid</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="variables" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Available variables for this template:</p>
                  <div className="grid gap-3">
                    {[
                      { name: "first_name", desc: "User's first name" },
                      { name: "last_name", desc: "User's last name" },
                      { name: "email", desc: "User's email address" },
                      { name: "company_name", desc: "Company name (if applicable)" },
                      { name: "job_title", desc: "Job title (if applicable)" },
                      { name: "magic_link", desc: "Authentication magic link" },
                      { name: "unsubscribe_link", desc: "Unsubscribe URL" },
                    ].map((v) => (
                      <div key={v.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{`{{${v.name}}}`}</code>
                          <p className="text-xs text-muted-foreground mt-1">{v.desc}</p>
                        </div>
                        <Button size="sm" variant="ghost">Copy</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"} onClick={() => setPreviewMode("desktop")}>
                        <MonitorIcon className="w-4 h-4 mr-1" /> Desktop
                      </Button>
                      <Button size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"} onClick={() => setPreviewMode("mobile")}>
                        <SmartphoneIcon className="w-4 h-4 mr-1" /> Mobile
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
                    <div className={cn("p-6", previewTheme === "dark" ? "text-white" : "text-gray-900")}>
                      <h1 className="text-2xl font-bold mb-4">Welcome, John!</h1>
                      <p className="mb-4">We&apos;re excited to have you on board. Your journey to finding the perfect role starts here.</p>
                      <a href="#" className="inline-block px-6 py-3 bg-primary text-white rounded-lg">Get Started</a>
                    </div>
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
                      <Input placeholder="first_name" defaultValue="John" />
                      <Input placeholder="company_name" defaultValue="Acme Inc" />
                    </div>
                  </div>
                  <Button><SendIcon className="w-4 h-4 mr-2" />Send Test Email</Button>
                </div>
              </TabsContent>

              <TabsContent value="versions" className="flex-1 overflow-auto m-0 p-6">
                <div className="space-y-3">
                  {[
                    { version: "v3 (current)", date: "Mar 15, 2024", author: "admin@orion.jobs" },
                    { version: "v2", date: "Mar 10, 2024", author: "admin@orion.jobs" },
                    { version: "v1", date: "Mar 5, 2024", author: "admin@orion.jobs" },
                  ].map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{v.version}</p>
                        <p className="text-sm text-muted-foreground">{v.date} by {v.author}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Compare</Button>
                        {i > 0 && <Button size="sm" variant="outline">Rollback</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MailIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
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

  const filteredLogs = emailLogs.filter((log) => {
    if (searchEmail && !log.recipient.toLowerCase().includes(searchEmail.toLowerCase())) return false
    if (statusFilter !== "all" && log.status.toLowerCase() !== statusFilter) return false
    if (providerFilter !== "all" && log.provider !== providerFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          </SelectContent>
        </Select>

        <Button variant="outline">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Date Range
        </Button>
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
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
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
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false)
  const [confirmKillSwitch, setConfirmKillSwitch] = useState(false)

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
              <Input defaultValue="Orion" />
            </div>
            <div className="space-y-2">
              <Label>Default From Email</Label>
              <Input defaultValue="noreply@orion.jobs" />
            </div>
            <div className="space-y-2">
              <Label>Reply-To Address</Label>
              <Input defaultValue="support@orion.jobs" />
            </div>
            <div className="space-y-2">
              <Label>Sending Domain</Label>
              <Input defaultValue="mail.orion.jobs" />
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
              defaultValue="You're receiving this email because you signed up for Orion. If you'd like to stop receiving these emails, you can unsubscribe at any time."
              className="min-h-[80px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch defaultChecked />
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
              <Input type="number" defaultValue="50" />
            </div>
            <div className="space-y-2">
              <Label>Max emails per minute</Label>
              <Input type="number" defaultValue="1000" />
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
              <Select defaultValue="3">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Backoff</Label>
              <Select defaultValue="60">
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
              <Select defaultValue="2">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1.5, 2, 3].map((n) => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
              <Badge variant="default" className="bg-green-600">Production</Badge>
              <Switch defaultChecked />
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
              variant="destructive"
              onClick={() => setConfirmKillSwitch(true)}
            >
              {killSwitchEnabled ? "Re-enable" : "Disable All"}
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div>
              <p className="font-medium text-red-900">Rotate API Keys</p>
              <p className="text-sm text-red-700">Generate new API keys for all connected providers</p>
            </div>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent">
              Rotate Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg">Save Settings</Button>
      </div>

      {/* Kill Switch Confirmation */}
      <Dialog open={confirmKillSwitch} onOpenChange={setConfirmKillSwitch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Kill Switch</DialogTitle>
            <DialogDescription>
              This will immediately stop ALL outgoing emails. This affects transactional, marketing, and system emails.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium">Type &quot;DISABLE ALL&quot; to confirm:</p>
            <Input className="mt-2" placeholder="DISABLE ALL" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmKillSwitch(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setKillSwitchEnabled(true); setConfirmKillSwitch(false) }}>
              Disable All Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// ICONS
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
}

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
}

function SendIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
}

function MailIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
}

function EyeIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
}

function XCircleIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
}

function InfoIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
}

function LightbulbIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
}

function ChevronRightIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
}

function BoldIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8"/></svg>
}

function ItalicIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>
}

function LinkIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
}

function ImageIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
}

function MonitorIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
}

function SmartphoneIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
}

function RefreshCwIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
}

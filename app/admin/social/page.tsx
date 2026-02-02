"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Settings,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Link2,
  Link2Off,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  Edit,
  Plus,
  ExternalLink,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Provider config
const providers = [
  { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600", connected: true, tokenExpiry: "2026-06-15" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 to-pink-500", connected: true, tokenExpiry: "2026-06-15" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-blue-700", connected: true, tokenExpiry: "2026-04-20" },
  { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "bg-black", connected: false, tokenExpiry: null },
]

// Mock queue data
const mockQueue = [
  { id: "q1", jobTitle: "Senior Engineer at TechCorp", provider: "linkedin", status: "queued", scheduledFor: "2026-02-02T10:00:00", company: "TechCorp Inc" },
  { id: "q2", jobTitle: "Product Designer at GrowthLabs", provider: "facebook", status: "queued", scheduledFor: "2026-02-02T11:00:00", company: "GrowthLabs" },
  { id: "q3", jobTitle: "Data Scientist at DataFlow", provider: "instagram", status: "failed", scheduledFor: "2026-02-01T14:00:00", company: "DataFlow Analytics", error: "Rate limit exceeded" },
  { id: "q4", jobTitle: "Marketing Manager at GrowthLabs", provider: "linkedin", status: "posted", scheduledFor: "2026-02-01T09:00:00", company: "GrowthLabs" },
]

// Template type
interface SocialTemplate {
  id: string
  provider: string
  titleFormat: string
  includeSalary: boolean
  hashtags: string[]
  utmSource: string
  utmMedium: string
  utmCampaign: string
}

const mockTemplates: SocialTemplate[] = [
  { id: "t1", provider: "linkedin", titleFormat: "🚀 {company} is hiring: {title}", includeSalary: true, hashtags: ["hiring", "jobs", "careers"], utmSource: "linkedin", utmMedium: "social", utmCampaign: "job_post" },
  { id: "t2", provider: "facebook", titleFormat: "Join {company}! We're looking for a {title}", includeSalary: true, hashtags: ["hiring", "opportunity"], utmSource: "facebook", utmMedium: "social", utmCampaign: "job_post" },
  { id: "t3", provider: "instagram", titleFormat: "📢 Now Hiring: {title} at {company}", includeSalary: false, hashtags: ["hiring", "jobsearch", "career"], utmSource: "instagram", utmMedium: "social", utmCampaign: "job_post" },
]

export default function SocialDistributionPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [policyMode, setPolicyMode] = useState<"user" | "admin-approved" | "admin-only">("user")
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; template: SocialTemplate | null }>({ open: false, template: null })
  const [connectDialog, setConnectDialog] = useState<{ open: boolean; provider: typeof providers[0] | null }>({ open: false, provider: null })

  const queuedCount = mockQueue.filter(q => q.status === "queued").length
  const failedCount = mockQueue.filter(q => q.status === "failed").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Social Distribution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage social media posting for job listings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Distribution:</span>
            <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
            <span className={globalEnabled ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
              {globalEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue" className="relative">
            Queue
            {queuedCount > 0 && (
              <Badge variant="secondary" className="ml-2">{queuedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed" className="relative">
            Failed
            {failedCount > 0 && (
              <Badge variant="destructive" className="ml-2">{failedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Provider Connections */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Connected Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {providers.map((provider, i) => {
                const Icon = provider.icon
                return (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "bg-card border rounded-xl p-4 relative overflow-hidden",
                      provider.connected ? "border-border" : "border-dashed border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", provider.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {provider.connected ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
                      ) : (
                        <Badge variant="secondary">Not Connected</Badge>
                      )}
                    </div>
                    <h4 className="font-medium mt-3">{provider.name}</h4>
                    {provider.connected && provider.tokenExpiry && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Token expires: {new Date(provider.tokenExpiry).toLocaleDateString()}
                      </p>
                    )}
                    <Button
                      variant={provider.connected ? "outline" : "default"}
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setConnectDialog({ open: true, provider })}
                    >
                      {provider.connected ? (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Posts Today", value: "12", icon: Zap, color: "text-primary" },
              { label: "Queued", value: queuedCount.toString(), icon: Clock, color: "text-amber-600" },
              { label: "Failed (24h)", value: failedCount.toString(), icon: AlertTriangle, color: "text-red-600" },
              { label: "Success Rate", value: "94%", icon: Check, color: "text-emerald-600" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <p className={cn("text-2xl font-semibold mt-2", stat.color)}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">Recent Activity</h3>
            </div>
            <div className="divide-y divide-border">
              {mockQueue.slice(0, 5).map(item => {
                const provider = providers.find(p => p.id === item.provider)
                const Icon = provider?.icon || Twitter
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", provider?.color || "bg-gray-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{item.company}</p>
                    </div>
                    <Badge className={cn(
                      item.status === "posted" && "bg-emerald-100 text-emerald-700",
                      item.status === "queued" && "bg-amber-100 text-amber-700",
                      item.status === "failed" && "bg-red-100 text-red-700",
                    )}>
                      {item.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="bg-card border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Queued Posts</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="divide-y divide-border">
              {mockQueue.filter(q => q.status === "queued").map(item => {
                const provider = providers.find(p => p.id === item.provider)
                const Icon = provider?.icon || Twitter
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", provider?.color || "bg-gray-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {mockQueue.filter(q => q.status === "queued").length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No posts in queue
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Failed Tab */}
        <TabsContent value="failed" className="space-y-4">
          <div className="bg-card border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Failed Posts</h3>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry All
              </Button>
            </div>
            <div className="divide-y divide-border">
              {mockQueue.filter(q => q.status === "failed").map(item => {
                const provider = providers.find(p => p.id === item.provider)
                const Icon = provider?.icon || Twitter
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white opacity-60", provider?.color || "bg-gray-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.jobTitle}</p>
                      <p className="text-xs text-red-600">{item.error}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Post Templates</h3>
            <Button onClick={() => setTemplateDialog({ open: true, template: null })}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTemplates.map((template, i) => {
              const provider = providers.find(p => p.id === template.provider)
              const Icon = provider?.icon || Twitter
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", provider?.color || "bg-gray-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{provider?.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{template.titleFormat}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.hashtags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Salary: {template.includeSalary ? "Yes" : "No"}</span>
                    <Button variant="ghost" size="sm" onClick={() => setTemplateDialog({ open: true, template })}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Global Policy</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Distribution Control Mode</Label>
                  <Select value={policyMode} onValueChange={(v: typeof policyMode) => setPolicyMode(v)}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User-Controlled (employers choose)</SelectItem>
                      <SelectItem value="admin-approved">Admin-Approved (requires approval)</SelectItem>
                      <SelectItem value="admin-only">Admin-Only (platform managed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls who can initiate social posts for job listings
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label>Require Company Verification</Label>
                      <p className="text-xs text-muted-foreground">Only verified companies can post</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label>Max Posts Per Day</Label>
                      <p className="text-xs text-muted-foreground">Per company limit</p>
                    </div>
                    <Input type="number" defaultValue="5" className="w-20" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-medium mb-4">Rate Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {providers.filter(p => p.connected).map(provider => {
                  const Icon = provider.icon
                  return (
                    <div key={provider.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{provider.name}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Posts/hour</span>
                          <Input type="number" defaultValue="10" className="w-16 h-6 text-xs" />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Posts/day</span>
                          <Input type="number" defaultValue="50" className="w-16 h-6 text-xs" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={templateDialog.open} onOpenChange={open => !open && setTemplateDialog({ open: false, template: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{templateDialog.template ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>Configure the post template for a social provider</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select defaultValue={templateDialog.template?.provider || "linkedin"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.filter(p => p.connected).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title Format</Label>
              <Input defaultValue={templateDialog.template?.titleFormat || ""} placeholder="{company} is hiring: {title}" />
              <p className="text-xs text-muted-foreground">Use {"{company}"}, {"{title}"}, {"{location}"}, {"{salary}"}</p>
            </div>
            <div className="space-y-2">
              <Label>Hashtags (comma-separated)</Label>
              <Input defaultValue={templateDialog.template?.hashtags.join(", ") || ""} placeholder="hiring, jobs, careers" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Include Salary</Label>
              <Switch defaultChecked={templateDialog.template?.includeSalary} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">UTM Source</Label>
                <Input className="h-8 text-sm" defaultValue={templateDialog.template?.utmSource || ""} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UTM Medium</Label>
                <Input className="h-8 text-sm" defaultValue={templateDialog.template?.utmMedium || ""} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UTM Campaign</Label>
                <Input className="h-8 text-sm" defaultValue={templateDialog.template?.utmCampaign || ""} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog({ open: false, template: null })}>Cancel</Button>
            <Button>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect/Manage Provider Dialog */}
      <Dialog open={connectDialog.open} onOpenChange={open => !open && setConnectDialog({ open: false, provider: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {connectDialog.provider?.connected ? `Manage ${connectDialog.provider?.name}` : `Connect ${connectDialog.provider?.name}`}
            </DialogTitle>
          </DialogHeader>
          {connectDialog.provider?.connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Token Expires</span>
                  <span>{connectDialog.provider.tokenExpiry}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Token
                </Button>
                <Button variant="destructive" className="flex-1">
                  <Link2Off className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your {connectDialog.provider?.name} account to enable social distribution.
              </p>
              <Button className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {connectDialog.provider?.name}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

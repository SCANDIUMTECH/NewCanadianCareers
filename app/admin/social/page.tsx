"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Facebook,
  Instagram,
  Linkedin,
  Settings,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Link2,
  Link2Off,
  Play,
  RotateCcw,
  Trash2,
  Eye,
  Edit,
  Plus,
  Zap,
  Share2,
  Loader2,
  ArrowUpRight,
  CircleDot,
  Hash,
  ExternalLink,
  Shield,
  Gauge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import {
  getSocialProviders,
  connectProvider,
  disconnectProvider,
  refreshProviderToken,
  getSocialQueue,
  postNow,
  cancelPost,
  retryPost,
  retryAllFailedPosts,
  syncQueue,
  getSocialTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getSocialSettings,
  updateSocialSettings,
  getSocialStats,
  type SocialProvider,
  type QueueItem,
  type SocialTemplate,
  type SocialSettings,
  type SocialProviderId,
  type PolicyMode,
} from "@/lib/api/admin-social"

// ── X (Twitter) logo — official mark ────────────────────────────────────
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="X">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// ── Provider UI configuration ───────────────────────────────────────────
const providerUIConfig: Record<SocialProviderId, {
  icon: typeof Facebook | typeof XLogo
  bgClass: string
  textClass: string
  lightBgClass: string
  name: string
  gradient?: string
}> = {
  facebook: {
    icon: Facebook,
    bgClass: "bg-social-facebook",
    textClass: "text-social-facebook",
    lightBgClass: "bg-social-facebook/10",
    name: "Facebook",
  },
  instagram: {
    icon: Instagram,
    bgClass: "bg-gradient-to-br from-social-instagram-from via-social-instagram-via to-social-instagram-to",
    textClass: "text-social-instagram",
    lightBgClass: "bg-social-instagram/10",
    name: "Instagram",
    gradient: "from-social-instagram-from via-social-instagram-via to-social-instagram-to",
  },
  linkedin: {
    icon: Linkedin,
    bgClass: "bg-social-linkedin",
    textClass: "text-social-linkedin",
    lightBgClass: "bg-social-linkedin/10",
    name: "LinkedIn",
  },
  twitter: {
    icon: XLogo,
    bgClass: "bg-social-twitter",
    textClass: "text-social-twitter",
    lightBgClass: "bg-social-twitter/10",
    name: "X",
  },
}

const allProviderIds: SocialProviderId[] = ['facebook', 'instagram', 'linkedin', 'twitter']

// ── Animation variants ──────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// ── Provider icon renderer ──────────────────────────────────────────────
function ProviderIcon({ providerId, size = "md" }: { providerId: SocialProviderId; size?: "sm" | "md" | "lg" }) {
  const config = providerUIConfig[providerId]
  const Icon = config.icon
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  }
  const iconSizeMap = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }
  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center text-white shrink-0",
      sizeMap[size],
      config.bgClass,
    )}>
      <Icon className={iconSizeMap[size]} />
    </div>
  )
}

// ── Status badge helper ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    posted: "bg-success-light text-success",
    queued: "bg-warning-light text-warning",
    failed: "bg-destructive/10 text-destructive",
    connected: "bg-success-light text-success",
  }
  return (
    <Badge className={cn("font-medium capitalize border-0", variants[status] || "bg-muted text-muted-foreground")}>
      {status === "posted" && <CircleDot className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  )
}


export default function SocialDistributionPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [globalEnabled, setGlobalEnabled] = useState(true)

  // Data state
  const [providers, setProviders] = useState<SocialProvider[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [stats, setStats] = useState({ posts_today: 0, queued_count: 0, failed_count: 0, success_rate: 0 })

  // Settings state
  const [settings, setSettings] = useState<SocialSettings>({
    policy_mode: "user",
    require_verification: true,
    max_posts_per_day: 5,
    rate_limits: {
      facebook: { hourly: 10, daily: 50 },
      instagram: { hourly: 10, daily: 50 },
      linkedin: { hourly: 10, daily: 50 },
      twitter: { hourly: 10, daily: 50 },
    }
  })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)
  const [isRetryingAll, setIsRetryingAll] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isRefreshingToken, setIsRefreshingToken] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isPostingNow, setIsPostingNow] = useState(false)

  // Dialog states
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; template: SocialTemplate | null }>({ open: false, template: null })
  const [connectDialog, setConnectDialog] = useState<{ open: boolean; provider: SocialProvider | null }>({ open: false, provider: null })
  const [previewingPost, setPreviewingPost] = useState<QueueItem | null>(null)
  const [postingNow, setPostingNow] = useState<QueueItem | null>(null)
  const [cancelingPost, setCancelingPost] = useState<QueueItem | null>(null)
  const [deletingPost, setDeletingPost] = useState<QueueItem | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<SocialTemplate | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<SocialProvider | null>(null)
  const [retryingAll, setRetryingAll] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    provider: "linkedin" as SocialProviderId,
    title_format: "",
    hashtags: "",
    include_salary: true,
    utm_source: "",
    utm_medium: "",
    utm_campaign: ""
  })

  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    app_id: "",
    app_secret: "",
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const queued_count = queue.filter(q => q.status === "queued").length
  const failed_count = queue.filter(q => q.status === "failed").length

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [providersData, queueData, templatesData, settingsData, statsData] = await Promise.all([
        getSocialProviders(),
        getSocialQueue(),
        getSocialTemplates(),
        getSocialSettings(),
        getSocialStats(),
      ])
      setProviders(providersData)
      setQueue(queueData.results)
      setTemplates(templatesData)
      setSettings(settingsData)
      setStats(statsData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncQueue()
      const queueData = await getSocialQueue()
      setQueue(queueData.results)
      const statsData = await getSocialStats()
      setStats(statsData)
    } catch (err) {
      console.error("Sync failed:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePostNow = async (item: QueueItem) => {
    setIsPostingNow(true)
    try {
      const updated = await postNow(item.id)
      setQueue(prev => prev.map(q => q.id === item.id ? updated : q))
    } catch (err) {
      console.error("Post failed:", err)
    } finally {
      setIsPostingNow(false)
      setPostingNow(null)
    }
  }

  const handleCancelPost = async (item: QueueItem) => {
    try {
      await cancelPost(item.id)
      setQueue(prev => prev.filter(q => q.id !== item.id))
    } catch (err) {
      console.error("Cancel failed:", err)
    } finally {
      setCancelingPost(null)
    }
  }

  const handleRetryPost = async (item: QueueItem) => {
    setIsRetrying(item.id)
    try {
      const updated = await retryPost(item.id)
      setQueue(prev => prev.map(q => q.id === item.id ? updated : q))
    } catch (err) {
      console.error("Retry failed:", err)
    } finally {
      setIsRetrying(null)
    }
  }

  const handleRetryAll = async () => {
    setIsRetryingAll(true)
    try {
      await retryAllFailedPosts()
      const queueData = await getSocialQueue()
      setQueue(queueData.results)
    } catch (err) {
      console.error("Retry all failed:", err)
    } finally {
      setIsRetryingAll(false)
      setRetryingAll(false)
    }
  }

  const handleDeleteFailedPost = async (item: QueueItem) => {
    try {
      await cancelPost(item.id)
      setQueue(prev => prev.filter(q => q.id !== item.id))
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeletingPost(null)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.title_format) return
    setIsSavingTemplate(true)
    try {
      const templateData = {
        provider: templateForm.provider,
        title_format: templateForm.title_format,
        hashtags: templateForm.hashtags.split(",").map(h => h.trim()).filter(Boolean),
        include_salary: templateForm.include_salary,
        utm_source: templateForm.utm_source,
        utm_medium: templateForm.utm_medium,
        utm_campaign: templateForm.utm_campaign
      }
      if (templateDialog.template) {
        const updated = await updateTemplate(templateDialog.template.id, templateData)
        setTemplates(prev => prev.map(t => t.id === templateDialog.template!.id ? updated : t))
      } else {
        const created = await createTemplate(templateData)
        setTemplates(prev => [...prev, created])
      }
    } catch (err) {
      console.error("Save template failed:", err)
    } finally {
      setIsSavingTemplate(false)
      setTemplateDialog({ open: false, template: null })
    }
  }

  const handleDeleteTemplate = async (template: SocialTemplate) => {
    try {
      await deleteTemplate(template.id)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
    } catch (err) {
      console.error("Delete template failed:", err)
    } finally {
      setDeletingTemplate(null)
    }
  }

  const handleRefreshToken = async (provider: SocialProvider) => {
    setIsRefreshingToken(true)
    try {
      const updated = await refreshProviderToken(provider.id)
      setProviders(prev => prev.map(p => p.id === provider.id ? updated : p))
      setConnectDialog(prev => prev.provider ? { ...prev, provider: updated } : prev)
    } catch (err) {
      console.error("Refresh token failed:", err)
    } finally {
      setIsRefreshingToken(false)
    }
  }

  const handleDisconnect = async (provider: SocialProvider) => {
    try {
      await disconnectProvider(provider.id)
      setProviders(prev => prev.map(p =>
        p.id === provider.id ? { ...p, connected: false, token_expiry: null } : p
      ))
    } catch (err) {
      console.error("Disconnect failed:", err)
    } finally {
      setDisconnectingProvider(null)
      setConnectDialog({ open: false, provider: null })
    }
  }

  const getFieldLabel = (providerId: string | undefined, field: string) => {
    const labels: Record<string, Record<string, string>> = {
      facebook: { app_id: "App ID", app_secret: "App Secret" },
      instagram: { app_id: "App ID", app_secret: "App Secret" },
      linkedin: { app_id: "Client ID", app_secret: "Client Secret" },
      twitter: { app_id: "API Key", app_secret: "API Secret" },
    }
    return labels[providerId || ""]?.[field] || (field === "app_id" ? "App ID" : "App Secret")
  }

  const getCredentialHelp = (providerId: string | undefined) => {
    const help: Record<string, string> = {
      facebook: "Go to developers.facebook.com \u2192 Your Apps \u2192 Settings \u2192 Basic",
      instagram: "Uses the same credentials as your Facebook App",
      linkedin: "Go to linkedin.com/developers \u2192 Your Apps \u2192 Auth tab",
      twitter: "Go to developer.x.com \u2192 Projects & Apps \u2192 Keys and tokens",
    }
    return help[providerId || ""] || "Check your provider's developer portal"
  }

  const handleConnectWithCredentials = async () => {
    if (!connectDialog.provider) return
    setIsConnecting(true)
    setConnectionError(null)
    if (!connectionForm.app_id || !connectionForm.app_secret) {
      setConnectionError("Please fill in all required fields")
      setIsConnecting(false)
      return
    }
    try {
      const updated = await connectProvider(connectDialog.provider.id, {
        app_id: connectionForm.app_id,
        app_secret: connectionForm.app_secret,
      })
      setProviders(prev => prev.map(p => p.id === connectDialog.provider!.id ? updated : p))
      setConnectionForm({ app_id: "", app_secret: "" })
      setConnectDialog({ open: false, provider: null })
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    if (connectDialog.open && !connectDialog.provider?.connected) {
      setConnectionForm({ app_id: "", app_secret: "" })
      setConnectionError(null)
    }
  }, [connectDialog.open, connectDialog.provider?.connected])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const updated = await updateSocialSettings(settings)
      setSettings(updated)
    } catch (err) {
      console.error("Save settings failed:", err)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const openTemplateDialog = (template: SocialTemplate | null) => {
    if (template) {
      setTemplateForm({
        provider: template.provider,
        title_format: template.title_format,
        hashtags: template.hashtags.join(", "),
        include_salary: template.include_salary,
        utm_source: template.utm_source,
        utm_medium: template.utm_medium,
        utm_campaign: template.utm_campaign
      })
    } else {
      setTemplateForm({
        provider: "linkedin",
        title_format: "",
        hashtags: "",
        include_salary: true,
        utm_source: "",
        utm_medium: "",
        utm_campaign: ""
      })
    }
    setTemplateDialog({ open: true, template })
  }

  const getProviderWithUI = (providerId: SocialProviderId) => {
    const provider = providers.find(p => p.id === providerId)
    const ui = providerUIConfig[providerId]
    return {
      id: providerId,
      name: ui.name,
      icon: ui.icon,
      bgClass: ui.bgClass,
      textClass: ui.textClass,
      lightBgClass: ui.lightBgClass,
      connected: provider?.connected ?? false,
      token_expiry: provider?.token_expiry ?? null,
    }
  }

  const providersWithUI = allProviderIds.map(getProviderWithUI)
  const connectedCount = providersWithUI.filter(p => p.connected).length

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading social distribution data...</p>
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Failed to load data</p>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-destructive to-destructive-deep flex items-center justify-center shadow-lg shadow-destructive/20">
              <Share2 className="h-6 w-6 text-white" />
            </div>
            {globalEnabled && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Social Distribution</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage social media posting across {connectedCount} connected {connectedCount === 1 ? 'provider' : 'providers'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync
          </Button>
          <div className="flex items-center gap-2.5 pl-3 border-l border-border">
            <span className="text-sm text-muted-foreground">Distribution</span>
            <Switch checked={globalEnabled} onCheckedChange={async (checked) => {
              setGlobalEnabled(checked)
              try {
                await updateSocialSettings({ policy_mode: checked ? settings.policy_mode : "admin-only" })
              } catch (err) {
                setGlobalEnabled(!checked)
                console.error("Failed to update distribution status:", err)
              }
            }} />
            <Badge className={cn(
              "border-0 font-medium",
              globalEnabled
                ? "bg-success-light text-success"
                : "bg-muted text-muted-foreground"
            )}>
              {globalEnabled ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <motion.div variants={itemVariants}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue" className="relative">
              Queue
              {queued_count > 0 && (
                <Badge className="ml-2 bg-warning/15 text-warning border-0 h-5 px-1.5 text-[10px] font-semibold">
                  {queued_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="failed" className="relative">
              Failed
              {failed_count > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px] font-semibold">
                  {failed_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            OVERVIEW TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Row */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {[
              { label: "Posts Today", value: stats.posts_today ?? 0, icon: Zap, gradient: "from-sky to-sky-deep", bgAccent: "bg-sky", accent: "text-primary" },
              { label: "Queued", value: queued_count, icon: Clock, gradient: "from-amber-500 to-orange-600", bgAccent: "bg-amber-500", accent: "text-warning" },
              { label: "Failed (24h)", value: failed_count, icon: AlertTriangle, gradient: "from-red-500 to-red-600", bgAccent: "bg-red-500", accent: "text-destructive", highlight: failed_count > 0 },
              { label: "Success Rate", value: `${stats.success_rate}%`, icon: ArrowUpRight, gradient: "from-emerald-500 to-teal-600", bgAccent: "bg-emerald-500", accent: "text-success" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={itemVariants}>
                <Card className={cn("relative overflow-hidden group", stat.highlight && "border-red-200 bg-red-50/30")}>
                  <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", stat.bgAccent)} />
                  <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", stat.gradient)}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Provider Cards */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Connected Providers</h3>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {providersWithUI.map((provider) => {
                // Map provider to gradient colors for hover effects
                const gradientMap: Record<SocialProviderId, { gradient: string; bgAccent: string }> = {
                  facebook: { gradient: "from-blue-500 to-blue-600", bgAccent: "bg-blue-500" },
                  instagram: { gradient: "from-purple-500 via-pink-500 to-orange-500", bgAccent: "bg-pink-500" },
                  linkedin: { gradient: "from-sky-500 to-blue-600", bgAccent: "bg-sky-500" },
                  twitter: { gradient: "from-gray-700 to-gray-900", bgAccent: "bg-gray-800" },
                }
                const { gradient, bgAccent } = gradientMap[provider.id]

                return (
                  <motion.div key={provider.id} variants={itemVariants}>
                    <Card className={cn(
                      "relative overflow-hidden group",
                      !provider.connected && "border-dashed border-muted-foreground/25"
                    )}>
                      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
                      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
                      <CardContent className="p-5 relative">
                        <div className="flex items-start justify-between mb-3">
                          <ProviderIcon providerId={provider.id} size="lg" />
                          {provider.connected ? (
                            <StatusBadge status="connected" />
                          ) : (
                            <Badge variant="secondary" className="border-0">Disconnected</Badge>
                          )}
                        </div>

                        <h4 className="font-semibold text-foreground">{provider.name}</h4>
                        {provider.connected && provider.token_expiry ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Token expires {new Date(provider.token_expiry).toLocaleDateString()}
                          </p>
                        ) : !provider.connected ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Not configured
                          </p>
                        ) : null}

                        <Button
                          variant={provider.connected ? "outline" : "default"}
                          size="sm"
                          className={cn("mt-3 w-full", provider.connected && "bg-transparent")}
                          onClick={() => setConnectDialog({ open: true, provider: { id: provider.id, name: provider.name, connected: provider.connected, token_expiry: provider.token_expiry } })}
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
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>

          {/* Recent Activity */}
          <Card className="relative overflow-hidden group">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary-light to-sky opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm">
                    <CircleDot className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                    <CardDescription className="text-xs">Latest social distribution events</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setActiveTab("queue")}>
                  View all
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {queue.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50 cursor-default",
                      index === 0 && "bg-muted/30"
                    )}
                  >
                    <ProviderIcon providerId={item.provider} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{item.job_title}</p>
                      <p className="text-xs text-muted-foreground">{item.company}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
                {queue.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                      <CircleDot className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Social distribution events will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            QUEUE TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="queue" className="space-y-4">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Queued Posts</CardTitle>
                      <CardDescription className="text-xs">Posts scheduled for distribution</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {queued_count > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs font-medium tabular-nums border-0">
                        {queued_count} queued
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" className="bg-transparent" onClick={handleSync} disabled={isSyncing}>
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {queue.filter(q => q.status === "queued").map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50 cursor-default",
                        index === 0 && "bg-muted/30"
                      )}
                    >
                      <ProviderIcon providerId={item.provider} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.job_title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.scheduled_for).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPreviewingPost(item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary" onClick={() => setPostingNow(item)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setCancelingPost(item)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {queue.filter(q => q.status === "queued").length === 0 && (
                    <div className="py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No posts in queue</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Scheduled posts will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            FAILED TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="failed" className="space-y-4">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-red-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 via-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Failed Posts</CardTitle>
                      <CardDescription className="text-xs">Posts that failed to distribute</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {failed_count > 0 && (
                      <Badge variant="destructive" className="text-xs font-medium tabular-nums">
                        {failed_count} failed
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => setRetryingAll(true)}
                      disabled={isRetryingAll || failed_count === 0}
                    >
                      {isRetryingAll ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      Retry All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {queue.filter(q => q.status === "failed").map((item, index) => {
                    const isThisRetrying = isRetrying === item.id
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50 cursor-default",
                          index === 0 && "bg-muted/30"
                        )}
                      >
                        <div className="opacity-50">
                          <ProviderIcon providerId={item.provider} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.job_title}</p>
                          <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.error}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => handleRetryPost(item)}
                            disabled={isThisRetrying || isRetryingAll}
                          >
                            {isThisRetrying ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Retry
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeletingPost(item)}
                            disabled={isThisRetrying || isRetryingAll}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {failed_count === 0 && (
                    <div className="py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 mx-auto mb-2">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-sm font-medium">All clear</p>
                      <p className="text-muted-foreground text-xs mt-0.5">No failed posts to review</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TEMPLATES TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates" className="space-y-4">
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Post Templates</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure how jobs are formatted when posted to each platform</p>
            </div>
            <Button onClick={() => openTemplateDialog(null)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {templates.map((template) => {
              const config = providerUIConfig[template.provider]
              const templateGradientMap: Record<SocialProviderId, { gradient: string; bgAccent: string }> = {
                facebook: { gradient: "from-blue-500 to-blue-600", bgAccent: "bg-blue-500" },
                instagram: { gradient: "from-purple-500 via-pink-500 to-orange-500", bgAccent: "bg-pink-500" },
                linkedin: { gradient: "from-sky-500 to-blue-600", bgAccent: "bg-sky-500" },
                twitter: { gradient: "from-gray-700 to-gray-900", bgAccent: "bg-gray-800" },
              }
              const { gradient: tGradient, bgAccent: tBgAccent } = templateGradientMap[template.provider]

              return (
                <motion.div key={template.id} variants={itemVariants}>
                  <Card className="relative overflow-hidden group">
                    <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", tBgAccent)} />
                    <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", tGradient)} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon providerId={template.provider} size="sm" />
                          <span className="font-semibold text-sm">{config.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openTemplateDialog(template)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeletingTemplate(template)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 font-mono text-xs leading-relaxed bg-muted/50 rounded-lg px-3 py-2">
                        {template.title_format}
                      </p>

                      {template.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.hashtags.map(tag => (
                            <span key={tag} className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full", config.lightBgClass, config.textClass)}>
                              <Hash className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                        <span className="flex items-center gap-1">
                          Salary: {template.include_salary ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground" />
                          )}
                        </span>
                        {template.utm_source && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            UTM
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
            {templates.length === 0 && (
              <div className="col-span-full">
                <Card className="border-dashed border-muted-foreground/25">
                  <CardContent className="p-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                      <Hash className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No templates yet</p>
                    <p className="text-xs text-muted-foreground mb-3">Create a template to control how jobs appear on social media</p>
                    <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openTemplateDialog(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            SETTINGS TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary-light via-primary to-sky opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Global Policy */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary text-white shadow-sm">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">Global Policy</h3>
                  <p className="text-xs text-muted-foreground">Control distribution permissions</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Distribution Control Mode</Label>
                <Select
                  value={settings.policy_mode}
                  onValueChange={(v: PolicyMode) => setSettings(prev => ({ ...prev, policy_mode: v }))}
                >
                  <SelectTrigger className="w-full max-w-sm">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div>
                    <Label className="text-sm font-medium">Require Company Verification</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Only verified companies can post</p>
                  </div>
                  <Switch
                    checked={settings.require_verification}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, require_verification: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div>
                    <Label className="text-sm font-medium">Max Posts Per Day</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Per company limit</p>
                  </div>
                  <Input
                    type="number"
                    value={settings.max_posts_per_day}
                    onChange={(e) => setSettings(prev => ({ ...prev, max_posts_per_day: parseInt(e.target.value) || 0 }))}
                    className="w-20 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="p-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky to-sky-deep text-white shadow-sm">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">Rate Limits</h3>
                  <p className="text-xs text-muted-foreground">Per-provider posting thresholds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {providersWithUI.filter(p => p.connected).map(provider => {
                  const providerId = provider.id
                  const config = providerUIConfig[providerId]
                  const limits = settings.rate_limits[providerId] || { hourly: 10, daily: 50 }
                  return (
                    <div key={provider.id} className="p-4 bg-muted/40 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <ProviderIcon providerId={providerId} size="sm" />
                        <span className="text-sm font-medium">{config.name}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Posts / hour</span>
                          <Input
                            type="number"
                            value={limits.hourly}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              rate_limits: {
                                ...prev.rate_limits,
                                [providerId]: { ...limits, hourly: parseInt(e.target.value) || 0 }
                              }
                            }))}
                            className="w-16 h-7 text-xs text-center"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Posts / day</span>
                          <Input
                            type="number"
                            value={limits.daily}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              rate_limits: {
                                ...prev.rate_limits,
                                [providerId]: { ...limits, daily: parseInt(e.target.value) || 0 }
                              }
                            }))}
                            className="w-16 h-7 text-xs text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                {connectedCount === 0 && (
                  <div className="col-span-full text-center py-6">
                    <Gauge className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Connect a provider to configure rate limits</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setSettings({
                  policy_mode: "user",
                  require_verification: true,
                  max_posts_per_day: 5,
                  rate_limits: {
                    facebook: { hourly: 10, daily: 50 },
                    instagram: { hourly: 10, daily: 50 },
                    linkedin: { hourly: 10, daily: 50 },
                    twitter: { hourly: 10, daily: 50 },
                  }
                })}
              >
                Reset to Defaults
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════════════════════ */}

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
              <Select
                value={templateForm.provider}
                onValueChange={(v: SocialProviderId) => setTemplateForm(prev => ({ ...prev, provider: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providersWithUI.filter(p => p.connected).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title Format <span className="text-destructive">*</span></Label>
              <Input
                value={templateForm.title_format}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, title_format: e.target.value }))}
                placeholder="{company} is hiring: {title}"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Variables: <code className="px-1 py-0.5 bg-muted rounded text-[11px]">{"{company}"}</code>{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-[11px]">{"{title}"}</code>{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-[11px]">{"{location}"}</code>{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-[11px]">{"{salary}"}</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Hashtags (comma-separated)</Label>
              <Input
                value={templateForm.hashtags}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, hashtags: e.target.value }))}
                placeholder="hiring, jobs, careers"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <Label className="cursor-pointer">Include Salary</Label>
              <Switch
                checked={templateForm.include_salary}
                onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, include_salary: checked }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">UTM Source</Label>
                <Input
                  className="h-8 text-sm"
                  value={templateForm.utm_source}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, utm_source: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UTM Medium</Label>
                <Input
                  className="h-8 text-sm"
                  value={templateForm.utm_medium}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, utm_medium: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UTM Campaign</Label>
                <Input
                  className="h-8 text-sm"
                  value={templateForm.utm_campaign}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, utm_campaign: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog({ open: false, template: null })}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={isSavingTemplate || !templateForm.title_format}>
              {isSavingTemplate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect/Manage Provider Dialog */}
      <Dialog open={connectDialog.open} onOpenChange={open => !open && setConnectDialog({ open: false, provider: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {connectDialog.provider && (
                <ProviderIcon providerId={connectDialog.provider.id as SocialProviderId} size="sm" />
              )}
              {connectDialog.provider?.connected ? `Manage ${connectDialog.provider?.name}` : `Connect ${connectDialog.provider?.name}`}
            </DialogTitle>
            {!connectDialog.provider?.connected && (
              <DialogDescription>
                Enter your API credentials to connect this provider
              </DialogDescription>
            )}
          </DialogHeader>
          {connectDialog.provider?.connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status="connected" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Token Expires</span>
                  <span className="font-medium">{connectDialog.provider.token_expiry ? new Date(connectDialog.provider.token_expiry).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => connectDialog.provider && handleRefreshToken(connectDialog.provider)}
                  disabled={isRefreshingToken}
                >
                  {isRefreshingToken ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh Token
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => connectDialog.provider && setDisconnectingProvider(connectDialog.provider)}
                >
                  <Link2Off className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {connectionError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {connectionError}
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{getFieldLabel(connectDialog.provider?.id, "app_id")}</Label>
                  <Input
                    type="text"
                    value={connectionForm.app_id}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, app_id: e.target.value }))}
                    placeholder={`Enter your ${getFieldLabel(connectDialog.provider?.id, "app_id")}`}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{getFieldLabel(connectDialog.provider?.id, "app_secret")}</Label>
                  <Input
                    type="password"
                    value={connectionForm.app_secret}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, app_secret: e.target.value }))}
                    placeholder={`Enter your ${getFieldLabel(connectDialog.provider?.id, "app_secret")}`}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="p-3 bg-info-light rounded-lg border border-info/20">
                <p className="text-xs text-info flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Where to find credentials:</strong><br />
                    {getCredentialHelp(connectDialog.provider?.id)}
                  </span>
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleConnectWithCredentials}
                disabled={isConnecting || !connectionForm.app_id || !connectionForm.app_secret}
              >
                {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Connect {connectDialog.provider?.name}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Preview Dialog */}
      <Dialog open={!!previewingPost} onOpenChange={open => !open && setPreviewingPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
            <DialogDescription>Preview the scheduled social post</DialogDescription>
          </DialogHeader>
          {previewingPost && (() => {
            const config = providerUIConfig[previewingPost.provider]
            const template = templates.find(t => t.provider === previewingPost.provider)
            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Provider header bar */}
                  <div className={cn("h-1.5", config.bgClass)} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <ProviderIcon providerId={previewingPost.provider} />
                      <div>
                        <p className="font-semibold text-sm">{config.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(previewingPost.scheduled_for).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-sm font-medium">{previewingPost.job_title}</p>
                      <p className="text-xs text-muted-foreground">{previewingPost.company}</p>
                    </div>
                    {template && (
                      <>
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Generated Post</p>
                          <p className="text-sm">
                            {template.title_format
                              .replace("{company}", previewingPost.company)
                              .replace("{title}", previewingPost.job_title.split(" at ")[0])}
                          </p>
                          {template.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.hashtags.map(tag => (
                                <span key={tag} className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", config.lightBgClass, config.textClass)}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">UTM Parameters</p>
                          <p className="text-xs text-muted-foreground font-mono bg-muted/50 rounded-lg px-3 py-1.5">
                            ?utm_source={template.utm_source}&utm_medium={template.utm_medium}&utm_campaign={template.utm_campaign}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewingPost(null)}>Close</Button>
            <Button onClick={() => {
              if (previewingPost) {
                setPreviewingPost(null)
                setPostingNow(previewingPost)
              }
            }}>
              <Play className="w-4 h-4 mr-2" />
              Post Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Now Confirmation */}
      <Dialog open={!!postingNow} onOpenChange={open => !open && setPostingNow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Now</DialogTitle>
            <DialogDescription>
              Post this immediately instead of waiting for the scheduled time?
            </DialogDescription>
          </DialogHeader>
          {postingNow && (
            <div className="p-4 bg-muted/40 rounded-xl">
              <p className="font-medium text-sm">{postingNow.job_title}</p>
              <p className="text-xs text-muted-foreground">{postingNow.company}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostingNow(null)} disabled={isPostingNow}>Cancel</Button>
            <Button onClick={() => postingNow && handlePostNow(postingNow)} disabled={isPostingNow}>
              {isPostingNow ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Post Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Post Confirmation */}
      <Dialog open={!!cancelingPost} onOpenChange={open => !open && setCancelingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Post</DialogTitle>
            <DialogDescription>
              This will remove the post from the queue. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancelingPost && (
            <div className="p-4 bg-muted/40 rounded-xl">
              <p className="font-medium text-sm">{cancelingPost.job_title}</p>
              <p className="text-xs text-muted-foreground">{cancelingPost.company}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelingPost(null)}>Keep Post</Button>
            <Button variant="destructive" onClick={() => cancelingPost && handleCancelPost(cancelingPost)}>
              <X className="w-4 h-4 mr-2" />
              Cancel Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Failed Post */}
      <Dialog open={!!deletingPost} onOpenChange={open => !open && setDeletingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Failed Post</DialogTitle>
            <DialogDescription>
              This will permanently remove the failed post. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingPost && (
            <div className="p-4 bg-muted/40 rounded-xl">
              <p className="font-medium text-sm">{deletingPost.job_title}</p>
              <p className="text-xs text-muted-foreground">{deletingPost.company}</p>
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {deletingPost.error}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPost(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingPost && handleDeleteFailedPost(deletingPost)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry All Confirmation */}
      <Dialog open={retryingAll} onOpenChange={open => !open && setRetryingAll(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry All Failed Posts</DialogTitle>
            <DialogDescription>
              This will move all {failed_count} failed posts back to the queue for retry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetryingAll(false)} disabled={isRetryingAll}>Cancel</Button>
            <Button onClick={handleRetryAll} disabled={isRetryingAll}>
              {isRetryingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Retry All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <Dialog open={!!deletingTemplate} onOpenChange={open => !open && setDeletingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              This will permanently remove this template. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingTemplate && (
            <div className="p-4 bg-muted/40 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <ProviderIcon providerId={deletingTemplate.provider} size="sm" />
                <span className="font-medium text-sm">{providerUIConfig[deletingTemplate.provider].name} Template</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{deletingTemplate.title_format}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingTemplate && handleDeleteTemplate(deletingTemplate)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Provider Confirmation */}
      <Dialog open={!!disconnectingProvider} onOpenChange={open => !open && setDisconnectingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectingProvider?.name}</DialogTitle>
            <DialogDescription>
              You will lose the ability to post to {disconnectingProvider?.name} until you reconnect.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-warning-light border border-warning/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Warning</p>
                <p className="text-muted-foreground mt-0.5">Any posts currently queued for {disconnectingProvider?.name} will fail after disconnection.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectingProvider(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => disconnectingProvider && handleDisconnect(disconnectingProvider)}>
              <Link2Off className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

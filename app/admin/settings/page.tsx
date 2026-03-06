"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2,
  Settings,
  ShieldCheck,
  Globe,
  Wrench,
  CreditCard,
  Megaphone,
  Link2,
  FileText,
  Mail,
  BarChart3,
  KeyRound,
  Network,
  Ticket,
  CheckCircle2,
  Send,
  Hash,
  ExternalLink,
  Unplug,
  RefreshCw,
  Shield,
  Briefcase,
  Gauge,
  AlertTriangle,
  Lock,
  Save,
  Copy,
  Webhook,
} from "lucide-react"
import { cn, isSafeExternalUrl } from "@/lib/utils"
import { toast } from "sonner"
import {
  getPlatformSettings,
  updatePlatformSettings,
  getSlackInstallation,
  getSlackOAuthUrl,
  completeSlackOAuth,
  getSlackChannels,
  updateSlackChannels,
  updateSlackCredentials,
  disconnectSlack,
  testSlackNotification,
  getStripeSettings,
  updateStripeKeys,
  testStripeConnection,
  type PlatformSettings,
  type SlackInstallation,
  type SlackChannelInfo,
  type StripeSettings,
} from "@/lib/api/admin-settings"

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

// ---------------------------------------------------------------------------
// Section Card — reusable wrapper matching dashboard design language
// ---------------------------------------------------------------------------
function SectionCard({
  icon,
  gradient,
  title,
  description,
  children,
  badge,
}: {
  icon: React.ReactNode
  gradient: string
  title: string
  description: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <Card className="relative overflow-hidden group">
      <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Toggle Row — consistent toggle layout
// ---------------------------------------------------------------------------
function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Channel Select Row — dropdown to pick a Slack channel per category
// ---------------------------------------------------------------------------
const CHANNEL_CATEGORIES = [
  {
    field: 'channel_default' as const,
    label: 'Default',
    description: 'Fallback channel for unconfigured categories',
    icon: <Hash className="h-3.5 w-3.5" />,
  },
  {
    field: 'channel_security' as const,
    label: 'Security',
    description: 'Login lockouts, suspicious activity, admin actions',
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  {
    field: 'channel_moderation' as const,
    label: 'Moderation',
    description: 'Fraud alerts, content flags, compliance requests',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  {
    field: 'channel_billing' as const,
    label: 'Billing',
    description: 'Payment failures, refunds, subscription changes',
    icon: <CreditCard className="h-3.5 w-3.5" />,
  },
  {
    field: 'channel_jobs' as const,
    label: 'Jobs',
    description: 'Job submissions, publications, applications, hires',
    icon: <Briefcase className="h-3.5 w-3.5" />,
  },
  {
    field: 'channel_system' as const,
    label: 'System',
    description: 'Daily digests, platform health, signup notifications',
    icon: <Gauge className="h-3.5 w-3.5" />,
  },
]

type ChannelField = typeof CHANNEL_CATEGORIES[number]['field']

function ChannelSelectRow({
  label,
  description,
  icon,
  channelField,
  value,
  channels,
  onUpdate,
  onTest,
  isTesting,
}: {
  label: string
  description: string
  icon: React.ReactNode
  channelField: ChannelField
  value: string
  channels: SlackChannelInfo[]
  onUpdate: (field: ChannelField, value: string) => void
  onTest: (channel: string) => void
  isTesting: boolean
}) {
  const channelName = channels.find(c => c.id === value)?.name

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        <Select
          value={value || "unset"}
          onValueChange={(v) => onUpdate(channelField, v === "unset" ? "" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select channel...">
              {value ? (
                <span className="flex items-center gap-1.5">
                  {channels.find(c => c.id === value)?.is_private ? (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Hash className="h-3 w-3 text-muted-foreground" />
                  )}
                  {channelName || value}
                </span>
              ) : (
                "Not configured"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">
              <span className="text-muted-foreground">Not configured</span>
            </SelectItem>
            {channels.map(ch => (
              <SelectItem key={ch.id} value={ch.id}>
                <span className="flex items-center gap-1.5">
                  {ch.is_private ? (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Hash className="h-3 w-3 text-muted-foreground" />
                  )}
                  {ch.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => {
            // Map channel_field to the channel name for the test endpoint
            const ch = channelField.replace('channel_', '')
            onTest(ch)
          }}
          disabled={!value || isTesting}
          title="Send test notification"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slack Integration Card — OAuth connect + channel mapping
// ---------------------------------------------------------------------------
function SlackIntegrationCard({
  installation,
  channels,
  isLoadingInstallation,
  isLoadingChannels,
  slackEnabled,
  onToggleEnabled,
  onConnect,
  onDisconnect,
  onUpdateChannel,
  onTest,
  onRefreshChannels,
  onSaveCredentials,
  isConnecting,
  isDisconnecting,
  isSavingCredentials,
  testingChannel,
}: {
  installation: SlackInstallation | null
  channels: SlackChannelInfo[]
  isLoadingInstallation: boolean
  isLoadingChannels: boolean
  slackEnabled: boolean
  onToggleEnabled: (v: boolean) => void
  onConnect: () => void
  onDisconnect: () => void
  onUpdateChannel: (field: ChannelField, value: string) => void
  onTest: (channel: string) => void
  onRefreshChannels: () => void
  onSaveCredentials: (clientId: string, clientSecret: string) => Promise<void>
  isConnecting: boolean
  isDisconnecting: boolean
  isSavingCredentials: boolean
  testingChannel: string | null
}) {
  const isConnected = installation?.is_active ?? false
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const credsConfigured = installation?.client_id_set && installation?.client_secret_set

  return (
    <SectionCard
      icon={
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      }
      gradient="from-[#611f69] to-[#4a154b]"
      title="Slack"
      description="Connect your Slack workspace for real-time platform alerts"
      badge={
        isConnected ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Not connected</Badge>
        )
      }
    >
      {isLoadingInstallation ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isConnected && installation ? (
        <>
          {/* Connected workspace info */}
          <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#611f69] to-[#4a154b] text-white shadow-sm">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{installation.team_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    Connected{installation.installed_by ? ` by ${installation.installed_by}` : ''}
                    {installation.installed_at ? ` on ${new Date(installation.installed_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="text-destructive hover:text-destructive"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Unplug className="h-4 w-4 mr-1.5" />
              )}
              Disconnect
            </Button>
          </div>

          {/* Master toggle */}
          <ToggleRow
            title="Enable Slack Notifications"
            description="Send platform events and alerts to your Slack workspace"
            checked={slackEnabled}
            onCheckedChange={onToggleEnabled}
          />

          {slackEnabled && (
            <>
              <Separator />

              {/* Channel mapping header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Channel Mapping</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select which Slack channel receives each notification type
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefreshChannels}
                  disabled={isLoadingChannels}
                  title="Refresh channel list"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingChannels && "animate-spin")} />
                </Button>
              </div>

              {/* Channel dropdowns */}
              {isLoadingChannels ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-9 w-[200px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {CHANNEL_CATEGORIES.map((cat) => (
                    <ChannelSelectRow
                      key={cat.field}
                      label={cat.label}
                      description={cat.description}
                      icon={cat.icon}
                      channelField={cat.field}
                      value={installation[cat.field]}
                      channels={channels}
                      onUpdate={onUpdateChannel}
                      onTest={onTest}
                      isTesting={testingChannel === cat.field.replace('channel_', '')}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Not connected state — configure credentials then connect */
        <div className="space-y-5">
          <div className="text-center pb-1">
            <p className="text-sm font-medium">Connect your Slack workspace</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Enter your Slack App credentials from{" "}
              <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                api.slack.com/apps
              </a>
              , then connect your workspace.
            </p>
          </div>

          {/* Credential inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slack-client-id" className="text-xs font-medium">Client ID</Label>
              <Input
                id="slack-client-id"
                placeholder={credsConfigured ? "••••••••••••" : "Enter Slack Client ID"}
                value={clientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack-client-secret" className="text-xs font-medium">Client Secret</Label>
              <Input
                id="slack-client-secret"
                type="password"
                placeholder={credsConfigured ? "••••••••••••" : "Enter Slack Client Secret"}
                value={clientSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Save + Connect buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await onSaveCredentials(clientId, clientSecret)
                setClientId('')
                setClientSecret('')
              }}
              disabled={isSavingCredentials || (!clientId && !clientSecret)}
            >
              {isSavingCredentials ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {credsConfigured ? "Update Credentials" : "Save Credentials"}
            </Button>
            <Button onClick={onConnect} disabled={isConnecting || !credsConfigured}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? "Connecting..." : "Connect to Slack"}
            </Button>
          </div>

          {credsConfigured && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              App credentials configured. Click &quot;Connect to Slack&quot; to authorize.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<PlatformSettings | null>(null)

  // Slack OAuth state
  const [slackInstallation, setSlackInstallation] = useState<SlackInstallation | null>(null)
  const [slackChannels, setSlackChannels] = useState<SlackChannelInfo[]>([])
  const [isLoadingSlackInstallation, setIsLoadingSlackInstallation] = useState(true)
  const [isLoadingSlackChannels, setIsLoadingSlackChannels] = useState(false)
  const [isConnectingSlack, setIsConnectingSlack] = useState(false)
  const [isDisconnectingSlack, setIsDisconnectingSlack] = useState(false)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [isSavingSlackCreds, setIsSavingSlackCreds] = useState(false)
  const oauthHandled = useRef(false)

  // Stripe state
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null)
  const [isLoadingStripe, setIsLoadingStripe] = useState(true)
  const [isSavingStripe, setIsSavingStripe] = useState(false)
  const [isTestingStripe, setIsTestingStripe] = useState(false)
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')

  // Determine default tab from URL
  const defaultTab = searchParams.get('tab') || 'general'

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getPlatformSettings()
      setSettings(data)
    } catch {
      toast.error("Failed to load platform settings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchStripeSettings = useCallback(async () => {
    try {
      setIsLoadingStripe(true)
      const data = await getStripeSettings()
      setStripeSettings(data)
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number }
      console.error('[Stripe Settings] Failed to fetch — status:', apiErr?.status, 'message:', apiErr?.message)
      setStripeSettings(null)
    } finally {
      setIsLoadingStripe(false)
    }
  }, [])

  const fetchSlackInstallation = useCallback(async () => {
    try {
      setIsLoadingSlackInstallation(true)
      const data = await getSlackInstallation()
      setSlackInstallation(data)
    } catch {
      // Not critical — just means Slack isn't configured yet
      setSlackInstallation(null)
    } finally {
      setIsLoadingSlackInstallation(false)
    }
  }, [])

  const fetchSlackChannels = useCallback(async () => {
    try {
      setIsLoadingSlackChannels(true)
      const data = await getSlackChannels()
      setSlackChannels(data.channels)
    } catch {
      toast.error("Failed to load Slack channels")
    } finally {
      setIsLoadingSlackChannels(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchSlackInstallation()
    fetchStripeSettings()
  }, [fetchSettings, fetchSlackInstallation, fetchStripeSettings])

  // Fetch channels when installation becomes active
  useEffect(() => {
    if (slackInstallation?.is_active) {
      fetchSlackChannels()
    }
  }, [slackInstallation?.is_active, fetchSlackChannels])

  // Handle OAuth callback — detect ?slack_callback=1&code=xxx in URL
  useEffect(() => {
    if (oauthHandled.current) return

    const slackCallback = searchParams.get('slack_callback')
    const code = searchParams.get('code')

    if (slackCallback === '1' && code) {
      oauthHandled.current = true
      setIsConnectingSlack(true)

      // Retrieve stored state for CSRF verification
      const storedState = sessionStorage.getItem('slack_oauth_state') || ''
      sessionStorage.removeItem('slack_oauth_state')

      completeSlackOAuth(code, storedState)
        .then((result) => {
          if (result.connected) {
            toast.success(`Connected to ${result.team_name}`)
            fetchSlackInstallation()
          }
        })
        .catch(() => {
          toast.error("Failed to complete Slack connection")
        })
        .finally(() => {
          setIsConnectingSlack(false)
          // Clean up URL params
          const url = new URL(window.location.href)
          url.searchParams.delete('slack_callback')
          url.searchParams.delete('code')
          url.searchParams.delete('state')
          window.history.replaceState({}, '', url.toString())
        })
    }
  }, [searchParams, fetchSlackInstallation])

  const updateField = useCallback(<K extends keyof PlatformSettings>(
    field: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev))
  }, [])

  const handleSave = useCallback(async () => {
    if (!settings) return
    try {
      setIsSaving(true)
      const { updated_at: _, ...data } = settings
      const updated = await updatePlatformSettings(data)
      setSettings(updated)
      toast.success("Settings saved successfully")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  const handleSaveSlackCredentials = useCallback(async (clientId: string, clientSecret: string) => {
    try {
      setIsSavingSlackCreds(true)
      const data: { client_id?: string; client_secret?: string } = {}
      if (clientId) data.client_id = clientId
      if (clientSecret) data.client_secret = clientSecret
      await updateSlackCredentials(data)
      // Refresh installation to get updated client_id_set / client_secret_set
      const inst = await getSlackInstallation()
      setSlackInstallation(inst)
      toast.success("Slack credentials saved")
    } catch {
      toast.error("Failed to save Slack credentials")
    } finally {
      setIsSavingSlackCreds(false)
    }
  }, [])

  const handleSlackConnect = useCallback(async () => {
    try {
      setIsConnectingSlack(true)
      const { url, state } = await getSlackOAuthUrl()
      // Store state in sessionStorage for CSRF verification after redirect
      sessionStorage.setItem('slack_oauth_state', state)
      // Full-page redirect to Slack OAuth — Slack will redirect back to this
      // page with ?slack_callback=1&code=xxx which the useEffect above handles
      if (isSafeExternalUrl(url)) {
        window.location.href = url
      }
    } catch {
      toast.error("Failed to start Slack connection")
      setIsConnectingSlack(false)
    }
  }, [])

  const handleSlackDisconnect = useCallback(async () => {
    if (!confirm("Disconnect Slack? Notifications will stop being sent to your workspace.")) return
    try {
      setIsDisconnectingSlack(true)
      await disconnectSlack()
      setSlackInstallation(null)
      setSlackChannels([])
      toast.success("Slack disconnected")
    } catch {
      toast.error("Failed to disconnect Slack")
    } finally {
      setIsDisconnectingSlack(false)
    }
  }, [])

  const handleUpdateSlackChannel = useCallback(async (field: ChannelField, value: string) => {
    try {
      const updated = await updateSlackChannels({ [field]: value })
      setSlackInstallation((prev) =>
        prev ? { ...prev, ...updated } : prev
      )
      toast.success("Channel updated")
    } catch {
      toast.error("Failed to update channel")
    }
  }, [])

  const handleTestSlack = useCallback(async (channel: string) => {
    setTestingChannel(channel)
    try {
      const result = await testSlackNotification(channel)
      if (result.success) {
        toast.success(result.message || `Test sent to #${channel}`)
      } else {
        toast.error(result.error || `Failed to send test to #${channel}`)
      }
    } catch {
      toast.error(`Failed to send test to #${channel}`)
    } finally {
      setTestingChannel(null)
    }
  }, [])

  const handleSlackToggle = useCallback(async (enabled: boolean) => {
    updateField("slack_enabled", enabled)
    try {
      await updatePlatformSettings({ slack_enabled: enabled })
      toast.success(enabled ? "Slack notifications enabled" : "Slack notifications disabled")
    } catch {
      // Revert on failure
      updateField("slack_enabled", !enabled)
      toast.error("Failed to update Slack setting")
    }
  }, [updateField])

  const handleSaveStripeKeys = useCallback(async () => {
    const data: { publishable_key?: string; secret_key?: string; webhook_secret?: string } = {}
    if (stripePublishableKey) data.publishable_key = stripePublishableKey
    if (stripeSecretKey) data.secret_key = stripeSecretKey
    if (stripeWebhookSecret) data.webhook_secret = stripeWebhookSecret

    if (Object.keys(data).length === 0) {
      toast.error("Enter at least one key to save")
      return
    }

    try {
      setIsSavingStripe(true)
      await updateStripeKeys(data)
      toast.success("Stripe keys saved and encrypted")
      // Clear inputs and refresh status
      setStripePublishableKey('')
      setStripeSecretKey('')
      setStripeWebhookSecret('')
      fetchStripeSettings()
    } catch (err: unknown) {
      console.error('[Stripe Save] Error:', err)
      const apiErr = err as { message?: string; errors?: Record<string, string[]>; status?: number }
      if (apiErr?.errors) {
        // Show field-level validation errors from DRF
        const messages = Object.entries(apiErr.errors).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        toast.error(messages.join('. '))
      } else if (apiErr?.message) {
        toast.error(apiErr.message)
      } else {
        toast.error("Failed to save Stripe keys — check browser console for details")
      }
    } finally {
      setIsSavingStripe(false)
    }
  }, [stripePublishableKey, stripeSecretKey, stripeWebhookSecret, fetchStripeSettings])

  const handleTestStripe = useCallback(async () => {
    try {
      setIsTestingStripe(true)
      const result = await testStripeConnection()
      if (result.connected) {
        toast.success(`Connected to Stripe${result.account_name ? ` (${result.account_name})` : ''} in ${result.mode} mode`)
      } else {
        toast.error(result.error || "Failed to connect to Stripe")
      }
      fetchStripeSettings()
    } catch {
      toast.error("Failed to test Stripe connection")
    } finally {
      setIsTestingStripe(false)
    }
  }, [fetchStripeSettings])

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Global platform configuration and preferences</p>
          </div>
        </div>
        <Skeleton className="h-10 w-[480px]" />
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div>
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-52 mt-1" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
                <Skeleton className="mt-4 h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Error state
  // ==========================================================================
  if (!settings) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Failed to load settings. Please try again.</p>
          </div>
        </div>
        <Button onClick={fetchSettings}>Retry</Button>
      </div>
    )
  }

  // ==========================================================================
  // Render
  // ==========================================================================
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Global platform configuration and preferences
            </p>
          </div>
        </div>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue={defaultTab} className="space-y-8">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* ================================================================
              GENERAL TAB
          ================================================================ */}
          <TabsContent value="general" className="space-y-6">
            <SectionCard
              icon={<Globe className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              title="Platform Information"
              description="Basic platform settings and branding"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={settings.platform_name}
                    onChange={(e) => updateField("platform_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    value={settings.support_email}
                    onChange={(e) => updateField("support_email", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Platform Description</Label>
                <Textarea
                  value={settings.platform_description}
                  onChange={(e) => updateField("platform_description", e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(v) => updateField("timezone", v)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Wrench className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              title="Maintenance Mode"
              description="Control access to the platform during maintenance"
              badge={
                settings.maintenance_mode ? (
                  <Badge variant="destructive" className="text-xs">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )
              }
            >
              <ToggleRow
                title="Enable Maintenance Mode"
                description="Only admins can access the platform when enabled"
                checked={settings.maintenance_mode}
                onCheckedChange={(v) => updateField("maintenance_mode", v)}
              />
              <Separator />
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={settings.maintenance_message}
                  onChange={(e) => updateField("maintenance_message", e.target.value)}
                  placeholder="We're currently performing maintenance. Please check back soon."
                  className="min-h-[80px]"
                />
              </div>
            </SectionCard>
          </TabsContent>

          {/* ================================================================
              BILLING TAB
          ================================================================ */}
          <TabsContent value="billing" className="space-y-6">
            {/* Stripe API Keys */}
            <SectionCard
              icon={<CreditCard className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              title="Stripe Configuration"
              description="Manage Stripe API keys for payment processing"
              badge={
                isLoadingStripe ? (
                  <Skeleton className="h-5 w-20" />
                ) : stripeSettings?.connected ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {stripeSettings.mode === 'test' ? 'Test Mode' : 'Live Mode'}
                  </Badge>
                ) : stripeSettings?.mode === 'unconfigured' ? (
                  <Badge variant="secondary" className="text-xs">Not Configured</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                )
              }
            >
              {isLoadingStripe ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {/* Connection status */}
                  {stripeSettings && stripeSettings.connected && (
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-white shadow-sm">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {stripeSettings.account_name || 'Stripe Account'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stripeSettings.mode === 'test' ? 'Test' : 'Live'} mode
                            {stripeSettings.secret_key_source === 'database' ? ' — keys stored in database (encrypted)' : ' — using environment variables'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestStripe}
                        disabled={isTestingStripe}
                      >
                        {isTestingStripe ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                        )}
                        Test Connection
                      </Button>
                    </div>
                  )}

                  {stripeSettings && !stripeSettings.connected && stripeSettings.connection_error && (
                    <div className="flex items-center gap-2 p-3 border border-destructive/20 rounded-xl bg-destructive/5 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {stripeSettings.connection_error}
                    </div>
                  )}

                  {/* Current key status */}
                  {stripeSettings && (stripeSettings.publishable_key || stripeSettings.secret_key || stripeSettings.webhook_secret) && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-2">Current Keys</p>
                        <div className="grid gap-2">
                          {stripeSettings.publishable_key && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                              <span className="text-muted-foreground">Publishable Key</span>
                              <span className="font-mono">{stripeSettings.publishable_key}</span>
                            </div>
                          )}
                          {stripeSettings.secret_key && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                              <span className="text-muted-foreground">Secret Key</span>
                              <span className="font-mono">{stripeSettings.secret_key}</span>
                            </div>
                          )}
                          {stripeSettings.webhook_secret && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                              <span className="text-muted-foreground">Webhook Secret</span>
                              <span className="font-mono">{stripeSettings.webhook_secret}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* API Key inputs */}
                  <div>
                    <p className="text-sm font-medium mb-1">
                      {stripeSettings?.secret_key ? 'Update API Keys' : 'Enter API Keys'}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Keys are encrypted at rest using AES-256. Get your keys from{' '}
                      <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        dashboard.stripe.com/apikeys
                      </a>
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="stripe-pk" className="text-xs font-medium">Publishable Key</Label>
                        <Input
                          id="stripe-pk"
                          placeholder="pk_test_..."
                          value={stripePublishableKey}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStripePublishableKey(e.target.value)}
                          className="text-sm font-mono"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stripe-sk" className="text-xs font-medium">Secret Key</Label>
                        <Input
                          id="stripe-sk"
                          type="password"
                          placeholder="sk_test_..."
                          value={stripeSecretKey}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStripeSecretKey(e.target.value)}
                          className="text-sm font-mono"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save API Keys + Test Connection */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestStripe}
                      disabled={isTestingStripe || (!stripeSettings?.secret_key && !stripeSecretKey)}
                    >
                      {isTestingStripe ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Shield className="h-4 w-4 mr-1.5" />
                      )}
                      Test Connection
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveStripeKeys}
                      disabled={isSavingStripe || (!stripePublishableKey && !stripeSecretKey && !stripeWebhookSecret)}
                    >
                      {isSavingStripe ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Save className="h-4 w-4 mr-1.5" />
                      )}
                      Save Keys
                    </Button>
                  </div>

                  <Separator />

                  {/* Webhook Setup */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Webhook Setup</p>
                    </div>

                    {(() => {
                      const webhookUrl = stripeSettings?.webhook_url || ''
                      const isLocalhost = webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')

                      if (isLocalhost) {
                        // ── Local Development Mode ──
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 border border-sky/20 rounded-lg bg-sky/5 text-xs text-sky">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                You&apos;re running locally. Stripe cannot reach <code className="font-mono bg-sky/10 px-1 rounded">localhost</code> — use the Stripe CLI to forward webhooks during development.
                              </span>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-medium">1. Run the Stripe CLI</Label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 p-2.5 rounded-lg bg-muted/50 border">
                                  <code className="text-xs font-mono text-muted-foreground">
                                    stripe listen --forward-to https://localhost/api/billing/webhook/ --skip-verify
                                  </code>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText('stripe listen --forward-to https://localhost/api/billing/webhook/ --skip-verify').then(() => toast.success("Command copied")).catch(() => toast.error("Failed to copy"))
                                  }}
                                  title="Copy command"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                The CLI will print a webhook signing secret (<code className="font-mono bg-muted px-1 rounded">whsec_...</code>). Copy it and paste below.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="stripe-wh" className="text-xs font-medium">2. Enter the signing secret from the CLI output</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="stripe-wh"
                                  type="password"
                                  placeholder="whsec_..."
                                  value={stripeWebhookSecret}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStripeWebhookSecret(e.target.value)}
                                  className="text-sm font-mono"
                                  autoComplete="new-password"
                                />
                                {stripeWebhookSecret && (
                                  <Button
                                    size="sm"
                                    onClick={handleSaveStripeKeys}
                                    disabled={isSavingStripe}
                                  >
                                    {isSavingStripe ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    ) : (
                                      <Save className="h-4 w-4 mr-1.5" />
                                    )}
                                    Save
                                  </Button>
                                )}
                              </div>
                            </div>

                            <Separator />

                            <p className="text-xs text-muted-foreground">
                              For production, set <code className="font-mono bg-muted px-1 rounded">API_BASE_URL</code> in your backend <code className="font-mono bg-muted px-1 rounded">.env</code> to your public domain (e.g. <code className="font-mono bg-muted px-1 rounded">https://api.yourdomain.com</code>) and the webhook URL above will update automatically.
                            </p>
                          </div>
                        )
                      }

                      // ── Production Mode ──
                      return (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold shrink-0">1</Badge>
                              <Label className="text-xs font-medium">Copy your webhook endpoint URL</Label>
                            </div>
                            {webhookUrl ? (
                              <div className="flex items-center gap-2 ml-7">
                                <Input
                                  value={webhookUrl}
                                  readOnly
                                  className="text-sm font-mono bg-muted/50"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Webhook URL copied")).catch(() => toast.error("Failed to copy"))
                                  }}
                                  title="Copy webhook URL"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic ml-7">
                                Save your API keys first to generate a webhook URL.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold shrink-0">2</Badge>
                              <Label className="text-xs font-medium">Register in Stripe Dashboard</Label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-7">
                              Go to{' '}
                              <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Stripe Dashboard &rarr; Developers &rarr; Webhooks
                              </a>
                              , click &ldquo;Add endpoint&rdquo;, and paste the URL above.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold shrink-0">3</Badge>
                              <Label htmlFor="stripe-wh" className="text-xs font-medium">Enter the signing secret from Stripe</Label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-7 mb-2">
                              After adding the endpoint, Stripe shows a signing secret (starts with <code className="font-mono bg-muted px-1 rounded">whsec_</code>). Paste it here.
                            </p>
                            <div className="flex items-center gap-2 ml-7">
                              <Input
                                id="stripe-wh"
                                type="password"
                                placeholder="whsec_..."
                                value={stripeWebhookSecret}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStripeWebhookSecret(e.target.value)}
                                className="text-sm font-mono"
                                autoComplete="new-password"
                              />
                              {stripeWebhookSecret && (
                                <Button
                                  size="sm"
                                  onClick={handleSaveStripeKeys}
                                  disabled={isSavingStripe}
                                >
                                  {isSavingStripe ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                  ) : (
                                    <Save className="h-4 w-4 mr-1.5" />
                                  )}
                                  Save
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </SectionCard>

            {/* General Billing Settings */}
            <SectionCard
              icon={<FileText className="h-4 w-4" />}
              gradient="from-slate-500 to-gray-600"
              title="Payment Configuration"
              description="Currency and provider settings"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Provider</Label>
                  <Select
                    value={settings.billing_provider}
                    onValueChange={(v) => updateField("billing_provider", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paddle">Paddle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select
                    value={settings.billing_default_currency}
                    onValueChange={(v) => updateField("billing_default_currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="cad">CAD (C$)</SelectItem>
                      <SelectItem value="eur">EUR (&euro;)</SelectItem>
                      <SelectItem value="gbp">GBP (&pound;)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<FileText className="h-4 w-4" />}
              gradient="from-slate-500 to-gray-600"
              title="Invoice Settings"
              description="Configure invoice generation"
            >
              <div className="space-y-2">
                <Label>Invoice Prefix</Label>
                <Input
                  value={settings.billing_invoice_prefix}
                  onChange={(e) => updateField("billing_invoice_prefix", e.target.value)}
                  className="w-[180px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name (for invoices)</Label>
                <Input
                  value={settings.billing_company_name}
                  onChange={(e) => updateField("billing_company_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Address</Label>
                <Textarea
                  value={settings.billing_company_address}
                  onChange={(e) => updateField("billing_company_address", e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </SectionCard>
          </TabsContent>

          {/* ================================================================
              MARKETING TAB
          ================================================================ */}
          <TabsContent value="marketing" className="space-y-6">
            <SectionCard
              icon={<Megaphone className="h-4 w-4" />}
              gradient="from-destructive to-destructive-deep"
              title="Campaign Settings"
              description="Default settings for marketing campaigns"
            >
              <ToggleRow
                title="Require Campaign Approval"
                description="Campaigns must be approved before sending"
                checked={settings.marketing_require_approval ?? true}
                onCheckedChange={(v) => updateField("marketing_require_approval" as keyof PlatformSettings, v as never)}
              />
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Emails Per Day</Label>
                  <Input
                    type="number"
                    value={settings.marketing_max_emails_per_day ?? 10000}
                    onChange={(e) => updateField("marketing_max_emails_per_day" as keyof PlatformSettings, Number(e.target.value) as never)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Daily sending limit across all campaigns
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Frequency Cap (days)</Label>
                  <Input
                    type="number"
                    value={settings.marketing_frequency_cap_days ?? 3}
                    onChange={(e) => updateField("marketing_frequency_cap_days" as keyof PlatformSettings, Number(e.target.value) as never)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum days between marketing emails per user
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Mail className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              title="Compliance"
              description="Consent and unsubscribe settings"
            >
              <ToggleRow
                title="Double Opt-In"
                description="Require email confirmation before adding to marketing list"
                checked={settings.marketing_double_opt_in ?? false}
                onCheckedChange={(v) => updateField("marketing_double_opt_in" as keyof PlatformSettings, v as never)}
              />
              <Separator />
              <ToggleRow
                title="Auto-Suppress Hard Bounces"
                description="Automatically add hard-bounced emails to suppression list"
                checked={settings.marketing_auto_suppress_bounces ?? true}
                onCheckedChange={(v) => updateField("marketing_auto_suppress_bounces" as keyof PlatformSettings, v as never)}
              />
              <Separator />
              <ToggleRow
                title="Auto-Suppress Complaints"
                description="Automatically add spam complaints to suppression list"
                checked={settings.marketing_auto_suppress_complaints ?? true}
                onCheckedChange={(v) => updateField("marketing_auto_suppress_complaints" as keyof PlatformSettings, v as never)}
              />
            </SectionCard>

            <SectionCard
              icon={<Ticket className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              title="Coupon Defaults"
              description="Default settings for coupon creation"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Expiry (days)</Label>
                  <Input
                    type="number"
                    value={settings.marketing_coupon_default_expiry_days ?? 30}
                    onChange={(e) => updateField("marketing_coupon_default_expiry_days" as keyof PlatformSettings, Number(e.target.value) as never)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses Per Customer</Label>
                  <Input
                    type="number"
                    value={settings.marketing_coupon_max_per_customer ?? 1}
                    onChange={(e) => updateField("marketing_coupon_max_per_customer" as keyof PlatformSettings, Number(e.target.value) as never)}
                  />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ================================================================
              INTEGRATIONS TAB
          ================================================================ */}
          <TabsContent value="integrations" className="space-y-6">
            {/* Slack OAuth Integration */}
            <SlackIntegrationCard
              installation={slackInstallation}
              channels={slackChannels}
              isLoadingInstallation={isLoadingSlackInstallation}
              isLoadingChannels={isLoadingSlackChannels}
              slackEnabled={settings.slack_enabled}
              onToggleEnabled={handleSlackToggle}
              onConnect={handleSlackConnect}
              onDisconnect={handleSlackDisconnect}
              onUpdateChannel={handleUpdateSlackChannel}
              onTest={handleTestSlack}
              onRefreshChannels={fetchSlackChannels}
              onSaveCredentials={handleSaveSlackCredentials}
              isConnecting={isConnectingSlack}
              isDisconnecting={isDisconnectingSlack}
              isSavingCredentials={isSavingSlackCreds}
              testingChannel={testingChannel}
            />

            <SectionCard
              icon={<Link2 className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              title="Social Distribution"
              description="Connect and manage social media accounts for job distribution"
            >
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Social accounts, posting templates, and distribution settings are managed from the dedicated Social Distribution page.
                  </p>
                </div>
                <Link href="/admin/social">
                  <Button variant="outline" size="sm" className="ml-4 shrink-0">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              </div>
            </SectionCard>

            <SectionCard
              icon={<BarChart3 className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              title="Analytics"
              description="Third-party analytics integrations"
            >
              <div className="space-y-2">
                <Label>Google Analytics ID</Label>
                <Input
                  value={settings.integration_google_analytics_id}
                  onChange={(e) => updateField("integration_google_analytics_id", e.target.value)}
                  className="w-[280px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Mixpanel Token</Label>
                <Input
                  value={settings.integration_mixpanel_token}
                  onChange={(e) => updateField("integration_mixpanel_token", e.target.value)}
                  placeholder="Optional"
                  className="w-[280px]"
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<ShieldCheck className="h-4 w-4" />}
              gradient="from-orange-500 to-red-600"
              title="Cloudflare Turnstile"
              description="Bot protection for forms and submissions"
              badge={
                settings.turnstile_enabled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Enabled</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                )
              }
            >
              <ToggleRow
                title="Enable Turnstile"
                description="Require human verification on protected forms"
                checked={settings.turnstile_enabled}
                onCheckedChange={(v) => updateField("turnstile_enabled", v)}
              />

              {settings.turnstile_enabled && (
                <>
                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Site Key</Label>
                      <Input
                        value={settings.turnstile_site_key}
                        onChange={(e) => updateField("turnstile_site_key", e.target.value)}
                        placeholder="0x4AAAA..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Public key from Cloudflare Turnstile dashboard
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.turnstile_secret_key}
                        onChange={(e) => updateField("turnstile_secret_key", e.target.value)}
                        placeholder="0x4AAAA..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Private key for server-side verification
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Feature Guards</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enable or disable Turnstile per feature
                      </p>
                    </div>
                    <div className="space-y-1">
                      <ToggleRow
                        title="Authentication"
                        description="Login, signup, password reset"
                        checked={settings.turnstile_protect_auth}
                        onCheckedChange={(v) => updateField("turnstile_protect_auth", v)}
                      />
                      <ToggleRow
                        title="Job Posting"
                        description="Job creation and publishing"
                        checked={settings.turnstile_protect_jobs}
                        onCheckedChange={(v) => updateField("turnstile_protect_jobs", v)}
                      />
                      <ToggleRow
                        title="Applications"
                        description="Job application submissions"
                        checked={settings.turnstile_protect_applications}
                        onCheckedChange={(v) => updateField("turnstile_protect_applications", v)}
                      />
                    </div>
                  </div>
                </>
              )}
            </SectionCard>
          </TabsContent>

          {/* ================================================================
              SECURITY TAB
          ================================================================ */}
          <TabsContent value="security" className="space-y-6">
            <SectionCard
              icon={<KeyRound className="h-4 w-4" />}
              gradient="from-red-500 to-rose-600"
              title="Authentication"
              description="Security and authentication settings"
              badge={
                settings.require_2fa ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">2FA Enforced</Badge>
                ) : null
              }
            >
              <ToggleRow
                title="Require Two-Factor Authentication"
                description="Enforce 2FA for all admin accounts"
                checked={settings.require_2fa}
                onCheckedChange={(v) => updateField("require_2fa", v)}
              />
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.session_timeout_minutes}
                    onChange={(e) => updateField("session_timeout_minutes", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={settings.max_login_attempts}
                    onChange={(e) => updateField("max_login_attempts", Number(e.target.value))}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Network className="h-4 w-4" />}
              gradient="from-slate-500 to-gray-600"
              title="IP Allowlist"
              description="Restrict admin access to specific IP addresses"
              badge={
                settings.enable_ip_allowlist ? (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Enforced</Badge>
                ) : null
              }
            >
              <ToggleRow
                title="Enable IP Allowlist"
                description="Only allow admin access from specified IPs"
                checked={settings.enable_ip_allowlist}
                onCheckedChange={(v) => updateField("enable_ip_allowlist", v)}
              />
              <div className="space-y-2">
                <Label>Allowed IP Addresses (one per line)</Label>
                <Textarea
                  value={settings.ip_allowlist}
                  onChange={(e) => updateField("ip_allowlist", e.target.value)}
                  placeholder={"192.168.1.1\n10.0.0.0/24"}
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Save Button */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </motion.div>
    </motion.div>
  )
}

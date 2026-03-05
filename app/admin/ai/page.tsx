"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Sparkles,
  Plus,
  Loader2,
  Settings2,
  Trash2,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  getAIProviders,
  createAIProvider,
  updateAIProvider,
  deleteAIProvider,
  testAIProvider,
  getAIUsageStats,
  getAIUsageLogs,
  bulkGenerateSEOMeta,
  PROVIDER_REGISTRY,
  type AIProviderConfig,
  type AIProviderConfigCreate,
  type AIProviderConfigUpdate,
  type AIProviderType,
  type AIUsageStats,
  type AIUsageLog,
  type AITestResult,
} from "@/lib/api/ai"

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

const statusColors: Record<string, string> = {
  success: "bg-green-500/10 text-green-600",
  error: "bg-red-500/10 text-red-600",
  rate_limited: "bg-amber-500/10 text-amber-600",
}

const featureLabels: Record<string, string> = {
  seo_meta: "SEO Meta",
  seo_meta_bulk: "SEO Bulk",
  social_content: "Social Content",
  connection_test: "Connection Test",
}

const PROVIDER_OPTIONS = Object.entries(PROVIDER_REGISTRY).map(([key, val]) => ({
  value: key as AIProviderType,
  label: val.label,
}))

function getDefaultFormForProvider(provider: AIProviderType): Partial<AIProviderConfigCreate> {
  const reg = PROVIDER_REGISTRY[provider]
  const firstModel = reg.models[0]?.value || ""
  return {
    name: reg.label,
    provider,
    base_url: reg.baseUrl,
    model: firstModel,
    api_key: "",
    is_active: false,
    max_requests_per_minute: 100,
    max_requests_per_day: 10000,
    cost_per_1k_input_tokens: reg.defaultCosts.input,
    cost_per_1k_output_tokens: reg.defaultCosts.output,
    seo_generation_enabled: true,
    social_generation_enabled: true,
    auto_generate_on_publish: false,
  }
}

const defaultProviderForm = getDefaultFormForProvider("anthropic")

export default function AISettingsPage() {
  // ==========================================================================
  // Tab state
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<"providers" | "usage">("providers")

  // ==========================================================================
  // Providers state
  // ==========================================================================
  const [providers, setProviders] = useState<AIProviderConfig[]>([])
  const [isProvidersLoading, setIsProvidersLoading] = useState(true)

  // Provider dialog
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null)
  const [providerForm, setProviderForm] = useState<Partial<AIProviderConfigCreate>>({ ...defaultProviderForm })
  const [isSavingProvider, setIsSavingProvider] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState<AIProviderConfig | null>(null)
  const [isDeletingProvider, setIsDeletingProvider] = useState(false)

  // Test connection
  const [testingProvider, setTestingProvider] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<{ providerId: number; result: AITestResult } | null>(null)

  // ==========================================================================
  // Usage stats state
  // ==========================================================================
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [logs, setLogs] = useState<AIUsageLog[]>([])
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [logsPage, setLogsPage] = useState(1)

  // Bulk SEO state
  const [bulkSEODialogOpen, setBulkSEODialogOpen] = useState(false)
  const [bulkSEOScope, setBulkSEOScope] = useState<"missing" | "all">("missing")
  const [bulkSEOLimit, setBulkSEOLimit] = useState("100")
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)

  // ==========================================================================
  // Model suggestions for current provider selection
  // ==========================================================================
  const modelSuggestions = useMemo(() => {
    const provider = providerForm.provider as AIProviderType | undefined
    if (!provider) return []
    return PROVIDER_REGISTRY[provider]?.models || []
  }, [providerForm.provider])

  // ==========================================================================
  // Data Fetching — Providers
  // ==========================================================================

  const fetchProviders = useCallback(async () => {
    setIsProvidersLoading(true)
    try {
      const data = await getAIProviders()
      setProviders(data)
    } catch (err) {
      console.error("Failed to fetch AI providers:", err)
      toast.error("Failed to load AI providers")
    } finally {
      setIsProvidersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  // ==========================================================================
  // Data Fetching — Usage Stats
  // ==========================================================================

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAIUsageStats(30)
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch AI stats:", err)
      toast.error("Failed to load AI usage stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setIsLogsLoading(true)
    try {
      const data = await getAIUsageLogs({ page: logsPage, page_size: 20, ordering: "-created_at" })
      setLogs(data.results)
    } catch (err) {
      console.error("Failed to fetch AI logs:", err)
      toast.error("Failed to load AI usage logs")
    } finally {
      setIsLogsLoading(false)
    }
  }, [logsPage])

  useEffect(() => {
    if (activeTab === "usage") {
      fetchStats()
      fetchLogs()
    }
  }, [activeTab, fetchStats, fetchLogs])

  // ==========================================================================
  // Provider Actions
  // ==========================================================================

  const handleProviderChange = (providerKey: AIProviderType) => {
    const defaults = getDefaultFormForProvider(providerKey)
    setProviderForm({ ...defaults })
  }

  const handleModelSelect = (modelValue: string) => {
    const reg = PROVIDER_REGISTRY[providerForm.provider as AIProviderType]
    const modelEntry = reg?.models.find((m) => m.value === modelValue)
    const autoName = modelEntry
      ? `${reg.label} - ${modelEntry.label}`
      : `${reg?.label || providerForm.provider}`
    setProviderForm((prev) => ({
      ...prev,
      model: modelValue,
      name: autoName,
    }))
  }

  const handleOpenProviderDialog = (provider?: AIProviderConfig) => {
    if (provider) {
      setEditingProvider(provider)
      setProviderForm({
        name: provider.name,
        provider: provider.provider,
        base_url: provider.base_url,
        model: provider.model,
        api_key: "", // Never prefill API key for security
        is_active: provider.is_active,
        max_requests_per_minute: provider.max_requests_per_minute,
        max_requests_per_day: provider.max_requests_per_day,
        cost_per_1k_input_tokens: provider.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens: provider.cost_per_1k_output_tokens,
        seo_generation_enabled: provider.seo_generation_enabled,
        social_generation_enabled: provider.social_generation_enabled,
        auto_generate_on_publish: provider.auto_generate_on_publish,
      })
    } else {
      setEditingProvider(null)
      setProviderForm({ ...defaultProviderForm })
    }
    setProviderDialogOpen(true)
  }

  const handleCloseProviderDialog = () => {
    setProviderDialogOpen(false)
    setEditingProvider(null)
    setProviderForm({ ...defaultProviderForm })
  }

  const handleSaveProvider = async () => {
    if (!providerForm.provider || !providerForm.model || !providerForm.name) {
      toast.error("Name, provider, and model are required")
      return
    }

    if (!editingProvider && !providerForm.api_key) {
      toast.error("API key is required when creating a provider")
      return
    }

    setIsSavingProvider(true)
    try {
      if (editingProvider) {
        // Update existing provider
        const updateData: AIProviderConfigUpdate = {
          name: providerForm.name,
          base_url: providerForm.base_url,
          model: providerForm.model,
          is_active: providerForm.is_active,
          max_requests_per_minute: providerForm.max_requests_per_minute,
          max_requests_per_day: providerForm.max_requests_per_day,
          cost_per_1k_input_tokens: providerForm.cost_per_1k_input_tokens,
          cost_per_1k_output_tokens: providerForm.cost_per_1k_output_tokens,
          seo_generation_enabled: providerForm.seo_generation_enabled,
          social_generation_enabled: providerForm.social_generation_enabled,
          auto_generate_on_publish: providerForm.auto_generate_on_publish,
        }
        // Only include API key if it was entered
        if (providerForm.api_key) {
          updateData.api_key = providerForm.api_key
        }
        await updateAIProvider(editingProvider.id, updateData)
        toast.success("Provider updated successfully")
      } else {
        // Create new provider
        await createAIProvider(providerForm as AIProviderConfigCreate)
        toast.success("Provider created successfully")
      }
      await fetchProviders()
      handleCloseProviderDialog()
    } catch (err) {
      console.error("Failed to save provider:", err)
      toast.error("Failed to save provider")
    } finally {
      setIsSavingProvider(false)
    }
  }

  const handleDeleteProvider = async () => {
    if (!deletingProvider) return

    setIsDeletingProvider(true)
    try {
      await deleteAIProvider(deletingProvider.id)
      toast.success("Provider deleted successfully")
      await fetchProviders()
      setDeleteDialogOpen(false)
      setDeletingProvider(null)
    } catch (err) {
      console.error("Failed to delete provider:", err)
      toast.error("Failed to delete provider")
    } finally {
      setIsDeletingProvider(false)
    }
  }

  const handleTestConnection = async (provider: AIProviderConfig) => {
    setTestingProvider(provider.id)
    setTestResult(null)
    try {
      const result = await testAIProvider(provider.id)
      setTestResult({ providerId: provider.id, result })
      if (result.success) {
        toast.success(`Test successful (${result.tokens} tokens, ${result.duration_ms}ms)`)
      } else {
        toast.error(`Test failed: ${result.error}`)
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number }
      console.error("Test failed:", apiErr.message || err)
      toast.error(apiErr.message || "Failed to test connection")
    } finally {
      setTestingProvider(null)
    }
  }

  const handleToggleActive = async (provider: AIProviderConfig) => {
    try {
      await updateAIProvider(provider.id, { is_active: !provider.is_active })
      toast.success(`Provider ${provider.is_active ? "deactivated" : "activated"}`)
      await fetchProviders()
    } catch (err) {
      console.error("Failed to toggle provider:", err)
      toast.error("Failed to update provider")
    }
  }

  // ==========================================================================
  // Bulk SEO Actions
  // ==========================================================================

  const handleBulkGenerateSEO = async () => {
    const limit = parseInt(bulkSEOLimit, 10)
    if (isNaN(limit) || limit < 1) {
      toast.error("Please enter a valid limit")
      return
    }

    setIsBulkGenerating(true)
    try {
      const result = await bulkGenerateSEOMeta({
        scope: bulkSEOScope,
        limit,
      })
      toast.success(result.message)
      setBulkSEODialogOpen(false)
      await fetchStats()
    } catch (err) {
      console.error("Bulk SEO generation failed:", err)
      toast.error("Failed to start bulk generation")
    } finally {
      setIsBulkGenerating(false)
    }
  }

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const renderProviderCard = (provider: AIProviderConfig) => {
    const isTestingThis = testingProvider === provider.id
    const hasTestResult = testResult?.providerId === provider.id
    const providerLabel = PROVIDER_REGISTRY[provider.provider]?.label || provider.provider_display

    return (
      <Card key={provider.id} className={cn("relative overflow-hidden group", provider.is_active && "border-primary/30")}>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-light to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="px-5 pt-4 pb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-snug">{provider.name}</CardTitle>
            <div className="flex items-center gap-0.5 shrink-0 -mr-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => handleOpenProviderDialog(provider)}>
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-red-600"
                onClick={() => {
                  setDeletingProvider(provider)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {provider.is_active && (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-[11px] px-2 py-0.5">
                Active
              </Badge>
            )}
            <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{providerLabel}</Badge>
            {provider.api_key_set && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                API Key Set
              </Badge>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{provider.model}</p>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Rate Limits</p>
              <p className="font-medium mt-0.5">
                {provider.max_requests_per_minute}/min, {provider.max_requests_per_day}/day
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cost per 1K tokens</p>
              <p className="font-medium mt-0.5">
                ${provider.cost_per_1k_input_tokens} / ${provider.cost_per_1k_output_tokens}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
              <CheckCircle2 className={cn("h-4 w-4 shrink-0", provider.seo_generation_enabled ? "text-green-600" : "text-muted-foreground")} />
              SEO
            </Label>
            <Label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
              <CheckCircle2 className={cn("h-4 w-4 shrink-0", provider.social_generation_enabled ? "text-green-600" : "text-muted-foreground")} />
              Social
            </Label>
            <Label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
              <CheckCircle2 className={cn("h-4 w-4 shrink-0", provider.auto_generate_on_publish ? "text-green-600" : "text-muted-foreground")} />
              Auto-generate
            </Label>
          </div>

          {hasTestResult && (
            <div className={cn("px-3 py-2.5 rounded-lg border", testResult.result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
              <div className="flex items-start gap-2">
                {testResult.result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  {testResult.result.success ? (
                    <div>
                      <p className="font-medium text-green-900">Connection successful</p>
                      <p className="text-green-700 text-xs mt-0.5">
                        {testResult.result.tokens} tokens, {testResult.result.duration_ms}ms
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-red-900">Connection failed</p>
                      <p className="text-red-700 text-xs mt-0.5">{testResult.result.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => handleTestConnection(provider)} disabled={isTestingThis}>
              {isTestingThis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1.5" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              variant={provider.is_active ? "outline" : "default"}
              size="sm"
              className="flex-1 h-9 text-sm"
              onClick={() => handleToggleActive(provider)}
            >
              {provider.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderProvidersEmpty = () => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="relative mb-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-hover/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No AI Providers Configured</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Add an AI provider to enable SEO meta generation and social content creation.
          Supports Anthropic, OpenAI, OpenRouter, Gemini, Mistral, DeepSeek, Groq, xAI, and Together AI.
        </p>
        <Button onClick={() => handleOpenProviderDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </CardContent>
    </Card>
  )

  const renderStatsCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    gradient: string,
    bgAccent: string,
    description?: string
  ) => (
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
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )

  // ==========================================================================
  // Render
  // ==========================================================================

  if (isProvidersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Configure AI providers and monitor usage across SEO and social features
            </p>
          </div>
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-3 h-4 w-48" />
                <Skeleton className="mt-2 h-4 w-36" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Configure AI providers and monitor usage across SEO and social features
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "providers" | "usage")} className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers">Providers & Settings</TabsTrigger>
            <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
          </TabsList>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            {providers.length === 0 ? (
              renderProvidersEmpty()
            ) : (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => handleOpenProviderDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Provider
                  </Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {providers.map(renderProviderCard)}
                </div>
              </>
            )}
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Stats Cards */}
            {isStatsLoading ? (
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                      <Skeleton className="mt-2 h-8 w-20" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : stats ? (
              <div className="grid gap-4 md:grid-cols-4">
                {renderStatsCard(
                  "Total Requests",
                  stats.total_requests.toLocaleString(),
                  <Activity className="h-4 w-4" />,
                  "from-primary-light to-primary",
                  "bg-primary",
                  "Last 30 days"
                )}
                {renderStatsCard(
                  "Success Rate",
                  stats.total_requests > 0
                    ? `${((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%`
                    : "0%",
                  <CheckCircle2 className="h-4 w-4" />,
                  "from-emerald-500 to-teal-600",
                  "bg-emerald-500"
                )}
                {renderStatsCard(
                  "Total Tokens",
                  stats.total_tokens.toLocaleString(),
                  <Zap className="h-4 w-4" />,
                  "from-amber-500 to-orange-600",
                  "bg-amber-500"
                )}
                {renderStatsCard(
                  "Total Cost",
                  `$${stats.total_cost.toFixed(2)}`,
                  <DollarSign className="h-4 w-4" />,
                  "from-sky to-sky-deep",
                  "bg-sky",
                  "Last 30 days"
                )}
              </div>
            ) : null}

            {/* Feature Breakdown */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Feature Breakdown</CardTitle>
                  <CardDescription>Requests by AI feature type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="relative overflow-hidden group flex items-center justify-between p-4 border rounded-xl transition-colors hover:border-sky/20">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-sky opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                      <div>
                        <p className="text-sm text-muted-foreground">SEO Generation</p>
                        <p className="text-2xl font-bold tracking-tight tabular-nums">{stats.seo_requests.toLocaleString()}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-sky-deep text-white shadow-sm">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="relative overflow-hidden group flex items-center justify-between p-4 border rounded-xl transition-colors hover:border-primary/20">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bulk SEO</p>
                        <p className="text-2xl font-bold tracking-tight tabular-nums">{stats.seo_bulk_requests.toLocaleString()}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-white shadow-sm">
                        <RefreshCw className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="relative overflow-hidden group flex items-center justify-between p-4 border rounded-xl transition-colors hover:border-emerald-200">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-emerald-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Social Content</p>
                        <p className="text-2xl font-bold tracking-tight tabular-nums">{stats.social_requests.toLocaleString()}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                        <Activity className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="relative overflow-hidden group flex items-center justify-between p-4 border rounded-xl transition-colors hover:border-amber-200">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-500 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Connection Tests</p>
                        <p className="text-2xl font-bold tracking-tight tabular-nums">{stats.test_requests.toLocaleString()}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                        <Zap className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Actions</CardTitle>
                <CardDescription>Generate SEO meta for multiple jobs at once</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setBulkSEODialogOpen(true)} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Missing SEO Meta
                </Button>
              </CardContent>
            </Card>

            {/* Recent Usage Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Usage Logs</CardTitle>
                <CardDescription>Last 20 AI API requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLogsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-hover/10 flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">No usage logs yet</p>
                    <p className="text-xs text-muted-foreground">Logs will appear here once AI features are used</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{featureLabels[log.feature]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", statusColors[log.status])}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.model}</TableCell>
                          <TableCell className="text-right tabular-nums">{log.total_tokens.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">${parseFloat(log.cost_usd).toFixed(4)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {log.job_title || "\u2014"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.user_email || "\u2014"}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Provider Dialog */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Edit Provider" : "Add AI Provider"}</DialogTitle>
            <DialogDescription>
              {editingProvider
                ? "Update provider settings and configuration"
                : "Configure a new AI provider for SEO and social content generation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Provider Select */}
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={providerForm.provider}
                onValueChange={(v) => handleProviderChange(v as AIProviderType)}
                disabled={!!editingProvider}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={providerForm.name || ""}
                onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                placeholder="e.g. Groq - Llama 3.1 8B"
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this configuration
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>API Key {editingProvider && "(leave empty to keep current)"}</Label>
              <Input
                type="password"
                value={providerForm.api_key || ""}
                onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                placeholder={editingProvider ? "Enter new API key to update" : "sk-..."}
              />
            </div>

            {/* Model — Select from suggestions or type custom */}
            <div className="space-y-2">
              <Label>Model</Label>
              {modelSuggestions.length > 0 ? (
                <Select
                  value={modelSuggestions.some((m) => m.value === providerForm.model) ? providerForm.model : "__custom__"}
                  onValueChange={(v) => {
                    if (v === "__custom__") return
                    handleModelSelect(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelSuggestions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom model...</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {/* Always show the text input for custom/override */}
              <Input
                value={providerForm.model || ""}
                onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                placeholder="Model identifier (e.g. gpt-4o)"
                className={modelSuggestions.length > 0 ? "mt-1" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Select a suggested model above or type a custom model ID
              </p>
            </div>

            {/* Base URL (for OpenAI-compatible providers) */}
            {providerForm.provider !== "anthropic" && providerForm.provider !== "openai" && (
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  value={providerForm.base_url || ""}
                  onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled based on provider. Change only for custom endpoints.
                </p>
              </div>
            )}

            {/* Rate Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Requests/Min</Label>
                <Input
                  type="number"
                  value={providerForm.max_requests_per_minute || ""}
                  onChange={(e) => setProviderForm({ ...providerForm, max_requests_per_minute: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Requests/Day</Label>
                <Input
                  type="number"
                  value={providerForm.max_requests_per_day || ""}
                  onChange={(e) => setProviderForm({ ...providerForm, max_requests_per_day: parseInt(e.target.value, 10) })}
                />
              </div>
            </div>

            {/* Cost Tracking */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost/1K Input Tokens ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={providerForm.cost_per_1k_input_tokens || ""}
                  onChange={(e) => setProviderForm({ ...providerForm, cost_per_1k_input_tokens: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost/1K Output Tokens ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={providerForm.cost_per_1k_output_tokens || ""}
                  onChange={(e) => setProviderForm({ ...providerForm, cost_per_1k_output_tokens: e.target.value })}
                />
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SEO Generation</p>
                  <p className="text-sm text-muted-foreground">Enable for SEO meta generation</p>
                </div>
                <Switch
                  checked={providerForm.seo_generation_enabled}
                  onCheckedChange={(v) => setProviderForm({ ...providerForm, seo_generation_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Social Generation</p>
                  <p className="text-sm text-muted-foreground">Enable for social content generation</p>
                </div>
                <Switch
                  checked={providerForm.social_generation_enabled}
                  onCheckedChange={(v) => setProviderForm({ ...providerForm, social_generation_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-generate on Publish</p>
                  <p className="text-sm text-muted-foreground">Generate SEO meta when job is published</p>
                </div>
                <Switch
                  checked={providerForm.auto_generate_on_publish}
                  onCheckedChange={(v) => setProviderForm({ ...providerForm, auto_generate_on_publish: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active</p>
                  <p className="text-sm text-muted-foreground">Enable this provider (only one can be active)</p>
                </div>
                <Switch
                  checked={providerForm.is_active}
                  onCheckedChange={(v) => setProviderForm({ ...providerForm, is_active: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseProviderDialog} disabled={isSavingProvider}>
              Cancel
            </Button>
            <Button onClick={handleSaveProvider} disabled={isSavingProvider}>
              {isSavingProvider && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProvider ? "Update Provider" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingProvider?.name}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingProvider}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProvider} disabled={isDeletingProvider}>
              {isDeletingProvider && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk SEO Dialog */}
      <Dialog open={bulkSEODialogOpen} onOpenChange={setBulkSEODialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Generate SEO Meta</DialogTitle>
            <DialogDescription>
              Generate SEO meta for multiple jobs at once. This will use AI credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={bulkSEOScope} onValueChange={(v: "missing" | "all") => setBulkSEOScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Jobs Missing SEO Meta</SelectItem>
                  <SelectItem value="all">All Published Jobs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Limit</Label>
              <Input
                type="number"
                value={bulkSEOLimit}
                onChange={(e) => setBulkSEOLimit(e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of jobs to process
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSEODialogOpen(false)} disabled={isBulkGenerating}>
              Cancel
            </Button>
            <Button onClick={handleBulkGenerateSEO} disabled={isBulkGenerating}>
              {isBulkGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import {
  Search,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  Globe,
  FileText,
  Settings,
  Play,
  Database,
  Zap,
  ExternalLink,
  AlertCircle,
  Activity,
  Bot,
  Code,
  TrendingUp,
  Shield,
  Gauge,
  FileCode,
  Send,
  Eye,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  BarChart3,
  Loader2,
  ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { CoreWebVitalsGauge } from "@/app/admin/search/components/widgets/core-web-vitals-gauge"
import { SEOHealthScoreCard } from "@/app/admin/search/components/widgets/seo-health-score-card"
import { BotAccessCard } from "@/app/admin/search/components/widgets/bot-access-card"
import {
  getSEOHealthMetrics,
  getIndexStatus,
  getCrawlHistory,
  getFailedIndexJobs,
  reindexJob,
  triggerFullReindex,
  triggerCompanyReindex,
  getGoogleJobsValidationIssues,
  getGoogleJobsValidationSummary,
  getAIBotConfig,
  updateAIBotAccess,
  getSitemapInfo,
  submitToIndexNow,
  runBatchValidation,
  regenerateSitemap,
  updateSitemapConfig,
  updateSchemaTemplateSettings,
  updateRobotsTxt,
  getRobotsTxt,
  getSchemaTemplateSettings,
  getCoreWebVitals,
  getPageSpeedByTemplate,
  getCrawlabilityAudit,
  generateSchemaPreview as fetchSchemaPreview,
  getSEORecommendations,
  runSEOAutoFix,
  getCompaniesForReindex,
  type SEOHealthMetrics,
  type IndexStatus,
  type CrawlHistoryItem,
  type FailedIndexJob,
  type GoogleJobsValidationResult,
  type AIBotConfig,
  type SitemapInfo,
  type SEORecommendation,
  type SEOAffectedJob,
  type SEOAffectedCompany,
} from "@/lib/api/admin-search"

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

// Default/fallback data for initial render
const defaultSeoHealthMetrics: SEOHealthMetrics = {
  overallScore: 0,
  previousScore: 0,
  indexedPages: 0,
  crawlErrors: 0,
  coreWebVitals: { lcp: 0, cls: 0, inp: 0 },
  schemaErrors: 0,
  aiVisibilityScore: 0,
}

const defaultIndexStatus: IndexStatus = {
  lastIndexed: new Date().toISOString(),
  totalDocuments: 0,
  pendingIndexing: 0,
  failedIndexing: 0,
  averageIndexTime: "0s",
  indexLag: "0 min",
  health: "healthy",
}

interface ValidationSummary {
  valid: number
  warnings: number
  errors: number
  lastValidated: string
}

interface PageSpeedItem {
  template: string
  score: number
  pageCount: number
  issues: string[]
}

interface CrawlabilityCheck {
  check: string
  description: string
  status: 'passed' | 'warning' | 'failed'
  details: string
  affectedPages?: number
}

export default function SearchSEOPage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [reindexDialog, setReindexDialog] = useState<{ open: boolean; scope: string }>({ open: false, scope: "" })
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexProgress, setReindexProgress] = useState(0)
  const [batchValidationDialog, setBatchValidationDialog] = useState(false)
  const [indexNowDialog, setIndexNowDialog] = useState(false)
  const [schemaPreviewDialog, setSchemaPreviewDialog] = useState(false)
  const [expandedJobs, setExpandedJobs] = useState<string[]>([])
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>()
  const [companyList, setCompanyList] = useState<Array<{ id: number; name: string }>>([])
  const reindexDialogRef = useRef<HTMLDivElement>(null)

  // API data state
  const [seoHealthMetrics, setSeoHealthMetrics] = useState<SEOHealthMetrics>(defaultSeoHealthMetrics)
  const [indexStatus, setIndexStatus] = useState<IndexStatus>(defaultIndexStatus)
  const [crawlHistory, setCrawlHistory] = useState<CrawlHistoryItem[]>([])
  const [failedIndexJobs, setFailedIndexJobs] = useState<FailedIndexJob[]>([])
  const [googleJobsValidation, setGoogleJobsValidation] = useState<GoogleJobsValidationResult[]>([])
  const [aiBotsState, setAiBotsState] = useState<AIBotConfig[]>([])
  const [sitemapUrls, setSitemapUrls] = useState<SitemapInfo[]>([])
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({ valid: 0, warnings: 0, errors: 0, lastValidated: "" })
  const [pageSpeedData, setPageSpeedData] = useState<PageSpeedItem[]>([])
  const [crawlabilityChecks, setCrawlabilityChecks] = useState<CrawlabilityCheck[]>([])
  const [schemaPreviewJson, setSchemaPreviewJson] = useState<string>("")
  const [isLoadingSchemaPreview, setIsLoadingSchemaPreview] = useState(false)
  const [seoRecommendations, setSeoRecommendations] = useState<SEORecommendation[]>([])
  const [isAutoFixing, setIsAutoFixing] = useState(false)
  const [autoFixResult, setAutoFixResult] = useState<string | null>(null)
  const [expandedRecs, setExpandedRecs] = useState<string[]>([])

  const toggleRecExpanded = (id: string) => {
    setExpandedRecs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBatchValidating, setIsBatchValidating] = useState(false)
  const [isRegeneratingSitemap, setIsRegeneratingSitemap] = useState(false)
  const [isSavingSitemapSettings, setIsSavingSitemapSettings] = useState(false)
  const [isSavingSchemaSettings, setIsSavingSchemaSettings] = useState(false)
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false)
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0)

  // Sitemap settings state
  const [sitemapFrequency, setSitemapFrequency] = useState<"realtime" | "hourly" | "daily" | "weekly">("hourly")
  const [sitemapMaxUrls, setSitemapMaxUrls] = useState("50000")
  const [sitemapIncludeJobs, setSitemapIncludeJobs] = useState(true)
  const [sitemapIncludeCompanies, setSitemapIncludeCompanies] = useState(true)
  const [sitemapIncludeCategories, setSitemapIncludeCategories] = useState(true)

  // Schema settings state
  const [schemaOrgName, setSchemaOrgName] = useState("Orion Jobs")
  const [schemaOrgUrl, setSchemaOrgUrl] = useState("https://orion.jobs")
  const [schemaLogoUrl, setSchemaLogoUrl] = useState("https://orion.jobs/logo.png")
  const [schemaIncludeSalary, setSchemaIncludeSalary] = useState(true)
  const [schemaIncludeDirectApply, setSchemaIncludeDirectApply] = useState(true)
  const [schemaIncludeRemote, setSchemaIncludeRemote] = useState(true)

  // Robots.txt editing state
  const [isEditingRobotsTxt, setIsEditingRobotsTxt] = useState(false)
  const [robotsTxtContent, setRobotsTxtContent] = useState("")
  const [isSavingRobotsTxt, setIsSavingRobotsTxt] = useState(false)

  // Batch validation scope state
  const [batchValidationScope, setBatchValidationScope] = useState<"all" | "recent" | "errors" | "company">("all")

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [healthData, indexData, historyData, failedData, validationData, botsData, sitemapData, summaryData, speedData, crawlData, recsData, schemaSettings, companiesData] = await Promise.all([
          getSEOHealthMetrics().catch(() => defaultSeoHealthMetrics),
          getIndexStatus().catch(() => defaultIndexStatus),
          getCrawlHistory(5).catch(() => []),
          getFailedIndexJobs().catch(() => ({ results: [] })),
          getGoogleJobsValidationIssues().catch(() => ({ results: [] })),
          getAIBotConfig().catch(() => []),
          getSitemapInfo().catch(() => []),
          getGoogleJobsValidationSummary().catch(() => ({ valid: 0, warnings: 0, errors: 0, lastValidated: "" })),
          getPageSpeedByTemplate().catch(() => []),
          getCrawlabilityAudit().catch(() => []),
          getSEORecommendations().catch(() => ({ total_published: 0, recommendations: [] })),
          getSchemaTemplateSettings().catch(() => null),
          getCompaniesForReindex().catch(() => []),
        ])

        setSeoHealthMetrics(healthData)
        setIndexStatus(indexData)
        setCrawlHistory(historyData)
        setFailedIndexJobs(failedData.results || [])
        setGoogleJobsValidation(validationData.results || [])
        setAiBotsState(botsData)
        setSitemapUrls(sitemapData)
        setValidationSummary(summaryData)
        setPageSpeedData(speedData)
        setCrawlabilityChecks(crawlData)
        setSeoRecommendations(recsData.recommendations || [])

        setCompanyList(companiesData)

        // Populate schema settings form with persisted values
        if (schemaSettings) {
          setSchemaOrgName(schemaSettings.organizationName || "Orion Jobs")
          setSchemaOrgUrl(schemaSettings.organizationUrl || "https://orion.jobs")
          setSchemaLogoUrl(schemaSettings.logoUrl || "https://orion.jobs/logo.png")
          setSchemaIncludeSalary(schemaSettings.includeSalary ?? true)
          setSchemaIncludeDirectApply(schemaSettings.includeDirectApply ?? true)
          setSchemaIncludeRemote(schemaSettings.includeRemoteFields ?? true)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const handleReindex = (scope: string) => {
    setReindexDialog({ open: true, scope })
  }

  const executeReindex = async () => {
    setIsReindexing(true)
    setReindexProgress(0)

    try {
      let result: { processedDocuments?: number; failedDocuments?: number } | undefined
      if (reindexDialog.scope === "all") {
        result = await triggerFullReindex()
      } else if (reindexDialog.scope === "company" && selectedCompanyId) {
        result = await triggerCompanyReindex(selectedCompanyId)
      }

      setReindexProgress(100)
      setTimeout(() => {
        setIsReindexing(false)
        setReindexDialog({ open: false, scope: "" })
        const processed = result?.processedDocuments ?? 0
        const failed = result?.failedDocuments ?? 0
        if (failed > 0) {
          toast.warning(`Reindex complete: ${processed} processed, ${failed} failed`)
        } else {
          toast.success(`Reindex complete: ${processed} documents processed`)
        }
        // Refresh data
        getSEOHealthMetrics().then(setSeoHealthMetrics).catch(() => {})
        getIndexStatus().then(setIndexStatus).catch(() => {})
        getSEORecommendations().then(data => setSeoRecommendations(data.recommendations || [])).catch(() => {})
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reindex failed"
      toast.error(message)
      setIsReindexing(false)
    }
  }

  const handleRetryIndex = async (jobId: string) => {
    try {
      await reindexJob(jobId)
      // Remove from failed list immediately
      setFailedIndexJobs(prev => prev.filter(j => j.id !== jobId))
      // Refresh related data in background
      getSEOHealthMetrics().then(setSeoHealthMetrics).catch(() => {})
      getSEORecommendations().then(data => setSeoRecommendations(data.recommendations || [])).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fix failed"
      toast.error(message)
    }
  }

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const toggleAiBotAccess = async (botId: string, allowed: boolean) => {
    // Optimistic update
    setAiBotsState(prev =>
      prev.map(bot =>
        bot.id === botId ? { ...bot, allowed } : bot
      )
    )

    try {
      await updateAIBotAccess(botId, allowed)
    } catch (err) {
      // Revert on error
      setAiBotsState(prev =>
        prev.map(bot =>
          bot.id === botId ? { ...bot, allowed: !allowed } : bot
        )
      )
      const message = err instanceof Error ? err.message : "Failed to update bot access"
      toast.error(message)
    }
  }

  const handleSubmitIndexNow = async () => {
    try {
      const result = await submitToIndexNow({
        scope: selectedJobs.length > 0 ? "selected" : "recent",
        jobIds: selectedJobs.length > 0 ? selectedJobs : undefined,
      })
      setIndexNowDialog(false)
      setSelectedJobs([])
      toast.success(`${result.urlCount} URLs submitted to ${result.submittedTo?.join(', ') || 'IndexNow'}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "IndexNow submission failed"
      toast.error(message)
    }
  }

  const handleBatchValidation = async () => {
    setIsBatchValidating(true)
    try {
      const result = await runBatchValidation({ scope: batchValidationScope })
      setBatchValidationDialog(false)
      toast.success(result.message || "Batch validation complete")
      // Refresh validation data
      getGoogleJobsValidationSummary().then(setValidationSummary).catch(() => {})
      getGoogleJobsValidationIssues().then(data => setGoogleJobsValidation(data.results || [])).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Batch validation failed"
      toast.error(message)
    } finally {
      setIsBatchValidating(false)
    }
  }

  const handleAutoFix = async (action: 'fill_meta_titles' | 'fill_meta_descriptions' | 'fill_all_meta' | 'expire_overdue') => {
    setIsAutoFixing(true)
    setAutoFixResult(null)
    try {
      const result = await runSEOAutoFix(action)
      setAutoFixResult(result.message)
      // Refresh recommendations after fix
      getSEORecommendations().then(data => setSeoRecommendations(data.recommendations || [])).catch(() => {})
      // Refresh health metrics
      getSEOHealthMetrics().then(setSeoHealthMetrics).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auto-fix failed"
      setAutoFixResult(`Error: ${message}`)
    } finally {
      setIsAutoFixing(false)
    }
  }

  const handleRegenerateSitemap = async () => {
    setIsRegeneratingSitemap(true)
    try {
      const result = await regenerateSitemap("all")
      toast.success(result.message || "Sitemap regenerated successfully")
      // Refresh sitemap data
      getSitemapInfo().then(setSitemapUrls).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to regenerate sitemap"
      toast.error(message)
    } finally {
      setIsRegeneratingSitemap(false)
    }
  }

  const handleSaveSitemapSettings = async () => {
    setIsSavingSitemapSettings(true)
    try {
      await updateSitemapConfig({
        frequency: sitemapFrequency,
        maxUrlsPerSitemap: parseInt(sitemapMaxUrls, 10),
        includeJobs: sitemapIncludeJobs,
        includeCompanies: sitemapIncludeCompanies,
        includeCategories: sitemapIncludeCategories,
      })
      toast.success("Sitemap settings saved")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save sitemap settings"
      toast.error(message)
    } finally {
      setIsSavingSitemapSettings(false)
    }
  }

  const handleSaveSchemaSettings = async () => {
    setIsSavingSchemaSettings(true)
    try {
      await updateSchemaTemplateSettings({
        organizationName: schemaOrgName,
        organizationUrl: schemaOrgUrl,
        logoUrl: schemaLogoUrl,
        includeSalary: schemaIncludeSalary,
        includeDirectApply: schemaIncludeDirectApply,
        includeRemoteFields: schemaIncludeRemote,
      })
      toast.success("Schema settings saved")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save schema settings"
      toast.error(message)
    } finally {
      setIsSavingSchemaSettings(false)
    }
  }

  const handleEditRobotsTxt = async () => {
    if (!isEditingRobotsTxt) {
      // Enter edit mode - load current content from API
      try {
        const data = await getRobotsTxt()
        setRobotsTxtContent(data.content)
      } catch {
        // Use default if API fails
        setRobotsTxtContent("")
      }
      setIsEditingRobotsTxt(true)
    } else {
      // Save the edited content
      setIsSavingRobotsTxt(true)
      try {
        await updateRobotsTxt(robotsTxtContent)
        setIsEditingRobotsTxt(false)
        toast.success("robots.txt updated")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update robots.txt"
        toast.error(message)
      } finally {
        setIsSavingRobotsTxt(false)
      }
    }
  }

  const handleRefreshMetrics = async () => {
    setIsRefreshingMetrics(true)
    try {
      const [vitals, health, speed, crawl] = await Promise.all([
        getCoreWebVitals(),
        getSEOHealthMetrics(),
        getPageSpeedByTemplate().catch(() => pageSpeedData),
        getCrawlabilityAudit().catch(() => crawlabilityChecks),
      ])
      setSeoHealthMetrics(health)
      if (vitals.current) {
        setSeoHealthMetrics(prev => ({ ...prev, coreWebVitals: vitals.current }))
      }
      setPageSpeedData(speed)
      setCrawlabilityChecks(crawl)
      setMetricsRefreshKey(k => k + 1)
      toast.success("Metrics refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh metrics"
      toast.error(message)
    } finally {
      setIsRefreshingMetrics(false)
    }
  }

  const handleDownloadSchema = () => {
    if (!schemaPreviewJson) return
    const blob = new Blob([schemaPreviewJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "jobposting-schema.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadSchemaPreview = async (jobId: string) => {
    setIsLoadingSchemaPreview(true)
    try {
      const result = await fetchSchemaPreview(jobId)
      setSchemaPreviewJson(JSON.stringify(result.schema, null, 2))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load schema"
      setSchemaPreviewJson(`// Error loading schema: ${message}`)
    } finally {
      setIsLoadingSchemaPreview(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SEO data...</p>
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Failed to load data</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Search & SEO</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Enterprise SEO dashboard and search management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleReindex("all")}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reindex All
          </Button>
          <Button variant="outline" onClick={() => setIndexNowDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            IndexNow
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {[
          { label: "SEO Score", value: `${seoHealthMetrics.overallScore}/100`, icon: Activity, gradient: "from-indigo-500 to-blue-600", bgAccent: "bg-indigo-500" },
          { label: "Indexed Pages", value: seoHealthMetrics.indexedPages.toLocaleString(), icon: Database, gradient: "from-emerald-500 to-teal-600", bgAccent: "bg-emerald-500" },
          { label: "Crawl Errors", value: seoHealthMetrics.crawlErrors.toString(), icon: AlertTriangle, gradient: seoHealthMetrics.crawlErrors > 10 ? "from-red-500 to-rose-600" : "from-amber-500 to-orange-600", bgAccent: seoHealthMetrics.crawlErrors > 10 ? "bg-red-500" : "bg-amber-500", highlight: seoHealthMetrics.crawlErrors > 10 },
          { label: "Schema Errors", value: seoHealthMetrics.schemaErrors.toString(), icon: Code, gradient: seoHealthMetrics.schemaErrors > 0 ? "from-amber-500 to-orange-600" : "from-emerald-500 to-teal-600", bgAccent: seoHealthMetrics.schemaErrors > 0 ? "bg-amber-500" : "bg-emerald-500" },
          { label: "AI Visibility", value: `${seoHealthMetrics.aiVisibilityScore}%`, icon: Bot, gradient: "from-violet-500 to-purple-600", bgAccent: "bg-violet-500" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className={cn("relative overflow-hidden group", stat.highlight && "border-red-200 bg-red-50/30")}>
              <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", stat.bgAccent)} />
              <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", stat.gradient)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums mt-2">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <motion.div variants={itemVariants}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="index" className="gap-2">
              <Database className="w-4 h-4" />
              Index Health
            </TabsTrigger>
            <TabsTrigger value="technical" className="gap-2">
              <Gauge className="w-4 h-4" />
              Technical SEO
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2">
              <Search className="w-4 h-4" />
              Google for Jobs
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" />
              AI Visibility
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-2">
              <Globe className="w-4 h-4" />
              Sitemap & Indexing
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <FileCode className="w-4 h-4" />
              Schema Tools
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            DASHBOARD TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SEO Health Score */}
            <div className="lg:col-span-2">
              <SEOHealthScoreCard
                score={seoHealthMetrics.overallScore}
                previousScore={seoHealthMetrics.previousScore}
                industryAverage={seoHealthMetrics.industryAverage}
              />
            </div>

            {/* Quick Actions */}
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-teal-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
                    <Zap className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => setBatchValidationDialog(true)}>
                    <Play className="w-4 h-4 mr-2" />
                    Run SEO Audit
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => setIndexNowDialog(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit to IndexNow
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleRegenerateSitemap} disabled={isRegeneratingSitemap}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", isRegeneratingSitemap && "animate-spin")} />
                    {isRegeneratingSitemap ? "Regenerating..." : "Regenerate Sitemap"}
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => setSchemaPreviewDialog(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Schema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* SEO Issues & Recommendations */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Issues &amp; Recommendations</CardTitle>
                      <CardDescription className="text-xs">
                        {seoRecommendations.length + (failedIndexJobs.length > 0 ? 1 : 0) + (seoHealthMetrics.schemaErrors > 0 ? 1 : 0) + (seoHealthMetrics.coreWebVitals.lcp > 2.5 ? 1 : 0)} issues found
                        {seoRecommendations.some(r => r.auto_fixable) && " · click rows to see affected items"}
                      </CardDescription>
                    </div>
                  </div>
                  {seoRecommendations.some(r => r.auto_fixable) && (
                    <Button
                      size="sm"
                      onClick={() => handleAutoFix('fill_all_meta')}
                      disabled={isAutoFixing}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                    >
                      {isAutoFixing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 mr-1.5" />
                          Auto-Fix All
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {autoFixResult && (
                  <div className={cn(
                    "mb-4 px-3 py-2 rounded-lg text-sm",
                    autoFixResult.startsWith("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  )}>
                    {autoFixResult}
                  </div>
                )}
                <div className="space-y-0.5">
                  {/* System-level alerts (index failures, schema errors, performance) */}
                  {failedIndexJobs.length > 0 && (
                    <div className="flex items-start gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{failedIndexJobs.length} jobs failed to index</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20">critical</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Check the Index Health tab for details and retry indexing.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setActiveTab("index")}>
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  {seoHealthMetrics.schemaErrors > 0 && (
                    <div className="flex items-start gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Code className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{seoHealthMetrics.schemaErrors} schema validation warnings</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">warning</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Fix schema issues to ensure proper Google for Jobs appearance.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setActiveTab("google")}>
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  {seoHealthMetrics.coreWebVitals.lcp > 2.5 && (
                    <div className="flex items-start gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Gauge className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">LCP above target ({seoHealthMetrics.coreWebVitals.lcp}s vs ≤2.5s)</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">warning</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Optimize images and reduce JavaScript bundle size to improve load times.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setActiveTab("technical")}>
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Data-driven recommendations from backend */}
                  {seoRecommendations.map((rec) => {
                    const severityConfig = {
                      critical: { bg: "bg-red-100", text: "text-red-600", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
                      error: { bg: "bg-red-100", text: "text-red-600", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
                      warning: { bg: "bg-amber-100", text: "text-amber-600", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                      info: { bg: "bg-blue-100", text: "text-blue-600", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                    }[rec.severity]
                    const isExpanded = expandedRecs.includes(rec.id)
                    const hasItems = rec.affected_items && rec.affected_items.length > 0

                    return (
                      <div key={rec.id} className="rounded-lg transition-colors duration-200">
                        {/* Main row — clickable to expand */}
                        <div
                          className={cn(
                            "flex items-start gap-4 py-3 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-muted/50",
                            isExpanded && "bg-muted/30"
                          )}
                          onClick={() => hasItems && toggleRecExpanded(rec.id)}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", severityConfig.bg)}>
                            {hasItems ? (
                              isExpanded ? <ChevronDown className={cn("w-4 h-4", severityConfig.text)} /> : <ChevronRight className={cn("w-4 h-4", severityConfig.text)} />
                            ) : (
                              <AlertCircle className={cn("w-4 h-4", severityConfig.text)} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium">{rec.title}</p>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", severityConfig.badge)}>
                                {rec.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {rec.affected_count} affected
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
                          </div>
                          {rec.auto_fixable && rec.fix_action && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs shrink-0 border-violet-200 text-violet-600 hover:bg-violet-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAutoFix(rec.fix_action as 'fill_meta_titles' | 'fill_meta_descriptions' | 'fill_all_meta' | 'expire_overdue')
                              }}
                              disabled={isAutoFixing}
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Auto-Fix
                            </Button>
                          )}
                        </div>

                        {/* Expanded panel — affected items */}
                        {isExpanded && hasItems && (
                          <div className="ml-12 mr-2 mb-2 rounded-lg border bg-muted/20 divide-y">
                            {rec.item_type === 'job' ? (
                              (rec.affected_items as SEOAffectedJob[]).map((item) => (
                                <div key={item.job_id} className="flex items-center justify-between py-2 px-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{item.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{item.company__name || 'No company'}</p>
                                  </div>
                                  <a
                                    href={`/company/jobs/${item.job_id}/edit`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Edit <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ))
                            ) : (
                              (rec.affected_items as SEOAffectedCompany[]).map((item) => (
                                <div key={item.entity_id} className="flex items-center justify-between py-2 px-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{item.name}</p>
                                  </div>
                                  <a
                                    href={`/admin/users`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ))
                            )}
                            {rec.affected_count > rec.affected_items.length && (
                              <div className="py-2 px-3 text-xs text-muted-foreground">
                                +{rec.affected_count - rec.affected_items.length} more {rec.item_type === 'job' ? 'jobs' : 'companies'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* All clear state */}
                  {seoRecommendations.length === 0 && failedIndexJobs.length === 0 && seoHealthMetrics.schemaErrors === 0 && seoHealthMetrics.coreWebVitals.lcp <= 2.5 && (
                    <div className="py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-2">
                        <Check className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-emerald-700">All systems healthy</p>
                      <p className="text-muted-foreground text-xs mt-0.5">No issues requiring attention</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            INDEX HEALTH TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="index" className="space-y-6">
          {/* Index Status */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Index Status</CardTitle>
                      <CardDescription className="text-xs">Search index health and performance</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Healthy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Last Indexed</span>
                    <p className="text-sm font-medium">{new Date(indexStatus.lastIndexed).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Total Documents</span>
                    <p className="text-sm font-medium">{indexStatus.totalDocuments.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Avg Index Time</span>
                    <p className="text-sm font-medium">{indexStatus.averageIndexTime}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Current Lag</span>
                    <p className="text-sm font-medium">{indexStatus.indexLag}</p>
                  </div>
                </div>

                {/* Crawl History Chart (simplified) */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="text-sm font-medium mb-4">30-Day Crawl History</h4>
                  <div className="flex items-end gap-2 h-24">
                    {crawlHistory.map((day) => (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary/80 rounded-t"
                          style={{ height: `${(day.indexed / 8500) * 100}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{day.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" size="sm" onClick={() => handleReindex("all")}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reindex All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReindex("company")}>
                    Reindex by Company
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReindex("single")}>
                    Reindex Single Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Scheduled Reindex */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-cyan-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Scheduled Reindex</CardTitle>
                    <CardDescription className="text-xs">Automatic reindexing configuration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reindex Schedule</Label>
                    <Select defaultValue="hourly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time (on change)</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily at midnight</SelectItem>
                        <SelectItem value="custom">Custom cron</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Index Coverage Target</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={99.5} className="flex-1" />
                      <span className="text-sm font-medium">99.5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expired Jobs Still Published */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-red-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-sm">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Expired Jobs Still Published</CardTitle>
                      <CardDescription className="text-xs">These jobs need to be marked as expired to avoid indexing penalties</CardDescription>
                    </div>
                  </div>
                  <Badge variant="destructive">{failedIndexJobs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {failedIndexJobs.map((job, index) => (
                    <div
                      key={job.id}
                      className={cn(
                        "flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-muted/50 cursor-default",
                        index === 0 && "bg-muted/30"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                        <p className="text-xs text-red-600 mt-0.5">{job.error}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleRetryIndex(job.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Mark Expired
                      </Button>
                    </div>
                  ))}
                  {failedIndexJobs.length === 0 && (
                    <div className="py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-2">
                        <Check className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-emerald-700">All clear</p>
                      <p className="text-muted-foreground text-xs mt-0.5">No expired jobs with published status</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TECHNICAL SEO TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="technical" className="space-y-6">
          {/* Core Web Vitals */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-violet-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                      <Gauge className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Core Web Vitals</CardTitle>
                      <CardDescription className="text-xs">Performance metrics that affect search ranking</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefreshMetrics} disabled={isRefreshingMetrics}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshingMetrics && "animate-spin")} />
                    {isRefreshingMetrics ? "Refreshing..." : "Refresh Metrics"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div key={metricsRefreshKey} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CoreWebVitalsGauge
                    label="LCP"
                    value={seoHealthMetrics.coreWebVitals.lcp}
                    unit="s"
                    target={2.5}
                    description="Largest Contentful Paint"
                  />
                  <CoreWebVitalsGauge
                    label="CLS"
                    value={seoHealthMetrics.coreWebVitals.cls}
                    unit=""
                    target={0.1}
                    description="Cumulative Layout Shift"
                  />
                  <CoreWebVitalsGauge
                    label="INP"
                    value={seoHealthMetrics.coreWebVitals.inp}
                    unit="ms"
                    target={200}
                    description="Interaction to Next Paint"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Crawlability Audit */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-emerald-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Crawlability Audit</CardTitle>
                    <CardDescription className="text-xs">Checks that ensure search engines can crawl your site</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  key={metricsRefreshKey}
                  className="space-y-3"
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                >
                  {crawlabilityChecks.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No audit data available</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Run an SEO audit to see results</p>
                    </div>
                  ) : (
                    crawlabilityChecks.map((item) => (
                      <motion.div
                        key={item.check}
                        variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {item.status === "passed" ? (
                            <Check className="w-5 h-5 text-emerald-600" />
                          ) : item.status === "warning" ? (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.check}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            item.status === "passed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            item.status === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            item.status === "failed" && "bg-red-500/10 text-red-600 border-red-500/20"
                          )}
                        >
                          {item.affectedPages ? `${item.affectedPages.toLocaleString()} pages` : item.details}
                        </Badge>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Page Speed by Template */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-orange-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Page Speed by Template</CardTitle>
                    <CardDescription className="text-xs">Performance scores for each page type</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pageSpeedData.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No page speed data available</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Run a performance audit to see results</p>
                    </div>
                  ) : (
                    pageSpeedData.map(page => (
                        <div key={page.template} className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{page.template}</p>
                                {page.score >= 90 && (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">Passing</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{page.pageCount.toLocaleString()} {page.pageCount === 1 ? "page" : "pages"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24">
                                <Progress value={page.score} className="h-2" />
                              </div>
                              <span className={cn(
                                "text-sm font-medium w-8 tabular-nums",
                                page.score >= 90 ? "text-emerald-600" : page.score >= 80 ? "text-amber-600" : "text-red-600"
                              )}>
                                {page.score}
                              </span>
                            </div>
                          </div>
                          {page.issues.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                              {page.issues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                  {page.score < 80 ? (
                                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                  )}
                                  <p className="text-xs text-muted-foreground">{issue}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            GOOGLE FOR JOBS TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="google" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-sm">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Google for Jobs Compliance</CardTitle>
                      <CardDescription className="text-xs">Validate JobPosting schema requirements</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBatchValidationDialog(true)}>
                      <Play className="w-4 h-4 mr-2" />
                      Batch Validation
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIndexNowDialog(true)}>
                      <Send className="w-4 h-4 mr-2" />
                      Submit IndexNow
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Validation Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="relative overflow-hidden group/inner border-emerald-200 bg-emerald-50/30">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-emerald-500 opacity-[0.06] transition-opacity duration-300 group-hover/inner:opacity-[0.10]" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium text-emerald-700">Valid</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 mt-2 tabular-nums">{validationSummary.valid.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden group/inner border-amber-200 bg-amber-50/30">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-500 opacity-[0.06] transition-opacity duration-300 group-hover/inner:opacity-[0.10]" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-amber-700">Warnings</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-700 mt-2 tabular-nums">{validationSummary.warnings}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden group/inner border-red-200 bg-red-50/30">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-red-500 opacity-[0.06] transition-opacity duration-300 group-hover/inner:opacity-[0.10]" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-700">Errors</span>
                      </div>
                      <p className="text-2xl font-bold text-red-700 mt-2 tabular-nums">{validationSummary.errors}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Jobs with Issues - Expandable */}
                <div className="border border-border rounded-lg">
                  <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">Jobs with Validation Issues</span>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedJobs.length === googleJobsValidation.length && googleJobsValidation.length > 0}
                        onCheckedChange={(checked) => {
                          setSelectedJobs(checked ? googleJobsValidation.map(j => j.jobId) : [])
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Select All</span>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {googleJobsValidation.map(job => (
                      <Collapsible key={job.id} open={expandedJobs.includes(job.jobId)}>
                        <div className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                          <Checkbox
                            checked={selectedJobs.includes(job.jobId)}
                            onCheckedChange={(checked) => {
                              setSelectedJobs(prev =>
                                checked
                                  ? [...prev, job.jobId]
                                  : prev.filter(id => id !== job.jobId)
                              )
                            }}
                          />
                          <CollapsibleTrigger
                            onClick={() => toggleJobExpanded(job.jobId)}
                            className="flex items-center gap-2"
                          >
                            {expandedJobs.includes(job.jobId)
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />
                            }
                          </CollapsibleTrigger>
                          {job.severity === "error" ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{job.title}</p>
                            <p className="text-xs text-muted-foreground">{job.company} · {job.jobId}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 ml-16">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {Object.entries(job.fields).map(([field, valid]) => (
                                <div
                                  key={field}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                                    valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                  )}
                                >
                                  {valid ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                  {field}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    {googleJobsValidation.length === 0 && (
                      <div className="py-6 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-2">
                          <Check className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-emerald-700">All jobs passing validation</p>
                        <p className="text-muted-foreground text-xs mt-0.5">No issues found</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Required Fields Reference */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Required JobPosting Fields</CardTitle>
                    <CardDescription className="text-xs">Schema.org requirements for Google for Jobs</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    "title", "description", "datePosted", "validThrough",
                    "employmentType", "hiringOrganization", "jobLocation", "identifier"
                  ].map(field => (
                    <div key={field} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm">{field}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-3">Recommended Fields (Salary Transparency)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["baseSalary", "jobLocationType", "applicantLocationRequirements", "directApply"].map(field => (
                      <div key={field} className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm">{field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            AI VISIBILITY TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="ai" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-purple-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">AI Search Visibility</CardTitle>
                      <CardDescription className="text-xs">Control how AI crawlers access your content</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    GEO Score: {seoHealthMetrics.aiVisibilityScore}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiBotsState.map(bot => (
                    <BotAccessCard
                      key={bot.id}
                      name={bot.name}
                      description={bot.description}
                      icon={<Bot className="w-5 h-5 text-primary" />}
                      isAllowed={bot.allowed}
                      onToggle={(allowed) => toggleAiBotAccess(bot.id, allowed)}
                      lastSeen={bot.lastSeen ?? undefined}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Visibility Recommendations */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-emerald-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Recommendations for AI Visibility</CardTitle>
                    <CardDescription className="text-xs">Steps to improve your presence in AI search results</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100/80 transition-colors">
                    <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Structured Data Enabled</p>
                      <p className="text-xs text-emerald-600">JobPosting schema helps AI understand your content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100/80 transition-colors">
                    <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Clean URL Structure</p>
                      <p className="text-xs text-emerald-600">Semantic URLs improve content discoverability</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors">
                    <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Consider Allowing Google-Extended</p>
                      <p className="text-xs text-muted-foreground">May improve visibility in Google AI features</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Robots.txt AI Configuration */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-slate-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">robots.txt AI Bot Configuration</CardTitle>
                    <CardDescription className="text-xs">Control crawler access to your content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingRobotsTxt ? (
                  <Textarea
                    value={robotsTxtContent}
                    onChange={(e) => setRobotsTxtContent(e.target.value)}
                    className="font-mono text-sm min-h-[200px]"
                  />
                ) : (
                  <pre className="bg-muted/30 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# AI Crawlers
User-agent: GPTBot
Allow: /jobs
Allow: /companies
Disallow: /admin
Disallow: /api

User-agent: ClaudeBot
Allow: /jobs
Allow: /companies
Disallow: /admin
Disallow: /api

User-agent: PerplexityBot
Allow: /jobs
Allow: /companies
Disallow: /admin

User-agent: Google-Extended
Disallow: /`}
                  </pre>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={handleEditRobotsTxt} disabled={isSavingRobotsTxt}>
                    <Settings className="w-4 h-4 mr-2" />
                    {isSavingRobotsTxt ? "Saving..." : isEditingRobotsTxt ? "Save Configuration" : "Edit Configuration"}
                  </Button>
                  {isEditingRobotsTxt && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingRobotsTxt(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            SITEMAP & INDEXING TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sitemap" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-teal-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Sitemap Configuration</CardTitle>
                      <CardDescription className="text-xs">Manage XML sitemap generation</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRegenerateSitemap} disabled={isRegeneratingSitemap}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", isRegeneratingSitemap && "animate-spin")} />
                    {isRegeneratingSitemap ? "Regenerating..." : "Regenerate Sitemap"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sitemap Tree */}
                <div className="border border-border rounded-lg">
                  <div className="px-4 py-2 bg-muted/30 border-b border-border">
                    <span className="text-sm font-medium">Sitemap Index</span>
                  </div>
                  <div className="divide-y divide-border">
                    {sitemapUrls.map(sitemap => (
                      <div key={sitemap.url} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          {sitemap.type === "index"
                            ? <Globe className="w-4 h-4 text-primary" />
                            : <FileText className="w-4 h-4 text-muted-foreground" />
                          }
                          <div>
                            <a href="#" className="text-sm font-medium text-primary hover:underline">
                              {sitemap.url}
                            </a>
                            <p className="text-xs text-muted-foreground">
                              {sitemap.urls.toLocaleString()} URLs · Last generated: {new Date(sitemap.lastGenerated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {sitemapUrls.length === 0 && (
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">No sitemaps generated yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Generation Frequency</Label>
                      <Select value={sitemapFrequency} onValueChange={(v) => setSitemapFrequency(v as typeof sitemapFrequency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Max URLs per Sitemap</Label>
                      <Input type="number" value={sitemapMaxUrls} onChange={(e) => setSitemapMaxUrls(e.target.value)} />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Include Job Listings</Label>
                        <Switch checked={sitemapIncludeJobs} onCheckedChange={setSitemapIncludeJobs} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Include Company Pages</Label>
                        <Switch checked={sitemapIncludeCompanies} onCheckedChange={setSitemapIncludeCompanies} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Include Category Pages</Label>
                        <Switch checked={sitemapIncludeCategories} onCheckedChange={setSitemapIncludeCategories} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">Sitemap Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Generated</span>
                          <span>
                            {sitemapUrls.length > 0
                              ? new Date(
                                  Math.max(...sitemapUrls.map(s => new Date(s.lastGenerated).getTime()))
                                ).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total URLs</span>
                          <span>{sitemapUrls.reduce((sum, s) => sum + s.urls, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sitemap Files</span>
                          <span>{sitemapUrls.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* IndexNow Configuration */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">IndexNow Configuration</h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">API Key</Label>
                          <div className="flex gap-2">
                            <Input type="password" defaultValue="••••••••••••" className="flex-1" />
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Auto-submit on publish</Label>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSaveSitemapSettings} disabled={isSavingSitemapSettings}>
                    {isSavingSitemapSettings ? "Saving..." : "Save Sitemap Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            SCHEMA TOOLS TAB
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="schema" className="space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                      <Code className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">Schema Preview & Validation</CardTitle>
                      <CardDescription className="text-xs">Preview and test JobPosting structured data</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter job ID to preview..."
                        className="w-48"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim()
                            if (val) loadSchemaPreview(val)
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.querySelector<HTMLInputElement>('input[placeholder="Enter job ID to preview..."]')
                          const val = input?.value.trim()
                          if (val) loadSchemaPreview(val)
                        }}
                        disabled={isLoadingSchemaPreview}
                      >
                        {isLoadingSchemaPreview ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSchemaPreviewDialog(true)} disabled={!schemaPreviewJson}>
                      <Eye className="w-4 h-4 mr-2" />
                      Full Preview
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Schema Preview */}
                <div className="relative">
                  <pre className="bg-muted/30 p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-96">
                    {schemaPreviewJson || "// Enter a job ID above and click the preview button to load schema"}
                  </pre>
                  {schemaPreviewJson && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => navigator.clipboard.writeText(schemaPreviewJson).then(() => toast.success("Copied")).catch(() => toast.error("Failed to copy"))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" asChild>
                    <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Test with Rich Results
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Schema Validator
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Schema Template Configuration */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card className="relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-cyan-500 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-sm">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Schema Template Variables</CardTitle>
                    <CardDescription className="text-xs">Configure organization details for structured data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input value={schemaOrgName} onChange={(e) => setSchemaOrgName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Organization URL</Label>
                      <Input value={schemaOrgUrl} onChange={(e) => setSchemaOrgUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input value={schemaLogoUrl} onChange={(e) => setSchemaLogoUrl(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Include baseSalary</Label>
                          <p className="text-xs text-muted-foreground">Show salary in schema</p>
                        </div>
                        <Switch checked={schemaIncludeSalary} onCheckedChange={setSchemaIncludeSalary} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Include directApply</Label>
                          <p className="text-xs text-muted-foreground">Enable direct apply button</p>
                        </div>
                        <Switch checked={schemaIncludeDirectApply} onCheckedChange={setSchemaIncludeDirectApply} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Include remote job fields</Label>
                          <p className="text-xs text-muted-foreground">jobLocationType for remote jobs</p>
                        </div>
                        <Switch checked={schemaIncludeRemote} onCheckedChange={setSchemaIncludeRemote} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t border-border">
                  <Button onClick={handleSaveSchemaSettings} disabled={isSavingSchemaSettings}>
                    {isSavingSchemaSettings ? "Saving..." : "Save Schema Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════════════════ */}

      {/* Reindex Dialog */}
      <Dialog open={reindexDialog.open} onOpenChange={open => { if (!open && !isReindexing) { setReindexDialog({ open: false, scope: "" }); setSelectedCompanyId(undefined) } }}>
        <DialogContent ref={reindexDialogRef}>
          <DialogHeader>
            <DialogTitle>Reindex {reindexDialog.scope === "all" ? "All Documents" : reindexDialog.scope === "company" ? "by Company" : "Single Job"}</DialogTitle>
            <DialogDescription>
              {reindexDialog.scope === "all" && "This will reindex all documents in the search index."}
              {reindexDialog.scope === "company" && "Select a company to reindex all their jobs."}
              {reindexDialog.scope === "single" && "Enter the job ID to reindex a single job."}
            </DialogDescription>
          </DialogHeader>

          {isReindexing ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span>Reindexing in progress...</span>
                <span>{reindexProgress}%</span>
              </div>
              <Progress value={reindexProgress} />
            </div>
          ) : (
            <div className="space-y-4">
              {reindexDialog.scope === "company" && (
                <div className="space-y-2">
                  <Label>Select Company</Label>
                  <Combobox
                    items={companyList.map(c => `${c.name} (#${c.id})`)}
                    value={(() => {
                      const company = companyList.find(c => c.id === selectedCompanyId)
                      return company ? `${company.name} (#${company.id})` : null
                    })()}
                    onValueChange={(label) => {
                      const match = companyList.find(c => `${c.name} (#${c.id})` === label)
                      setSelectedCompanyId(match?.id)
                    }}
                  >
                    <ComboboxInput placeholder="Search companies..." showClear />
                    <ComboboxContent container={reindexDialogRef}>
                      <ComboboxEmpty>No companies found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              )}
              {reindexDialog.scope === "single" && (
                <div className="space-y-2">
                  <Label>Job ID</Label>
                  <Input placeholder="Enter job ID" />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReindexDialog({ open: false, scope: "" })} disabled={isReindexing}>
              Cancel
            </Button>
            <Button onClick={executeReindex} disabled={isReindexing || (reindexDialog.scope === "company" && !selectedCompanyId)}>
              {isReindexing ? "Reindexing..." : "Start Reindex"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Validation Dialog */}
      <Dialog open={batchValidationDialog} onOpenChange={setBatchValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Schema Validation</DialogTitle>
            <DialogDescription>
              Run validation on multiple jobs at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Jobs to Validate</Label>
              <Select value={batchValidationScope} onValueChange={(v) => setBatchValidationScope(v as typeof batchValidationScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Jobs</SelectItem>
                  <SelectItem value="recent">Recently Modified (Last 7 days)</SelectItem>
                  <SelectItem value="errors">Jobs with Previous Errors</SelectItem>
                  <SelectItem value="company">By Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="check-required" defaultChecked />
                <label htmlFor="check-required" className="text-sm">Check required fields</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="check-salary" defaultChecked />
                <label htmlFor="check-salary" className="text-sm">Check salary transparency</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="check-remote" defaultChecked />
                <label htmlFor="check-remote" className="text-sm">Check remote job compliance</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchValidationDialog(false)} disabled={isBatchValidating}>
              Cancel
            </Button>
            <Button onClick={handleBatchValidation} disabled={isBatchValidating}>
              <Play className="w-4 h-4 mr-2" />
              {isBatchValidating ? "Running..." : "Run Validation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IndexNow Submit Dialog */}
      <Dialog open={indexNowDialog} onOpenChange={setIndexNowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to IndexNow</DialogTitle>
            <DialogDescription>
              Instantly notify search engines about new or updated content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URLs to Submit</Label>
              <Select defaultValue="recent">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Changed URLs (Last 24h)</SelectItem>
                  <SelectItem value="selected">Selected Jobs ({selectedJobs.length})</SelectItem>
                  <SelectItem value="all">All Job URLs</SelectItem>
                  <SelectItem value="custom">Custom URLs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>12 URLs</strong> will be submitted to:
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">Bing</Badge>
                <Badge variant="outline">Yandex</Badge>
                <Badge variant="outline">IndexNow.org</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndexNowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitIndexNow}>
              <Send className="w-4 h-4 mr-2" />
              Submit URLs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schema Preview Dialog */}
      <Dialog open={schemaPreviewDialog} onOpenChange={setSchemaPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>JobPosting Schema Preview</DialogTitle>
            <DialogDescription>
              Full JSON-LD structured data for the selected job
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="bg-muted/30 p-4 rounded-lg text-sm font-mono">
              {schemaPreviewJson || "// No schema loaded. Enter a job ID in the Schema Tools tab."}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => schemaPreviewJson && navigator.clipboard.writeText(schemaPreviewJson).then(() => toast.success("Copied")).catch(() => toast.error("Failed to copy"))} disabled={!schemaPreviewJson}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={handleDownloadSchema} disabled={!schemaPreviewJson}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setSchemaPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

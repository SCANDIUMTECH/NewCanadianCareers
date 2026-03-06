"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Building2,
  Eye,
  AlertTriangle,
  ExternalLink,
  Activity,
  Shield,
  LogIn,
  Download,
  RefreshCw,
  User,
  LifeBuoy,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
} from "lucide-react"
import { isSameOriginUrl } from "@/lib/utils"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  searchSupportUsers,
  searchSupportCompanies,
  getUserTimeline,
  getCompanyTimeline,
  exportUserData,
  exportCompanyData,
  listExportJobs,
  type SupportUserResult,
  type SupportCompanyResult,
  type TimelineEvent,
  type DataExportJob,
} from "@/lib/api/admin-support"
import { startImpersonation } from "@/lib/api/admin-users"
import { toast } from "sonner"

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

export default function SupportToolsPage() {
  const [activeTab, setActiveTab] = useState("lookup")
  const [searchType, setSearchType] = useState<"user" | "company">("user")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Search results state
  const [userResults, setUserResults] = useState<SupportUserResult[]>([])
  const [companyResults, setCompanyResults] = useState<SupportCompanyResult[]>([])

  // Selected entity for timeline
  const [selectedEntity, setSelectedEntity] = useState<{
    type: "user" | "company"
    data: SupportUserResult | SupportCompanyResult
  } | null>(null)

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  // Dialog state
  const [impersonateDialog, setImpersonateDialog] = useState(false)
  const [impersonateTarget, setImpersonateTarget] = useState<SupportUserResult | null>(null)
  const [impersonateReason, setImpersonateReason] = useState("")
  const [isImpersonating, setIsImpersonating] = useState(false)

  const [exportDialog, setExportDialog] = useState(false)
  const [exportTarget, setExportTarget] = useState<{
    type: "user" | "company"
    data: SupportUserResult | SupportCompanyResult
  } | null>(null)
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xlsx">("csv")
  const [exportIncludePII, setExportIncludePII] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Export jobs state
  const [exportJobs, setExportJobs] = useState<DataExportJob[]>([])
  const [isLoadingExportJobs, setIsLoadingExportJobs] = useState(false)

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)

    try {
      if (searchType === "user") {
        const response = await searchSupportUsers({ query: searchQuery })
        setUserResults(response.results)
        setCompanyResults([])
      } else {
        const response = await searchSupportCompanies({ query: searchQuery })
        setCompanyResults(response.results)
        setUserResults([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed"
      setSearchError(message)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, searchType])

  // Load timeline when entity is selected
  useEffect(() => {
    if (!selectedEntity) {
      setTimeline([])
      return
    }

    const loadTimeline = async () => {
      setIsLoadingTimeline(true)
      setTimelineError(null)

      try {
        if (selectedEntity.type === "user") {
          const response = await getUserTimeline((selectedEntity.data as SupportUserResult).id)
          setTimeline(response.results)
        } else {
          const response = await getCompanyTimeline((selectedEntity.data as SupportCompanyResult).id)
          setTimeline(response.results)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load timeline"
        setTimelineError(message)
      } finally {
        setIsLoadingTimeline(false)
      }
    }

    loadTimeline()
  }, [selectedEntity])

  // Impersonate handler (uses admin-users API with redirect)
  const handleImpersonate = async () => {
    if (!impersonateTarget || !impersonateReason.trim()) return

    setIsImpersonating(true)
    try {
      const result = await startImpersonation(impersonateTarget.id, { reason: impersonateReason })
      setImpersonateDialog(false)
      setImpersonateReason("")
      setImpersonateTarget(null)
      // Redirect to the impersonation URL
      if (result.redirect_url && isSameOriginUrl(result.redirect_url)) {
        window.location.href = result.redirect_url
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start impersonation"
      toast.error(message)
    } finally {
      setIsImpersonating(false)
    }
  }

  // Export handler
  const handleExport = async () => {
    if (!exportTarget) return

    setIsExporting(true)
    try {
      let job
      if (exportTarget.type === "user") {
        job = await exportUserData((exportTarget.data as SupportUserResult).id, {
          format: exportFormat,
          include_pii: exportIncludePII,
        })
      } else {
        job = await exportCompanyData((exportTarget.data as SupportCompanyResult).id, {
          format: exportFormat,
          include_pii: exportIncludePII,
        })
      }
      toast.success(`Export started. Job ID: ${job.id}. You will be notified when it's ready.`)
      setExportDialog(false)
      setExportTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start export"
      toast.error(message)
    } finally {
      setIsExporting(false)
    }
  }

  // Fetch export jobs when switching to export tab
  useEffect(() => {
    if (activeTab !== "export") return
    const fetchExportJobs = async () => {
      setIsLoadingExportJobs(true)
      try {
        const data = await listExportJobs()
        setExportJobs(data.results)
      } catch {
        // Silently fail — the section will show empty state
      } finally {
        setIsLoadingExportJobs(false)
      }
    }
    fetchExportJobs()
  }, [activeTab])

  // Reset search when type changes
  const handleSearchTypeChange = (type: "user" | "company") => {
    setSearchType(type)
    setUserResults([])
    setCompanyResults([])
    setSearchError(null)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center shadow-lg shadow-sky/20">
              <LifeBuoy className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Support Tools</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              User lookup, impersonation, timelines, and data export
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warning Banner */}
      <motion.div variants={itemVariants}>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Sensitive Operations</p>
              <p className="text-sm text-amber-700 mt-1">
                All actions on this page are logged to the audit trail. Impersonation requires explicit justification.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lookup">User/Company Lookup</TabsTrigger>
          <TabsTrigger value="timeline">View Timeline</TabsTrigger>
          <TabsTrigger value="export">Export Reports</TabsTrigger>
        </TabsList>

        {/* Lookup Tab */}
        <TabsContent value="lookup" className="space-y-6">
          <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 flex gap-2">
                <Select value={searchType} onValueChange={handleSearchTypeChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={searchType === "user" ? "Search by name or email..." : "Search by name or domain..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
                <p className="text-sm text-destructive">{searchError}</p>
              </div>
            )}

            {/* Search Results */}
            {(userResults.length > 0 || companyResults.length > 0) && (
              <Card className="divide-y divide-border overflow-hidden">
                {searchType === "user" ? (
                  userResults.map(user => (
                    <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <UserAvatar
                        name={user.name}
                        avatar={user.avatar}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {user.type}
                          </Badge>
                          <Badge
                            className={
                              user.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : user.status === "suspended"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {user.status}
                          </Badge>
                          {user.company && (
                            <span className="text-xs text-muted-foreground">{user.company}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEntity({ type: "user", data: user })
                            setActiveTab("timeline")
                          }}
                        >
                          <Activity className="w-4 h-4 mr-1" />
                          Timeline
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImpersonateTarget(user)
                            setImpersonateDialog(true)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Impersonate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExportTarget({ type: "user", data: user })
                            setExportDialog(true)
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  companyResults.map(company => (
                    <div key={company.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={company.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {company.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{company.job_count} jobs · {company.employee_count} employees</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEntity({ type: "company", data: company })
                            setActiveTab("timeline")
                          }}
                        >
                          <Activity className="w-4 h-4 mr-1" />
                          Timeline
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExportTarget({ type: "company", data: company })
                            setExportDialog(true)
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/admin/companies?search=${encodeURIComponent(company.name)}`, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            )}

            {/* No Results */}
            {!isSearching && searchQuery && userResults.length === 0 && companyResults.length === 0 && !searchError && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
          <CardContent className="p-6">
            {selectedEntity ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky to-sky-deep text-white shadow-sm">
                      {selectedEntity.type === "user" ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedEntity.type === "user"
                          ? (selectedEntity.data as SupportUserResult).name
                          : (selectedEntity.data as SupportCompanyResult).name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEntity.type === "user"
                          ? (selectedEntity.data as SupportUserResult).email
                          : (selectedEntity.data as SupportCompanyResult).domain}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedEntity(null)}>
                    Clear Selection
                  </Button>
                </div>

                {/* Timeline Error */}
                {timelineError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
                    <p className="text-sm text-destructive">{timelineError}</p>
                  </div>
                )}

                {/* Timeline Loading */}
                {isLoadingTimeline && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Timeline Events */}
                {!isLoadingTimeline && !timelineError && timeline.length > 0 && (
                  <div className="relative pl-6 border-l-2 border-border space-y-6">
                    {timeline.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                      >
                        <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-card border-2 border-primary" />
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{event.description}</p>
                              {event.ip && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  IP: {event.ip}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* No Timeline Events */}
                {!isLoadingTimeline && !timelineError && timeline.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No activity found for this {selectedEntity.type}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Select a user or company from the lookup tab to view their timeline</p>
              </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "User Report", description: "Export all user data as CSV", icon: User, gradient: "from-sky to-sky-deep", accent: "bg-sky", onClick: () => setActiveTab("lookup") },
              { title: "Company Report", description: "Export company data and metrics", icon: Building2, gradient: "from-primary-light to-primary", accent: "bg-primary", onClick: () => setActiveTab("lookup") },
              { title: "Activity Report", description: "Platform-wide activity log", icon: Activity, gradient: "from-emerald-500 to-teal-600", accent: "bg-emerald-500", onClick: () => window.open("/admin/audit", "_blank") },
            ].map((report) => (
              <Card key={report.title} className="relative overflow-hidden group">
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${report.accent} opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]`} />
                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${report.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="p-6 relative">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${report.gradient} text-white shadow-sm mb-4`}>
                    <report.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">{report.description}</p>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={report.onClick}>
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">Recent Exports</h3>
              {isLoadingExportJobs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : exportJobs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Download className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No exports yet. Use the lookup tab to search for a specific user or company to export their data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exportJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {job.status === "completed" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        {job.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-sky" />}
                        {job.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
                        {job.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                        <div>
                          <p className="text-sm font-medium">Export #{job.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleDateString()} &middot; {job.status}
                          </p>
                        </div>
                      </div>
                      {job.status === "completed" && job.download_url && (
                        <Button variant="outline" size="sm" className="gap-1.5" asChild>
                          <a href={job.download_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </Button>
                      )}
                      {job.status === "failed" && job.error && (
                        <span className="text-xs text-red-600 max-w-[200px] truncate">{job.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Impersonate Dialog */}
      <Dialog open={impersonateDialog} onOpenChange={setImpersonateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Impersonate User
            </DialogTitle>
            <DialogDescription>
              This action is heavily logged and requires justification. You will see the platform as this user sees it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {impersonateTarget && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{impersonateTarget.name}</p>
                <p className="text-sm text-muted-foreground">{impersonateTarget.email}</p>
              </div>
            )}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium">Warning:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>This session will be logged with your admin ID</li>
                <li>Actions taken will be marked as impersonated</li>
                <li>Session expires after 30 minutes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Reason for Impersonation *</Label>
              <Textarea
                placeholder="Describe why you need to impersonate this user..."
                value={impersonateReason}
                onChange={e => setImpersonateReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateDialog(false)} disabled={isImpersonating}>Cancel</Button>
            <Button onClick={handleImpersonate} disabled={!impersonateReason.trim() || isImpersonating}>
              {isImpersonating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>Configure your data export</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {exportTarget && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">
                  {exportTarget.type === "user"
                    ? (exportTarget.data as SupportUserResult).name
                    : (exportTarget.data as SupportCompanyResult).name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {exportTarget.type === "user"
                    ? (exportTarget.data as SupportUserResult).email
                    : (exportTarget.data as SupportCompanyResult).domain}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" />
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Include PII (Personally Identifiable Information)</Label>
              <Switch checked={exportIncludePII} onCheckedChange={setExportIncludePII} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Generate Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

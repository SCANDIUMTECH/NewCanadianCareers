"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

// Index status mock
const indexStatus = {
  lastIndexed: "2026-02-02T08:30:00",
  totalDocuments: 8432,
  pendingIndexing: 12,
  failedIndexing: 3,
  averageIndexTime: "1.2s",
  indexLag: "5 min",
}

// Failed jobs mock
const failedIndexJobs = [
  { id: "job-123", title: "Senior Engineer", company: "TechCorp", error: "Missing required field: description", timestamp: "2026-02-02T07:45:00" },
  { id: "job-456", title: "Product Manager", company: "GrowthLabs", error: "Invalid salary format", timestamp: "2026-02-02T06:30:00" },
  { id: "job-789", title: "Designer", company: "WebWorks", error: "Timeout during indexing", timestamp: "2026-02-01T23:15:00" },
]

// Google for Jobs validation issues
const googleJobsIssues = [
  { id: "g1", jobId: "job-234", title: "Marketing Lead", issue: "Missing datePosted field", severity: "error" },
  { id: "g2", jobId: "job-567", title: "Sales Rep", issue: "Invalid employmentType value", severity: "warning" },
  { id: "g3", jobId: "job-890", title: "Data Analyst", issue: "hiringOrganization.name too long", severity: "warning" },
]

export default function SearchSEOPage() {
  const [activeTab, setActiveTab] = useState("index")
  const [reindexDialog, setReindexDialog] = useState<{ open: boolean; scope: string }>({ open: false, scope: "" })
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexProgress, setReindexProgress] = useState(0)

  const handleReindex = (scope: string) => {
    setReindexDialog({ open: true, scope })
  }

  const executeReindex = () => {
    setIsReindexing(true)
    setReindexProgress(0)
    
    const interval = setInterval(() => {
      setReindexProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsReindexing(false)
          setReindexDialog({ open: false, scope: "" })
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Search & SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage search indexing and SEO configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleReindex("all")}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reindex All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Indexed Documents", value: indexStatus.totalDocuments.toLocaleString(), icon: Database, color: "text-primary" },
          { label: "Pending", value: indexStatus.pendingIndexing.toString(), icon: Clock, color: "text-amber-600" },
          { label: "Failed", value: indexStatus.failedIndexing.toString(), icon: AlertTriangle, color: "text-red-600" },
          { label: "Index Lag", value: indexStatus.indexLag, icon: Zap, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="index">Index Health</TabsTrigger>
          <TabsTrigger value="seo">SEO Settings</TabsTrigger>
          <TabsTrigger value="google">Google for Jobs</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
        </TabsList>

        {/* Index Health Tab */}
        <TabsContent value="index" className="space-y-6">
          {/* Index Status */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-medium mb-4">Index Status</h3>
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
          </div>

          {/* Failed Indexing Jobs */}
          <div className="bg-card border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Failed Indexing Jobs</h3>
              <Badge variant="destructive">{failedIndexJobs.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {failedIndexJobs.map(job => (
                <div key={job.id} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                    <p className="text-xs text-red-600 mt-0.5">{job.error}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SEO Settings Tab */}
        <TabsContent value="seo" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h3 className="font-medium">SEO Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Meta Title Template</Label>
                  <Input defaultValue="{title} at {company} | Orion Jobs" />
                  <p className="text-xs text-muted-foreground">Variables: {"{title}"}, {"{company}"}, {"{location}"}</p>
                </div>

                <div className="space-y-2">
                  <Label>Default Meta Description Template</Label>
                  <Textarea defaultValue="Apply for {title} at {company}. {location}. Find your next career opportunity on Orion." />
                </div>

                <div className="space-y-2">
                  <Label>Canonical URL Base</Label>
                  <Input defaultValue="https://orion.jobs" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Robots.txt Rules</Label>
                  <Select defaultValue="production">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production (Allow all)</SelectItem>
                      <SelectItem value="staging">Staging (Disallow all)</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Job Schema Markup</Label>
                      <p className="text-xs text-muted-foreground">JSON-LD for job listings</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Organization Schema</Label>
                      <p className="text-xs text-muted-foreground">For company pages</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Breadcrumb Schema</Label>
                      <p className="text-xs text-muted-foreground">For navigation</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button>Save SEO Settings</Button>
            </div>
          </div>
        </TabsContent>

        {/* Google for Jobs Tab */}
        <TabsContent value="google" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-medium">Google for Jobs Compliance</h3>
                <p className="text-sm text-muted-foreground">Validate JobPosting schema requirements</p>
              </div>
              <Button variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Run Validation
              </Button>
            </div>

            {/* Validation Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Valid</span>
                </div>
                <p className="text-2xl font-semibold text-emerald-700 mt-2">8,429</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-700">Warnings</span>
                </div>
                <p className="text-2xl font-semibold text-amber-700 mt-2">2</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">Errors</span>
                </div>
                <p className="text-2xl font-semibold text-red-700 mt-2">1</p>
              </div>
            </div>

            {/* Issues List */}
            <div className="border border-border rounded-lg">
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <span className="text-sm font-medium">Issues Found</span>
              </div>
              <div className="divide-y divide-border">
                {googleJobsIssues.map(issue => (
                  <div key={issue.id} className="px-4 py-3 flex items-center gap-4">
                    {issue.severity === "error" ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">Job ID: {issue.jobId}</p>
                      <p className={cn("text-xs mt-0.5", issue.severity === "error" ? "text-red-600" : "text-amber-600")}>
                        {issue.issue}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Required Fields Reference */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-medium mb-4">Required JobPosting Fields</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                "title", "description", "datePosted", "validThrough",
                "employmentType", "hiringOrganization", "jobLocation", "identifier"
              ].map(field => (
                <div key={field} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">{field}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Sitemap Tab */}
        <TabsContent value="sitemap" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Sitemap Configuration</h3>
                <p className="text-sm text-muted-foreground">Manage XML sitemap generation</p>
              </div>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Sitemap
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Generation Frequency</Label>
                  <Select defaultValue="hourly">
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
                  <Input type="number" defaultValue="50000" />
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Include Job Listings</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include Company Pages</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include Category Pages</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Sitemap Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Generated</span>
                      <span>Feb 2, 2026 08:00 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total URLs</span>
                      <span>12,847</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sitemap Files</span>
                      <span>3</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sitemap URLs</Label>
                  <div className="space-y-1">
                    <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="w-4 h-4" />
                      /sitemap.xml
                    </a>
                    <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText className="w-4 h-4" />
                      /sitemap-jobs-1.xml
                    </a>
                    <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText className="w-4 h-4" />
                      /sitemap-companies.xml
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button>Save Sitemap Settings</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reindex Dialog */}
      <Dialog open={reindexDialog.open} onOpenChange={open => !open && !isReindexing && setReindexDialog({ open: false, scope: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reindex {reindexDialog.scope === "all" ? "All Documents" : reindexDialog.scope === "company" ? "by Company" : "Single Job"}</DialogTitle>
            <DialogDescription>
              {reindexDialog.scope === "all" && "This will reindex all documents in the search index. This may take several minutes."}
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="techcorp">TechCorp Inc</SelectItem>
                      <SelectItem value="growthlabs">GrowthLabs</SelectItem>
                      <SelectItem value="dataflow">DataFlow Analytics</SelectItem>
                    </SelectContent>
                  </Select>
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
            <Button onClick={executeReindex} disabled={isReindexing}>
              {isReindexing ? "Reindexing..." : "Start Reindex"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  User,
  Building2,
  Eye,
  Clock,
  FileText,
  Download,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Activity,
  Shield,
  LogIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

// Mock user timeline
const mockUserTimeline = [
  { id: "e1", type: "login", description: "User logged in", timestamp: "2026-02-02T09:30:00", ip: "192.168.1.1" },
  { id: "e2", type: "profile_update", description: "Updated profile information", timestamp: "2026-02-02T09:35:00" },
  { id: "e3", type: "application", description: "Applied to Senior Engineer at TechCorp", timestamp: "2026-02-02T10:00:00" },
  { id: "e4", type: "job_view", description: "Viewed Product Designer at GrowthLabs", timestamp: "2026-02-02T10:15:00" },
  { id: "e5", type: "search", description: "Searched for 'remote engineering jobs'", timestamp: "2026-02-02T10:20:00" },
  { id: "e6", type: "application", description: "Applied to DevOps Engineer at DataFlow", timestamp: "2026-02-02T10:45:00" },
]

// Mock company timeline
const mockCompanyTimeline = [
  { id: "c1", type: "job_posted", description: "Posted new job: Senior Engineer", timestamp: "2026-02-01T14:00:00", user: "john@techcorp.com" },
  { id: "c2", type: "candidate_viewed", description: "Viewed candidate: Sarah Johnson", timestamp: "2026-02-01T15:30:00", user: "jane@techcorp.com" },
  { id: "c3", type: "job_updated", description: "Updated job: Product Designer", timestamp: "2026-02-02T09:00:00", user: "john@techcorp.com" },
  { id: "c4", type: "package_purchased", description: "Purchased Premium Package", timestamp: "2026-02-02T10:00:00", user: "john@techcorp.com" },
]

// Mock user search results
const mockUserResults = [
  { id: "u1", name: "Sarah Johnson", email: "sarah.j@email.com", type: "candidate", status: "active", lastActive: "2026-02-02T10:45:00" },
  { id: "u2", name: "John Smith", email: "john@techcorp.com", type: "employer", company: "TechCorp Inc", status: "active", lastActive: "2026-02-02T09:00:00" },
]

// Mock company search results
const mockCompanyResults = [
  { id: "co1", name: "TechCorp Inc", domain: "techcorp.com", status: "verified", jobCount: 12, employeeCount: 3 },
  { id: "co2", name: "Tech Solutions", domain: "techsolutions.io", status: "pending", jobCount: 2, employeeCount: 1 },
]

export default function SupportToolsPage() {
  const [activeTab, setActiveTab] = useState("lookup")
  const [searchType, setSearchType] = useState<"user" | "company">("user")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<typeof mockUserResults | typeof mockCompanyResults | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; data: unknown } | null>(null)
  const [impersonateDialog, setImpersonateDialog] = useState(false)
  const [impersonateReason, setImpersonateReason] = useState("")
  const [exportDialog, setExportDialog] = useState(false)

  const handleSearch = () => {
    if (searchType === "user") {
      setSearchResults(mockUserResults.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    } else {
      setSearchResults(mockCompanyResults.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.domain.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    }
  }

  const isUserResults = (results: unknown[]): results is typeof mockUserResults => {
    return searchType === "user"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Support Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          User lookup, impersonation, timelines, and data export
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Sensitive Operations</p>
          <p className="text-sm text-amber-700 mt-1">
            All actions on this page are logged to the audit trail. Impersonation requires explicit justification.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lookup">User/Company Lookup</TabsTrigger>
          <TabsTrigger value="timeline">View Timeline</TabsTrigger>
          <TabsTrigger value="export">Export Reports</TabsTrigger>
        </TabsList>

        {/* Lookup Tab */}
        <TabsContent value="lookup" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 flex gap-2">
                <Select value={searchType} onValueChange={(v: "user" | "company") => {
                  setSearchType(v)
                  setSearchResults(null)
                }}>
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
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults && searchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border">
                {isUserResults(searchResults) ? (
                  searchResults.map(user => (
                    <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {user.type}
                          </Badge>
                          {user.type === "employer" && (
                            <span className="text-xs text-muted-foreground">{(user as typeof mockUserResults[1]).company}</span>
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
                          onClick={() => setImpersonateDialog(true)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Impersonate
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  (searchResults as typeof mockCompanyResults).map(company => (
                    <div key={company.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={company.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {company.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{company.jobCount} jobs · {company.employeeCount} employees</span>
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
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {searchResults && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            {selectedEntity ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selectedEntity.type === "user" ? "bg-primary/10" : "bg-primary/10"
                    )}>
                      {selectedEntity.type === "user" ? (
                        <User className="w-5 h-5 text-primary" />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedEntity.type === "user" 
                          ? (selectedEntity.data as typeof mockUserResults[0]).name 
                          : (selectedEntity.data as typeof mockCompanyResults[0]).name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEntity.type === "user" 
                          ? (selectedEntity.data as typeof mockUserResults[0]).email 
                          : (selectedEntity.data as typeof mockCompanyResults[0]).domain}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedEntity(null)}>
                    Clear Selection
                  </Button>
                </div>

                <div className="relative pl-6 border-l-2 border-border space-y-6">
                  {(selectedEntity.type === "user" ? mockUserTimeline : mockCompanyTimeline).map((event, i) => (
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
                            {selectedEntity.type === "company" && (event as typeof mockCompanyTimeline[0]).user && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                by {(event as typeof mockCompanyTimeline[0]).user}
                              </p>
                            )}
                            {selectedEntity.type === "user" && (event as typeof mockUserTimeline[0]).ip && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                IP: {(event as typeof mockUserTimeline[0]).ip}
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
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Select a user or company from the lookup tab to view their timeline</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "User Report", description: "Export all user data as CSV", icon: User },
              { title: "Company Report", description: "Export company data and metrics", icon: Building2 },
              { title: "Job Listings Report", description: "All jobs with applications data", icon: FileText },
              { title: "Revenue Report", description: "Package purchases and billing", icon: Calendar },
              { title: "Activity Report", description: "Platform-wide activity log", icon: Activity },
              { title: "Custom Query", description: "Run custom data export", icon: Download },
            ].map((report, i) => (
              <motion.div
                key={report.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium">{report.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{report.description}</p>
                <Button variant="outline" size="sm" onClick={() => setExportDialog(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

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
            <Button variant="outline" onClick={() => setImpersonateDialog(false)}>Cancel</Button>
            <Button disabled={!impersonateReason.trim()}>
              <LogIn className="w-4 h-4 mr-2" />
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>Configure your data export</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" />
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select defaultValue="csv">
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
              <Label>Include PII</Label>
              <Switch />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)}>Cancel</Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Generate Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  FileText,
  Trash2,
  Download,
  Clock,
  Check,
  AlertTriangle,
  User,
  Building2,
  Search,
  ChevronRight,
  Eye,
  MoreHorizontal,
  RefreshCw,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Request types
interface ComplianceRequest {
  id: string
  type: "export" | "deletion"
  status: "pending" | "processing" | "completed" | "rejected"
  requestedBy: {
    name: string
    email: string
    type: "candidate" | "employer"
  }
  createdAt: string
  completedAt?: string
  notes?: string
}

const mockRequests: ComplianceRequest[] = [
  {
    id: "cr-001",
    type: "export",
    status: "pending",
    requestedBy: { name: "John Doe", email: "john.doe@email.com", type: "candidate" },
    createdAt: "2026-02-01T10:00:00",
  },
  {
    id: "cr-002",
    type: "deletion",
    status: "processing",
    requestedBy: { name: "Jane Smith", email: "jane@company.com", type: "employer" },
    createdAt: "2026-01-30T14:30:00",
    notes: "Verified identity via support ticket #12345",
  },
  {
    id: "cr-003",
    type: "export",
    status: "completed",
    requestedBy: { name: "Bob Johnson", email: "bob.j@email.com", type: "candidate" },
    createdAt: "2026-01-28T09:00:00",
    completedAt: "2026-01-29T11:00:00",
  },
  {
    id: "cr-004",
    type: "deletion",
    status: "completed",
    requestedBy: { name: "Alice Brown", email: "alice@startup.io", type: "employer" },
    createdAt: "2026-01-25T16:00:00",
    completedAt: "2026-01-27T10:00:00",
  },
  {
    id: "cr-005",
    type: "deletion",
    status: "rejected",
    requestedBy: { name: "Charlie Wilson", email: "charlie@fake.com", type: "candidate" },
    createdAt: "2026-01-20T08:00:00",
    notes: "Identity verification failed",
  },
]

// Retention rules
const retentionRules = [
  { category: "Candidate Profiles", retention: "3 years after last activity", deletable: true },
  { category: "Job Applications", retention: "2 years after application", deletable: true },
  { category: "Employer Accounts", retention: "5 years after account closure", deletable: true },
  { category: "Payment Records", retention: "7 years (legal requirement)", deletable: false },
  { category: "Audit Logs", retention: "Permanent (anonymized after 5 years)", deletable: false },
  { category: "Email Communications", retention: "1 year", deletable: true },
]

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: AlertTriangle },
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("requests")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<ComplianceRequest | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; request: ComplianceRequest | null }>({
    open: false,
    action: "",
    request: null,
  })
  const [actionNotes, setActionNotes] = useState("")

  const filteredRequests = mockRequests.filter(req => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false
    if (typeFilter !== "all" && req.type !== typeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        req.requestedBy.name.toLowerCase().includes(q) ||
        req.requestedBy.email.toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const stats = {
    pending: mockRequests.filter(r => r.status === "pending").length,
    processing: mockRequests.filter(r => r.status === "processing").length,
    completed: mockRequests.filter(r => r.status === "completed").length,
    total: mockRequests.length,
  }

  const handleAction = (action: string, request: ComplianceRequest) => {
    setActionDialog({ open: true, action, request })
  }

  const executeAction = () => {
    console.log(`Executing ${actionDialog.action} for request ${actionDialog.request?.id}`, { notes: actionNotes })
    setActionDialog({ open: false, action: "", request: null })
    setActionNotes("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compliance & Privacy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Handle data export requests, deletion requests, and retention policies
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Requests", value: stats.pending, icon: Clock, color: "text-amber-600" },
          { label: "Processing", value: stats.processing, icon: RefreshCw, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, icon: Check, color: "text-emerald-600" },
          { label: "Total Requests", value: stats.total, icon: FileText, color: "text-foreground" },
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
          <TabsTrigger value="requests">
            Data Requests
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">{stats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="retention">Retention Rules</TabsTrigger>
          <TabsTrigger value="policies">Privacy Policies</TabsTrigger>
        </TabsList>

        {/* Data Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="export">Data Export</SelectItem>
                <SelectItem value="deletion">Data Deletion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests List */}
          <div className="bg-card border border-border rounded-xl">
            <div className="divide-y divide-border">
              {filteredRequests.map((request, i) => {
                const status = statusConfig[request.status]
                const StatusIcon = status.icon
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      request.type === "export" ? "bg-blue-100" : "bg-red-100"
                    )}>
                      {request.type === "export" ? (
                        <Download className={cn("w-5 h-5", request.type === "export" ? "text-blue-600" : "text-red-600")} />
                      ) : (
                        <Trash2 className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.requestedBy.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {request.requestedBy.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.requestedBy.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>ID: {request.id}</span>
                        <span>·</span>
                        <span>Requested: {new Date(request.createdAt).toLocaleDateString()}</span>
                        {request.completedAt && (
                          <>
                            <span>·</span>
                            <span>Completed: {new Date(request.completedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-xs gap-1", status.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {request.type === "export" ? "Export" : "Deletion"}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction("process", request)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Start Processing
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleAction("reject", request)}
                                className="text-red-600"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Reject Request
                              </DropdownMenuItem>
                            </>
                          )}
                          {request.status === "processing" && (
                            <DropdownMenuItem onClick={() => handleAction("complete", request)}>
                              <Check className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                )
              })}

              {filteredRequests.length === 0 && (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  No requests found matching your criteria
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Retention Rules Tab */}
        <TabsContent value="retention" className="space-y-4">
          <div className="bg-card border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">Data Retention Policies</h3>
              <p className="text-sm text-muted-foreground">Defines how long data is kept before automatic deletion</p>
            </div>
            <div className="divide-y divide-border">
              {retentionRules.map((rule, i) => (
                <motion.div
                  key={rule.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-4 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{rule.category}</p>
                    <p className="text-sm text-muted-foreground">{rule.retention}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.deletable ? (
                      <Badge className="bg-emerald-100 text-emerald-700">User Deletable</Badge>
                    ) : (
                      <Badge variant="secondary">Protected</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Retention Policy Notes</p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>Hard deletes only when legally required</li>
                <li>Audit logs preserved with anonymization</li>
                <li>Deletion requests processed within 30 days</li>
                <li>Payment records retained per financial regulations</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Privacy Policy", lastUpdated: "2026-01-15", url: "/privacy" },
              { title: "Terms of Service", lastUpdated: "2026-01-15", url: "/terms" },
              { title: "Cookie Policy", lastUpdated: "2025-12-01", url: "/cookies" },
              { title: "Data Processing Agreement", lastUpdated: "2025-11-20", url: "/dpa" },
            ].map((policy, i) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Updated {new Date(policy.lastUpdated).toLocaleDateString()}
                  </Badge>
                </div>
                <h3 className="font-medium mt-4">{policy.title}</h3>
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.type === "export" ? "Data Export Request" : "Data Deletion Request"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Request ID</Label>
                  <p className="font-medium">{selectedRequest.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={cn("mt-1", statusConfig[selectedRequest.status].color)}>
                    {statusConfig[selectedRequest.status].label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Requester</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedRequest.requestedBy.type === "candidate" ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{selectedRequest.requestedBy.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.requestedBy.email}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Requested</Label>
                  <p>{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
                {selectedRequest.completedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Completed</Label>
                    <p>{new Date(selectedRequest.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedRequest.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => !open && setActionDialog({ open: false, action: "", request: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "process" && "Start Processing Request"}
              {actionDialog.action === "complete" && "Complete Request"}
              {actionDialog.action === "reject" && "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "process" && "Begin processing this data request"}
              {actionDialog.action === "complete" && "Mark this request as completed"}
              {actionDialog.action === "reject" && "Reject this request with a reason"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">{actionDialog.request?.requestedBy.name}</p>
              <p className="text-xs text-muted-foreground">{actionDialog.request?.requestedBy.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Notes {actionDialog.action === "reject" && "*"}</Label>
              <Textarea
                placeholder={actionDialog.action === "reject" ? "Reason for rejection (required)..." : "Optional notes..."}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: "", request: null })}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={actionDialog.action === "reject" && !actionNotes.trim()}
              variant={actionDialog.action === "reject" ? "destructive" : "default"}
            >
              {actionDialog.action === "process" && "Start Processing"}
              {actionDialog.action === "complete" && "Mark Complete"}
              {actionDialog.action === "reject" && "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

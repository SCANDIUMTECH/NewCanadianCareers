"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Sample feature flags
const featureFlags = [
  {
    id: 1,
    key: "social_distribution",
    name: "Social Distribution",
    description: "Automatically post jobs to LinkedIn and Twitter",
    enabled: true,
    rollout: 100,
    environment: "production",
    lastUpdated: "2024-03-10",
  },
  {
    id: 2,
    key: "ai_job_matching",
    name: "AI Job Matching",
    description: "Use AI to match candidates with relevant jobs",
    enabled: true,
    rollout: 50,
    environment: "production",
    lastUpdated: "2024-03-12",
  },
  {
    id: 3,
    key: "new_dashboard_ui",
    name: "New Dashboard UI",
    description: "Redesigned company dashboard with improved analytics",
    enabled: false,
    rollout: 10,
    environment: "staging",
    lastUpdated: "2024-03-14",
  },
  {
    id: 4,
    key: "bulk_job_upload",
    name: "Bulk Job Upload",
    description: "Allow companies to upload multiple jobs via CSV",
    enabled: true,
    rollout: 100,
    environment: "production",
    lastUpdated: "2024-02-28",
  },
  {
    id: 5,
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Enhanced job performance metrics and insights",
    enabled: true,
    rollout: 75,
    environment: "production",
    lastUpdated: "2024-03-08",
  },
  {
    id: 6,
    key: "email_v2",
    name: "Email Template V2",
    description: "New email templates with improved deliverability",
    enabled: false,
    rollout: 0,
    environment: "staging",
    lastUpdated: "2024-03-15",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(featureFlags)
  const [searchQuery, setSearchQuery] = useState("")
  const [envFilter, setEnvFilter] = useState("all")
  const [editingFlag, setEditingFlag] = useState<typeof featureFlags[0] | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesEnv = envFilter === "all" || flag.environment === envFilter
    return matchesSearch && matchesEnv
  })

  const toggleFlag = (id: number) => {
    setFlags(flags.map((flag) =>
      flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
    ))
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">
            Control feature rollouts and A/B testing
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Flag
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Flags</p>
            <p className="mt-1 text-2xl font-semibold">{flags.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Enabled</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {flags.filter((f) => f.enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Staging</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              {flags.filter((f) => f.environment === "staging").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Partial Rollout</p>
            <p className="mt-1 text-2xl font-semibold">
              {flags.filter((f) => f.rollout > 0 && f.rollout < 100).length}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={envFilter} onValueChange={setEnvFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Flags List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {filteredFlags.map((flag) => (
          <Card key={flag.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4">
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => toggleFlag(flag.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{flag.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        flag.environment === "production"
                          ? "border-green-200 text-green-700"
                          : "border-amber-200 text-amber-700"
                      )}
                    >
                      {flag.environment}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{flag.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Key: <code className="bg-muted px-1 py-0.5 rounded">{flag.key}</code>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Rollout Indicator */}
                  <div className="text-right">
                    <p className="text-sm font-medium">{flag.rollout}%</p>
                    <p className="text-xs text-muted-foreground">rollout</p>
                    <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          flag.rollout === 100
                            ? "bg-green-500"
                            : flag.rollout === 0
                            ? "bg-gray-300"
                            : "bg-amber-500"
                        )}
                        style={{ width: `${flag.rollout}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingFlag(flag)}
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Edit/Create Dialog */}
      <Dialog
        open={!!editingFlag || isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingFlag(null)
            setIsCreateDialogOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? "Edit Feature Flag" : "Create Feature Flag"}
            </DialogTitle>
            <DialogDescription>
              Configure the feature flag settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                defaultValue={editingFlag?.name}
                placeholder="e.g., New Dashboard UI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                defaultValue={editingFlag?.key}
                placeholder="e.g., new_dashboard_ui"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-description">Description</Label>
              <Textarea
                id="flag-description"
                defaultValue={editingFlag?.description}
                placeholder="Describe what this flag controls..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select defaultValue={editingFlag?.environment || "staging"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollout">Rollout %</Label>
                <Input
                  id="rollout"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editingFlag?.rollout || 0}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch defaultChecked={editingFlag?.enabled} />
              <Label>Enabled</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingFlag(null)
                setIsCreateDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button>{editingFlag ? "Save Changes" : "Create Flag"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

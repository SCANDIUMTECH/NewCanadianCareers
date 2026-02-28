"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  getJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
  toggleJobAlert,
} from "@/lib/api/candidates"
import type { JobAlert, JobAlertCreate, JobAlertUpdate } from "@/lib/candidate/types"

function formatDate(dateString: string | null): string {
  if (!dateString) return "Never"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getJobAlerts()
      setAlerts(response.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job alerts")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const updated = await toggleJobAlert(id, enabled)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle alert")
    }
  }

  const handleFrequencyChange = async (id: number, frequency: "daily" | "weekly" | "off") => {
    try {
      const updated = await updateJobAlert(id, { frequency })
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update frequency")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this alert?")) return
    try {
      await deleteJobAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete alert")
    }
  }

  const handleCreate = async (data: JobAlertCreate) => {
    try {
      const created = await createJobAlert(data)
      setAlerts((prev) => [...prev, created])
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create alert")
    }
  }

  const handleUpdate = async (id: number, data: JobAlertUpdate) => {
    try {
      const updated = await updateJobAlert(id, data)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
      setEditingAlert(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update alert")
    }
  }

  const enabledCount = alerts.filter((a) => a.enabled).length
  const totalMatches = alerts.reduce((acc, a) => acc + a.match_count, 0)

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-background-secondary/50 rounded w-48" />
            <div className="h-10 bg-background-secondary/50 rounded w-32" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-background-secondary/50 rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-background-secondary/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchAlerts}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Job Alerts</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Get notified when new jobs match your searches
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Job Alert</DialogTitle>
              </DialogHeader>
              <CreateAlertForm onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{alerts.length}</p>
              <p className="text-xs text-foreground-muted">Saved Searches</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{enabledCount}</p>
              <p className="text-xs text-foreground-muted">Active Alerts</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-primary">{totalMatches}</p>
              <p className="text-xs text-foreground-muted">New Matches</p>
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Alerts List */}
      <MotionWrapper delay={200}>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggle={(enabled) => handleToggle(alert.id, enabled)}
              onFrequencyChange={(f) => handleFrequencyChange(alert.id, f)}
              onDelete={() => handleDelete(alert.id)}
              onEdit={() => setEditingAlert(alert)}
            />
          ))}

          {alerts.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-secondary flex items-center justify-center">
                  <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">No job alerts yet</h3>
                <p className="text-sm text-foreground-muted mt-1 mb-4">
                  Create an alert to get notified about new matching jobs
                </p>
                <Button onClick={() => setCreateOpen(true)}>Create Your First Alert</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </MotionWrapper>

      {/* Tips */}
      <MotionWrapper delay={300}>
        <Card className="border-primary/20 bg-primary/5 mt-8">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Tips for better alerts</h3>
            <ul className="text-sm text-foreground-muted space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Be specific with keywords to reduce noise
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Daily alerts work best for competitive roles
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Pause alerts you&apos;re not actively using
              </li>
            </ul>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Edit Alert Dialog */}
      <Dialog open={!!editingAlert} onOpenChange={(open) => !open && setEditingAlert(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Job Alert</DialogTitle>
          </DialogHeader>
          {editingAlert && (
            <EditAlertForm
              alert={editingAlert}
              onClose={() => setEditingAlert(null)}
              onSubmit={(data) => handleUpdate(editingAlert.id, data)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AlertCard({
  alert,
  onToggle,
  onFrequencyChange,
  onDelete,
  onEdit,
}: {
  alert: JobAlert
  onToggle: (enabled: boolean) => void
  onFrequencyChange: (f: "daily" | "weekly" | "off") => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Card className={cn("border transition-all duration-300", alert.enabled ? "border-border/50" : "border-border/30 opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base font-medium text-foreground">{alert.name}</h3>
              {alert.match_count > 0 && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {alert.match_count} new
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
              {alert.query.search && <span>{alert.query.search}</span>}
              {alert.query.location && (
                <>
                  {alert.query.search && <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />}
                  <span>{alert.query.location}</span>
                </>
              )}
              {alert.query.location_type && (
                <>
                  <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
                  <span className="capitalize">{alert.query.location_type}</span>
                </>
              )}
              {alert.query.salary_min && (
                <>
                  <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
                  <span>${(alert.query.salary_min / 1000).toFixed(0)}k+</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-muted">
              <span>
                {alert.frequency === "daily" ? "Daily" : alert.frequency === "weekly" ? "Weekly" : "Off"} alerts
              </span>
              <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>Last sent {formatDate(alert.last_sent_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={alert.frequency} onValueChange={(v) => onFrequencyChange(v as "daily" | "weekly" | "off")}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
            <Switch checked={alert.enabled} onCheckedChange={onToggle} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
          <Link href={`/jobs?${new URLSearchParams(alert.query as Record<string, string>).toString()}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              View Matches
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={onEdit}>
            Edit Search
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateAlertForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: JobAlertCreate) => Promise<void>
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    search: "",
    location: "",
    locationType: "",
    salaryMin: "",
    employmentType: "",
    frequency: "daily" as "daily" | "weekly" | "off",
  })
  const [errors, setErrors] = useState<{ name?: string; search?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Please enter a name for this alert"
    }
    if (!formData.search.trim()) {
      newErrors.search = "Please enter at least one keyword"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: formData.name,
        query: {
          search: formData.search || undefined,
          location: formData.location || undefined,
          location_type: formData.locationType as "remote" | "onsite" | "hybrid" | undefined,
          salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
          employment_type: formData.employmentType ? [formData.employmentType] : undefined,
        },
        frequency: formData.frequency,
        enabled: true,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create alert")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name" className={cn(errors.name && "text-destructive")}>
          Alert Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Frontend Remote $150k+"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value })
            if (errors.name && e.target.value.trim()) setErrors({ ...errors, name: undefined })
          }}
          className={cn(errors.name && "border-destructive")}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="search" className={cn(errors.search && "text-destructive")}>
          Keywords <span className="text-destructive">*</span>
        </Label>
        <Input
          id="search"
          placeholder="e.g., Frontend Engineer, React Developer"
          value={formData.search}
          onChange={(e) => {
            setFormData({ ...formData, search: e.target.value })
            if (errors.search && e.target.value.trim()) setErrors({ ...errors, search: undefined })
          }}
          className={cn(errors.search && "border-destructive")}
        />
        {errors.search && <p className="text-sm text-destructive">{errors.search}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="e.g., San Francisco, New York"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="locationType">Work Type</Label>
          <Select value={formData.locationType} onValueChange={(v) => setFormData({ ...formData, locationType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Min Salary</Label>
          <Input
            id="salary"
            placeholder="e.g., 150000"
            type="number"
            value={formData.salaryMin}
            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employmentType">Job Type</Label>
          <Select value={formData.employmentType} onValueChange={(v) => setFormData({ ...formData, employmentType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Alert Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(v) => setFormData({ ...formData, frequency: v as "daily" | "weekly" | "off" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-foreground-muted">
        You&apos;ll receive an email when new jobs match this search
      </p>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Alert"}
        </Button>
      </div>
    </form>
  )
}

function EditAlertForm({
  alert,
  onClose,
  onSubmit,
}: {
  alert: JobAlert
  onClose: () => void
  onSubmit: (data: JobAlertUpdate) => Promise<void>
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: alert.name,
    search: alert.query.search || "",
    location: alert.query.location || "",
    locationType: alert.query.location_type || "",
    salaryMin: alert.query.salary_min?.toString() || "",
    employmentType: alert.query.employment_type?.[0] || "",
    frequency: alert.frequency,
  })
  const [errors, setErrors] = useState<{ name?: string; search?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Please enter a name for this alert"
    }
    if (!formData.search.trim()) {
      newErrors.search = "Please enter at least one keyword"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: formData.name,
        query: {
          search: formData.search || undefined,
          location: formData.location || undefined,
          location_type: formData.locationType as "remote" | "onsite" | "hybrid" | undefined,
          salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
          employment_type: formData.employmentType ? [formData.employmentType] : undefined,
        },
        frequency: formData.frequency,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update alert")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name" className={cn(errors.name && "text-destructive")}>
          Alert Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value })
            if (errors.name && e.target.value.trim()) setErrors({ ...errors, name: undefined })
          }}
          className={cn(errors.name && "border-destructive")}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-search" className={cn(errors.search && "text-destructive")}>
          Keywords <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-search"
          value={formData.search}
          onChange={(e) => {
            setFormData({ ...formData, search: e.target.value })
            if (errors.search && e.target.value.trim()) setErrors({ ...errors, search: undefined })
          }}
          className={cn(errors.search && "border-destructive")}
        />
        {errors.search && <p className="text-sm text-destructive">{errors.search}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-location">Location</Label>
        <Input
          id="edit-location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Work Type</Label>
          <Select value={formData.locationType} onValueChange={(v) => setFormData({ ...formData, locationType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Min Salary</Label>
          <Input
            type="number"
            value={formData.salaryMin}
            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Type</Label>
          <Select value={formData.employmentType} onValueChange={(v) => setFormData({ ...formData, employmentType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Alert Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(v) => setFormData({ ...formData, frequency: v as "daily" | "weekly" | "off" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="off">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}

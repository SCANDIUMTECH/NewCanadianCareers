"use client"

import React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

/**
 * Job Alerts Page
 * Manage saved searches and alert preferences
 */

const savedSearches = [
  {
    id: 1,
    name: "Frontend Remote $150k+",
    query: {
      keywords: "Frontend Engineer",
      location: "Remote",
      salaryMin: 150000,
      type: "Full-time",
    },
    frequency: "daily",
    enabled: true,
    matchCount: 12,
    lastSent: new Date("2026-02-01"),
    createdAt: new Date("2026-01-15"),
  },
  {
    id: 2,
    name: "Product Design San Francisco",
    query: {
      keywords: "Product Designer",
      location: "San Francisco, CA",
      salaryMin: null,
      type: "Full-time",
    },
    frequency: "weekly",
    enabled: true,
    matchCount: 8,
    lastSent: new Date("2026-01-28"),
    createdAt: new Date("2026-01-10"),
  },
  {
    id: 3,
    name: "Engineering Manager NYC",
    query: {
      keywords: "Engineering Manager",
      location: "New York, NY",
      salaryMin: 180000,
      type: "Full-time",
    },
    frequency: "daily",
    enabled: false,
    matchCount: 3,
    lastSent: new Date("2026-01-25"),
    createdAt: new Date("2026-01-05"),
  },
]

export default function AlertsPage() {
  const [searches, setSearches] = useState(savedSearches)
  const [createOpen, setCreateOpen] = useState(false)

  const toggleEnabled = (id: number) => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  const updateFrequency = (id: number, frequency: string) => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, frequency } : s))
    )
  }

  const deleteSearch = (id: number) => {
    setSearches((prev) => prev.filter((s) => s.id !== id))
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const enabledCount = searches.filter((s) => s.enabled).length
  const totalMatches = searches.reduce((acc, s) => acc + s.matchCount, 0)

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
              <CreateAlertForm onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{searches.length}</p>
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
          {searches.map((search) => (
            <AlertCard
              key={search.id}
              search={search}
              onToggle={() => toggleEnabled(search.id)}
              onFrequencyChange={(f) => updateFrequency(search.id, f)}
              onDelete={() => deleteSearch(search.id)}
              formatDate={formatDate}
            />
          ))}

          {searches.length === 0 && (
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
    </div>
  )
}

function AlertCard({
  search,
  onToggle,
  onFrequencyChange,
  onDelete,
  formatDate,
}: {
  search: typeof savedSearches[0]
  onToggle: () => void
  onFrequencyChange: (f: string) => void
  onDelete: () => void
  formatDate: (date: Date) => string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={cn("border transition-all duration-300", search.enabled ? "border-border/50" : "border-border/30 opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base font-medium text-foreground">{search.name}</h3>
              {search.matchCount > 0 && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {search.matchCount} new
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
              <span>{search.query.keywords}</span>
              <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>{search.query.location}</span>
              {search.query.salaryMin && (
                <>
                  <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
                  <span>${(search.query.salaryMin / 1000).toFixed(0)}k+</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-muted">
              <span>
                {search.frequency === "daily" ? "Daily" : "Weekly"} alerts
              </span>
              <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
              <span>Last sent {formatDate(search.lastSent)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={search.frequency} onValueChange={onFrequencyChange}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
            <Switch checked={search.enabled} onCheckedChange={onToggle} />
          </div>
        </div>

        {/* Expanded Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            View Matches
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
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

function CreateAlertForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    keywords: "",
    location: "",
    salaryMin: "",
    type: "any",
    frequency: "daily",
  })
  const [errors, setErrors] = useState<{ keywords?: string; location?: string }>({})
  const [touched, setTouched] = useState<{ keywords?: boolean; location?: boolean }>({})

  const validate = () => {
    const newErrors: { keywords?: string; location?: string } = {}
    if (!formData.keywords.trim()) {
      newErrors.keywords = "Please enter at least one keyword"
    }
    if (!formData.location.trim()) {
      newErrors.location = "Please enter a location"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      // Handle form submission
      onClose()
    }
  }

  const handleBlur = (field: "keywords" | "location") => {
    setTouched({ ...touched, [field]: true })
    // Validate on blur
    if (field === "keywords" && !formData.keywords.trim()) {
      setErrors(prev => ({ ...prev, keywords: "Please enter at least one keyword" }))
    } else if (field === "keywords") {
      setErrors(prev => ({ ...prev, keywords: undefined }))
    }
    if (field === "location" && !formData.location.trim()) {
      setErrors(prev => ({ ...prev, location: "Please enter a location" }))
    } else if (field === "location") {
      setErrors(prev => ({ ...prev, location: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="keywords" className={cn(errors.keywords && "text-destructive")}>
          Keywords <span className="text-destructive">*</span>
        </Label>
        <Input
          id="keywords"
          placeholder="e.g., Frontend Engineer, React Developer"
          value={formData.keywords}
          onChange={(e) => {
            setFormData({ ...formData, keywords: e.target.value })
            if (errors.keywords && e.target.value.trim()) {
              setErrors({ ...errors, keywords: undefined })
            }
          }}
          onBlur={() => handleBlur("keywords")}
          className={cn(errors.keywords && "border-destructive focus-visible:ring-destructive")}
          aria-invalid={!!errors.keywords}
        />
        {errors.keywords && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.keywords}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className={cn(errors.location && "text-destructive")}>
          Location <span className="text-destructive">*</span>
        </Label>
        <Input
          id="location"
          placeholder="e.g., Remote, New York, San Francisco"
          value={formData.location}
          onChange={(e) => {
            setFormData({ ...formData, location: e.target.value })
            if (errors.location && e.target.value.trim()) {
              setErrors({ ...errors, location: undefined })
            }
          }}
          onBlur={() => handleBlur("location")}
          className={cn(errors.location && "border-destructive focus-visible:ring-destructive")}
          aria-invalid={!!errors.location}
        />
        {errors.location && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.location}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salary">Minimum Salary</Label>
          <Input
            id="salary"
            placeholder="e.g., 150000"
            type="number"
            value={formData.salaryMin}
            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Job Type</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Alert Frequency</Label>
        <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-foreground-muted">
          You&apos;ll receive an email when new jobs match this search
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover">
          Create Alert
        </Button>
      </div>
    </form>
  )
}

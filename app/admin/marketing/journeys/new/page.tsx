"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createJourney } from "@/lib/api/admin-marketing"
import type { JourneyTriggerType } from "@/lib/api/admin-marketing"
import { ArrowLeft, GitBranchPlus } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function NewJourneyPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [triggerType, setTriggerType] = useState<JourneyTriggerType>("manual")
  const [maxEntriesPerUser, setMaxEntriesPerUser] = useState(1)
  const [cooldownHours, setCooldownHours] = useState(0)
  const [goalType, setGoalType] = useState("")
  const [segmentId, setSegmentId] = useState("")

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const triggerConfig: Record<string, unknown> = {}
      if (triggerType === "segment_entry" && segmentId) {
        triggerConfig.segment_id = parseInt(segmentId)
      }

      const journey = await createJourney({
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        max_entries_per_user: maxEntriesPerUser,
        cooldown_hours: cooldownHours,
        goal_type: goalType || undefined,
      })

      router.push(`/admin/marketing/journeys/${journey.id}`)
    } catch (err) {
      console.error("Failed to create journey:", err)
      setError("Failed to create journey. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
          <Link href="/admin/marketing/journeys">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-sm shadow-primary/20 flex-shrink-0">
          <GitBranchPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Journey</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Set up a new automation journey
          </p>
        </div>
      </motion.div>

      {/* Basic Info */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Name and describe your journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Welcome Sequence, Onboarding Flow"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this journey do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trigger */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trigger</CardTitle>
            <CardDescription>What starts this journey for a user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as JourneyTriggerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                  <SelectItem value="user_signup">User Signup</SelectItem>
                  <SelectItem value="package_purchase">Package Purchase</SelectItem>
                  <SelectItem value="job_published">Job Published</SelectItem>
                  <SelectItem value="segment_entry">Segment Entry</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {triggerType === "manual" && "Users are enrolled manually by an admin."}
                {triggerType === "user_signup" && "Users are enrolled automatically when they sign up."}
                {triggerType === "package_purchase" && "Users are enrolled when they purchase a package."}
                {triggerType === "job_published" && "Users are enrolled when they publish a job."}
                {triggerType === "segment_entry" && "Users are enrolled when they enter a specific segment."}
              </p>
            </div>

            {triggerType === "segment_entry" && (
              <div className="space-y-2">
                <Label htmlFor="segment_id">Segment ID</Label>
                <Input
                  id="segment_id"
                  type="number"
                  placeholder="Enter segment ID"
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Entry Limits */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entry Limits</CardTitle>
            <CardDescription>Control how users enter this journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_entries">Max Entries per User</Label>
                <Input
                  id="max_entries"
                  type="number"
                  min={1}
                  max={100}
                  value={maxEntriesPerUser}
                  onChange={(e) => setMaxEntriesPerUser(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (hours)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  min={0}
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">0 = no cooldown</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Goal (optional) */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal (Optional)</CardTitle>
            <CardDescription>Exit condition — users who meet the goal leave the journey early</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={goalType || "none"} onValueChange={(v) => setGoalType(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Goal</SelectItem>
                  <SelectItem value="package_purchase">Package Purchase</SelectItem>
                  <SelectItem value="job_published">Job Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submit */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" asChild>
            <Link href="/admin/marketing/journeys">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Journey"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

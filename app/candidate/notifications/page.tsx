"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { NotificationCenter, type Notification } from "@/components/notification-center"
import { MotionWrapper } from "@/components/motion-wrapper"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCandidate } from "@/hooks/use-candidate"
import {
  getCandidateNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/api/candidates"
import type { CandidateNotification } from "@/lib/candidate/types"

// Map backend notification types to component types
function mapNotificationType(
  type: CandidateNotification["notification_type"]
): Notification["type"] {
  switch (type) {
    case "application_status":
      return "application"
    case "message":
      return "message"
    case "job_alert":
      return "job"
    case "job_expired":
      return "alert"
    case "system":
    default:
      return "system"
  }
}

// Convert backend notification to component notification
function mapNotification(n: CandidateNotification): Notification {
  return {
    id: String(n.id),
    type: mapNotificationType(n.notification_type),
    title: n.title,
    description: n.message,
    timestamp: n.created_at,
    read: n.is_read,
    actionUrl: n.link || undefined,
    actionLabel: n.link ? "View details" : undefined,
    metadata: n.data,
  }
}

export default function CandidateNotificationsPage() {
  const { refreshNotifications } = useCandidate()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getCandidateNotifications({ page_size: 100 })
      setNotifications(response.results.map(mapNotification))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    try {
      await markNotificationAsRead(parseInt(id, 10))
      refreshNotifications()
    } catch (err) {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      )
    }
  }

  const handleMarkAllRead = async () => {
    // Optimistic update
    const oldNotifications = [...notifications]
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsAsRead()
      refreshNotifications()
    } catch (err) {
      setNotifications(oldNotifications)
      toast.error(err instanceof Error ? err.message : "Failed to mark all as read")
    }
  }

  const handleDelete = async (id: string) => {
    // Optimistic update
    const oldNotifications = [...notifications]
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotification(parseInt(id, 10))
      refreshNotifications()
    } catch (err) {
      setNotifications(oldNotifications)
      toast.error(err instanceof Error ? err.message : "Failed to delete notification")
    }
  }

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return
    // Optimistic update
    const oldNotifications = [...notifications]
    setNotifications([])
    try {
      await clearAllNotifications()
      refreshNotifications()
    } catch (err) {
      setNotifications(oldNotifications)
      toast.error(err instanceof Error ? err.message : "Failed to clear notifications")
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-background-secondary/50 rounded w-48" />
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-background-secondary/50 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchNotifications}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
      <MotionWrapper delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Stay updated on your applications, job matches, and messages
          </p>
        </div>
      </MotionWrapper>

      <MotionWrapper delay={100}>
        <div className="bg-card border border-border rounded-xl p-6">
          <NotificationCenter
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            userType="candidate"
          />
        </div>
      </MotionWrapper>
    </div>
  )
}

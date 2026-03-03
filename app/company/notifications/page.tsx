"use client"

import { useState, useEffect, useCallback } from "react"
import { NotificationCenter, Notification as NotificationUIType } from "@/components/notification-center"
import { MotionWrapper } from "@/components/motion-wrapper"
import { Button } from "@/components/ui/button"
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/api/notifications"
import type { Notification, NotificationType } from "@/lib/company/types"
import { useCompanyContext } from "@/hooks/use-company"

/**
 * Company Notifications Page
 * View and manage notifications
 * Integrated with backend API
 */

// Map backend notification types to UI notification types
const mapNotificationType = (type: NotificationType): NotificationUIType["type"] => {
  const typeMap: Record<NotificationType, NotificationUIType["type"]> = {
    application_received: "application",
    application_status: "application",
    job_expired: "alert",
    job_expiring: "alert",
    credits_low: "alert",
    credits_expiring: "alert",
    team_invite: "system",
    payment_success: "system",
    payment_failed: "alert",
    system: "system",
  }
  return typeMap[type] || "system"
}

// Map backend notification to UI notification
const mapNotificationToUI = (notification: Notification): NotificationUIType => ({
  id: String(notification.id),
  type: mapNotificationType(notification.type),
  title: notification.title,
  description: notification.message,
  timestamp: notification.created_at,
  read: notification.read,
  actionUrl: getActionUrl(notification),
  actionLabel: getActionLabel(notification),
})

// Get action URL based on notification type
const getActionUrl = (notification: Notification): string | undefined => {
  switch (notification.type) {
    case "application_received":
    case "application_status":
      return notification.data.application_id
        ? `/company/applications/${notification.data.application_id}`
        : "/company/jobs"
    case "job_expired":
    case "job_expiring":
      return notification.data.job_id
        ? `/company/jobs/${notification.data.job_id}`
        : "/company/jobs"
    case "credits_low":
    case "credits_expiring":
      return "/company/billing"
    case "payment_success":
    case "payment_failed":
      return "/company/billing"
    default:
      return undefined
  }
}

// Get action label based on notification type
const getActionLabel = (notification: Notification): string | undefined => {
  switch (notification.type) {
    case "application_received":
      return "Review application"
    case "job_expiring":
      return "Extend job"
    case "credits_low":
    case "credits_expiring":
      return "Buy credits"
    case "payment_failed":
      return "Update payment"
    default:
      return undefined
  }
}

export default function CompanyNotificationsPage() {
  const { refreshNotifications } = useCompanyContext()
  const [notifications, setNotifications] = useState<NotificationUIType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true)
    setError(null)
    try {
      const response = await getNotifications({ page: pageNum, page_size: 20 })
      const mappedNotifications = response.results.map(mapNotificationToUI)

      if (append) {
        setNotifications(prev => [...prev, ...mappedNotifications])
      } else {
        setNotifications(mappedNotifications)
      }

      setHasMore(!!response.next)
      setPage(pageNum)
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
    try {
      await markAsRead(parseInt(id))
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      refreshNotifications()
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      refreshNotifications()
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(parseInt(id))
      setNotifications(prev => prev.filter(n => n.id !== id))
      refreshNotifications()
    } catch (err) {
      console.error("Failed to delete notification:", err)
    }
  }

  const handleClearAll = async () => {
    // Delete all notifications one by one
    try {
      await Promise.all(notifications.map(n => deleteNotification(parseInt(n.id))))
      setNotifications([])
      refreshNotifications()
    } catch (err) {
      console.error("Failed to clear all notifications:", err)
    }
  }

  const handleLoadMore = () => {
    if (hasMore) {
      fetchNotifications(page + 1, true)
    }
  }

  // Loading skeleton
  if (isLoading && notifications.length === 0) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
          <div className="h-4 w-64 bg-background-secondary rounded animate-pulse mt-2" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-background-secondary rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load notifications</h2>
          <p className="text-foreground-muted mb-6">{error}</p>
          <Button onClick={() => fetchNotifications()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8">
      <MotionWrapper delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Stay updated on applications, messages, and important alerts
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
            userType="company"
          />

          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={handleLoadMore} className="bg-transparent">
                Load More
              </Button>
            </div>
          )}
        </div>
      </MotionWrapper>
    </div>
  )
}

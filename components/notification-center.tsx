"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Settings,
  Briefcase,
  MessageSquare,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

export interface Notification {
  id: string
  type: "application" | "message" | "system" | "job" | "alert"
  title: string
  description: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}

export interface NotificationPreferences {
  email_applications: boolean
  email_messages: boolean
  email_weekly_digest: boolean
  push_desktop: boolean
  push_sound: boolean
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
  onDelete?: (id: string) => void
  onClearAll?: () => void
  userType: "company" | "candidate" | "agency"
  preferences?: NotificationPreferences
  onPreferencesChange?: (prefs: Partial<NotificationPreferences>) => Promise<void>
}

const typeIcons = {
  application: Briefcase,
  message: MessageSquare,
  system: Bell,
  job: Briefcase,
  alert: AlertCircle,
}

const typeColors = {
  application: "bg-blue-500/10 text-blue-600",
  message: "bg-emerald-500/10 text-emerald-600",
  system: "bg-primary/10 text-primary",
  job: "bg-amber-500/10 text-amber-600",
  alert: "bg-red-500/10 text-red-600",
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  userType,
  preferences,
  onPreferencesChange,
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState("all")
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_applications: true,
    email_messages: true,
    email_weekly_digest: false,
    push_desktop: true,
    push_sound: false,
  })

  // Sync local state with server preferences
  useEffect(() => {
    if (preferences) {
      setPrefs(preferences)
    }
  }, [preferences])

  const handlePrefChange = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    const prev = prefs
    setPrefs(p => ({ ...p, [key]: value }))
    try {
      await onPreferencesChange?.({ [key]: value })
    } catch {
      setPrefs(prev)
      toast.error("Failed to save preference")
    }
  }, [prefs, onPreferencesChange])

  const unreadCount = notifications.filter(n => !n.read).length

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !n.read
    return n.type === activeTab
  })

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  if (showSettings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
            Back
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Email Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Applications</Label>
                  <p className="text-sm text-muted-foreground">Get notified when candidates apply</p>
                </div>
                <Switch checked={prefs.email_applications} onCheckedChange={(v) => handlePrefChange('email_applications', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Messages</Label>
                  <p className="text-sm text-muted-foreground">Get notified for new messages</p>
                </div>
                <Switch checked={prefs.email_messages} onCheckedChange={(v) => handlePrefChange('email_messages', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">Weekly summary of activity</p>
                </div>
                <Switch checked={prefs.email_weekly_digest} onCheckedChange={(v) => handlePrefChange('email_weekly_digest', v)} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4">Push Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show browser notifications</p>
                </div>
                <Switch checked={prefs.push_desktop} onCheckedChange={(v) => handlePrefChange('push_desktop', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sound</Label>
                  <p className="text-sm text-muted-foreground">Play sound for new notifications</p>
                </div>
                <Switch checked={prefs.push_sound} onCheckedChange={(v) => handlePrefChange('push_sound', v)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="application">Applications</TabsTrigger>
          <TabsTrigger value="message">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-1">No notifications</h4>
              <p className="text-sm text-muted-foreground">
                {activeTab === "unread"
                  ? "You're all caught up!"
                  : "You don't have any notifications yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map(notification => {
                const Icon = typeIcons[notification.type]
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors cursor-pointer group",
                      notification.read
                        ? "bg-card border-border hover:border-border"
                        : "bg-primary/5 border-primary/20 hover:border-primary/30"
                    )}
                    onClick={() => onMarkRead?.(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        typeColors[notification.type]
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn(
                              "font-medium",
                              !notification.read && "text-foreground"
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                        {notification.actionUrl && (
                          <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary hover:text-primary-hover">
                            <Link href={notification.actionUrl}>
                              {notification.actionLabel || "View details"}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete?.(notification.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Clear All */}
      {filteredNotifications.length > 0 && (
        <div className="pt-4 border-t border-border">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear all notifications
          </Button>
        </div>
      )}
    </div>
  )
}

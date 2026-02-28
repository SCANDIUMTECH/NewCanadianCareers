"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { APPLICATION_STATUS_STYLES } from "@/lib/constants/status-styles"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MotionWrapper } from "@/components/motion-wrapper"
import { Input } from "@/components/ui/input"
import {
  getMyApplications,
  getApplication,
  withdrawApplication,
  getApplicationMessages,
  sendApplicationMessage,
  markMessagesAsRead,
} from "@/lib/api/candidates"
import type {
  CandidateApplicationListItem,
  CandidateApplication,
  CandidateApplicationMessage,
} from "@/lib/candidate/types"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <ApplicationsContent />
    </Suspense>
  )
}

function ApplicationsContent() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get("id")

  const [applications, setApplications] = useState<CandidateApplicationListItem[]>([])
  const [selectedApp, setSelectedApp] = useState<CandidateApplication | null>(null)
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState(false)
  const [messages, setMessages] = useState<CandidateApplicationMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  const fetchApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getMyApplications({ page, page_size: pageSize })
      setApplications(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }, [page])

  const fetchApplicationDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true)
    try {
      const detail = await getApplication(id)
      setSelectedApp(detail)
    } catch (err) {
      console.error("Failed to load application detail:", err)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Load detail from URL param or first application
  useEffect(() => {
    if (applications.length > 0) {
      const targetId = selectedId ? parseInt(selectedId, 10) : applications[0].id
      fetchApplicationDetail(targetId)
    }
  }, [applications, selectedId, fetchApplicationDetail])

  const handleWithdraw = async () => {
    if (!selectedApp) return
    if (!confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) {
      return
    }

    setIsWithdrawing(true)
    try {
      await withdrawApplication(selectedApp.id)
      await fetchApplications()
      await fetchApplicationDetail(selectedApp.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to withdraw application")
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleOpenMessages = async () => {
    if (!selectedApp) return
    setShowMessages(true)
    setIsLoadingMessages(true)
    try {
      const msgs = await getApplicationMessages(selectedApp.id)
      setMessages(msgs)
      if (selectedApp.has_unread_messages) {
        await markMessagesAsRead(selectedApp.id)
        // Update the list to clear unread indicator
        setApplications((prev) =>
          prev.map((a) => a.id === selectedApp.id ? { ...a, has_unread_messages: false } : a)
        )
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedApp || !newMessage.trim()) return
    setIsSending(true)
    try {
      const msg = await sendApplicationMessage(selectedApp.id, newMessage.trim())
      setMessages((prev) => [...prev, msg])
      setNewMessage("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true
    if (filter === "active") return !["rejected", "offered", "hired", "withdrawn"].includes(app.status)
    return app.status === filter
  })

  const activeCount = applications.filter(
    (a) => !["rejected", "offered", "hired", "withdrawn"].includes(a.status)
  ).length
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length
  const offeredCount = applications.filter((a) => a.status === "offered" || a.status === "hired").length

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-background-secondary/50 rounded-lg w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-background-secondary/50 rounded-xl" />
            ))}
          </div>
          <div className="h-10 bg-background-secondary/50 rounded-lg w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-background-secondary/50 rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-background-secondary/50 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchApplications}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Applications</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Track your job applications
          </p>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatPill label="Total" value={applications.length} />
          <StatPill label="Active" value={activeCount} color="blue" />
          <StatPill label="Interviewing" value={interviewingCount} color="purple" />
          <StatPill label="Offers" value={offeredCount} color="green" />
        </div>
      </MotionWrapper>

      {/* Tabs */}
      <MotionWrapper delay={150}>
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-background-secondary/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="interviewing">Interviewing</TabsTrigger>
            <TabsTrigger value="offered">Offers</TabsTrigger>
            <TabsTrigger value="rejected">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </MotionWrapper>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <MotionWrapper delay={200} className="lg:col-span-2">
          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                isSelected={selectedApp?.id === app.id}
                onClick={() => fetchApplicationDetail(app.id)}
              />
            ))}

            {filteredApplications.length === 0 && (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <p className="text-foreground-muted mb-4">No applications found</p>
                  <Link href="/jobs">
                    <Button variant="outline">Browse Jobs</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-foreground-muted">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </MotionWrapper>

        {/* Detail Panel */}
        <MotionWrapper delay={300}>
          {isLoadingDetail ? (
            <Card className="border-border/50 sticky top-28">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-background-secondary/50 rounded w-24" />
                  <div className="h-8 bg-background-secondary/50 rounded" />
                  <div className="h-4 bg-background-secondary/50 rounded w-32" />
                  <div className="space-y-3 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-background-secondary/50 rounded" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedApp ? (
            <Card className="border-border/50 sticky top-28">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge
                      variant="outline"
                      className={cn("mb-2", APPLICATION_STATUS_STYLES[selectedApp.status]?.className)}
                    >
                      {APPLICATION_STATUS_STYLES[selectedApp.status]?.label ?? selectedApp.status}
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">{selectedApp.job.title}</h2>
                    <p className="text-sm text-foreground-muted">{selectedApp.job.company_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-foreground-muted mb-6">
                  <span>{selectedApp.job.location}</span>
                  {selectedApp.job.salary_display && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
                      <span>{selectedApp.job.salary_display}</span>
                    </>
                  )}
                </div>

                {/* Timeline */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-4">Application Timeline</h3>
                  <div className="relative">
                    {selectedApp.timeline.length > 0 ? (
                      selectedApp.timeline.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-3 pb-4 last:pb-0">
                          {/* Line */}
                          {index < selectedApp.timeline.length - 1 && (
                            <div
                              className="absolute left-[9px] w-0.5 bg-primary/30"
                              style={{ top: `${index * 48 + 20}px`, height: "48px" }}
                            />
                          )}
                          {/* Dot */}
                          <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 bg-primary border-primary flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          {/* Content */}
                          <div className="flex-1 pt-0.5">
                            <p className="text-sm text-foreground">{item.event}</p>
                            <p className="text-xs text-foreground-muted mt-0.5">
                              {formatDate(item.created_at)}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-foreground-muted/80 mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-foreground-muted">No timeline events yet</p>
                    )}
                  </div>
                </div>

                {/* Messages Panel */}
                {showMessages && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground">Messages</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowMessages(false)}>
                        Close
                      </Button>
                    </div>
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {isLoadingMessages ? (
                        <div className="p-4 text-center text-sm text-foreground-muted">Loading...</div>
                      ) : messages.length === 0 ? (
                        <div className="p-4 text-center text-sm text-foreground-muted">
                          No messages yet. Start the conversation below.
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn("p-3", msg.sender === "candidate" ? "bg-primary/5" : "")}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-foreground">
                                {msg.sender === "candidate" ? "You" : selectedApp.job.company_name}
                              </span>
                              <span className="text-xs text-foreground-muted">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="text-sm text-foreground-muted">{msg.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={isSending || !newMessage.trim()}
                      >
                        {isSending ? "..." : "Send"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Link href={`/jobs/${selectedApp.job.job_id}`}>
                    <Button variant="outline" className="w-full bg-transparent">
                      View Job Posting
                    </Button>
                  </Link>
                  {!showMessages && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={handleOpenMessages}
                    >
                      Messages
                      {selectedApp.has_unread_messages && (
                        <span className="w-2 h-2 rounded-full bg-primary ml-2" />
                      )}
                    </Button>
                  )}
                  {!["rejected", "withdrawn", "hired"].includes(selectedApp.status) && (
                    <Button
                      variant="ghost"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleWithdraw}
                      disabled={isWithdrawing}
                    >
                      {isWithdrawing ? "Withdrawing..." : "Withdraw Application"}
                    </Button>
                  )}
                </div>

                {/* Applied date */}
                <p className="text-xs text-foreground-muted text-center mt-4">
                  Applied on {formatDate(selectedApp.created_at)}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-foreground-muted">Select an application to view details</p>
              </CardContent>
            </Card>
          )}
        </MotionWrapper>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  color = "default",
}: {
  label: string
  value: number
  color?: "default" | "blue" | "purple" | "green"
}) {
  const colors = {
    default: "bg-foreground/5",
    blue: "bg-blue-500/5",
    purple: "bg-purple-500/5",
    green: "bg-emerald-500/5",
  }

  return (
    <div className={cn("rounded-xl px-4 py-3", colors[color])}>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-foreground-muted">{label}</p>
    </div>
  )
}

function ApplicationCard({
  application,
  isSelected,
  onClick,
}: {
  application: CandidateApplicationListItem
  isSelected: boolean
  onClick: () => void
}) {
  const style = APPLICATION_STATUS_STYLES[application.status]
  const status = style
    ? { label: style.label, color: style.className }
    : { label: application.status, color: "" }

  return (
    <Card
      className={cn(
        "overflow-hidden border cursor-pointer transition-all duration-300",
        isSelected
          ? "border-primary/50 bg-primary/5 shadow-md"
          : "border-border/50 hover:border-border hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center overflow-hidden">
              {application.job.company_logo ? (
                <img
                  src={application.job.company_logo}
                  alt={application.job.company_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-foreground-muted">
                  {application.job.company_name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{application.job.title}</h3>
              <p className="text-sm text-foreground-muted">{application.job.company_name}</p>
              <p className="text-xs text-foreground-muted/60 mt-1">
                Applied {formatDate(application.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("flex-shrink-0", status.color)}>
              {status.label}
            </Badge>
            {application.has_unread_messages && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

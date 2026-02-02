"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MotionWrapper } from "@/components/motion-wrapper"

/**
 * Applications Page
 * Track application status for direct apply jobs
 */

const applications = [
  {
    id: 1,
    title: "Engineering Manager",
    company: "TechFlow",
    location: "Austin, TX",
    salary: "$180,000 - $220,000",
    status: "reviewing",
    appliedAt: new Date("2026-01-28"),
    timeline: [
      { event: "Application submitted", date: new Date("2026-01-28"), completed: true },
      { event: "Application viewed", date: new Date("2026-01-29"), completed: true },
      { event: "Under review", date: new Date("2026-01-30"), completed: true },
      { event: "Interview scheduled", date: null, completed: false },
      { event: "Decision", date: null, completed: false },
    ],
  },
  {
    id: 2,
    title: "Staff Engineer",
    company: "BuildCo",
    location: "Remote",
    salary: "$170,000 - $200,000",
    status: "submitted",
    appliedAt: new Date("2026-01-25"),
    timeline: [
      { event: "Application submitted", date: new Date("2026-01-25"), completed: true },
      { event: "Application viewed", date: null, completed: false },
      { event: "Under review", date: null, completed: false },
      { event: "Interview scheduled", date: null, completed: false },
      { event: "Decision", date: null, completed: false },
    ],
  },
  {
    id: 3,
    title: "Lead Developer",
    company: "DataSync",
    location: "New York, NY",
    salary: "$160,000 - $190,000",
    status: "interviewing",
    appliedAt: new Date("2026-01-20"),
    timeline: [
      { event: "Application submitted", date: new Date("2026-01-20"), completed: true },
      { event: "Application viewed", date: new Date("2026-01-21"), completed: true },
      { event: "Under review", date: new Date("2026-01-22"), completed: true },
      { event: "Interview scheduled", date: new Date("2026-01-27"), completed: true },
      { event: "Decision", date: null, completed: false },
    ],
  },
  {
    id: 4,
    title: "Frontend Developer",
    company: "StartupXYZ",
    location: "San Francisco, CA",
    salary: "$140,000 - $170,000",
    status: "rejected",
    appliedAt: new Date("2026-01-15"),
    timeline: [
      { event: "Application submitted", date: new Date("2026-01-15"), completed: true },
      { event: "Application viewed", date: new Date("2026-01-16"), completed: true },
      { event: "Under review", date: new Date("2026-01-17"), completed: true },
      { event: "Not selected", date: new Date("2026-01-22"), completed: true },
    ],
  },
  {
    id: 5,
    title: "Senior Backend Engineer",
    company: "CloudNative",
    location: "Remote",
    salary: "$150,000 - $180,000",
    status: "offered",
    appliedAt: new Date("2026-01-10"),
    timeline: [
      { event: "Application submitted", date: new Date("2026-01-10"), completed: true },
      { event: "Application viewed", date: new Date("2026-01-11"), completed: true },
      { event: "Under review", date: new Date("2026-01-12"), completed: true },
      { event: "Interview completed", date: new Date("2026-01-18"), completed: true },
      { event: "Offer received", date: new Date("2026-01-25"), completed: true },
    ],
  },
]

const statusConfig = {
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: "clock" },
  reviewing: { label: "In Review", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: "eye" },
  interviewing: { label: "Interviewing", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: "calendar" },
  rejected: { label: "Not Selected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: "x" },
  offered: { label: "Offer", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "check" },
}

export default function ApplicationsPage() {
  const [selectedApp, setSelectedApp] = useState<typeof applications[0] | null>(applications[0])
  const [filter, setFilter] = useState("all")

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true
    if (filter === "active") return !["rejected", "offered"].includes(app.status)
    return app.status === filter
  })

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const activeCount = applications.filter((a) => !["rejected", "offered"].includes(a.status)).length
  const offeredCount = applications.filter((a) => a.status === "offered").length

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
          <StatPill label="Interviewing" value={applications.filter((a) => a.status === "interviewing").length} color="purple" />
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
                onClick={() => setSelectedApp(app)}
                formatDate={formatDate}
              />
            ))}

            {filteredApplications.length === 0 && (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <p className="text-foreground-muted">No applications found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </MotionWrapper>

        {/* Detail Panel */}
        <MotionWrapper delay={300}>
          {selectedApp ? (
            <Card className="border-border/50 sticky top-28">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="outline" className={cn("mb-2", statusConfig[selectedApp.status as keyof typeof statusConfig].color)}>
                      {statusConfig[selectedApp.status as keyof typeof statusConfig].label}
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">{selectedApp.title}</h2>
                    <p className="text-sm text-foreground-muted">{selectedApp.company}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-foreground-muted mb-6">
                  <span>{selectedApp.location}</span>
                  <span className="w-1 h-1 rounded-full bg-foreground-muted/40" />
                  <span>{selectedApp.salary}</span>
                </div>

                {/* Timeline */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-4">Application Timeline</h3>
                  <div className="relative">
                    {selectedApp.timeline.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 pb-4 last:pb-0">
                        {/* Line */}
                        {index < selectedApp.timeline.length - 1 && (
                          <div
                            className={cn(
                              "absolute left-[9px] w-0.5 h-full -z-10",
                              item.completed ? "bg-primary/30" : "bg-border"
                            )}
                            style={{ top: `${index * 48 + 20}px`, height: "48px" }}
                          />
                        )}
                        {/* Dot */}
                        <div
                          className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            item.completed
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          )}
                        >
                          {item.completed && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                          <p className={cn("text-sm", item.completed ? "text-foreground" : "text-foreground-muted")}>
                            {item.event}
                          </p>
                          {item.date && (
                            <p className="text-xs text-foreground-muted mt-0.5">
                              {formatDate(item.date)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Link href={`/jobs/${selectedApp.id}`}>
                    <Button variant="outline" className="w-full bg-transparent">View Job Posting</Button>
                  </Link>
                  {selectedApp.status === "offered" && (
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">
                      Respond to Offer
                    </Button>
                  )}
                  {selectedApp.status === "interviewing" && (
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">
                      View Interview Details
                    </Button>
                  )}
                </div>

                {/* Applied date */}
                <p className="text-xs text-foreground-muted text-center mt-4">
                  Applied on {formatDate(selectedApp.appliedAt)}
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
  formatDate,
}: {
  application: typeof applications[0]
  isSelected: boolean
  onClick: () => void
  formatDate: (date: Date) => string
}) {
  const status = statusConfig[application.status as keyof typeof statusConfig]

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
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
              <span className="text-sm font-semibold text-foreground-muted">
                {application.company.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{application.title}</h3>
              <p className="text-sm text-foreground-muted">{application.company}</p>
              <p className="text-xs text-foreground-muted/60 mt-1">
                Applied {formatDate(application.appliedAt)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("flex-shrink-0", status.color)}>
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

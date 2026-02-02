"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MotionWrapper } from "@/components/motion-wrapper"

/**
 * Candidate Dashboard
 * Overview of saved jobs, applications, alerts, and recent activity
 * Premium UI with Orion design language
 */

// Mock data
const savedJobs = [
  { id: 1, title: "Senior Frontend Engineer", company: "Acme Corp", logo: null, location: "Remote", salary: "$140k - $180k", saved: "2 days ago", type: "Full-time" },
  { id: 2, title: "Product Designer", company: "Stellar Inc", logo: null, location: "San Francisco, CA", salary: "$120k - $160k", saved: "3 days ago", type: "Full-time" },
  { id: 3, title: "Full Stack Developer", company: "Nova Labs", logo: null, location: "New York, NY", salary: "$130k - $170k", saved: "5 days ago", type: "Full-time" },
]

const applications = [
  { id: 1, title: "Engineering Manager", company: "TechFlow", status: "reviewing", appliedAt: "Jan 28, 2026" },
  { id: 2, title: "Staff Engineer", company: "BuildCo", status: "submitted", appliedAt: "Jan 25, 2026" },
  { id: 3, title: "Lead Developer", company: "DataSync", status: "interviewing", appliedAt: "Jan 20, 2026" },
]

const recentlyViewed = [
  { id: 1, title: "Backend Engineer", company: "CloudFirst", location: "Remote", viewedAt: "1 hour ago" },
  { id: 2, title: "DevOps Engineer", company: "InfraTeam", location: "Austin, TX", viewedAt: "3 hours ago" },
  { id: 3, title: "Software Architect", company: "Enterprise Co", location: "Chicago, IL", viewedAt: "Yesterday" },
]

const savedSearches = [
  { id: 1, query: "Frontend Remote $150k+", matches: 12, alertFrequency: "daily" },
  { id: 2, query: "Product Design San Francisco", matches: 8, alertFrequency: "weekly" },
]

export default function CandidateDashboard() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Welcome Header */}
      <MotionWrapper delay={0}>
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
            <span>Good morning</span>
            <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, John
          </h1>
        </div>
      </MotionWrapper>

      {/* Quick Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Saved Jobs"
            value={savedJobs.length}
            href="/candidate/saved"
            trend="+2 this week"
            color="primary"
          />
          <StatCard
            label="Applications"
            value={applications.length}
            href="/candidate/applications"
            trend="1 in review"
            color="blue"
          />
          <StatCard
            label="Job Alerts"
            value={savedSearches.length}
            href="/candidate/alerts"
            trend="12 new matches"
            color="green"
          />
          <StatCard
            label="Profile Score"
            value="85%"
            href="/candidate/profile"
            trend="Add resume"
            color="amber"
          />
        </div>
      </MotionWrapper>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Saved Jobs */}
          <MotionWrapper delay={200}>
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Saved Jobs</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Jobs you&apos;ve bookmarked</p>
                </div>
                <Link href="/candidate/saved">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {savedJobs.map((job, index) => (
                    <JobCard key={job.id} job={job} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Applications */}
          <MotionWrapper delay={300}>
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Your Applications</CardTitle>
                  <p className="text-sm text-foreground-muted mt-1">Track your application status</p>
                </div>
                <Link href="/candidate/applications">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {applications.map((app, index) => (
                    <ApplicationCard key={app.id} application={app} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <MotionWrapper delay={250}>
            <ProfileCompletionCard />
          </MotionWrapper>

          {/* Saved Searches */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Job Alerts</CardTitle>
                  <Link href="/candidate/alerts">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover h-8 px-2">
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50 hover:bg-background-secondary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{search.query}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {search.matches} new matches · {search.alertFrequency}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {search.matches}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  + Create new alert
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Recently Viewed */}
          <MotionWrapper delay={450}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Recently Viewed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentlyViewed.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block p-3 rounded-lg hover:bg-background-secondary/50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {job.company} · {job.location}
                    </p>
                    <p className="text-xs text-foreground-muted/60 mt-1">{job.viewedAt}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  href,
  trend,
  color,
}: {
  label: string
  value: string | number
  href: string
  trend: string
  color: "primary" | "blue" | "green" | "amber"
}) {
  const colorStyles = {
    primary: "bg-primary/5 text-primary border-primary/10",
    blue: "bg-blue-500/5 text-blue-600 border-blue-500/10",
    green: "bg-emerald-500/5 text-emerald-600 border-emerald-500/10",
    amber: "bg-amber-500/5 text-amber-600 border-amber-500/10",
  }

  return (
    <Link href={href}>
      <Card className={cn("border hover:shadow-md transition-all duration-300 cursor-pointer group", colorStyles[color])}>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1 group-hover:translate-x-0.5 transition-transform">{value}</p>
          <p className="text-xs text-foreground-muted/80 mt-1">{trend}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// Job Card Component
function JobCard({ job, index }: { job: typeof savedJobs[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="flex items-start gap-4 p-4 hover:bg-background-secondary/30 transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Company Logo */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center">
        <span className="text-lg font-semibold text-foreground-muted">
          {job.company.charAt(0)}
        </span>
      </div>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <p className="text-sm text-foreground-muted">{job.company}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 transition-all duration-300",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
            )}
          >
            Apply
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {job.location}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {job.salary}
          </Badge>
          <span className="text-xs text-foreground-muted/60">Saved {job.saved}</span>
        </div>
      </div>
    </div>
  )
}

// Application Card Component
function ApplicationCard({ application, index }: { application: typeof applications[0]; index: number }) {
  const statusStyles = {
    submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    reviewing: { label: "In Review", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    interviewing: { label: "Interviewing", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    rejected: { label: "Not Selected", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    offered: { label: "Offer", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  }

  const status = statusStyles[application.status as keyof typeof statusStyles]

  return (
    <div className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground-muted">
            {application.company.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {application.title}
          </h3>
          <p className="text-sm text-foreground-muted">{application.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-foreground-muted hidden sm:inline">{application.appliedAt}</span>
        <Badge variant="outline" className={cn("text-xs", status.color)}>
          {status.label}
        </Badge>
      </div>
    </div>
  )
}

// Profile Completion Card
function ProfileCompletionCard() {
  const completionItems = [
    { label: "Basic info", completed: true },
    { label: "Resume uploaded", completed: true },
    { label: "Preferred locations", completed: true },
    { label: "Job preferences", completed: false },
    { label: "Skills added", completed: false },
  ]

  const completedCount = completionItems.filter((i) => i.completed).length
  const progress = (completedCount / completionItems.length) * 100

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      {/* Gradient header */}
      <div
        className="h-2"
        style={{
          background: "linear-gradient(90deg, #3B5BDB 0%, #5C7CFA 100%)",
          width: `${progress}%`,
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Profile Strength</CardTitle>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2 mb-4" />
        <div className="space-y-2">
          {completionItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.completed ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border" />
              )}
              <span className={cn("text-sm", item.completed ? "text-foreground-muted" : "text-foreground")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <Link href="/candidate/profile">
          <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
            Complete Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

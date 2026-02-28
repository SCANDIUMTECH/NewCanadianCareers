"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  Search,
  Briefcase,
  Users,
  Building,
  Bell,
  Bookmark,
  FileText,
  BarChart3,
  Inbox,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type EmptyStateIcon =
  | "search"
  | "briefcase"
  | "users"
  | "building"
  | "bell"
  | "bookmark"
  | "document"
  | "chart"
  | "inbox"
  | "folder"

const icons: Record<EmptyStateIcon, ReactNode> = {
  search: <Search className="w-10 h-10" strokeWidth={1.5} />,
  briefcase: <Briefcase className="w-10 h-10" strokeWidth={1.5} />,
  users: <Users className="w-10 h-10" strokeWidth={1.5} />,
  building: <Building className="w-10 h-10" strokeWidth={1.5} />,
  bell: <Bell className="w-10 h-10" strokeWidth={1.5} />,
  bookmark: <Bookmark className="w-10 h-10" strokeWidth={1.5} />,
  document: <FileText className="w-10 h-10" strokeWidth={1.5} />,
  chart: <BarChart3 className="w-10 h-10" strokeWidth={1.5} />,
  inbox: <Inbox className="w-10 h-10" strokeWidth={1.5} />,
  folder: <FolderOpen className="w-10 h-10" strokeWidth={1.5} />,
}

interface EmptyStateProps {
  icon?: EmptyStateIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
}

export function EmptyState({
  icon = "search",
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-20 h-20 rounded-full bg-foreground/5 flex items-center justify-center mb-6 text-foreground-muted">
        {icons[icon]}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-foreground-muted max-w-sm mb-6">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          action.href ? (
            <Link href={action.href}>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={action.onClick}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {action.label}
            </Button>
          )
        )}
        {secondaryAction && (
          secondaryAction.href ? (
            <Link href={secondaryAction.href}>
              <Button variant="outline" className="bg-transparent">
                {secondaryAction.label}
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="bg-transparent"
            >
              {secondaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

interface LegacyEmptyStateProps {
  onReset?: () => void
  hasFilters?: boolean
}

export function JobsEmptyState({ onReset, hasFilters }: LegacyEmptyStateProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon="search"
        title="No jobs match your filters"
        description="Try adjusting your filters or search terms to find more opportunities."
        secondaryAction={onReset ? { label: "Clear all filters", onClick: onReset } : undefined}
      />
    )
  }

  return (
    <EmptyState
      icon="briefcase"
      title="No jobs yet"
      description="New opportunities are added daily. Set up a job alert to be notified when jobs matching your interests are posted."
      action={{ label: "Create Job Alert", href: "/candidate/alerts" }}
      secondaryAction={{ label: "Browse Companies", href: "/companies" }}
    />
  )
}

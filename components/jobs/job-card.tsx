"use client"

import { useState, useEffect, useMemo, type MouseEvent } from "react"
import Link from "next/link"
import { BadgeCheck, Bookmark, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CompanyAvatar } from "@/components/company-avatar"

export interface JobCardProps {
  id: string
  title: string
  company: {
    name: string
    logo?: string
    verified?: boolean
  }
  location: {
    city: string
    state?: string
    country: string
    remote: "onsite" | "hybrid" | "remote"
  }
  type: string
  salary?: {
    min: number
    max: number
    currency: string
    period?: string
  }
  skills: string[]
  postedDate: string
  featured?: boolean
  onSave?: (id: string) => void | Promise<void>
  isSaved?: boolean
}

export function JobCard({
  id,
  title,
  company,
  location,
  type,
  salary,
  skills,
  postedDate,
  featured,
  onSave,
  isSaved = false,
}: JobCardProps) {
  const [saved, setSaved] = useState(isSaved)

  // Sync saved state when isSaved prop changes (e.g. after async load)
  useEffect(() => {
    setSaved(isSaved)
  }, [isSaved])

  const formattedSalary = useMemo(() => {
    if (!salary) return null
    const locale = salary.currency === "CAD" ? "en-CA" : "en-US"
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`
  }, [salary])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const handleSave = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const prev = saved
    setSaved(!prev)
    try {
      await onSave?.(id)
    } catch {
      setSaved(prev)
    }
  }

  return (
    <Link href={`/jobs/${id}`}>
      <div
        className={cn(
          "relative p-5 rounded-2xl border transition-all duration-300 group",
          "hover:shadow-lg hover:shadow-black/5 hover:border-primary/30",
          featured
            ? "bg-gradient-to-br from-primary/5 to-transparent border-primary/30"
            : "bg-card border-border/50"
        )}
      >
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Featured
            </Badge>
          </div>
        )}

        {/* Company Info */}
        <div className="flex items-start gap-4">
          <CompanyAvatar name={company.name} logo={company.logo} size="sm" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">{company.name}</span>
              {company.verified && (
                <BadgeCheck className="w-4 h-4 text-primary" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mt-1 truncate">
              {title}
            </h3>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            aria-label={saved ? "Unsave job" : "Save job"}
            className={cn(
              "p-2 rounded-lg transition-colors shrink-0",
              saved
                ? "text-primary"
                : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <Bookmark className="w-5 h-5" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-foreground/5 text-foreground-muted">
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            {location.remote === "remote"
              ? "Remote"
              : `${location.city}${location.state ? `, ${location.state}` : ""}`}
            {location.remote === "hybrid" && " · Hybrid"}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/5 text-foreground-muted">
            {type}
          </Badge>
        </div>

        {/* Salary */}
        {salary && (
          <p className="text-base font-semibold text-foreground mt-3">
            {formattedSalary}
            <span className="text-sm font-normal text-foreground-muted ml-1">/ {salary?.period || "year"}</span>
          </p>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded font-medium"
            >
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-foreground-muted">
              +{skills.length - 4} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <span className="text-xs text-foreground-muted">
            {formatDate(postedDate)}
          </span>
          <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  )
}

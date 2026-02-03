"use client"

import React, { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  }
  skills: string[]
  postedDate: string
  featured?: boolean
  onSave?: (id: string) => void
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

  const formatSalary = () => {
    if (!salary) return null
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`
  }

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

  const getRemoteLabel = () => {
    switch (location.remote) {
      case "hybrid":
        return "Hybrid"
      case "remote":
        return "Remote"
      default:
        return null
    }
  }

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSaved(!saved)
    onSave?.(id)
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
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <span className="text-lg font-bold text-primary">
                {company.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">{company.name}</span>
              {company.verified && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mt-1 truncate">
              {title}
            </h3>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={cn(
              "p-2 rounded-lg transition-colors shrink-0",
              saved
                ? "text-primary"
                : "text-foreground-muted hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <svg
              className="w-5 h-5"
              fill={saved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-foreground/5 text-foreground-muted">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location.remote === "remote"
              ? "Remote"
              : `${location.city}${location.state ? `, ${location.state}` : ""}`}
            {getRemoteLabel() && location.remote !== "remote" && ` · ${getRemoteLabel()}`}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/5 text-foreground-muted">
            {type}
          </Badge>
        </div>

        {/* Salary */}
        {salary && (
          <p className="text-base font-semibold text-foreground mt-3">
            {formatSalary()}
            <span className="text-sm font-normal text-foreground-muted ml-1">/ year</span>
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

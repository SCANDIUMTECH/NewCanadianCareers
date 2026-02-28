"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { cn, sanitizeHtml } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  type QuickJobDraft,
  type QuickJobCompany,
  currencies,
  wagePeriods,
  remoteOptions,
  jobTypes,
} from "@/lib/quick-job-schema"
import {
  MapPin,
  Briefcase,
  Home,
  Building,
  CheckCircle,
  Mail,
  Calendar,
} from "lucide-react"

interface JobPreviewProps {
  data: QuickJobDraft
  company: QuickJobCompany | null
  className?: string
}

export function JobPreview({ data, company, className }: JobPreviewProps) {
  // Format salary display
  const salaryDisplay = useMemo(() => {
    if (!data.wageMin && !data.wageMax) return null

    const currencyInfo = currencies.find((c) => c.value === data.currency)
    const periodInfo = wagePeriods.find((p) => p.value === data.wagePeriod)
    const symbol = currencyInfo?.symbol || "$"
    const period = periodInfo?.label || "per year"

    const formatNumber = (num: number) =>
      new Intl.NumberFormat("en-US").format(num)

    if (data.wageMin && data.wageMax) {
      return `${symbol}${formatNumber(data.wageMin)} - ${symbol}${formatNumber(data.wageMax)} ${period}`
    } else if (data.wageMin) {
      return `From ${symbol}${formatNumber(data.wageMin)} ${period}`
    } else if (data.wageMax) {
      return `Up to ${symbol}${formatNumber(data.wageMax)} ${period}`
    }
    return null
  }, [data.wageMin, data.wageMax, data.currency, data.wagePeriod])

  // Get remote type label
  const remoteLabel = useMemo(() => {
    return remoteOptions.find((o) => o.value === data.remote)?.label || "On-site"
  }, [data.remote])

  // Get job type label
  const jobTypeLabel = useMemo(() => {
    return jobTypes.find((t) => t.value === data.type)?.label || data.type
  }, [data.type])

  // Get remote icon
  const RemoteIcon = useMemo(() => {
    switch (data.remote) {
      case "remote":
        return Home
      case "hybrid":
        return Building
      default:
        return MapPin
    }
  }, [data.remote])

  // Format post date
  const postDateFormatted = useMemo(() => {
    if (!data.postDate) return null
    return format(new Date(data.postDate), "MMMM d, yyyy")
  }, [data.postDate])

  // Check if we have enough content to show preview
  const hasMinimalContent = data.title || data.description

  if (!hasMinimalContent) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-muted/30 border-b border-border/50">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Job Preview
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Company Info */}
        {company && (
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${company.color}15` }}
            >
              <span
                className="text-base font-bold"
                style={{ color: company.color }}
              >
                {company.initials}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {company.name}
                </span>
                {company.verified && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{company.industry}</p>
            </div>
          </div>
        )}

        {/* Job Title */}
        {data.title && (
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            {data.title}
          </h2>
        )}

        {/* Badges Row */}
        {(data.location || data.type || data.remote) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {data.location && (
              <Badge
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-foreground/5"
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                {data.location}
              </Badge>
            )}
            {data.type && (
              <Badge
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-foreground/5"
              >
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                {jobTypeLabel}
              </Badge>
            )}
            {data.remote && (
              <Badge
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-foreground/5"
              >
                <RemoteIcon className="w-3.5 h-3.5 mr-1.5" />
                {remoteLabel}
              </Badge>
            )}
          </div>
        )}

        {/* Salary */}
        {salaryDisplay && (
          <p className="text-xl font-semibold text-foreground mb-6">
            {salaryDisplay}
          </p>
        )}

        {/* Description */}
        {data.description && (
          <>
            <Separator className="my-6" />
            <div className="prose prose-slate prose-sm max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.description) }}
                className="text-muted-foreground leading-relaxed [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>ul>li]:ml-4 [&>ol>li]:ml-4"
              />
            </div>
          </>
        )}

        {/* Footer Info */}
        {(data.applyEmail || data.postDate) && (
          <>
            <Separator className="my-6" />
            <div className="space-y-3">
              {data.applyEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>
                    Applications sent to:{" "}
                    <span className="text-foreground font-medium">
                      {data.applyEmail}
                    </span>
                  </span>
                </div>
              )}
              {postDateFormatted && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Posting date:{" "}
                    <span className="text-foreground font-medium">
                      {postDateFormatted}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

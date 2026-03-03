"use client"

import { format } from "date-fns"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type QuickJobCompany } from "@/lib/quick-job-schema"
import {
  CheckCircle,
  Mail,
  CalendarIcon,
  Clock,
  Zap,
  Building2,
} from "lucide-react"

interface CompanyPreviewCardProps {
  company: QuickJobCompany | null
}

export function CompanyPreviewCard({ company }: CompanyPreviewCardProps) {
  if (!company) {
    return (
      <div className="p-5 rounded-xl bg-white/60 backdrop-blur-xl border border-border/40">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Company</h3>
        </div>
        <div className="flex items-center justify-center h-24 rounded-lg bg-muted/30 border border-dashed border-border/60">
          <p className="text-sm text-muted-foreground">Select a company</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-white/60 backdrop-blur-xl border border-border/40"
    >
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Company Preview</h3>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${company.color}15` }}
        >
          <span
            className="text-lg font-bold"
            style={{ color: company.color }}
          >
            {company.initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {company.name}
            </span>
            {company.verified && (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{company.industry}</p>
          {!company.verified && (
            <p className="text-xs text-amber-600 mt-1">Pending verification</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface ApplyToCardProps {
  email: string
  error?: string
  onChange: (email: string) => void
}

export function ApplyToCard({ email, error, onChange }: ApplyToCardProps) {
  return (
    <div className="p-5 rounded-xl bg-white/60 backdrop-blur-xl border border-border/40">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          Applications Sent To
        </h3>
      </div>

      <Label htmlFor="apply-email" className="sr-only">
        Apply Email
      </Label>
      <Input
        id="apply-email"
        type="email"
        placeholder="hr@company.com"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}

      <p className="text-xs text-muted-foreground mt-2">
        Candidates will apply to this email address
      </p>
    </div>
  )
}

interface PublishingCardProps {
  postDate: string
  allowBackdating?: boolean
  maxBackdateDays?: number
  onDateChange: (date: string) => void
  onPublishNow: () => void
  isScheduled: boolean
}

export function PublishingCard({
  postDate,
  allowBackdating = false,
  maxBackdateDays = 167,
  onDateChange,
  onPublishNow,
  isScheduled,
}: PublishingCardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDate = allowBackdating
    ? new Date(today.getTime() - maxBackdateDays * 24 * 60 * 60 * 1000)
    : today

  const selectedDate = postDate ? new Date(postDate) : undefined

  const handlePublishNow = () => {
    onDateChange(today.toISOString())
    onPublishNow()
  }

  return (
    <div className="p-5 rounded-xl bg-white/60 backdrop-blur-xl border border-border/40">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Publishing</h3>
      </div>

      {/* Quick Publish Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handlePublishNow}
        className="w-full mb-3 gap-2 bg-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/40"
      >
        <Zap className="w-4 h-4" />
        Publish Now
      </Button>

      {/* Or Divider */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-xs text-muted-foreground">or schedule</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-transparent",
              !postDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {postDate ? format(new Date(postDate), "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) =>
              onDateChange(date ? date.toISOString() : "")
            }
            disabled={(date) => {
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              return d < minDate
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Status Preview */}
      {postDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 p-3 rounded-lg bg-muted/30"
        >
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {isScheduled ? (
              <span className="text-amber-700">
                Will publish {format(new Date(postDate), "MMM d, yyyy")}
              </span>
            ) : (
              <span className="text-emerald-700">
                Publishing immediately
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

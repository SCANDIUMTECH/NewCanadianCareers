"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { cn, getVisibleTextLength } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { TiptapEditor } from "@/components/ui/tiptap-editor"
import {
  type QuickJobDraft,
  type JobType,
  type RemoteType,
  type WagePeriod,
  type Currency,
  jobTypes,
  remoteOptions,
  wagePeriods,
  currencies,
} from "@/lib/quick-job-schema"
import { CalendarIcon, MapPin, Clock, DollarSign, Info } from "lucide-react"

interface JobFormProps {
  data: QuickJobDraft
  errors: Record<string, string>
  onFieldChange: <K extends keyof QuickJobDraft>(
    field: K,
    value: QuickJobDraft[K]
  ) => void
  className?: string
}

// Section header component with optional tooltip
function SectionHeader({ title, tooltip }: { title: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="cursor-help">
                <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Separator className="flex-1" />
    </div>
  )
}

export function JobForm({
  data,
  errors,
  onFieldChange,
  className,
}: JobFormProps) {
  // Progressive disclosure states
  const [showSchedule, setShowSchedule] = useState(!!data.postDate)

  // Derive location visibility from work arrangement
  const showLocation = data.remote !== "remote"

  // Calculate date bounds
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const selectedDate = data.postDate ? new Date(data.postDate) : undefined

  // Check if selected date is in the future
  const isFutureDate = useMemo(() => {
    if (!data.postDate) return false
    const postDate = new Date(data.postDate)
    postDate.setHours(0, 0, 0, 0)
    return postDate > today
  }, [data.postDate, today])

  const descriptionCharCount = getVisibleTextLength(data.description || "")

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn("space-y-8", className)}
    >
      {/* Section 1: THE ROLE */}
      <section className="space-y-4">
        <SectionHeader title="The Role" />

        {/* Job Title */}
        <div>
          <Label htmlFor="title" className="text-sm font-medium text-foreground">
            Job Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g. Senior Frontend Developer"
            value={data.title || ""}
            onChange={(e) => onFieldChange("title", e.target.value)}
            className={cn("mt-1.5 h-10", errors.title && "border-destructive")}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title}</p>
          )}
        </div>

        {/* Work Arrangement + Location + Job Type row */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr] gap-4">
          {/* Work Arrangement - Tabs */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              Work Arrangement <span className="text-destructive">*</span>
            </Label>
            <Tabs
              value={data.remote || "onsite"}
              onValueChange={(value) => onFieldChange("remote", value as RemoteType)}
              className="mt-1.5"
            >
              <TabsList className="w-full h-10">
                {remoteOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Location (conditional) or Remote message */}
          <div>
            <AnimatePresence mode="wait">
              {showLocation ? (
                <motion.div
                  key="location-field"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label
                    htmlFor="location"
                    className="text-sm font-medium text-foreground"
                  >
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      placeholder="e.g., Toronto, ON"
                      value={data.location || ""}
                      onChange={(e) => onFieldChange("location", e.target.value)}
                      className={cn(
                        "pl-9 h-10",
                        errors.location && "border-destructive"
                      )}
                    />
                  </div>
                  {errors.location && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.location}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="remote-message"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center h-full pt-6"
                >
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Remote positions don't require a location
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Job Type */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              Job Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.type || ""}
              onValueChange={(value) => onFieldChange("type", value as JobType)}
            >
              <SelectTrigger
                className={cn("mt-1.5 !h-10 w-full", errors.type && "border-destructive")}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive mt-1">{errors.type}</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: COMPENSATION */}
      <section className="space-y-4">
        <SectionHeader
          title="Compensation"
          tooltip="Jobs with salary info get 2x more applicants"
        />

        {/* Salary range row: Min — Max | Period | Currency */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-[140px]">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Min"
              value={data.wageMin || ""}
              onChange={(e) =>
                onFieldChange(
                  "wageMin",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="pl-9 h-10"
            />
          </div>
          <span className="text-muted-foreground">—</span>
          <div className="relative flex-1 max-w-[140px]">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Max"
              value={data.wageMax || ""}
              onChange={(e) =>
                onFieldChange(
                  "wageMax",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="pl-9 h-10"
            />
          </div>
          <Select
            value={data.wagePeriod || "year"}
            onValueChange={(value) =>
              onFieldChange("wagePeriod", value as WagePeriod)
            }
          >
            <SelectTrigger className="w-[110px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wagePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={data.currency || "USD"}
            onValueChange={(value) =>
              onFieldChange("currency", value as Currency)
            }
          >
            <SelectTrigger className="w-[80px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hours row - always visible */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[140px]">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Hours"
              min={1}
              max={168}
              value={data.hoursPerWeek || ""}
              onChange={(e) =>
                onFieldChange(
                  "hoursPerWeek",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="pl-9 h-10"
            />
          </div>
          <span className="text-sm text-muted-foreground">hours per week</span>
        </div>
      </section>

      {/* Section 3: DESCRIPTION */}
      <section className="space-y-4">
        <SectionHeader title="Description" />
        <TiptapEditor
          value={data.description || ""}
          onChange={(html) => onFieldChange("description", html)}
          placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity great..."
          minHeight={200}
          error={errors.description}
          characterCount={{ current: descriptionCharCount, min: 50 }}
        />
      </section>

      {/* Section 4: PUBLISHING */}
      <section className="space-y-4">
        <SectionHeader title="Publishing" />

        <RadioGroup
          value={showSchedule ? "schedule" : "immediate"}
          onValueChange={(v) => {
            setShowSchedule(v === "schedule")
            if (v === "immediate") {
              onFieldChange("postDate", "")
            }
          }}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="immediate" id="publish-immediate" />
            <Label htmlFor="publish-immediate" className="font-normal cursor-pointer">
              Publish immediately
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="schedule" id="publish-schedule" />
            <Label htmlFor="publish-schedule" className="font-normal cursor-pointer">
              Schedule for later
            </Label>
            <AnimatePresence>
              {showSchedule && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal h-10",
                          !data.postDate && "text-muted-foreground",
                          errors.postDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.postDate
                          ? format(new Date(data.postDate), "MMM d, yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) =>
                          onFieldChange("postDate", date ? date.toISOString() : "")
                        }
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </RadioGroup>

        {errors.postDate && (
          <p className="text-sm text-destructive">{errors.postDate}</p>
        )}

        {/* Future date info message */}
        <AnimatePresence>
          {isFutureDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
            >
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  This job will automatically go live on{" "}
                  <strong>
                    {format(new Date(data.postDate!), "MMMM d, yyyy")}
                  </strong>
                  . You can edit or unpublish before then.
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  )
}

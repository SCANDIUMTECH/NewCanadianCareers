"use client"

import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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

interface JobFormFieldsProps {
  data: QuickJobDraft
  errors: Record<string, string>
  allowBackdating?: boolean
  maxBackdateDays?: number
  onFieldChange: <K extends keyof QuickJobDraft>(
    field: K,
    value: QuickJobDraft[K]
  ) => void
}

export function JobFormFields({
  data,
  errors,
  allowBackdating = false,
  maxBackdateDays = 167,
  onFieldChange,
}: JobFormFieldsProps) {
  // Calculate date bounds
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDate = allowBackdating
    ? new Date(today.getTime() - maxBackdateDays * 24 * 60 * 60 * 1000)
    : today

  const selectedDate = data.postDate ? new Date(data.postDate) : undefined

  return (
    <div className="space-y-6">
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
          className={cn("mt-2", errors.title && "border-destructive")}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1.5">{errors.title}</p>
        )}
      </div>

      {/* Job Type & Location Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className={cn("mt-2", errors.type && "border-destructive")}
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
            <p className="text-sm text-destructive mt-1.5">{errors.type}</p>
          )}
        </div>

        {/* Remote Type */}
        <div>
          <Label className="text-sm font-medium text-foreground">
            Work Arrangement <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2 mt-2">
            {remoteOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onFieldChange("remote", option.value as RemoteType)
                }
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                  data.remote === option.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location" className="text-sm font-medium text-foreground">
          Location <span className="text-destructive">*</span>
        </Label>
        <div className="relative mt-2">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="location"
            type="text"
            placeholder={
              data.remote === "remote"
                ? "Remote (Timezone or region)"
                : "e.g., Toronto, ON"
            }
            value={data.location || ""}
            onChange={(e) => onFieldChange("location", e.target.value)}
            className={cn("pl-9", errors.location && "border-destructive")}
          />
        </div>
        {errors.location && (
          <p className="text-sm text-destructive mt-1.5">{errors.location}</p>
        )}
      </div>

      {/* Wage & Hours Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wage Range */}
        <div>
          <Label className="text-sm font-medium text-foreground">
            Salary Range
            <span className="text-muted-foreground font-normal ml-1">
              (recommended)
            </span>
          </Label>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
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
                className="pl-9"
              />
            </div>
            <span className="flex items-center text-muted-foreground">–</span>
            <div className="relative flex-1">
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
                className="pl-9"
              />
            </div>
          </div>

          {/* Currency & Period */}
          <div className="flex gap-2 mt-2">
            <Select
              value={data.currency || "USD"}
              onValueChange={(value) =>
                onFieldChange("currency", value as Currency)
              }
            >
              <SelectTrigger className="w-24">
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

            <Select
              value={data.wagePeriod || "year"}
              onValueChange={(value) =>
                onFieldChange("wagePeriod", value as WagePeriod)
              }
            >
              <SelectTrigger className="flex-1">
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
          </div>

          {!data.wageMin && !data.wageMax && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Jobs with salary info get 2x more applicants
            </p>
          )}
        </div>

        {/* Hours Per Week */}
        <div>
          <Label htmlFor="hours" className="text-sm font-medium text-foreground">
            Hours per Week
            <span className="text-muted-foreground font-normal ml-1">
              (optional)
            </span>
          </Label>
          <div className="relative mt-2">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="hours"
              type="number"
              placeholder="e.g. 40"
              min={1}
              max={168}
              value={data.hoursPerWeek || ""}
              onChange={(e) =>
                onFieldChange(
                  "hoursPerWeek",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Post Date */}
      <div>
        <Label className="text-sm font-medium text-foreground">
          Post Date <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal mt-2 bg-transparent",
                !data.postDate && "text-muted-foreground",
                errors.postDate && "border-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.postDate
                ? format(new Date(data.postDate), "PPP")
                : "Select post date"}
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
                const d = new Date(date)
                d.setHours(0, 0, 0, 0)
                return d < minDate
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.postDate && (
          <p className="text-sm text-destructive mt-1.5">{errors.postDate}</p>
        )}
        {allowBackdating && (
          <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Backdating enabled: up to {maxBackdateDays} days in past
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label
          htmlFor="description"
          className="text-sm font-medium text-foreground"
        >
          Job Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity great..."
          value={data.description || ""}
          onChange={(e) => onFieldChange("description", e.target.value)}
          rows={8}
          className={cn("mt-2 resize-none", errors.description && "border-destructive")}
        />
        <div className="flex items-center justify-between mt-1.5">
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Minimum 50 characters
            </p>
          )}
          <p
            className={cn(
              "text-xs",
              (data.description?.length || 0) >= 50
                ? "text-muted-foreground"
                : "text-amber-600"
            )}
          >
            {data.description?.length || 0} / 50+
          </p>
        </div>
      </div>
    </div>
  )
}

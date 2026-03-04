"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export interface JobFilters {
  location: string
  remote: string[]
  type: string[]
  salaryMin: number
  salaryMax: number
  datePosted: string
}

interface JobFiltersSidebarProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
  onReset: () => void
}

const remoteOptions = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
]

const typeOptions = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
]

const dateOptions = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Past 24 hours" },
  { value: "7d", label: "Past week" },
  { value: "30d", label: "Past month" },
]

export function JobFiltersSidebar({
  filters,
  onFiltersChange,
  onReset,
}: JobFiltersSidebarProps) {
  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (key: "remote" | "type", value: string) => {
    const current = filters[key]
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilter(key, updated)
  }

  const hasActiveFilters =
    filters.location ||
    filters.remote.length > 0 ||
    filters.type.length > 0 ||
    filters.salaryMin > 0 ||
    filters.salaryMax > 0 ||
    filters.datePosted

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-foreground-muted hover:text-foreground h-auto p-0"
          >
            Reset all
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["location", "remote", "type", "salary", "date"]} className="space-y-2">
        {/* Location */}
        <AccordionItem value="location" className="border-none">
          <AccordionTrigger className="py-3 px-0 hover:no-underline">
            <span className="text-sm font-medium">Location</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <Input
              placeholder="City or province (e.g., Toronto, ON)"
              value={filters.location}
              onChange={(e) => updateFilter("location", e.target.value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Remote */}
        <AccordionItem value="remote" className="border-none">
          <AccordionTrigger className="py-3 px-0 hover:no-underline">
            <span className="text-sm font-medium">Work Type</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-3">
              {remoteOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.remote.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter("remote", option.value)}
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment Type */}
        <AccordionItem value="type" className="border-none">
          <AccordionTrigger className="py-3 px-0 hover:no-underline">
            <span className="text-sm font-medium">Employment Type</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-3">
              {typeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.type.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter("type", option.value)}
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Salary */}
        <AccordionItem value="salary" className="border-none">
          <AccordionTrigger className="py-3 px-0 hover:no-underline">
            <span className="text-sm font-medium">Salary Range</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground-muted">Min</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-7"
                    value={filters.salaryMin || ""}
                    onChange={(e) => updateFilter("salaryMin", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground-muted">Max</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <Input
                    type="number"
                    placeholder="Any"
                    className="pl-7"
                    value={filters.salaryMax || ""}
                    onChange={(e) => updateFilter("salaryMax", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Date Posted */}
        <AccordionItem value="date" className="border-none">
          <AccordionTrigger className="py-3 px-0 hover:no-underline">
            <span className="text-sm font-medium">Date Posted</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <Select
              value={filters.datePosted || "any"}
              onValueChange={(value) => updateFilter("datePosted", value === "any" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

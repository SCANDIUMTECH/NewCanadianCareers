"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { JobFiltersSidebar, type JobFilters } from "./job-filters-sidebar"

interface JobFiltersSheetProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
  onReset: () => void
  activeFilterCount: number
}

export function JobFiltersSheet({
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
}: JobFiltersSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-transparent relative">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filter Jobs</SheetTitle>
        </SheetHeader>
        <div className="py-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          <JobFiltersSidebar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onReset={onReset}
          />
        </div>
        <SheetFooter>
          <Button
            onClick={() => setOpen(false)}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            Show Results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

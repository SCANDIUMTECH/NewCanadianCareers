"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showPageNumbers?: boolean
  className?: string
}

/**
 * Pagination component for list views
 * Provides page navigation with current/total display
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  className,
}: PaginationProps) {
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  // Generate page numbers to display
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = []
    const maxVisible = 5 // Max visible page buttons

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        className={cn(
          "h-9 px-3 bg-transparent",
          !canGoPrev && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Go to previous page"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* Page Numbers */}
      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="w-9 h-9 flex items-center justify-center text-foreground-muted"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  "w-9 h-9 p-0",
                  currentPage === page
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "bg-transparent"
                )}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </Button>
            )
          )}
        </div>
      )}

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={cn(
          "h-9 px-3 bg-transparent",
          !canGoNext && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline">Next</span>
        <svg
          className="w-4 h-4 ml-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </nav>
  )
}

export interface PaginationInfoProps {
  currentPage: number
  pageSize: number
  totalItems: number
  className?: string
}

/**
 * Displays pagination information (e.g., "Showing 1-10 of 50")
 */
export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <p className={cn("text-sm text-foreground-muted", className)}>
      Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
      <span className="font-medium text-foreground">{endItem}</span> of{" "}
      <span className="font-medium text-foreground">{totalItems}</span> results
    </p>
  )
}

export interface PaginationWrapperProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  showInfo?: boolean
  className?: string
}

/**
 * Complete pagination wrapper with info and controls
 */
export function PaginationWrapper({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  showInfo = true,
  className,
}: PaginationWrapperProps) {
  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalItems <= pageSize) return null

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50",
        className
      )}
    >
      {showInfo && (
        <PaginationInfo
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}

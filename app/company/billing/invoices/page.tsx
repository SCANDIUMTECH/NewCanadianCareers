"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MotionWrapper } from "@/components/motion-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getInvoices, downloadInvoicePdf, type InvoiceFilters } from "@/lib/api/billing"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { Invoice } from "@/lib/company/types"

/**
 * Company Invoice History Page
 * Full invoice list with filtering, search, and PDF download
 * Linked from /company/billing "View All" button
 */

// Extended invoice type with display-friendly fields
interface DisplayInvoice extends Invoice {
  method?: string
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "open", label: "Open" },
  { value: "void", label: "Void" },
  { value: "uncollectible", label: "Uncollectible" },
]

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "subscription", label: "Subscription" },
  { value: "credit", label: "Credit Pack" },
]

export default function CompanyInvoicesPage() {
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: InvoiceFilters = {}
      if (statusFilter !== "all") {
        filters.status = statusFilter as Invoice["status"]
      }
      const response = await getInvoices(filters)
      setInvoices(response.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Client-side filtering for search and type (API filters status)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        searchQuery === "" ||
        invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === "all" ||
        (typeFilter === "subscription" && invoice.description.includes("Plan")) ||
        (typeFilter === "credit" && invoice.description.includes("Credit"))

      return matchesSearch && matchesType
    })
  }, [invoices, searchQuery, typeFilter])

  // Compute totals from fetched invoices
  const totals = useMemo(() => {
    const paid = invoices
      .filter(i => i.status === "paid")
      .reduce((acc, i) => acc + i.amount, 0)
    const voided = invoices
      .filter(i => i.status === "void")
      .reduce((acc, i) => acc + i.amount, 0)
    return { paid, voided, net: paid }
  }, [invoices])

  const handleDownload = async (invoice: DisplayInvoice) => {
    setDownloadingId(invoice.id)
    try {
      const blob = await downloadInvoicePdf(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>
      case "open":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Open</Badge>
      case "draft":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Draft</Badge>
      case "void":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Void</Badge>
      case "uncollectible":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Uncollectible</Badge>
      default:
        return null
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <MotionWrapper delay={0}>
        <nav className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
          <Link href="/company/billing" className="hover:text-foreground transition-colors">Billing</Link>
          <span>/</span>
          <span className="text-foreground">Invoices</span>
        </nav>
      </MotionWrapper>

      {/* Header */}
      <MotionWrapper delay={50}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invoice History</h1>
            <p className="text-sm text-foreground-muted mt-1">
              View and download your billing history
            </p>
          </div>
        </div>
      </MotionWrapper>

      {/* Summary Cards */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm text-foreground-muted">Total Paid</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-foreground mt-1">
                  ${totals.paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm text-foreground-muted">Voided</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-foreground mt-1">
                  ${totals.voided.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm text-foreground-muted">Net Spend</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-primary mt-1">
                  ${totals.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Filters */}
      <MotionWrapper delay={150}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Invoices List */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold">
              Invoices
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-foreground-muted">
                  ({filteredInvoices.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Failed to load invoices</h3>
                <p className="text-sm text-foreground-muted mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchInvoices}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
              <div className="divide-y divide-border/50">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Invoices List */}
            {!isLoading && !error && (
              <div className="divide-y divide-border/50">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{invoice.description}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground-muted">
                          <span className="font-mono">{invoice.number}</span>
                          <span>·</span>
                          <span>{formatDate(invoice.created_at)}</span>
                          {invoice.method && (
                            <>
                              <span>·</span>
                              <span>{invoice.method}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-foreground">
                        ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      {invoice.pdf_status === 'generating' ? (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled title="PDF is being generated...">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(invoice)}
                          disabled={invoice.pdf_status !== 'available' || downloadingId === invoice.id}
                          title={invoice.pdf_status === 'available' ? "Download PDF" : "PDF not available"}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredInvoices.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1">No invoices found</h3>
                    <p className="text-sm text-foreground-muted">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Help Section */}
      <MotionWrapper delay={300}>
        <Card className="border-primary/20 bg-primary/5 mt-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Need help with billing?</h3>
                <p className="text-sm text-foreground-muted">
                  Contact our support team at{" "}
                  <a href="mailto:billing@orion.com" className="text-primary hover:underline">
                    billing@orion.com
                  </a>{" "}
                  for questions about invoices or payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  )
}

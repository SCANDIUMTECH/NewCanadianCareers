"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format, subDays, subMonths, startOfYear, startOfMonth, startOfWeek, endOfYear } from "date-fns"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  RotateCcw,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  CalendarIcon,
  Building2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Printer,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import {
  getAdminTransactions,
  getAdminPaymentStats,
  getRevenueTrends,
  refundTransaction,
  retryTransaction,
  exportAdminTransactions,
  downloadInvoice,
  createManualInvoice,
} from "@/lib/api/admin-payments"
import { getAdminCompanies } from "@/lib/api/admin-companies"
import { getAdminAgencies } from "@/lib/api/admin-agencies"
import type {
  AdminTransaction,
  AdminPaymentStats,
  AdminRevenueTrend,
  AdminPaymentFilters,
  AdminCompany,
  AdminAgency,
  PaginatedResponse,
} from "@/lib/admin/types"

const AdminRevenueTrendChart = dynamic(
  () => import("@/components/charts/admin-revenue-trend-chart"),
  { ssr: false }
)

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// Sortable columns matching backend ordering_fields
type SortField = "created_at" | "amount" | "status"
type SortDirection = "asc" | "desc"

// Enterprise SaaS date range presets
type DatePreset = {
  label: string
  getValue: () => { start: Date; end: Date }
}

const currentYear = new Date().getFullYear()

const datePresets: DatePreset[] = [
  {
    label: "Last 7 days",
    getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }),
  },
  {
    label: "Last 3 months",
    getValue: () => ({ start: subMonths(new Date(), 3), end: new Date() }),
  },
  {
    label: "Last 12 months",
    getValue: () => ({ start: subMonths(new Date(), 12), end: new Date() }),
  },
  {
    label: "Year to date",
    getValue: () => ({ start: startOfYear(new Date()), end: new Date() }),
  },
  {
    label: "Month to date",
    getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }),
  },
  {
    label: "Week to date",
    getValue: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }),
  },
  {
    label: String(currentYear - 1),
    getValue: () => ({
      start: startOfYear(new Date(currentYear - 1, 0, 1)),
      end: endOfYear(new Date(currentYear - 1, 0, 1)),
    }),
  },
  {
    label: String(currentYear - 2),
    getValue: () => ({
      start: startOfYear(new Date(currentYear - 2, 0, 1)),
      end: endOfYear(new Date(currentYear - 2, 0, 1)),
    }),
  },
]

export default function PaymentsPage() {
  // Data state
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [stats, setStats] = useState<AdminPaymentStats | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<AdminRevenueTrend[]>([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, count: 0 })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isTrendLoading, setIsTrendLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<AdminPaymentFilters>({
    search: "",
    status: "all",
    payment_method: "all",
    page: 1,
    page_size: 20,
    ordering: "-created_at",
  })
  const [searchInput, setSearchInput] = useState("")

  // Sort state
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Date range filter
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [dateRangeOpen, setDateRangeOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [datePickerMonth, setDatePickerMonth] = useState<Date>(new Date())

  // Company / Agency filter
  const [orgSearch, setOrgSearch] = useState("")
  const [companyOptions, setCompanyOptions] = useState<AdminCompany[]>([])
  const [agencyOptions, setAgencyOptions] = useState<AdminAgency[]>([])
  const [selectedOrg, setSelectedOrg] = useState<{ id: number; name: string; type: "company" | "agency" } | null>(null)
  const [orgOpen, setOrgOpen] = useState(false)
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const orgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dialog states
  const [refundingTransaction, setRefundingTransaction] = useState<AdminTransaction | null>(null)
  const [viewingTransaction, setViewingTransaction] = useState<AdminTransaction | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false)

  // Action states
  const [isRefunding, setIsRefunding] = useState(false)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState<string | null>(null)
  const [isBulkDownloadingPdf, setIsBulkDownloadingPdf] = useState(false)

  // Refund form state
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")

  // Create Invoice form state
  const [invoiceCompanySearch, setInvoiceCompanySearch] = useState("")
  const [invoiceCompanies, setInvoiceCompanies] = useState<AdminCompany[]>([])
  const [invoiceCompanyOpen, setInvoiceCompanyOpen] = useState(false)
  const [invoiceCompany, setInvoiceCompany] = useState<AdminCompany | null>(null)
  const [invoiceAmount, setInvoiceAmount] = useState("")
  const [invoiceDescription, setInvoiceDescription] = useState("")
  const [invoiceDueDate, setInvoiceDueDate] = useState("")
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [isLoadingInvoiceCompanies, setIsLoadingInvoiceCompanies] = useState(false)
  const invoiceCompanyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Export format
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    setSelectedIds(new Set())
    try {
      const response: PaginatedResponse<AdminTransaction> = await getAdminTransactions(filters)
      setTransactions(response.results)
      setPagination({
        page: filters.page || 1,
        total_pages: Math.ceil(response.count / (filters.page_size || 20)),
        count: response.count,
      })
    } catch (err) {
      console.error("Failed to fetch transactions:", err)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminPaymentStats("30d")
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  const fetchTrend = useCallback(async () => {
    setIsTrendLoading(true)
    try {
      const data = await getRevenueTrends("30d")
      setRevenueTrend(data)
    } catch (err) {
      console.error("Failed to fetch trend:", err)
    } finally {
      setIsTrendLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchStats()
    fetchTrend()
  }, [fetchStats, fetchTrend])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  // Company + Agency search with debounce
  useEffect(() => {
    if (orgSearchTimer.current) clearTimeout(orgSearchTimer.current)
    if (!orgSearch.trim()) {
      setCompanyOptions([])
      setAgencyOptions([])
      return
    }
    orgSearchTimer.current = setTimeout(async () => {
      setIsLoadingOrgs(true)
      try {
        const [companyRes, agencyRes] = await Promise.all([
          getAdminCompanies({ search: orgSearch, page_size: 6 }),
          getAdminAgencies({ search: orgSearch, page_size: 6 }),
        ])
        setCompanyOptions(companyRes.results)
        setAgencyOptions(agencyRes.results)
      } catch {
        setCompanyOptions([])
        setAgencyOptions([])
      } finally {
        setIsLoadingOrgs(false)
      }
    }, 300)
    return () => {
      if (orgSearchTimer.current) clearTimeout(orgSearchTimer.current)
    }
  }, [orgSearch])

  // Invoice company search with debounce
  useEffect(() => {
    if (invoiceCompanyTimer.current) clearTimeout(invoiceCompanyTimer.current)
    if (!invoiceCompanySearch.trim()) {
      setInvoiceCompanies([])
      return
    }
    invoiceCompanyTimer.current = setTimeout(async () => {
      setIsLoadingInvoiceCompanies(true)
      try {
        const res = await getAdminCompanies({ search: invoiceCompanySearch, page_size: 6 })
        setInvoiceCompanies(res.results)
      } catch {
        setInvoiceCompanies([])
      } finally {
        setIsLoadingInvoiceCompanies(false)
      }
    }, 300)
    return () => {
      if (invoiceCompanyTimer.current) clearTimeout(invoiceCompanyTimer.current)
    }
  }, [invoiceCompanySearch])

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleCreateInvoice = async () => {
    if (!invoiceCompany || !invoiceAmount || !invoiceDescription || !invoiceDueDate) return
    setIsCreatingInvoice(true)
    try {
      await createManualInvoice({
        company_id: invoiceCompany.id,
        amount: parseFloat(invoiceAmount),
        description: invoiceDescription,
        due_date: invoiceDueDate,
      })
      setCreateInvoiceOpen(false)
      setInvoiceCompany(null)
      setInvoiceCompanySearch("")
      setInvoiceAmount("")
      setInvoiceDescription("")
      setInvoiceDueDate("")
      toast.success("Invoice created successfully")
      fetchTransactions()
      fetchStats()
    } catch (err) {
      console.error("Failed to create invoice:", err)
      toast.error("Failed to create invoice. Please try again.")
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const handleRefund = async () => {
    if (!refundingTransaction) return
    setIsRefunding(true)
    try {
      await refundTransaction(refundingTransaction.id, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason,
      })
      setRefundingTransaction(null)
      setRefundAmount("")
      setRefundReason("")
      fetchTransactions()
      fetchStats()
    } catch (err) {
      console.error("Failed to refund:", err)
      toast.error("Failed to issue refund. Please try again.")
    } finally {
      setIsRefunding(false)
    }
  }

  const handleRetry = async (transactionId: string) => {
    setIsRetrying(transactionId)
    try {
      await retryTransaction(transactionId)
      fetchTransactions()
      fetchStats()
    } catch (err) {
      console.error("Failed to retry:", err)
      toast.error("Failed to retry transaction. Please try again.")
    } finally {
      setIsRetrying(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportAdminTransactions(filters, exportFormat)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions-export.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
      setExportOpen(false)
    } catch (err) {
      console.error("Failed to export:", err)
      toast.error("Failed to export transactions. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadInvoice = async (transactionId: string, transactionRef: string) => {
    setIsDownloadingInvoice(transactionId)
    try {
      const blob = await downloadInvoice(transactionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${transactionRef}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch (err) {
      console.error("Failed to download invoice:", err)
      toast.error("Failed to download invoice. Please try again.")
    } finally {
      setIsDownloadingInvoice(null)
    }
  }

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value as AdminPaymentFilters["status"], page: 1 }))
  }

  const handlePaymentMethodFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, payment_method: value as AdminPaymentFilters["payment_method"], page: 1 }))
  }

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedTransactions = transactions.filter((t) => selectedIds.has(t.id))

  const handleBulkExport = async (fmt: "csv" | "xlsx") => {
    setIsExporting(true)
    try {
      const blob = await exportAdminTransactions(filters, fmt)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions-export.${fmt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${pagination.count.toLocaleString()} transactions as ${fmt.toUpperCase()}`)
    } catch {
      toast.error("Failed to export transactions.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleBulkPrint = () => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const rows = selectedTransactions.length > 0 ? selectedTransactions : transactions
    const printContent = rows
      .map(
        (t) =>
          `${t.invoice_number}\t${t.company?.name || t.agency?.name || "—"}\t${getTransactionMethod(t)}\t${formatCurrency(t.amount, t.currency)}\t${t.status}\t${formatDate(t.created_at)}`
      )
      .join("\n")
    const header = "Invoice #\tCompany / Agency\tMethod\tAmount\tStatus\tDate"
    const win = window.open("", "_blank")
    if (win) {
      win.document.write(`<html><head><title>Transactions</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb}th{font-weight:600;background:#f9fafb;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;color:#6b7280}td{color:#111827}.capitalize{text-transform:capitalize}h1{font-size:18px;margin-bottom:16px;font-weight:600}</style></head><body>`)
      win.document.write(`<h1>Transaction Report</h1><p style="color:#6b7280;font-size:13px;margin-bottom:16px">${esc(String(rows.length))} transactions · Generated ${esc(new Date().toLocaleDateString())}</p>`)
      win.document.write("<table><thead><tr>")
      header.split("\t").forEach((h) => win.document.write(`<th>${esc(h)}</th>`))
      win.document.write("</tr></thead><tbody>")
      printContent.split("\n").forEach((row) => {
        win.document.write("<tr>")
        row.split("\t").forEach((cell, i) => {
          const cls = i === 4 ? ' class="capitalize"' : ""
          win.document.write(`<td${cls}>${esc(cell)}</td>`)
        })
        win.document.write("</tr>")
      })
      win.document.write("</tbody></table></body></html>")
      win.document.close()
      win.print()
    }
  }

  const handleBulkDownloadPdf = async () => {
    const rows = selectedTransactions.length > 0
      ? selectedTransactions.filter((t) => t.status === "completed" || t.status === "refunded")
      : transactions.filter((t) => t.status === "completed" || t.status === "refunded")

    if (rows.length === 0) {
      toast.error("No completed transactions with invoices to download.")
      return
    }

    setIsBulkDownloadingPdf(true)
    let downloaded = 0
    let failed = 0

    for (const txn of rows) {
      try {
        const blob = await downloadInvoice(txn.id)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `invoice-${txn.invoice_number}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        downloaded++
      } catch {
        failed++
      }
    }

    setIsBulkDownloadingPdf(false)
    if (failed === 0) {
      toast.success(`Downloaded ${downloaded} invoice${downloaded !== 1 ? "s" : ""} as PDF`)
    } else {
      toast.warning(`Downloaded ${downloaded} invoice${downloaded !== 1 ? "s" : ""}, ${failed} failed`)
    }
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = "desc"
    if (sortField === field) {
      newDirection = sortDirection === "desc" ? "asc" : "desc"
    }
    setSortField(field)
    setSortDirection(newDirection)
    const ordering = newDirection === "desc" ? `-${field}` : field
    setFilters((prev) => ({ ...prev, ordering, page: 1 }))
  }

  const applyDateRange = (start: Date | undefined, end: Date | undefined, presetLabel?: string) => {
    setStartDate(start)
    setEndDate(end)
    setActivePreset(presetLabel || null)
    setFilters((prev) => ({
      ...prev,
      start_date: start ? format(start, "yyyy-MM-dd") : undefined,
      end_date: end ? format(end, "yyyy-MM-dd") : undefined,
      page: 1,
    }))
  }

  const handleDatePreset = (preset: DatePreset) => {
    const { start, end } = preset.getValue()
    applyDateRange(start, end, preset.label)
    setDateRangeOpen(false)
  }

  const clearDateRange = () => {
    applyDateRange(undefined, undefined)
    setDateRangeOpen(false)
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return
    setActivePreset(null)
    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      setStartDate(date)
      setEndDate(undefined)
    } else {
      // Complete the range
      if (date < startDate) {
        setStartDate(date)
        setEndDate(startDate)
      } else {
        setEndDate(date)
      }
    }
  }

  const handleApplyCustomRange = () => {
    applyDateRange(startDate, endDate)
    setDateRangeOpen(false)
  }

  const handleOrgSelect = (org: { id: number; name: string; type: "company" | "agency" } | null) => {
    setSelectedOrg(org)
    setOrgOpen(false)
    setOrgSearch("")
    setFilters((prev) => ({
      ...prev,
      company_id: org?.type === "company" ? org.id : undefined,
      agency_id: org?.type === "agency" ? org.id : undefined,
      page: 1,
    }))
  }

  const clearAllFilters = () => {
    setSearchInput("")
    setStartDate(undefined)
    setEndDate(undefined)
    setActivePreset(null)
    setSelectedOrg(null)
    setSortField("created_at")
    setSortDirection("desc")
    setDateRangeOpen(false)
    setFilters({
      search: "",
      status: "all",
      payment_method: "all",
      page: 1,
      page_size: 20,
      ordering: "-created_at",
    })
  }

  const hasActiveFilters =
    (filters.status && filters.status !== "all") ||
    (filters.payment_method && filters.payment_method !== "all") ||
    filters.start_date ||
    filters.end_date ||
    filters.company_id ||
    filters.agency_id ||
    filters.search

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-amber-100 text-amber-700"
      case "failed":
        return "bg-red-100 text-red-700"
      case "refunded":
        return "bg-gray-100 text-gray-700"
      default:
        return ""
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe_card: "Stripe / Credit Card",
      e_transfer: "E-Transfer",
      invoice: "Invoice",
      manual_card: "Card (Manual)",
      complimentary: "Complimentary",
      // Fallback for type values if payment_method isn't set
      subscription: "Subscription",
      package: "Package Purchase",
      credit: "Credit",
      refund: "Refund",
    }
    return labels[method] || method
  }

  /** Combined display: prefer payment_method, fall back to type */
  const getTransactionMethod = (txn: AdminTransaction) => {
    if (txn.payment_method) {
      // Handle legacy format "Stripe (pi_xxx...)" from old serializer
      if (txn.payment_method.startsWith("Stripe")) return "Stripe / Credit Card"
      return getPaymentMethodLabel(txn.payment_method)
    }
    return txn.type ? getPaymentMethodLabel(txn.type) : "—"
  }

  /** Date range display label for the trigger button */
  const getDateRangeLabel = () => {
    if (activePreset) return activePreset
    if (startDate && endDate) return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
    if (startDate) return `From ${format(startDate, "MMM d, yyyy")}`
    if (endDate) return `Until ${format(endDate, "MMM d, yyyy")}`
    return "Date range"
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    if (sortDirection === "asc") return <ArrowUp className="h-3.5 w-3.5" />
    return <ArrowDown className="h-3.5 w-3.5" />
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Track revenue and manage transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Revenue (MTD)"
              value={formatCurrency(stats.total_revenue)}
              change={stats.revenue_change}
              icon={<DollarSign className="h-4 w-4" />}
              gradient="from-emerald-500 to-teal-600"
              bgAccent="bg-emerald-500"
            />
            <StatCard
              title="Transactions"
              value={stats.transactions_count.toLocaleString()}
              subtitle="This month"
              icon={<Receipt className="h-4 w-4" />}
              gradient="from-sky to-sky-deep"
              bgAccent="bg-sky"
            />
            <StatCard
              title="Avg. Order Value"
              value={formatCurrency(stats.average_transaction)}
              icon={<TrendingUp className="h-4 w-4" />}
              gradient="from-primary-light to-primary"
              bgAccent="bg-primary"
            />
            <StatCard
              title="By Type"
              value={(stats.by_type.subscription + stats.by_type.package + stats.by_type.credit).toLocaleString()}
              subtitle="Total breakdown"
              icon={<Layers className="h-4 w-4" />}
              gradient="from-amber-500 to-orange-600"
              bgAccent="bg-amber-500"
            />
          </>
        ) : (
          <>
            <StatCard title="Revenue (MTD)" value="--" icon={<DollarSign className="h-4 w-4" />} gradient="from-emerald-500 to-teal-600" bgAccent="bg-emerald-500" />
            <StatCard title="Transactions" value="--" icon={<Receipt className="h-4 w-4" />} gradient="from-sky to-sky-deep" bgAccent="bg-sky" />
            <StatCard title="Avg. Order Value" value="--" icon={<TrendingUp className="h-4 w-4" />} gradient="from-primary-light to-primary" bgAccent="bg-primary" />
            <StatCard title="By Type" value="--" icon={<Layers className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" bgAccent="bg-amber-500" />
          </>
        )}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden group">
          <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10] bg-emerald-500")} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-emerald-500 to-teal-600")} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue from package sales</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : revenueTrend.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[250px]">
                <AdminRevenueTrendChart data={revenueTrend} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden group">
          <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10] bg-sky")} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-sky to-sky-deep")} />
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky to-sky-deep text-white shadow-sm">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-medium">Transactions</CardTitle>
                  {pagination.count > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                      {pagination.count.toLocaleString()}
                    </Badge>
                  )}
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 w-[180px] h-9"
                />
              </div>

              {/* Status */}
              <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Method */}
              <Select value={filters.payment_method || "all"} onValueChange={handlePaymentMethodFilter}>
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="stripe_card">Stripe / Credit Card</SelectItem>
                  <SelectItem value="e_transfer">E-Transfer</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="manual_card">Card (Manual)</SelectItem>
                  <SelectItem value="complimentary">Complimentary</SelectItem>
                </SelectContent>
              </Select>

              {/* Company / Agency Combobox */}
              <Popover open={orgOpen} onOpenChange={setOrgOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgOpen}
                    className={cn("h-9 w-[200px] justify-between font-normal", !selectedOrg && "text-muted-foreground")}
                  >
                    <Building2 className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1 text-left">
                      {selectedOrg ? selectedOrg.name : "All companies / agencies"}
                    </span>
                    {selectedOrg ? (
                      <X
                        className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOrgSelect(null)
                        }}
                      />
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search companies & agencies..."
                      value={orgSearch}
                      onValueChange={setOrgSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingOrgs ? "Searching..." : orgSearch ? "No results found" : "Type to search"}
                      </CommandEmpty>
                      {companyOptions.length > 0 && (
                        <CommandGroup heading="Companies">
                          {companyOptions.map((company) => (
                            <CommandItem
                              key={`company-${company.id}`}
                              value={`company-${company.id}`}
                              onSelect={() => handleOrgSelect({ id: company.id, name: company.name, type: "company" })}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedOrg?.type === "company" && selectedOrg?.id === company.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{company.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {agencyOptions.length > 0 && (
                        <CommandGroup heading="Agencies">
                          {agencyOptions.map((agency) => (
                            <CommandItem
                              key={`agency-${agency.id}`}
                              value={`agency-${agency.id}`}
                              onSelect={() => handleOrgSelect({ id: agency.id, name: agency.name, type: "agency" })}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedOrg?.type === "agency" && selectedOrg?.id === agency.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{agency.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="h-5 w-px bg-border mx-0.5" />

              {/* Unified Date Range Picker */}
              <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 gap-1.5 font-normal",
                      (startDate || endDate) ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {getDateRangeLabel()}
                    {(startDate || endDate) ? (
                      <X
                        className="h-3 w-3 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearDateRange()
                        }}
                      />
                    ) : (
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                  <div className="flex">
                    {/* Presets sidebar */}
                    <div className="border-r w-[160px] py-2 space-y-0.5">
                      <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Quick select</p>
                      {datePresets.map((preset, i) => (
                        <button
                          key={preset.label}
                          onClick={() => handleDatePreset(preset)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                            activePreset === preset.label && "bg-accent font-medium",
                            i === 4 && "mb-1 pb-2 border-b",
                            i === 6 && "mb-1 pb-2 border-b",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {(startDate || endDate) && (
                        <button
                          onClick={clearDateRange}
                          className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border-t mt-1 pt-2"
                        >
                          Clear dates
                        </button>
                      )}
                    </div>
                    {/* Calendar + range display */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">From</p>
                          <p className="text-sm font-medium tabular-nums">
                            {startDate ? format(startDate, "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                        <div className="text-muted-foreground text-xs">→</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">To</p>
                          <p className="text-sm font-medium tabular-nums">
                            {endDate ? format(endDate, "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={handleCalendarSelect}
                        month={datePickerMonth}
                        onMonthChange={setDatePickerMonth}
                        disabled={(date) => date > new Date()}
                        modifiers={{
                          range_start: startDate ? [startDate] : [],
                          range_end: endDate ? [endDate] : [],
                          range_middle: startDate && endDate
                            ? (date: Date) => date > startDate && date < endDate
                            : () => false,
                        }}
                        modifiersClassNames={{
                          range_start: "bg-primary text-primary-foreground rounded-l-md rounded-r-none",
                          range_end: "bg-primary text-primary-foreground rounded-r-md rounded-l-none",
                          range_middle: "bg-accent text-accent-foreground rounded-none",
                        }}
                        autoFocus
                      />
                      {startDate && !endDate && (
                        <p className="text-xs text-muted-foreground text-center mt-1">Select end date</p>
                      )}
                      {startDate && endDate && !activePreset && (
                        <div className="flex justify-end mt-2">
                          <Button size="sm" className="h-7 text-xs" onClick={handleApplyCustomRange}>
                            Apply range
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Rows per page — right-aligned */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(filters.page_size || 20)}
                  onValueChange={(val) => setFilters((prev) => ({ ...prev, page_size: Number(val), page: 1 }))}
                >
                  <SelectTrigger className="h-8 w-[68px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {[20, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter pills */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5">
                {filters.status && filters.status !== "all" && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                    Status: {filters.status}
                    <button onClick={() => handleStatusFilter("all")} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.payment_method && filters.payment_method !== "all" && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                    Method: {getPaymentMethodLabel(filters.payment_method)}
                    <button onClick={() => handlePaymentMethodFilter("all")} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedOrg && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                    {selectedOrg.type === "company" ? "Company" : "Agency"}: {selectedOrg.name}
                    <button onClick={() => handleOrgSelect(null)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(startDate || endDate) && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                    <CalendarIcon className="h-3 w-3 mr-0.5" />
                    {getDateRangeLabel()}
                    <button onClick={clearDateRange} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.search && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                    Search: &quot;{filters.search}&quot;
                    <button
                      onClick={() => {
                        setSearchInput("")
                        setFilters((prev) => ({ ...prev, search: "", page: 1 }))
                      }}
                      className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedIds.size}</span>{" "}
                  {selectedIds.size === 1 ? "transaction" : "transactions"} selected
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleBulkDownloadPdf}
                    disabled={isBulkDownloadingPdf}
                  >
                    {isBulkDownloadingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => handleBulkExport("csv")}
                    disabled={isExporting}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => handleBulkExport("xlsx")}
                    disabled={isExporting}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Excel
                  </Button>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleBulkPrint}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No transactions found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={transactions.length > 0 && selectedIds.size === transactions.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Company / Agency</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">
                        <button
                          onClick={() => handleSort("amount")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Amount
                          {getSortIcon("amount")}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("status")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Status
                          {getSortIcon("status")}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("created_at")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Date
                          {getSortIcon("created_at")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn) => (
                      <TableRow key={txn.id} className={cn(selectedIds.has(txn.id) && "bg-muted/30")}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(txn.id)}
                            onCheckedChange={() => toggleSelect(txn.id)}
                            aria-label={`Select ${txn.invoice_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{txn.invoice_number}</TableCell>
                        <TableCell className="font-medium">{txn.company?.name || txn.agency?.name || "—"}</TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[200px] block">{txn.description || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">{getTransactionMethod(txn)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(txn.amount, txn.currency)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusBadgeClass(txn.status)}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(txn.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingTransaction(txn)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {(txn.status === "completed" || txn.status === "refunded") && (
                                <DropdownMenuItem
                                  onClick={() => handleDownloadInvoice(String(txn.id), txn.invoice_number)}
                                  disabled={isDownloadingInvoice === String(txn.id)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {isDownloadingInvoice === String(txn.id) ? "Downloading..." : "Download Invoice"}
                                </DropdownMenuItem>
                              )}
                              {txn.status === "failed" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRetry(String(txn.id))}
                                    disabled={isRetrying === String(txn.id)}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {isRetrying === String(txn.id) ? "Retrying..." : "Retry Payment"}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {txn.status === "completed" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setRefundingTransaction(txn)}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Issue Refund
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.count > 0 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {((pagination.page - 1) * (filters.page_size || 20) + 1).toLocaleString()}
                      </span>
                      –
                      <span className="font-medium text-foreground tabular-nums">
                        {Math.min(pagination.page * (filters.page_size || 20), pagination.count).toLocaleString()}
                      </span>
                      {" "}of{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {pagination.count.toLocaleString()}
                      </span>
                    </p>
                    {pagination.total_pages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pagination.page === 1}
                          onClick={() => handlePageChange(1)}
                        >
                          <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pagination.page === 1}
                          onClick={() => handlePageChange(pagination.page - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        {(() => {
                          const pages: (number | string)[] = []
                          const total = pagination.total_pages
                          const current = pagination.page
                          if (total <= 7) {
                            for (let i = 1; i <= total; i++) pages.push(i)
                          } else {
                            pages.push(1)
                            if (current > 3) pages.push("…")
                            const start = Math.max(2, current - 1)
                            const end = Math.min(total - 1, current + 1)
                            for (let i = start; i <= end; i++) pages.push(i)
                            if (current < total - 2) pages.push("…")
                            pages.push(total)
                          }
                          return pages.map((p, idx) =>
                            typeof p === "string" ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                                {p}
                              </span>
                            ) : (
                              <Button
                                key={p}
                                variant={p === current ? "default" : "outline"}
                                size="icon"
                                className={cn("h-7 w-7 text-xs", p === current && "pointer-events-none")}
                                onClick={() => handlePageChange(p)}
                              >
                                {p}
                              </Button>
                            )
                          )
                        })()}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pagination.page === pagination.total_pages}
                          onClick={() => handlePageChange(pagination.page + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pagination.page === pagination.total_pages}
                          onClick={() => handlePageChange(pagination.total_pages)}
                        >
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Invoice Dialog */}
      <Dialog
        open={createInvoiceOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateInvoiceOpen(false)
            setInvoiceCompany(null)
            setInvoiceCompanySearch("")
            setInvoiceAmount("")
            setInvoiceDescription("")
            setInvoiceDueDate("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Manual Invoice</DialogTitle>
            <DialogDescription>
              Generate a manual invoice for a company. This will create a pending transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Popover open={invoiceCompanyOpen} onOpenChange={setInvoiceCompanyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {invoiceCompany ? invoiceCompany.name : "Search for a company..."}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search companies..."
                      value={invoiceCompanySearch}
                      onValueChange={setInvoiceCompanySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingInvoiceCompanies ? "Searching..." : "No companies found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {invoiceCompanies.map((company) => (
                          <CommandItem
                            key={company.id}
                            onSelect={() => {
                              setInvoiceCompany(company)
                              setInvoiceCompanyOpen(false)
                            }}
                          >
                            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{company.name}</p>
                            </div>
                            {invoiceCompany?.id === company.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-amount">Amount *</Label>
              <Input
                id="invoice-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-description">Description *</Label>
              <Textarea
                id="invoice-description"
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                placeholder="Invoice description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-due-date">Due Date *</Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateInvoiceOpen(false)} disabled={isCreatingInvoice}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={!invoiceCompany || !invoiceAmount || !invoiceDescription || !invoiceDueDate || isCreatingInvoice}
            >
              {isCreatingInvoice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={!!refundingTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setRefundingTransaction(null)
            setRefundAmount("")
            setRefundReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Refund transaction {refundingTransaction?.invoice_number} for{" "}
              {refundingTransaction?.company?.name || refundingTransaction?.agency?.name || "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Original Amount</Label>
              <p className="text-lg font-semibold">
                {refundingTransaction && formatCurrency(refundingTransaction.amount, refundingTransaction.currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount (leave blank for full refund)</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={refundingTransaction?.amount.toString()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason *</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter the reason for this refund..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundingTransaction(null)} disabled={isRefunding}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={!refundReason.trim() || isRefunding}
            >
              {isRefunding ? "Processing..." : "Issue Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewingTransaction} onOpenChange={(open) => !open && setViewingTransaction(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice #</p>
                  <p className="font-mono text-sm">{viewingTransaction.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={getStatusBadgeClass(viewingTransaction.status)}>
                    {viewingTransaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company / Agency</p>
                  <p className="font-medium">{viewingTransaction.company?.name || viewingTransaction.agency?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="capitalize">{viewingTransaction.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p>{getTransactionMethod(viewingTransaction)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatCurrency(viewingTransaction.amount, viewingTransaction.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{viewingTransaction.description || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p>{formatDate(viewingTransaction.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTransaction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>Download transaction data in your preferred format.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {pagination.count.toLocaleString()} transactions will be exported based on current filters.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Exporting..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ==========================================================================
// Sub Components
// ==========================================================================

function StatCard({
  title,
  value,
  change,
  subtitle,
  icon,
  gradient,
  bgAccent,
}: {
  title: string
  value: string
  change?: number
  subtitle?: string
  icon?: React.ReactNode
  gradient?: string
  bgAccent?: string
}) {
  return (
    <Card className="relative overflow-hidden group">
      {bgAccent && (
        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", bgAccent)} />
      )}
      {gradient && (
        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
      )}
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient ? (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {change !== undefined ? (
          <p className={cn("text-xs mt-1 flex items-center gap-1", change < 0 ? "text-red-600" : "text-green-600")}>
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change > 0 ? "+" : ""}{change}% from last month
          </p>
        ) : subtitle ? (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

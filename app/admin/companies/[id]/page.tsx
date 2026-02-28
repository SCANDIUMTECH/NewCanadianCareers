"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { CompanyAvatar } from "@/components/company-avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn, formatCurrency } from "@/lib/utils"
import { ChangePlanDialog } from "@/components/admin/change-plan-dialog"
import { AddCreditsDialog } from "@/components/admin/add-credits-dialog"
import {
  Briefcase,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Minus,
  CheckCircle2,
  Ban,
  Calendar,
  Globe,
  MapPin,
  ExternalLink,
  Mail,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { INDUSTRIES } from "@/lib/constants/industries"
import {
  getAdminCompany,
  updateAdminCompany,
  deleteAdminCompany,
  verifyCompany,
  suspendCompany,
  reactivateCompany,
  updateCompanyRiskLevel,
  contactCompany,
  getCompanyBilling,
  getCompanyEntitlements,
  adjustCompanyCredits,
  getCompanyInvoices,
  downloadCompanyInvoice,
  regenerateAdminInvoicePdf,
  toggleTeamManagement,
} from "@/lib/api/admin-companies"
import type {
  AdminCompanyDetail,
  AdminCompanyEntitlement,
  AdminCompanyUser,
  AdminCompanyJob,
  AdminCompanyInvoice,
  AdminCompanyStatus,
  AdminCompanyBillingStatus,
  AdminCompanyRiskLevel,
} from "@/lib/admin/types"
import type { Invoice } from "@/lib/company/types"

type CreditType = "job" | "featured" | "social"

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

// UI display type for company
interface CompanyDisplay {
  id: string
  name: string
  initials: string
  domain: string
  industry: string
  website: string
  contactEmail: string
  description: string
  location: string
  size: string
  verified: boolean
  featured: boolean
  status: AdminCompanyStatus | "suspended"
  billingStatus: AdminCompanyBillingStatus
  riskLevel: AdminCompanyRiskLevel
  createdAt: string
  totalJobs: number
  activeJobs: number
  totalApplications: number
  totalUsers: number
  hires: number
  entitlements: number
  plan: string
  totalSpend: string
}

// Transform API data to display format
function transformCompanyToDisplay(company: AdminCompanyDetail): CompanyDisplay {
  return {
    id: String(company.id),
    name: company.name,
    initials: company.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    domain: company.domain,
    industry: company.industry || "other",
    website: company.website || "",
    contactEmail: company.contact_email || "",
    description: company.description || "",
    location: company.address || "",
    size: company.size || "1-10",
    verified: company.status === "verified",
    featured: false, // Not provided by API
    status: company.status,
    billingStatus: company.billing_status,
    riskLevel: company.risk_level,
    createdAt: company.created_at,
    totalJobs: company.jobs?.length || 0,
    activeJobs: company.active_jobs_count || 0,
    totalApplications: company.jobs?.reduce((sum, j) => sum + j.applications, 0) || 0,
    totalUsers: company.users_count || company.users?.length || 0,
    hires: 0, // Not provided by API
    entitlements: company.subscription?.monthly_spend || 0,
    plan: company.subscription?.plan || "Free",
    totalSpend: company.subscription ? formatCurrency(company.subscription.monthly_spend) : "$0",
  }
}

// Transform API users to display format
function transformUsers(users: AdminCompanyUser[]) {
  return users.map((user) => ({
    id: String(user.id),
    name: user.full_name,
    email: user.email,
    role: user.role,
    lastLogin: user.last_login || "Never",
  }))
}

// Transform API jobs to display format
function transformJobs(jobs: AdminCompanyJob[]) {
  return jobs.map((job) => ({
    id: String(job.id),
    title: job.title,
    status: job.status === "published" ? "active" : job.status,
    applicants: job.applications,
    postedAt: job.posted_at,
  }))
}

// Transform API invoices to display format
function transformInvoices(invoices: AdminCompanyInvoice[]) {
  return invoices.map((invoice) => ({
    id: invoice.number,
    date: invoice.issued_at,
    amount: `$${invoice.amount.toFixed(2)}`,
    status: invoice.status,
  }))
}

// Format helpers — consistent across all admin detail pages
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function AdminCompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  // Data state
  const [company, setCompany] = useState<CompanyDisplay | null>(null)
  const [rawCompany, setRawCompany] = useState<AdminCompanyDetail | null>(null)
  const [users, setUsers] = useState<ReturnType<typeof transformUsers>>([])
  const [jobs, setJobs] = useState<ReturnType<typeof transformJobs>>([])
  const [invoices, setInvoices] = useState<ReturnType<typeof transformInvoices>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state (separate from display to prevent data loss on cancel)
  const [editData, setEditData] = useState({
    name: "",
    domain: "",
    industry: "",
    size: "",
    contactEmail: "",
    location: "",
    description: "",
    verified: false,
    featured: false,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Suspend form state
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendUsers, setSuspendUsers] = useState(false)
  const [suspendJobs, setSuspendJobs] = useState(true)

  // Billing dialog state
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [adjustCreditsOpen, setAdjustCreditsOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<{
    id: string | number
    credit_type: CreditType
    credits_remaining: number
  } | null>(null)

  // Billing data state
  const [billingInfo, setBillingInfo] = useState<{
    plan: string
    monthly_spend: number
    next_billing_date: string | null
    payment_method: string | null
  } | null>(null)
  const [entitlements, setEntitlements] = useState<AdminCompanyEntitlement[]>([])
  const [companyInvoices, setCompanyInvoices] = useState<Invoice[]>([])
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [regeneratingInvoiceId, setRegeneratingInvoiceId] = useState<string | null>(null)

  // Fetch company data
  const fetchCompany = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const companyData = await getAdminCompany(companyId)
      setRawCompany(companyData)
      const display = transformCompanyToDisplay(companyData)
      setCompany(display)
      setEditData({
        name: display.name,
        domain: display.domain,
        industry: display.industry,
        size: display.size,
        contactEmail: display.contactEmail,
        location: display.location,
        description: display.description,
        verified: display.verified,
        featured: display.featured,
      })
      setUsers(transformUsers(companyData.users || []))
      setJobs(transformJobs(companyData.jobs || []))
      setInvoices(transformInvoices(companyData.invoices || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company")
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  const fetchBillingData = useCallback(async () => {
    try {
      const [billing, ents, invs] = await Promise.all([
        getCompanyBilling(companyId),
        getCompanyEntitlements(companyId),
        getCompanyInvoices(companyId),
      ])
      setBillingInfo(billing)
      setEntitlements(ents)
      setCompanyInvoices(invs)
      setBillingLoaded(true)
    } catch {
      // Billing data is supplemental; don't block the page
    }
  }, [companyId])

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await downloadCompanyInvoice(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download invoice:', err)
      setError('Failed to download invoice PDF. Please try again.')
    }
  }

  const handleRegenerateInvoicePdf = async (invoiceId: string) => {
    try {
      setRegeneratingInvoiceId(invoiceId)
      await regenerateAdminInvoicePdf(invoiceId)
      // Update the invoice status locally to show generating state
      setCompanyInvoices(prev =>
        prev.map(inv =>
          inv.id === invoiceId ? { ...inv, pdf_status: 'generating' as const } : inv
        )
      )
    } catch (err) {
      console.error('Failed to regenerate invoice PDF:', err)
      setError('Failed to regenerate invoice PDF. Please try again.')
    } finally {
      setRegeneratingInvoiceId(null)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  const handleSave = async () => {
    if (!company) return
    try {
      setIsSubmitting(true)
      await updateAdminCompany(company.id, {
        name: editData.name,
        domain: editData.domain,
        contact_email: editData.contactEmail,
        industry: editData.industry,
        size: editData.size,
      })
      setIsEditing(false)
      toast.success("Company updated successfully")
      await fetchCompany()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save company")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEditing = () => {
    if (!company) return
    // Reset editData to current company state before editing
    setEditData({
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      contactEmail: company.contactEmail,
      location: company.location,
      description: company.description,
      verified: company.verified,
      featured: company.featured,
    })
    setIsEditing(true)
  }

  const handleVerify = async () => {
    if (!company) return
    try {
      setIsSubmitting(true)
      await verifyCompany(company.id)
      setVerifyDialogOpen(false)
      toast.success("Company verified successfully")
      await fetchCompany()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify company")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuspend = async () => {
    if (!company) return
    try {
      setIsSubmitting(true)
      if (company.billingStatus === "suspended") {
        await reactivateCompany(company.id, "Reactivated by admin")
        toast.success("Company reactivated successfully")
      } else {
        await suspendCompany(company.id, {
          reason: suspendReason,
          suspend_users: suspendUsers,
          suspend_jobs: suspendJobs,
        })
        toast.success("Company suspended successfully")
      }
      setSuspendDialogOpen(false)
      setSuspendReason("")
      setSuspendUsers(false)
      setSuspendJobs(true)
      await fetchCompany()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company status")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!company) return
    try {
      setIsSubmitting(true)
      await deleteAdminCompany(company.id)
      setDeleteDialogOpen(false)
      toast.success("Company deleted successfully")
      router.push("/admin/companies")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company")
      setIsSubmitting(false)
    }
  }

  // ==========================================================================
  // Credit Helpers
  // ==========================================================================

  const creditTypeLabels: Record<CreditType, string> = {
    job: "Job Credits",
    featured: "Featured Credits",
    social: "Social Credits",
  }

  const creditSummary = entitlements.reduce(
    (acc, ent) => {
      const type = ent.credit_type as CreditType
      if (!acc[type]) acc[type] = { total: 0, used: 0, remaining: 0 }
      acc[type].total += ent.credits_added
      acc[type].used += ent.credits_used
      acc[type].remaining += ent.credits_remaining
      return acc
    },
    {} as Record<CreditType, { total: number; used: number; remaining: number }>
  )

  const paymentMethodLabels: Record<string, string> = {
    stored_card: "Card",
    etransfer: "E-Transfer",
    invoice: "Invoice",
    phone_payment: "Phone",
    complimentary: "Complimentary",
  }

  // ==========================================================================
  // Stat Card Config
  // ==========================================================================

  const statCards = company
    ? [
        {
          label: "Active Jobs",
          value: company.activeJobs,
          icon: <Briefcase className="h-4 w-4" />,
          gradient: "from-blue-500 to-indigo-600",
          accent: "bg-blue-500",
        },
        {
          label: "Total Jobs",
          value: company.totalJobs,
          icon: <Briefcase className="h-4 w-4" />,
          gradient: "from-violet-500 to-purple-600",
          accent: "bg-violet-500",
        },
        {
          label: "Applications",
          value: company.totalApplications,
          icon: <FileText className="h-4 w-4" />,
          gradient: "from-emerald-500 to-teal-600",
          accent: "bg-emerald-500",
        },
        {
          label: "Users",
          value: company.totalUsers,
          icon: <Users className="h-4 w-4" />,
          gradient: "from-amber-500 to-orange-600",
          accent: "bg-amber-500",
        },
        {
          label: "Total Spend",
          value: company.totalSpend,
          icon: <DollarSign className="h-4 w-4" />,
          gradient: "from-pink-500 to-rose-600",
          accent: "bg-pink-500",
          isFormatted: true,
        },
      ]
    : []

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error && !company) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/admin/companies">Companies</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="p-8">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{error || "Company not found"}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/admin/companies")}>
                Back to Companies
              </Button>
              <Button onClick={fetchCompany}>Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!company) return null

  const getStatusBadge = () => {
    switch (company.status) {
      case "verified":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Verified</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      case "unverified":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Unverified</Badge>
      case "suspended":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
      default:
        return null
    }
  }

  const getRiskBadge = () => {
    switch (company.riskLevel) {
      case "low":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Low Risk</Badge>
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Medium Risk</Badge>
      case "high":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">High Risk</Badge>
      default:
        return null
    }
  }

  const getBillingBadge = () => {
    switch (company.billingStatus) {
      case "active":
        return <Badge variant="outline" className="border-green-200 text-green-700">Active</Badge>
      case "suspended":
        return <Badge variant="outline" className="border-red-200 text-red-700">Suspended</Badge>
      case "trial":
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Trial</Badge>
      default:
        return null
    }
  }

  const isSuspendValid = suspendReason.trim().length > 0

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Breadcrumb */}
      <motion.div variants={itemVariants}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/admin/companies">Companies</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{company.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
              <span className="text-lg font-bold text-white">
                {company.initials}
              </span>
            </div>
            {company.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              {getStatusBadge()}
              {getBillingBadge()}
              {getRiskBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{company.domain}</span>
              <span>·</span>
              <span className="capitalize">{company.industry}</span>
              <span>·</span>
              <span className="font-mono text-xs">CMP-{String(company.id).padStart(3, "0")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleStartEditing}
              >
                Edit Company
              </Button>
              {company.status !== "verified" && (
                <Button
                  variant="outline"
                  onClick={() => setVerifyDialogOpen(true)}
                  className="text-emerald-600 border-emerald-500/20 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSuspendDialogOpen(true)}
                className={company.billingStatus === "suspended" ? "text-emerald-600" : "text-amber-600"}
              >
                <Ban className="mr-2 h-4 w-4" />
                {company.billingStatus === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden group border-border/50">
            <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", stat.accent)} />
            <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", stat.gradient)}>
                  {stat.icon}
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                {stat.isFormatted ? stat.value : Number(stat.value).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div variants={itemVariants} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="profile" className="space-y-6" onValueChange={(value) => {
          if (value === "billing" && !billingLoaded) fetchBillingData()
        }}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Info */}
              <Card className="lg:col-span-2 border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={isEditing ? editData.name : company.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Input
                        value={isEditing ? editData.domain : company.domain}
                        onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={isEditing ? editData.industry : company.industry}
                        onValueChange={(value) => setEditData({ ...editData, industry: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => (
                            <SelectItem key={ind.value} value={ind.value}>
                              {ind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Company Size</Label>
                      <Select
                        value={isEditing ? editData.size : company.size}
                        onValueChange={(value) => setEditData({ ...editData, size: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500+">500+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input
                        value={isEditing ? editData.contactEmail : company.contactEmail}
                        onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={isEditing ? editData.location : company.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={isEditing ? editData.description : company.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      disabled={!isEditing}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Verified Company</Label>
                        <p className="text-sm text-muted-foreground">Company has been verified</p>
                      </div>
                      <Switch
                        checked={company.verified}
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Featured Company</Label>
                        <p className="text-sm text-muted-foreground">Show in featured listings</p>
                      </div>
                      <Switch
                        checked={isEditing ? editData.featured : company.featured}
                        onCheckedChange={(checked) => setEditData({ ...editData, featured: checked })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Details */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      Entitlements
                    </span>
                    <span className="font-medium text-foreground tabular-nums">{company.entitlements}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Total Hires
                    </span>
                    <span className="font-medium text-foreground tabular-nums">{company.hires}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Risk Level
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          company.riskLevel === "low" && "bg-green-500",
                          company.riskLevel === "medium" && "bg-amber-500",
                          company.riskLevel === "high" && "bg-red-500"
                        )}
                      />
                      <span className="font-medium text-foreground capitalize">{company.riskLevel}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Created
                      </span>
                      <span className="font-medium text-foreground">{formatDate(company.createdAt)}</span>
                    </div>
                    {company.website && (
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </span>
                        <a
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {company.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {company.location && (
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          Location
                        </span>
                        <span className="font-medium text-foreground">{company.location}</span>
                      </div>
                    )}
                    {company.contactEmail && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          Contact
                        </span>
                        <span className="font-medium text-foreground text-sm">{company.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Company Users</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Team members will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="group/row">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {user.name.split(" ").map(n => n[0]).join("")}
                                </span>
                              </div>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/users/${user.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Company Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No jobs found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Posted jobs will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applicants</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id} className="group/row">
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                job.status === "active" && "bg-emerald-500/10 text-emerald-600",
                                job.status === "published" && "bg-emerald-500/10 text-emerald-600",
                                job.status === "paused" && "bg-amber-500/10 text-amber-600",
                                job.status === "closed" && "bg-gray-500/10 text-gray-600",
                                job.status === "expired" && "bg-gray-500/10 text-gray-600"
                              )}
                            >
                              {job.status === "active" || job.status === "published" ? "Active" : job.status === "paused" ? "Paused" : "Closed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{job.applicants}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(job.postedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/jobs/${job.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {!billingLoaded ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-border/50">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-2 w-full rounded-full" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Skeleton className="h-64" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Skeleton className="lg:col-span-1 h-64" />
                  <Skeleton className="lg:col-span-2 h-64" />
                </div>
              </div>
            ) : (
            <>
            {/* Credit Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["job", "featured", "social"] as CreditType[]).map((type) => {
                const summary = creditSummary[type] || { total: 0, used: 0, remaining: 0 }
                const utilization = summary.total > 0 ? Math.round((summary.used / summary.total) * 100) : 0
                const colorMap = {
                  job: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-500/10", gradient: "from-blue-500 to-indigo-600" },
                  featured: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-500/10", gradient: "from-purple-500 to-violet-600" },
                  social: { bg: "bg-pink-500", text: "text-pink-600", light: "bg-pink-500/10", gradient: "from-pink-500 to-rose-600" },
                }
                const colors = colorMap[type]
                return (
                  <Card key={type} className="relative overflow-hidden group border-border/50">
                    <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", colors.bg)} />
                    <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", colors.gradient)} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-foreground">{creditTypeLabels[type]}</p>
                        <Badge className={cn(colors.light, colors.text, "border-0 text-xs")}>
                          {utilization}% used
                        </Badge>
                      </div>
                      <p className="text-3xl font-bold tracking-tight text-foreground mb-2 tabular-nums">{summary.remaining}</p>
                      <div className="w-full bg-muted/50 rounded-full h-2 mb-2">
                        <div
                          className={cn("h-2 rounded-full transition-all", colors.bg)}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {summary.used} used of {summary.total} total
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Credit History Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Credit History</CardTitle>
              </CardHeader>
              <CardContent>
                {entitlements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No credit history yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Credit transactions will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Adjust</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entitlements.map((ent) => {
                          const isExpired = ent.expires_at ? new Date(ent.expires_at) < new Date() : false
                          const isDepleted = ent.credits_remaining <= 0
                          const entStatus = isExpired ? "expired" : isDepleted ? "depleted" : "active"
                          return (
                            <TableRow key={ent.id}>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(ent.created_at)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    ent.credit_type === "job" && "bg-blue-500/10 text-blue-600",
                                    ent.credit_type === "featured" && "bg-purple-500/10 text-purple-600",
                                    ent.credit_type === "social" && "bg-pink-500/10 text-pink-600"
                                  )}
                                >
                                  {ent.credit_type === "job" ? "Job" : ent.credit_type === "featured" ? "Featured" : "Social"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-emerald-600 font-medium">+{ent.credits_added}</span>
                                {ent.credits_used > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({ent.credits_remaining} left)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {paymentMethodLabels[ent.payment_method] || ent.payment_method || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    entStatus === "active" && "bg-emerald-500/10 text-emerald-600",
                                    entStatus === "expired" && "bg-gray-500/10 text-gray-600",
                                    entStatus === "depleted" && "bg-amber-500/10 text-amber-600"
                                  )}
                                >
                                  {entStatus === "active" ? "Active" : entStatus === "expired" ? "Expired" : "Depleted"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                                {ent.admin_email || "—"}
                              </TableCell>
                              <TableCell className="text-sm max-w-[150px] truncate" title={ent.reason}>
                                {ent.reason || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {ent.expires_at ? formatDate(ent.expires_at) : "Never"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={ent.credits_remaining <= 0}
                                  onClick={() => {
                                    setAdjustTarget({
                                      id: ent.id,
                                      credit_type: ent.credit_type as CreditType,
                                      credits_remaining: ent.credits_remaining,
                                    })
                                    setAdjustCreditsOpen(true)
                                  }}
                                  title="Adjust credits"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription + Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subscription Card */}
              <Card className="border-border/50 lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Plan</span>
                    <span className="font-medium text-foreground">{billingInfo?.plan || company.plan}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Monthly Spend</span>
                    <span className="font-medium text-foreground">
                      {billingInfo ? formatCurrency(billingInfo.monthly_spend) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Next Billing</span>
                    <span className="font-medium text-foreground">
                      {billingInfo?.next_billing_date
                        ? formatDate(billingInfo.next_billing_date)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium text-foreground">
                      {billingInfo?.payment_method || "None"}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setChangePlanOpen(true)}
                    >
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAddCreditsOpen(true)}
                    >
                      Add Credits
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      Update Payment Method
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card className="border-border/50 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Invoices & Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  {companyInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No invoices yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Invoices will appear here after purchases</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium font-mono text-sm">{invoice.number}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {invoice.created_at ? formatDate(invoice.created_at) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm">{invoice.description}</TableCell>
                              <TableCell className="font-medium tabular-nums">
                                {formatCurrency(invoice.amount, invoice.currency, { decimals: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    invoice.status === "paid" && "bg-emerald-500/10 text-emerald-600",
                                    invoice.status === "open" && "bg-amber-500/10 text-amber-600",
                                    invoice.status === "draft" && "bg-gray-500/10 text-gray-600",
                                    invoice.status === "void" && "bg-red-500/10 text-red-600",
                                    invoice.status === "uncollectible" && "bg-red-500/10 text-red-600"
                                  )}
                                >
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {invoice.pdf_status === 'available' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadInvoice(invoice.id, invoice.number)}
                                    title="Download PDF"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    PDF
                                  </Button>
                                ) : invoice.pdf_status === 'generating' ? (
                                  <Button variant="ghost" size="sm" disabled>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRegenerateInvoicePdf(invoice.id)}
                                    disabled={regeneratingInvoiceId === invoice.id}
                                    title="Generate PDF"
                                  >
                                    {regeneratingInvoiceId === invoice.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                    )}
                                    Generate
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            </>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Risk Assessment */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Risk Level</p>
                    <p className="text-sm text-muted-foreground">Current risk assessment for this company</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        company.riskLevel === "low" && "bg-green-500",
                        company.riskLevel === "medium" && "bg-amber-500",
                        company.riskLevel === "high" && "bg-red-500"
                      )}
                    />
                    <span className="font-medium text-foreground capitalize">{company.riskLevel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Overrides */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Feature Overrides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Team Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Override: enable team management regardless of subscription package
                    </p>
                  </div>
                  <Switch
                    checked={rawCompany?.team_management_enabled ?? false}
                    onCheckedChange={async (checked) => {
                      try {
                        await toggleTeamManagement(companyId, checked)
                        setRawCompany(prev => prev ? { ...prev, team_management_enabled: checked } : null)
                        toast.success(`Team management ${checked ? "enabled" : "disabled"}`)
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update team management')
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <p className="font-medium text-foreground">
                      {company.billingStatus === "suspended" ? "Reactivate Company" : "Suspend Company"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {company.billingStatus === "suspended"
                        ? "Allow this company to access their account again"
                        : "Temporarily prevent this company and its users from accessing the platform"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSuspendDialogOpen(true)}
                    className={company.billingStatus === "suspended" ? "text-emerald-600 border-emerald-500/20" : "text-amber-600 border-amber-500/20"}
                  >
                    {company.billingStatus === "suspended" ? "Reactivate" : "Suspend"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground">Delete Company</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this company and all associated data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Company
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Company</DialogTitle>
            <DialogDescription>
              Confirm verification for {company.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CompanyAvatar name={company.name} size="xs" />
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-sm text-muted-foreground">{company.domain}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Verification checklist:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Domain ownership confirmed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Business registration validated
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Contact information verified
                </li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
              Verified companies gain a verified badge on their job postings and access to premium features.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify} className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Company"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={(open) => {
        setSuspendDialogOpen(open)
        if (!open) {
          setSuspendReason("")
          setSuspendUsers(false)
          setSuspendJobs(true)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {company.billingStatus === "suspended" ? "Reactivate Company" : "Suspend Company"}
            </DialogTitle>
            <DialogDescription>
              {company.billingStatus === "suspended"
                ? `Are you sure you want to reactivate ${company.name}? They will regain access to the platform.`
                : `Suspend ${company.name}'s account and related activities.`}
            </DialogDescription>
          </DialogHeader>
          {company.billingStatus !== "suspended" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CompanyAvatar name={company.name} size="xs" />
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.domain}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="suspend-reason">Reason for suspension *</Label>
                <Textarea
                  id="suspend-reason"
                  placeholder="Enter the reason for suspending this company..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suspend-users"
                    checked={suspendUsers}
                    onCheckedChange={(checked) => setSuspendUsers(checked as boolean)}
                  />
                  <Label htmlFor="suspend-users" className="text-sm font-normal cursor-pointer">
                    Suspend all company users ({company.totalUsers} users)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suspend-jobs"
                    checked={suspendJobs}
                    onCheckedChange={(checked) => setSuspendJobs(checked as boolean)}
                  />
                  <Label htmlFor="suspend-jobs" className="text-sm font-normal cursor-pointer">
                    Suspend all active jobs ({company.activeJobs} jobs)
                  </Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={(company.billingStatus !== "suspended" && !isSuspendValid) || isSubmitting}
              className={company.billingStatus === "suspended"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {company.billingStatus === "suspended" ? "Reactivating..." : "Suspending..."}
                </>
              ) : (
                company.billingStatus === "suspended" ? "Reactivate Company" : "Suspend Company"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {company.name}?
              This action cannot be undone. All jobs, applications, and team members will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Company"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <ChangePlanDialog
        company={{
          id: company.id,
          name: company.name,
          currentPlan: company.plan,
        }}
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        onSuccess={() => fetchCompany()}
      />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        company={{
          id: company.id,
          name: company.name,
        }}
        open={addCreditsOpen}
        onOpenChange={setAddCreditsOpen}
        onSuccess={() => {
          fetchCompany()
          fetchBillingData()
        }}
      />

      {/* Adjust Credits Dialog */}
      {adjustTarget && (
        <AddCreditsDialog
          company={{
            id: company.id,
            name: company.name,
          }}
          open={adjustCreditsOpen}
          onOpenChange={(open) => {
            setAdjustCreditsOpen(open)
            if (!open) setAdjustTarget(null)
          }}
          onSuccess={() => {
            fetchCompany()
            fetchBillingData()
          }}
          mode="adjust"
          entitlement={adjustTarget}
        />
      )}
    </motion.div>
  )
}

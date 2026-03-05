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
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Briefcase,
  Building2,
  Users,
  Award,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  Minus,
  CheckCircle2,
  Ban,
  Mail,
  ExternalLink,
  Calendar,
  Globe,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAdminAgency,
  updateAdminAgency,
  deleteAdminAgency,
  verifyAgency,
  suspendAgency,
  reactivateAgency,
  changeAgencyBillingModel,
  updateAgencyRiskLevel,
  contactAgency,
  getAgencyBilling,
  getAgencyInvoices,
  getAgencyEntitlements,
  downloadAgencyInvoice,
  regenerateAdminInvoicePdf,
  toggleAgencyTeamManagement,
} from "@/lib/api/admin-agencies"
import { ChangePlanDialog } from "@/components/admin/change-plan-dialog"
import { AddCreditsDialog } from "@/components/admin/add-credits-dialog"
import type {
  AdminAgencyDetail,
  AdminAgencyEntitlement,
  AdminAgencyStatus,
  AdminAgencyBillingStatus,
  AdminAgencyBillingModel,
  AdminAgencyRiskLevel,
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

export default function AdminAgencyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agencyId = params.id as string

  // Data state
  const [agency, setAgency] = useState<AdminAgencyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: "",
    industry: "",
    website: "",
    location: "",
    size: "",
    description: "",
    verified: false,
    featured: false,
  })

  // Dialog states
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [adjustCreditsOpen, setAdjustCreditsOpen] = useState(false)

  // Action loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isSuspending, setIsSuspending] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isContacting, setIsContacting] = useState(false)
  const [isChangingBilling, setIsChangingBilling] = useState(false)
  const [isChangingRisk, setIsChangingRisk] = useState(false)

  const [billingInfo, setBillingInfo] = useState<{
    plan: string
    monthly_spend: number
    next_billing_date: string | null
    payment_method: string | null
  } | null>(null)
  const [agencyInvoices, setAgencyInvoices] = useState<Invoice[]>([])
  const [entitlements, setEntitlements] = useState<AdminAgencyEntitlement[]>([])
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [regeneratingInvoiceId, setRegeneratingInvoiceId] = useState<string | null>(null)

  // Team management override
  const [teamManagementEnabled, setTeamManagementEnabled] = useState(false)
  const [teamManagementError, setTeamManagementError] = useState<string | null>(null)

  // Suspend form state
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendTeam, setSuspendTeam] = useState(false)
  const [suspendJobs, setSuspendJobs] = useState(true)

  // Reactivate form state
  const [reactivateReason, setReactivateReason] = useState("")

  // Contact form state
  const [contactSubject, setContactSubject] = useState("")
  const [contactMessage, setContactMessage] = useState("")

  // Billing change state
  const [newBillingModel, setNewBillingModel] = useState<AdminAgencyBillingModel>("agency_pays")

  // Risk change state
  const [newRiskLevel, setNewRiskLevel] = useState<AdminAgencyRiskLevel>("low")
  const [riskReason, setRiskReason] = useState("")

  // Adjust credits target
  const [adjustTarget, setAdjustTarget] = useState<{
    id: string | number
    credit_type: CreditType
    credits_remaining: number
  } | null>(null)

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchAgency = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAdminAgency(agencyId)
      setAgency({
        ...data,
        clients: data.clients ?? [],
        jobs: data.jobs ?? [],
        team_members: data.team_members ?? [],
      })
      setEditData({
        name: data.name,
        industry: data.industry || "",
        website: data.website || "",
        location: data.location || "",
        size: data.size || "",
        description: data.description || "",
        verified: data.status === "verified",
        featured: data.featured || false,
      })
      setTeamManagementEnabled(data.team_management_enabled ?? false)
    } catch (err) {
      console.error("Failed to fetch agency:", err)
      setError("Failed to load agency details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    fetchAgency()
  }, [fetchAgency])

  const fetchBillingData = useCallback(async () => {
    try {
      const [billing, invs, ents] = await Promise.all([
        getAgencyBilling(agencyId),
        getAgencyInvoices(agencyId),
        getAgencyEntitlements(agencyId).catch(() => [] as AdminAgencyEntitlement[]),
      ])
      setBillingInfo(billing)
      setAgencyInvoices(invs)
      setEntitlements(ents)
      setBillingLoaded(true)
    } catch {
      // Billing data is supplemental; don't block the page
    }
  }, [agencyId])

  // ==========================================================================
  // Form Reset Helpers
  // ==========================================================================

  const resetSuspendForm = () => {
    setSuspendReason("")
    setSuspendTeam(false)
    setSuspendJobs(true)
  }

  const resetContactForm = () => {
    setContactSubject("")
    setContactMessage("")
  }

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  const handleSave = async () => {
    if (!agency) return
    setIsSaving(true)
    try {
      const updated = await updateAdminAgency(agencyId, {
        name: editData.name,
        industry: editData.industry || undefined,
        website: editData.website || undefined,
        location: editData.location || undefined,
        description: editData.description || undefined,
      })
      setAgency(updated)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update agency:", err)
      toast.error("Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await downloadAgencyInvoice(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download invoice:", err)
      toast.error("Failed to download invoice PDF")
    }
  }

  const handleRegenerateInvoicePdf = async (invoiceId: string) => {
    try {
      setRegeneratingInvoiceId(invoiceId)
      await regenerateAdminInvoicePdf(invoiceId)
      setAgencyInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, pdf_status: "generating" as const } : inv
        )
      )
    } catch {
      toast.error("Failed to regenerate invoice PDF")
    } finally {
      setRegeneratingInvoiceId(null)
    }
  }

  const handleSuspend = async () => {
    if (!agency) return
    setIsSuspending(true)
    try {
      const updated = await suspendAgency(agencyId, {
        reason: suspendReason,
        suspend_team: suspendTeam,
        suspend_jobs: suspendJobs,
      })
      setAgency(updated)
      setSuspendDialogOpen(false)
      resetSuspendForm()
    } catch (err) {
      console.error("Failed to suspend agency:", err)
      toast.error("Failed to suspend agency. Please try again.")
    } finally {
      setIsSuspending(false)
    }
  }

  const handleReactivate = async () => {
    if (!agency) return
    setIsReactivating(true)
    try {
      const updated = await reactivateAgency(agencyId, reactivateReason || undefined)
      setAgency(updated)
      setReactivateDialogOpen(false)
      setReactivateReason("")
    } catch (err) {
      console.error("Failed to reactivate agency:", err)
      toast.error("Failed to reactivate agency. Please try again.")
    } finally {
      setIsReactivating(false)
    }
  }

  const handleVerify = async () => {
    if (!agency) return
    setIsVerifying(true)
    try {
      const updated = await verifyAgency(agencyId)
      setAgency(updated)
      setVerifyDialogOpen(false)
    } catch (err) {
      console.error("Failed to verify agency:", err)
      toast.error("Failed to verify agency. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDelete = async () => {
    if (!agency) return
    setIsDeleting(true)
    try {
      await deleteAdminAgency(agencyId)
      router.push("/admin/agencies")
    } catch (err) {
      console.error("Failed to delete agency:", err)
      toast.error("Failed to delete agency. Please try again.")
      setIsDeleting(false)
    }
  }

  const handleContact = async () => {
    if (!agency) return
    setIsContacting(true)
    try {
      await contactAgency(agencyId, {
        subject: contactSubject,
        message: contactMessage,
      })
      setContactDialogOpen(false)
      resetContactForm()
      toast.success("Message sent successfully.")
    } catch (err) {
      console.error("Failed to contact agency:", err)
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsContacting(false)
    }
  }

  const handleChangeBilling = async () => {
    if (!agency) return
    setIsChangingBilling(true)
    try {
      const updated = await changeAgencyBillingModel(agencyId, newBillingModel)
      setAgency(updated)
      setBillingDialogOpen(false)
    } catch (err) {
      console.error("Failed to change billing model:", err)
      toast.error("Failed to change billing model. Please try again.")
    } finally {
      setIsChangingBilling(false)
    }
  }

  const handleChangeRisk = async () => {
    if (!agency) return
    setIsChangingRisk(true)
    try {
      const updated = await updateAgencyRiskLevel(agencyId, newRiskLevel, riskReason || undefined)
      setAgency(updated)
      setRiskDialogOpen(false)
      setRiskReason("")
    } catch (err) {
      console.error("Failed to change risk level:", err)
      toast.error("Failed to change risk level. Please try again.")
    } finally {
      setIsChangingRisk(false)
    }
  }

  const handleToggleTeamManagement = async (enabled: boolean) => {
    setTeamManagementError(null)
    try {
      const result = await toggleAgencyTeamManagement(agencyId, enabled)
      setTeamManagementEnabled(result.team_management_enabled)
      toast.success(result.message || `Team management ${enabled ? "enabled" : "disabled"}`)
    } catch (err) {
      setTeamManagementError(err instanceof Error ? err.message : "Failed to update")
      toast.error("Failed to toggle team management")
    }
  }

  const handleToggleFeatured = async (featured: boolean) => {
    if (!agency) return
    try {
      const updated = await updateAdminAgency(agencyId, { featured })
      setAgency(updated)
      toast.success(`Agency ${featured ? "featured" : "unfeatured"} successfully`)
    } catch {
      toast.error("Failed to update featured status")
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
  // Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: AdminAgencyStatus | AdminAgencyBillingStatus) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "active":
      case "trial":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "suspended":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Review</Badge>
      case "unverified":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Unverified</Badge>
      default:
        return null
    }
  }

  const getRiskBadge = (risk: AdminAgencyRiskLevel) => {
    switch (risk) {
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

  // ==========================================================================
  // Stat Card Config
  // ==========================================================================

  const statCards = agency
    ? [
        {
          label: "Active Jobs",
          value: agency.active_jobs_count ?? 0,
          icon: <Briefcase className="h-4 w-4" />,
          gradient: "from-sky to-sky-deep",
          accent: "bg-sky",
        },
        {
          label: "Total Jobs",
          value: agency.total_jobs_count ?? agency.job_count ?? 0,
          icon: <Briefcase className="h-4 w-4" />,
          gradient: "from-primary-light to-primary",
          accent: "bg-primary",
        },
        {
          label: "Clients",
          value: agency.client_count ?? 0,
          icon: <Building2 className="h-4 w-4" />,
          gradient: "from-emerald-500 to-teal-600",
          accent: "bg-emerald-500",
        },
        {
          label: "Placements",
          value: agency.total_placements ?? 0,
          icon: <Award className="h-4 w-4" />,
          gradient: "from-amber-500 to-orange-600",
          accent: "bg-amber-500",
        },
        {
          label: "Job Credits",
          value: agency.job_credits_remaining ?? 0,
          icon: <CreditCard className="h-4 w-4" />,
          gradient: "from-destructive to-destructive-deep",
          accent: "bg-destructive",
        },
        {
          label: "Monthly Volume",
          value: formatCurrency(agency.monthly_volume ?? 0),
          icon: <DollarSign className="h-4 w-4" />,
          gradient: "from-sky to-sky-deep",
          accent: "bg-sky",
          isFormatted: true,
        },
      ]
    : []

  // ==========================================================================
  // Loading State
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-2 h-8 w-16" />
                <Skeleton className="mt-1 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // ==========================================================================
  // Error State
  // ==========================================================================

  if (error || !agency) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/admin/agencies">Agencies</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="p-8">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{error || "Agency not found"}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/admin/agencies")}>
                Back to Agencies
              </Button>
              <Button onClick={fetchAgency}>Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  const isSuspended = agency.billing_status === "suspended"

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
              <BreadcrumbLink asChild><Link href="/admin/agencies">Agencies</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{agency.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              {agency.logo ? (
                <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white">
                  {agency.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {agency.status === "verified" && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{agency.name}</h1>
              {getStatusBadge(agency.billing_status || agency.status)}
              {getRiskBadge(agency.risk_level)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {agency.industry && <span>{agency.industry}</span>}
              {agency.industry && agency.location && <span>·</span>}
              {agency.location && <span>{agency.location}</span>}
              <span>·</span>
              <span className="font-mono text-xs">AGY-{String(agency.id).padStart(3, "0")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Contact
              </Button>
              {agency.status !== "verified" && (
                <Button
                  variant="outline"
                  onClick={() => setVerifyDialogOpen(true)}
                  className="text-emerald-600 border-emerald-500/20 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Agency
              </Button>
              <Button
                variant="outline"
                onClick={() => (isSuspended ? setReactivateDialogOpen(true) : setSuspendDialogOpen(true))}
                className={isSuspended ? "text-emerald-600" : "text-amber-600"}
              >
                <Ban className="mr-2 h-4 w-4" />
                {isSuspended ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs
          defaultValue="profile"
          className="space-y-6"
          onValueChange={(value) => {
            if (value === "billing" && !billingLoaded) fetchBillingData()
          }}
        >
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="clients">Clients ({agency.clients?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({agency.jobs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="team">Team ({agency.team_members?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agency Info */}
              <Card className="lg:col-span-2 border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Agency Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agency Name</Label>
                      <Input
                        value={isEditing ? editData.name : agency.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        value={isEditing ? editData.industry : agency.industry || ""}
                        onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={isEditing ? editData.website : agency.website || ""}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={isEditing ? editData.location : agency.location || ""}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agency Size</Label>
                      <Input value={agency.size || "Not specified"} disabled className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Joined</Label>
                      <Input value={formatDate(agency.created_at)} disabled className="font-mono" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={isEditing ? editData.description : agency.description || ""}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      disabled={!isEditing}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Verified Agency</Label>
                        <p className="text-sm text-muted-foreground">Agency has been verified</p>
                      </div>
                      <Switch checked={agency.status === "verified"} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Featured Agency</Label>
                        <p className="text-sm text-muted-foreground">Show in featured listings</p>
                      </div>
                      <Switch
                        checked={agency.featured || false}
                        onCheckedChange={handleToggleFeatured}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Stats */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Billing Model
                    </span>
                    <Badge variant="outline">
                      {agency.billing_model === "agency_pays" ? "Agency Pays" : "Company Pays"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Team Size
                    </span>
                    <span className="font-medium text-foreground">{agency.team_members?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Award className="h-3.5 w-3.5" />
                      Risk Level
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          agency.risk_level === "low" && "bg-emerald-500",
                          agency.risk_level === "medium" && "bg-amber-500",
                          agency.risk_level === "high" && "bg-red-500"
                        )}
                      />
                      <span className="font-medium text-foreground capitalize">{agency.risk_level}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Created
                      </span>
                      <span className="font-medium text-foreground">{formatDate(agency.created_at)}</span>
                    </div>
                    {agency.website && (
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </span>
                        <a
                          href={agency.website.startsWith("http") ? agency.website : `https://${agency.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          Visit
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {agency.location && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          Location
                        </span>
                        <span className="font-medium text-foreground">{agency.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Client Companies</CardTitle>
              </CardHeader>
              <CardContent>
                {agency.clients?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No clients yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Client companies will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {agency.clients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-6 px-6 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {client.logo ? (
                              <AvatarImage src={client.logo} alt={client.company_name || client.name || "Client"} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(client.company_name || client.name || "CL").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{client.company_name || client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.industry || "Unknown industry"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-medium text-foreground tabular-nums">{client.active_jobs ?? client.jobs_count ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Active Jobs</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground tabular-nums">{client.total_placements ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Placements</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/companies/${client.company_id ?? client.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Job Listings</CardTitle>
              </CardHeader>
              <CardContent>
                {agency.jobs?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No jobs yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Posted jobs will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {agency.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-6 px-6 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">{job.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.client_company || "No client assigned"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={cn(
                              job.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : job.status === "draft"
                                  ? "bg-gray-500/10 text-gray-600 border-gray-500/20"
                                  : job.status === "paused"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : job.status === "expired"
                                      ? "bg-red-500/10 text-red-600 border-red-500/20"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}
                          >
                            {job.status === "published" ? "Active" : job.status}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/jobs/${job.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {agency.team_members?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No team members</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Invited team members will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {agency.team_members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-6 px-6 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(member.full_name || "TM")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{member.full_name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">{member.role}</Badge>
                          <Badge
                            className={cn(
                              member.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                              member.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                              member.status === "suspended" && "bg-red-500/10 text-red-600 border-red-500/20",
                              !["active", "pending", "suspended"].includes(member.status) && "bg-gray-500/10 text-gray-600 border-gray-500/20"
                            )}
                          >
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  job: { bg: "bg-sky", text: "text-sky", light: "bg-sky/10", gradient: "from-sky to-sky-deep" },
                  featured: { bg: "bg-primary", text: "text-primary", light: "bg-primary/10", gradient: "from-primary to-primary-hover" },
                  social: { bg: "bg-destructive", text: "text-destructive", light: "bg-destructive/10", gradient: "from-destructive to-destructive-deep" },
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
                          const isExpired = ent.expires_at && new Date(ent.expires_at) < new Date()
                          const isDepleted = ent.credits_remaining <= 0
                          const status = isExpired ? "expired" : isDepleted ? "depleted" : "active"
                          return (
                            <TableRow key={ent.id}>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(ent.created_at)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    ent.credit_type === "job" && "bg-sky/10 text-sky",
                                    ent.credit_type === "featured" && "bg-primary/10 text-primary",
                                    ent.credit_type === "social" && "bg-destructive/10 text-destructive"
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
                                {paymentMethodLabels[ent.payment_method] || ent.payment_method}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    status === "active" && "bg-emerald-500/10 text-emerald-600",
                                    status === "expired" && "bg-gray-500/10 text-gray-600",
                                    status === "depleted" && "bg-amber-500/10 text-amber-600"
                                  )}
                                >
                                  {status === "active" ? "Active" : status === "expired" ? "Expired" : "Depleted"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {ent.admin_email || "—"}
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={ent.reason}>
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
              <Card className="border-border/50 lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Plan</span>
                    <span className="font-medium text-foreground">{billingInfo?.plan || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Monthly Spend</span>
                    <span className="font-medium text-foreground">
                      {billingInfo ? `$${billingInfo.monthly_spend.toLocaleString()}` : "—"}
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
                  </div>
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card className="border-border/50 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Invoices & Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  {agencyInvoices.length === 0 ? (
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
                          {agencyInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium font-mono text-sm">{invoice.number}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {invoice.created_at ? formatDate(invoice.created_at) : "N/A"}
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
                                {invoice.pdf_status === "available" ? (
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
                                ) : invoice.pdf_status === "generating" ? (
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
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Billing Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Current Billing Model</p>
                    <p className="text-sm text-muted-foreground">How job posting costs are billed</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {agency.billing_model === "agency_pays" ? "Agency Pays" : "Company Pays"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewBillingModel(agency.billing_model)
                        setBillingDialogOpen(true)
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Risk Level</p>
                    <p className="text-sm text-muted-foreground">Current risk assessment for this agency</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRiskBadge(agency.risk_level)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewRiskLevel(agency.risk_level)
                        setRiskDialogOpen(true)
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Feature Overrides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Team Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Override to enable team management regardless of subscription package
                    </p>
                    {teamManagementError && (
                      <p className="text-sm text-destructive mt-1">{teamManagementError}</p>
                    )}
                  </div>
                  <Switch
                    checked={teamManagementEnabled}
                    onCheckedChange={handleToggleTeamManagement}
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
                  <div>
                    <Label className="text-foreground">Allow Backdate Posting</Label>
                    <p className="text-sm text-muted-foreground">
                      Permit this agency to publish jobs with dates up to 5 months in the past
                    </p>
                  </div>
                  <Switch
                    checked={agency.allow_backdate_posting || false}
                    onCheckedChange={async (checked) => {
                      try {
                        const updated = await updateAdminAgency(agencyId, { allow_backdate_posting: checked })
                        setAgency(updated)
                        toast.success(`Backdate posting ${checked ? "enabled" : "disabled"}`)
                      } catch {
                        toast.error("Failed to update backdate posting setting")
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <p className="font-medium text-foreground">
                      {isSuspended ? "Reactivate Agency" : "Suspend Agency"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSuspended
                        ? "Allow this agency to access their account again"
                        : "Temporarily prevent this agency from posting jobs"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => (isSuspended ? setReactivateDialogOpen(true) : setSuspendDialogOpen(true))}
                    className={
                      isSuspended ? "text-emerald-600 border-emerald-500/20" : "text-amber-600 border-amber-500/20"
                    }
                  >
                    {isSuspended ? "Reactivate" : "Suspend"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground">Delete Agency</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this agency and all associated data
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    Delete Agency
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ================================================================== */}
      {/* Dialogs                                                             */}
      {/* ================================================================== */}

      {/* Suspend Dialog */}
      <Dialog
        open={suspendDialogOpen}
        onOpenChange={(open) => {
          setSuspendDialogOpen(open)
          if (!open) resetSuspendForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Agency</DialogTitle>
            <DialogDescription>Suspend {agency.name} from the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this agency..."
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-team"
                  checked={suspendTeam}
                  onCheckedChange={(checked) => setSuspendTeam(checked === true)}
                />
                <Label htmlFor="suspend-team" className="text-sm font-normal cursor-pointer">
                  Suspend all team members
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspend-jobs"
                  checked={suspendJobs}
                  onCheckedChange={(checked) => setSuspendJobs(checked === true)}
                />
                <Label htmlFor="suspend-jobs" className="text-sm font-normal cursor-pointer">
                  Pause all active job postings
                </Label>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Suspending this agency will immediately prevent them from accessing the platform. This
                action can be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} disabled={isSuspending}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || isSuspending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSuspending ? "Suspending..." : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog
        open={reactivateDialogOpen}
        onOpenChange={(open) => {
          setReactivateDialogOpen(open)
          if (!open) setReactivateReason("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Agency</DialogTitle>
            <DialogDescription>Reactivate {agency.name} on the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reactivate-reason">Reason for Reactivation (Optional)</Label>
              <Textarea
                id="reactivate-reason"
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                placeholder="Enter the reason for reactivating this agency..."
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
              Reactivating this agency will restore their access to the platform.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialogOpen(false)} disabled={isReactivating}>
              Cancel
            </Button>
            <Button
              onClick={handleReactivate}
              disabled={isReactivating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isReactivating ? "Reactivating..." : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agency</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {agency.name}? This action cannot be undone.
              All jobs, client relationships, and team members will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Agency</DialogTitle>
            <DialogDescription>Confirm verification for {agency.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <p className="font-medium text-sm">Verification Checklist</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Business registration verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Contact information confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Industry credentials reviewed</span>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
              Verification enables the agency to access premium features, display a verified badge,
              and build trust with client companies.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isVerifying ? "Verifying..." : "Verify Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          setContactDialogOpen(open)
          if (!open) resetContactForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contact Agency</DialogTitle>
            <DialogDescription>Send a message to {agency.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject *</Label>
              <Input
                id="contact-subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Enter subject line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message *</Label>
              <Textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)} disabled={isContacting}>
              Cancel
            </Button>
            <Button
              onClick={handleContact}
              disabled={!contactSubject.trim() || !contactMessage.trim() || isContacting}
            >
              {isContacting ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Billing Model Dialog */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Billing Model</DialogTitle>
            <DialogDescription>Update billing model for {agency.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Billing Model</Label>
              <p className="text-sm text-muted-foreground">
                {agency.billing_model === "agency_pays" ? "Agency Pays" : "Company Pays"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-billing">New Billing Model</Label>
              <Select
                value={newBillingModel}
                onValueChange={(v) => setNewBillingModel(v as AdminAgencyBillingModel)}
              >
                <SelectTrigger id="new-billing">
                  <SelectValue placeholder="Select billing model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_pays">Agency Pays</SelectItem>
                  <SelectItem value="company_pays">Company Pays</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Changing the billing model will affect how future job postings are billed. Existing
                jobs will retain their current billing arrangement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingDialogOpen(false)} disabled={isChangingBilling}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeBilling}
              disabled={newBillingModel === agency.billing_model || isChangingBilling}
            >
              {isChangingBilling ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Risk Dialog */}
      <Dialog
        open={riskDialogOpen}
        onOpenChange={(open) => {
          setRiskDialogOpen(open)
          if (!open) setRiskReason("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Risk Level</DialogTitle>
            <DialogDescription>Update risk assessment for {agency.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Risk Level</Label>
              <div>{getRiskBadge(agency.risk_level)}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-risk">New Risk Level</Label>
              <Select
                value={newRiskLevel}
                onValueChange={(v) => setNewRiskLevel(v as AdminAgencyRiskLevel)}
              >
                <SelectTrigger id="new-risk">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-reason">Reason (Optional)</Label>
              <Textarea
                id="risk-reason"
                value={riskReason}
                onChange={(e) => setRiskReason(e.target.value)}
                placeholder="Enter the reason for this risk assessment change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskDialogOpen(false)} disabled={isChangingRisk}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeRisk}
              disabled={newRiskLevel === agency.risk_level || isChangingRisk}
            >
              {isChangingRisk ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <ChangePlanDialog
        entity={{
          id: agencyId,
          name: agency.name,
          currentPlan: billingInfo?.plan || "",
        }}
        entityType="agency"
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        onSuccess={() => {
          fetchAgency()
          fetchBillingData()
        }}
      />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        entity={{ id: agencyId, name: agency.name }}
        entityType="agency"
        open={addCreditsOpen}
        onOpenChange={setAddCreditsOpen}
        onSuccess={() => {
          fetchAgency()
          fetchBillingData()
        }}
      />

      {/* Adjust Credits Dialog */}
      <AddCreditsDialog
        entity={{ id: agencyId, name: agency.name }}
        entityType="agency"
        open={adjustCreditsOpen}
        onOpenChange={(open) => {
          setAdjustCreditsOpen(open)
          if (!open) setAdjustTarget(null)
        }}
        onSuccess={() => {
          fetchAgency()
          fetchBillingData()
        }}
        mode="adjust"
        entitlement={adjustTarget || undefined}
      />
    </motion.div>
  )
}

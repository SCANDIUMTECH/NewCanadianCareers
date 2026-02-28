"use client"

import { useState, useEffect, useCallback } from "react"
import { useAgencyContext } from "@/hooks/use-agency"
import { cn, formatCurrency, getCompanyInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { Loader2, RefreshCw, AlertCircle, X, CreditCard } from "lucide-react"
import { getAgencyEntitlements, purchasePackage, getAgencyClients, getAgencyInvoices, downloadAgencyInvoicePdf } from "@/lib/api/agencies"
import { toast } from "sonner"
import type { AgencyClient, AgencyInvoice } from "@/lib/agency/types"
import { CHART, CHART_SEQUENCE } from "@/lib/constants/colors"

const AgencyCreditChart = dynamic(
  () => import("@/components/charts/agency-credit-chart"),
  { ssr: false }
)

/**
 * Agency Billing & Credits
 * Pooled credits management with per-company usage breakdown
 */

// Static credit packages (marketing data)
const creditPackages = [
  { id: 1, name: "Starter", credits: 10, price: 99, perCredit: 9.90, currency: "USD", popular: false },
  { id: 2, name: "Growth", credits: 25, price: 199, perCredit: 7.96, currency: "USD", popular: true },
  { id: 3, name: "Agency", credits: 50, price: 349, perCredit: 6.98, currency: "USD", popular: false },
  { id: 4, name: "Enterprise", credits: 100, price: 599, perCredit: 5.99, currency: "USD", popular: false },
]

// Helper to generate color from string
function stringToColor(str: string): string {
  const colors = CHART_SEQUENCE
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Credit usage display type
interface CreditUsageItem {
  company: string
  initials: string
  credits: number
  color: string
}

export default function AgencyBillingPage() {
  const { agency } = useAgencyContext()
  const billingModel = agency?.billing_model || "agency_pays"

  // Data state
  const [totalCredits, setTotalCredits] = useState(0)
  const [usedCredits, setUsedCredits] = useState(0)
  const [remainingCredits, setRemainingCredits] = useState(0)
  const [creditUsageByCompany, setCreditUsageByCompany] = useState<CreditUsageItem[]>([])
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null)
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<typeof creditPackages[0] | null>(null)

  // Fetch entitlements and client credit usage
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch entitlements
      const entitlements = await getAgencyEntitlements()
      setTotalCredits(entitlements.total_credits)
      setUsedCredits(entitlements.used_credits)
      setRemainingCredits(entitlements.remaining_credits)

      // Fetch clients for credit usage breakdown
      try {
        const clientsResponse = await getAgencyClients({ page_size: 100 })
        const usageData: CreditUsageItem[] = clientsResponse.results.map((client: AgencyClient) => {
          const companyName = client.company_detail?.name || client.company_name || "Unknown"
          return {
            company: companyName,
            initials: getCompanyInitials(companyName),
            credits: client.credits_used || 0,
            color: stringToColor(companyName),
          }
        }).filter((item: CreditUsageItem) => item.credits > 0)
        setCreditUsageByCompany(usageData)
      } catch {
        // Client fetch is optional, don't fail the whole page
        setCreditUsageByCompany([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true)
      const response = await getAgencyInvoices({ page_size: 10 })
      setInvoices(response.results)
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
      // Don't fail the whole page for invoice fetch errors
    } finally {
      setInvoicesLoading(false)
    }
  }, [])

  const handleDownloadInvoice = async (invoice: AgencyInvoice) => {
    setDownloadingInvoiceId(invoice.id)
    try {
      const blob = await downloadAgencyInvoicePdf(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch {
      toast.error('Failed to download invoice. Please try again.')
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  useEffect(() => {
    fetchData()
    fetchInvoices()
  }, [fetchData, fetchInvoices])

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedPackage) return
    try {
      setIsSubmitting(true)
      const result = await purchasePackage({ package_id: selectedPackage.id })
      // Redirect to checkout
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-foreground-muted">Loading billing data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && totalCredits === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to load billing data</h3>
          <p className="text-sm text-foreground-muted mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const pieData = creditUsageByCompany.filter(c => c.credits > 0).map(c => ({
    name: c.company,
    value: c.credits,
    color: c.color,
  }))

  // Add remaining as a slice
  if (remainingCredits > 0) {
    pieData.push({ name: "Available", value: remainingCredits, color: CHART.grid })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Credits</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage your agency credits and billing
            </p>
          </div>
          <Button 
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={() => setShowBuyDialog(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Buy Credits
          </Button>
        </div>
      </MotionWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credit Overview */}
          <MotionWrapper delay={100}>
            <Card className="border-violet-500/20 shadow-sm bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Credit Stats */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="h-6 px-2 text-xs bg-violet-500/10 text-violet-600 border-violet-500/20">
                        Agency Pooled Credits
                      </Badge>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-violet-600">{remainingCredits}</span>
                      <span className="text-lg text-foreground-muted">/ {totalCredits} credits</span>
                    </div>
                    
                    <Progress value={totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0} className="h-3 mb-4" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-foreground-muted">Used this cycle</p>
                        <p className="text-xl font-semibold text-foreground">{usedCredits}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-muted">Billing cycle ends</p>
                        <p className="text-xl font-semibold text-foreground">Mar 1</p>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="w-full md:w-[180px] h-[180px]">
                    <AgencyCreditChart data={pieData} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Usage by Company */}
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Credit Usage by Company</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creditUsageByCompany.map((company) => (
                    <div key={company.company} className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${company.color}15` }}
                      >
                        <span className="text-sm font-semibold" style={{ color: company.color }}>
                          {company.initials}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground">{company.company}</p>
                          <p className="text-sm font-medium text-foreground">{company.credits} credits</p>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(company.credits / totalCredits) * 100}%`,
                              backgroundColor: company.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Invoice History */}
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary" disabled={invoices.length === 0}>
                    Download All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {invoicesLoading ? (
                  // Loading skeleton
                  <div className="divide-y divide-border/50">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-background-secondary" />
                          <div className="space-y-2">
                            <div className="h-4 w-40 bg-background-secondary rounded" />
                            <div className="h-3 w-24 bg-background-secondary rounded" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="space-y-2 text-right">
                            <div className="h-4 w-16 bg-background-secondary rounded ml-auto" />
                            <div className="h-5 w-12 bg-background-secondary rounded ml-auto" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  // Empty state
                  <div className="p-8 text-center">
                    <p className="text-sm text-foreground-muted">No invoices yet</p>
                  </div>
                ) : (
                  // Invoice list
                  <div className="divide-y divide-border/50">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{invoice.description}</p>
                            <p className="text-sm text-foreground-muted">
                              {invoice.created_at
                                ? new Date(invoice.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                invoice.status === 'paid' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                invoice.status === 'open' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                invoice.status === 'void' && "bg-gray-500/10 text-gray-600 border-gray-500/20"
                              )}
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          {invoice.pdf_status === 'available' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice)}
                              disabled={downloadingInvoiceId === invoice.id}
                              title="Download PDF"
                            >
                              {downloadingInvoiceId === invoice.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                            </Button>
                          ) : invoice.pdf_status === 'generating' ? (
                            <Button variant="ghost" size="sm" disabled title="PDF is being generated...">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Method */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
                    Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="w-10 h-7 bg-muted rounded flex items-center justify-center">
                    <CreditCard className="w-5 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">No payment method on file</p>
                    <p className="text-xs text-muted-foreground">Add a card to enable purchases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Billing Mode */}
          <MotionWrapper delay={300}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Billing Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                      {billingModel === "company_pays" ? "Company Pays" : "Agency Pays"}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-muted">
                    {billingModel === "company_pays"
                      ? "Each client company manages their own credits and billing independently."
                      : "Credits are pooled at the agency level and shared across all client companies."}
                  </p>
                </div>
                <p className="text-xs text-foreground-muted mt-3">
                  Contact support to change billing mode.
                </p>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Quick Purchase */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Quick Purchase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creditPackages.slice(0, 2).map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { setSelectedPackage(pkg); setShowBuyDialog(true); }}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50",
                      pkg.popular ? "border-violet-500/30 bg-violet-500/5" : "border-border/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{pkg.name}</span>
                      {pkg.popular && (
                        <Badge className="h-5 px-1.5 text-[10px] bg-violet-500 text-white">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(pkg.price, "USD")}</span>
                      <span className="text-sm text-foreground-muted">for {pkg.credits} credits</span>
                    </div>
                  </button>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-transparent"
                  onClick={() => setShowBuyDialog(true)}
                >
                  View All Packages
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>

      {/* Buy Credits Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Credit Package</DialogTitle>
            <DialogDescription>
              Select a package that fits your hiring needs
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  selectedPackage?.id === pkg.id 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-border/50 hover:border-primary/30",
                  pkg.popular && "relative"
                )}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 right-2 h-5 px-2 text-[10px] bg-violet-500 text-white">
                    Most Popular
                  </Badge>
                )}
                <p className="font-semibold text-foreground mb-1">{pkg.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-foreground">{formatCurrency(pkg.price, "USD")}</span>
                </div>
                <p className="text-sm text-foreground-muted">{pkg.credits} job posting credits</p>
                <p className="text-xs text-emerald-600 mt-1">${pkg.perCredit.toFixed(2)} per credit</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!selectedPackage || isSubmitting}
              onClick={handlePurchase}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Purchase ${selectedPackage?.credits} Credits - ${formatCurrency(selectedPackage?.price ?? 0, "USD")}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { Suspense, useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { JobWizard } from "@/components/job-wizard/job-wizard"
import { type JobWizardCompany } from "@/lib/job-wizard-schema"
import { Building2, CheckCircle, Check, Search, Plus, ArrowLeft, Loader2 } from "lucide-react"
import { useAgencySettings } from "@/hooks/use-quick-job-post"
import { useAgencyContext } from "@/hooks/use-agency"
import type { AgencyClient } from "@/lib/agency/types"
import { CHART } from "@/lib/constants/colors"

// Company colors for visual distinction
const companyColors = [CHART.primary, CHART.success, CHART.warning, CHART.purple, CHART.pink, CHART.indigo]
function getClientColor(clientId: number): string {
  return companyColors[clientId % companyColors.length]
}

// Transform AgencyClient to display format
type ClientCompanyDisplay = JobWizardCompany & { industry: string; activeJobs: number }

function transformClientsToDisplayFormat(clients: AgencyClient[]): ClientCompanyDisplay[] {
  return clients.map(client => ({
    id: client.company,
    name: client.company_name,
    initials: client.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    color: getClientColor(client.id),
    verified: client.company_detail?.status === 'verified',
    industry: client.company_detail?.industry || 'Technology',
    activeJobs: client.active_jobs_count || 0,
  }))
}

/**
 * Company Selection Card Component
 */
function CompanyCard({
  company,
  isSelected,
  onSelect,
  index,
}: {
  company: ClientCompanyDisplay
  isSelected: boolean
  onSelect: () => void
  index: number
}) {
  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:border-primary/40 hover:shadow-sm",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Company Avatar */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${company.color}15` }}
        >
          <span
            className="text-lg font-bold"
            style={{ color: company.color }}
          >
            {company.initials}
          </span>
        </div>

        {/* Company Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {company.name}
            </span>
            {company.verified && (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            {!company.verified && (
              <Badge variant="outline" className="text-amber-600 text-[10px] border-amber-500/30 shrink-0">
                Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {company.industry} · {company.activeJobs} active job{company.activeJobs !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Selection Indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
            >
              <Check className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

/**
 * Empty State Component
 */
function EmptyState() {
  const router = useRouter()

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-10 h-10 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
          No client companies yet
        </h1>
        <p className="text-muted-foreground mb-8">
          Add your first client company before posting jobs
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push("/agency/companies?action=add")}
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </Button>

          <Link
            href="/agency/jobs"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Agency Job Posting Page Content
 * Pre-flight company selection before launching the job wizard
 * Checks workflow preference and redirects to quick mode if enabled
 */
function AgencyNewJobPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings, isLoaded } = useAgencySettings()
  const { clients, isLoading: clientsLoading } = useAgencyContext()
  const [selectedCompany, setSelectedCompany] = useState<ClientCompanyDisplay | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Transform clients to display format
  const clientCompanies = useMemo(() => transformClientsToDisplayFormat(clients), [clients])

  // Filter companies based on search query - must be before any early returns
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return clientCompanies
    const query = searchQuery.toLowerCase()
    return clientCompanies.filter(
      (company) =>
        company.name.toLowerCase().includes(query) ||
        company.industry.toLowerCase().includes(query)
    )
  }, [searchQuery, clientCompanies])

  // Check workflow preference and redirect to quick mode if enabled
  useEffect(() => {
    if (isLoaded && settings.job_post_workflow === "quick") {
      const companyParam = searchParams.get("company")
      const redirectUrl = companyParam
        ? `/agency/jobs/new/quick?company=${companyParam}`
        : "/agency/jobs/new/quick"
      router.replace(redirectUrl)
    }
  }, [isLoaded, settings.job_post_workflow, router, searchParams])

  // Handle continue to wizard
  const handleContinue = () => {
    if (selectedCompany) {
      setShowWizard(true)
    }
  }

  // Show loading while checking workflow preference or loading clients
  if (!isLoaded || clientsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If quick mode is enabled, don't render (will redirect)
  if (settings.job_post_workflow === "quick") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no companies
  if (clientCompanies.length === 0) {
    return <EmptyState />
  }

  // Show job wizard once company is selected and confirmed
  if (showWizard && selectedCompany) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Company Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${selectedCompany.color}15` }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: selectedCompany.color }}
              >
                {selectedCompany.initials}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Posting for {selectedCompany.name}
              </p>
            </div>
            {selectedCompany.verified && (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
        </motion.div>

        <JobWizard
          company={selectedCompany}
          exitPath="/agency/jobs"
        />
      </div>
    )
  }

  // Company Selection Dialog (shown by default)
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <Dialog open={true} onOpenChange={(open) => !open && router.push("/agency/jobs")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Post a New Job
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select which client company this job will be posted for
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Company List */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 -mr-1">
            {filteredCompanies.map((company, index) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={selectedCompany?.id === company.id}
                onSelect={() => setSelectedCompany(company)}
                index={index}
              />
            ))}

            {filteredCompanies.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No companies match your search
                </p>
              </div>
            )}
          </div>

          {/* Add New Company Link */}
          <Link
            href="/agency/companies?action=add"
            className={cn(
              "w-full p-4 rounded-xl border border-dashed border-border/60",
              "flex items-center gap-3 text-left",
              "hover:border-primary/40 hover:bg-primary/5 transition-colors"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-muted-foreground">
              Add New Company
            </span>
          </Link>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => router.push("/agency/jobs")}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedCompany}
              className="bg-primary hover:bg-primary-hover text-primary-foreground gap-1"
            >
              Continue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Agency Job Posting Page
 * Wrapped in Suspense for useSearchParams
 */
export default function AgencyNewJobPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AgencyNewJobPageContent />
    </Suspense>
  )
}

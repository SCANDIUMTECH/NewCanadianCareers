"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type QuickJobCompany } from "@/lib/quick-job-schema"
import { CHART } from "@/lib/constants/colors"
import { addAgencyClient } from "@/lib/api/agencies"
import { toast } from "sonner"
import {
  Search,
  X,
  CheckCircle,
  Plus,
  Building2,
  ChevronDown,
} from "lucide-react"

interface CompanySelectorProps {
  companies: QuickJobCompany[]
  selectedCompany: QuickJobCompany | null
  onSelect: (company: QuickJobCompany) => void
  className?: string
}

export function CompanySelector({
  companies,
  selectedCompany,
  onSelect,
  className,
}: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies
    const query = searchQuery.toLowerCase()
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(query) ||
        company.industry.toLowerCase().includes(query)
    )
  }, [companies, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (company: QuickJobCompany) => {
    onSelect(company)
    setIsOpen(false)
    setSearchQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(null as unknown as QuickJobCompany)
  }

  const [isCreating, setIsCreating] = useState(false)

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return
    setIsCreating(true)
    try {
      const client = await addAgencyClient({ name: newCompanyName.trim() })
      const companyName = client.company_detail?.name ?? client.company_name ?? newCompanyName
      const newCompany: QuickJobCompany = {
        id: client.company,
        name: companyName,
        initials: companyName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        color: CHART.primary,
        verified: false,
        industry: "Other",
      }
      onSelect(newCompany)
      setShowAddDialog(false)
      setNewCompanyName("")
      setIsOpen(false)
    } catch {
      toast.error("Failed to create company. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Label className="text-sm font-medium text-foreground mb-2 block">
        Company <span className="text-destructive">*</span>
      </Label>

      {/* Selected Company Badge or Selector Trigger */}
      {selectedCompany ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${selectedCompany.color}15` }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: selectedCompany.color }}
            >
              {selectedCompany.initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">
                {selectedCompany.name}
              </span>
              {selectedCompany.verified && (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCompany.industry}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
            "border-border/60 bg-card hover:border-primary/40",
            isOpen && "border-primary ring-1 ring-primary/20"
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Select a company...</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Company List */}
            <div className="max-h-[280px] overflow-y-auto p-2">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company, index) => (
                  <motion.button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelect(company)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${company.color}15` }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: company.color }}
                      >
                        {company.initials}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {company.name}
                        </span>
                        {company.verified && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {company.industry}
                      </p>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="py-6 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No companies found
                  </p>
                </div>
              )}
            </div>

            {/* Add New Company */}
            <div className="p-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                  "border border-dashed border-border/60",
                  "hover:border-primary/40 hover:bg-primary/5 transition-colors"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Add New Company
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Company Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Quickly add a company to post this job. You can complete their
              profile later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="company-name" className="text-sm font-medium">
              Company Name
            </Label>
            <Input
              id="company-name"
              placeholder="Acme Corporation"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddCompany}
              disabled={!newCompanyName.trim()}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Add & Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

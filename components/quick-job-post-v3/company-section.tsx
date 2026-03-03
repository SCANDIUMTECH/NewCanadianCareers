"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { type QuickJobCompany } from "@/lib/quick-job-schema"
import {
  Search,
  X,
  CheckCircle,
  Plus,
  Building2,
  MapPin,
  Mail,
  Pencil,
} from "lucide-react"

interface CompanySectionProps {
  companies: QuickJobCompany[]
  selectedCompany: QuickJobCompany | null
  onSelect: (company: QuickJobCompany | null) => void
  onAddCompany: (company: Omit<QuickJobCompany, "id" | "initials" | "color" | "verified" | "industry">) => void
  className?: string
}

export function CompanySection({
  companies,
  selectedCompany,
  onSelect,
  onAddCompany,
  className,
}: CompanySectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: "",
    location: "",
    applyEmail: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
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

  // Check if search query exactly matches any company
  const hasExactMatch = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return companies.some((c) => c.name.toLowerCase() === query)
  }, [companies, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        // Don't close add form if clicking outside
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        setShowAddForm(false)
        inputRef.current?.blur()
      }
    }

    if (isOpen || showAddForm) {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, showAddForm])

  const handleSelectCompany = (company: QuickJobCompany) => {
    onSelect(company)
    setIsOpen(false)
    setSearchQuery("")
    setShowAddForm(false)
  }

  const handleClearCompany = () => {
    onSelect(null)
    setSearchQuery("")
    // Focus the search input after clearing
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleChangeCompany = () => {
    onSelect(null)
    setSearchQuery("")
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleOpenAddForm = () => {
    setNewCompany({
      name: searchQuery.trim(),
      location: "",
      applyEmail: "",
    })
    setShowAddForm(true)
    setIsOpen(false)
  }

  const handleCancelAddForm = () => {
    setShowAddForm(false)
    setNewCompany({ name: "", location: "", applyEmail: "" })
    setFormErrors({})
    setSearchQuery("")
  }

  const validateAddForm = () => {
    const errors: Record<string, string> = {}

    if (!newCompany.name.trim()) {
      errors.name = "Company name is required"
    }
    if (!newCompany.location.trim()) {
      errors.location = "Location is required"
    }
    if (!newCompany.applyEmail.trim()) {
      errors.applyEmail = "Apply email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCompany.applyEmail)) {
      errors.applyEmail = "Please enter a valid email"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddCompany = () => {
    if (!validateAddForm()) return

    onAddCompany({
      name: newCompany.name.trim(),
      location: newCompany.location.trim(),
      applyEmail: newCompany.applyEmail.trim(),
    })

    setShowAddForm(false)
    setNewCompany({ name: "", location: "", applyEmail: "" })
    setFormErrors({})
    setSearchQuery("")
  }

  // Selected state - show company card
  if (selectedCompany) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-xl border border-primary/30 bg-primary/5 p-4",
          className
        )}
      >
        <div className="flex items-center gap-4">
          {/* Company Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${selectedCompany.color}20` }}
          >
            <span
              className="text-base font-bold"
              style={{ color: selectedCompany.color }}
            >
              {selectedCompany.initials}
            </span>
          </div>

          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">
                {selectedCompany.name}
              </span>
              {selectedCompany.verified && (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">
                {selectedCompany.industry}
              </span>
            </div>
            {selectedCompany.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                {selectedCompany.location}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleChangeCompany}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearCompany}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Unselected state - inline search combobox
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search or add a company..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className={cn(
            "pl-10 pr-4 h-11 rounded-xl",
            isOpen && "ring-2 ring-primary/20 border-primary/40"
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && !showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden"
          >
            {/* Company List */}
            <div className="max-h-[280px] overflow-y-auto">
              {filteredCompanies.length > 0 ? (
                <div className="p-1.5">
                  {filteredCompanies.map((company, index) => (
                    <motion.button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left",
                        "hover:bg-muted/50 transition-colors"
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${company.color}15` }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{ color: company.color }}
                        >
                          {company.initials}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground text-sm truncate">
                            {company.name}
                          </span>
                          {company.verified && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {company.industry}
                          {company.location && ` · ${company.location}`}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No companies found
                  </p>
                </div>
              )}
            </div>

            {/* Add New Company Option */}
            {searchQuery.trim() && !hasExactMatch && (
              <div className="p-1.5 border-t border-border/40">
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg text-left",
                    "hover:bg-primary/5 transition-colors"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">
                    Add &quot;{searchQuery.trim()}&quot; as new company
                  </span>
                </button>
              </div>
            )}

            {/* Always show add option when no search query */}
            {!searchQuery.trim() && (
              <div className="p-1.5 border-t border-border/40">
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg text-left",
                    "border border-dashed border-border/60",
                    "hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Add New Company
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Add Company Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Add New Company
              </h3>

              <div className="space-y-3">
                {/* Company Name */}
                <div>
                  <Label htmlFor="add-company-name" className="text-xs font-medium text-foreground">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="add-company-name"
                    placeholder="e.g. Acme Corporation"
                    value={newCompany.name}
                    onChange={(e) => {
                      setNewCompany({ ...newCompany, name: e.target.value })
                      if (formErrors.name) {
                        setFormErrors({ ...formErrors, name: "" })
                      }
                    }}
                    className={cn("mt-1 h-9", formErrors.name && "border-destructive")}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="add-company-location" className="text-xs font-medium text-foreground">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="add-company-location"
                      placeholder="e.g. San Francisco, CA"
                      value={newCompany.location}
                      onChange={(e) => {
                        setNewCompany({ ...newCompany, location: e.target.value })
                        if (formErrors.location) {
                          setFormErrors({ ...formErrors, location: "" })
                        }
                      }}
                      className={cn("pl-9 h-9", formErrors.location && "border-destructive")}
                    />
                  </div>
                  {formErrors.location && (
                    <p className="text-xs text-destructive mt-1">{formErrors.location}</p>
                  )}
                </div>

                {/* Apply Email */}
                <div>
                  <Label htmlFor="add-company-email" className="text-xs font-medium text-foreground">
                    Apply Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="add-company-email"
                      type="email"
                      placeholder="careers@company.com"
                      value={newCompany.applyEmail}
                      onChange={(e) => {
                        setNewCompany({ ...newCompany, applyEmail: e.target.value })
                        if (formErrors.applyEmail) {
                          setFormErrors({ ...formErrors, applyEmail: "" })
                        }
                      }}
                      className={cn("pl-9 h-9", formErrors.applyEmail && "border-destructive")}
                    />
                  </div>
                  {formErrors.applyEmail && (
                    <p className="text-xs text-destructive mt-1">{formErrors.applyEmail}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAddForm}
                  className="bg-transparent h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCompany}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                >
                  Add & Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

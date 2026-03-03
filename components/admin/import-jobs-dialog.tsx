"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import Papa from "papaparse"
import { toast } from "sonner"
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building2,
  Users,
  Trash2,
  Info,
  ChevronDown,
  RotateCcw,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"
import { getAdminCompanies } from "@/lib/api/admin-companies"
import { getAdminAgencies } from "@/lib/api/admin-agencies"
import { importBulkJobs } from "@/lib/api/admin-jobs"
import {
  createImportJobRowSchema,
  createImportJobRowAgencySchema,
  sanitizeImportRow,
  generateJsonTemplate,
  generateCsvTemplate,
  MAX_IMPORT_ROWS,
  MAX_CSV_FILE_SIZE,
  MAX_JSON_FILE_SIZE,
  EMPLOYMENT_TYPE_LABELS,
} from "@/lib/admin/import-job-schema"
import { getAdminCategories } from "@/lib/api/admin-taxonomies"
import type {
  AdminCompany,
  AdminAgency,
  ImportJobRow,
  BulkJobImportResponse,
} from "@/lib/admin/types"

// =============================================================================
// Types
// =============================================================================

type ImportMode = "company" | "agency"
type FileFormat = "json" | "csv"
type Step = 1 | 2 | 3 | 4

interface ValidatedRow {
  index: number
  data: Record<string, unknown>
  valid: boolean
  errors: Record<string, string[]>
}

interface ImportJobsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

// =============================================================================
// Component
// =============================================================================

export function ImportJobsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportJobsDialogProps) {
  // ---- State ----
  const [step, setStep] = useState<Step>(1)
  const [importMode, setImportMode] = useState<ImportMode>("company")
  const [fileFormat, setFileFormat] = useState<FileFormat>("json")
  const [defaultStatus, setDefaultStatus] = useState<"draft" | "pending">("pending")

  // Dynamic categories (fetched from API for validation)
  const [validCategorySlugs, setValidCategorySlugs] = useState<string[]>([])

  // Selection
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null)
  const [selectedAgency, setSelectedAgency] = useState<AdminAgency | null>(null)

  // Combobox search
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [agencies, setAgencies] = useState<AdminAgency[]>([])
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false)
  const [isSearchingAgencies, setIsSearchingAgencies] = useState(false)

  // File upload
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Validation
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<BulkJobImportResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Drag & Resize ----

  const [dialogPos, setDialogPos] = useState<{ x: number; y: number } | null>(null)
  const [dialogSize, setDialogSize] = useState<{ w: number; h: number } | null>(null)
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag from the header bar area
    if ((e.target as HTMLElement).closest("button, a, input, [data-slot=dialog-close]")) return
    e.preventDefault()
    isDragging.current = true
    const rect = (e.currentTarget.closest("[data-slot=dialog-content]") as HTMLElement)?.getBoundingClientRect()
    if (!rect) return
    dragStart.current = { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 }
    if (!dialogPos) {
      setDialogPos({ x: 0, y: 0 })
    }
  }, [dialogPos])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    const dialogEl = (e.currentTarget.closest("[data-slot=dialog-content]") as HTMLElement)
    if (!dialogEl) return
    const rect = dialogEl.getBoundingClientRect()
    resizeStart.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height }
    if (!dialogSize) {
      setDialogSize({ w: rect.width, h: rect.height })
    }
  }, [dialogSize])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        setDialogPos((prev) => ({
          x: (prev?.x ?? 0) + e.movementX,
          y: (prev?.y ?? 0) + e.movementY,
        }))
      }
      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y
        setDialogSize({
          w: Math.max(400, resizeStart.current.w + dx),
          h: Math.max(300, resizeStart.current.h + dy),
        })
      }
    }
    const handleMouseUp = () => {
      isDragging.current = false
      isResizing.current = false
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  // Reset position/size when dialog closes
  const resetDragResize = useCallback(() => {
    setDialogPos(null)
    setDialogSize(null)
  }, [])

  // ---- Fetch dynamic categories on dialog open ----
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function fetchCategories() {
      try {
        const cats = await getAdminCategories(undefined, true)
        if (!cancelled) {
          setValidCategorySlugs(cats.map((c) => c.slug))
        }
      } catch (err) {
        console.error("Failed to fetch categories for validation:", err)
        // validCategorySlugs stays empty → schema factory falls back to JOB_CATEGORIES_FALLBACK
      }
    }
    fetchCategories()
    return () => { cancelled = true }
  }, [open])

  // ---- Helpers ----

  const resetAll = useCallback(() => {
    setStep(1)
    setImportMode("company")
    setFileFormat("json")
    setSelectedCompany(null)
    setSelectedAgency(null)
    setCompanies([])
    setAgencies([])
    setParsedRows([])
    setParseError(null)
    setFileName(null)
    setValidatedRows([])
    setExpandedErrors(new Set())
    setIsSubmitting(false)
    setImportResult(null)
    setSubmitError(null)
    resetDragResize()
  }, [resetDragResize])

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value && isSubmitting) return // prevent close during submit
      if (!value) resetAll()
      onOpenChange(value)
    },
    [isSubmitting, resetAll, onOpenChange]
  )

  // ---- Company/Agency Search ----

  const searchCompanies = useCallback(async (query: string) => {
    setIsSearchingCompanies(true)
    try {
      const res = await getAdminCompanies({ search: query, page_size: 20 })
      setCompanies(res.results)
    } catch {
      setCompanies([])
    } finally {
      setIsSearchingCompanies(false)
    }
  }, [])

  const searchAgencies = useCallback(async (query: string) => {
    setIsSearchingAgencies(true)
    try {
      const res = await getAdminAgencies({ search: query, page_size: 20 })
      setAgencies(res.results)
    } catch {
      setAgencies([])
    } finally {
      setIsSearchingAgencies(false)
    }
  }, [])

  const handleCompanyInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => searchCompanies(value), 300)
    },
    [searchCompanies]
  )

  const handleAgencyInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => searchAgencies(value), 300)
    },
    [searchAgencies]
  )

  // ---- File Handling ----

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileFormat, importMode]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input so the same file can be re-selected
      e.target.value = ""
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileFormat, importMode]
  )

  function processFile(file: File) {
    setParseError(null)
    setParsedRows([])
    setFileName(file.name)

    const maxSize = fileFormat === "csv" ? MAX_CSV_FILE_SIZE : MAX_JSON_FILE_SIZE
    if (file.size > maxSize) {
      setParseError(
        `File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
      )
      return
    }

    if (fileFormat === "json") {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          if (!Array.isArray(parsed)) {
            setParseError("JSON file must contain an array of job objects.")
            return
          }
          if (parsed.length === 0) {
            setParseError("File contains no job data.")
            return
          }
          if (parsed.length > MAX_IMPORT_ROWS) {
            setParseError(
              `File contains ${parsed.length} rows. Maximum is ${MAX_IMPORT_ROWS}.`
            )
            return
          }
          setParsedRows(parsed)
        } catch {
          setParseError("Invalid JSON file. Please check the format and try again.")
        }
      }
      reader.readAsText(file)
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setParseError(
              `CSV parsing error: ${results.errors[0].message}`
            )
            return
          }
          const rows = results.data as Record<string, unknown>[]
          if (rows.length === 0) {
            setParseError("File contains no job data.")
            return
          }
          if (rows.length > MAX_IMPORT_ROWS) {
            setParseError(
              `File contains ${rows.length} rows. Maximum is ${MAX_IMPORT_ROWS}.`
            )
            return
          }
          setParsedRows(rows)
        },
        error: (err) => {
          setParseError(`CSV parsing error: ${err.message}`)
        },
      })
    }
  }

  // ---- Validation ----

  const validateRows = useCallback(() => {
    const schema =
      importMode === "agency"
        ? createImportJobRowAgencySchema(validCategorySlugs)
        : createImportJobRowSchema(validCategorySlugs)
    const validated: ValidatedRow[] = parsedRows.map((raw, index) => {
      const sanitized = sanitizeImportRow(raw)
      const result = schema.safeParse(sanitized)
      if (result.success) {
        return { index, data: sanitized, valid: true, errors: {} }
      }
      const errors: Record<string, string[]> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join(".")
        if (!errors[path]) errors[path] = []
        errors[path].push(issue.message)
      }
      return { index, data: sanitized, valid: false, errors }
    })
    setValidatedRows(validated)
  }, [parsedRows, importMode, validCategorySlugs])

  const validRows = useMemo(
    () => validatedRows.filter((r) => r.valid),
    [validatedRows]
  )
  const invalidRows = useMemo(
    () => validatedRows.filter((r) => !r.valid),
    [validatedRows]
  )

  const uniqueCompanies = useMemo(() => {
    if (importMode !== "agency") return 0
    const names = new Set<string>()
    for (const row of validRows) {
      const name = String(row.data.company_name || "").toLowerCase().trim()
      if (name) names.add(name)
    }
    return names.size
  }, [validRows, importMode])

  const removeRow = useCallback(
    (index: number) => {
      setValidatedRows((prev) => prev.filter((r) => r.index !== index))
    },
    []
  )

  const toggleErrorExpand = useCallback((index: number) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  // ---- Submit ----

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const jobs: ImportJobRow[] = validRows.map((r) => r.data as unknown as ImportJobRow)
    const payload = {
      ...(importMode === "company"
        ? { company_id: selectedCompany!.id }
        : { agency_id: selectedAgency!.id }),
      jobs,
      default_status: defaultStatus,
    }

    try {
      const result = await importBulkJobs(payload)
      setImportResult(result)
      setStep(4)
      if (result.created > 0) {
        const statusLabel = defaultStatus === "pending" ? "pending review" : "drafts"
        toast.success(`Successfully imported ${result.created} jobs as ${statusLabel}`)
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [validRows, importMode, selectedCompany, selectedAgency])

  // ---- Template Download ----

  const downloadTemplate = useCallback(
    (format: FileFormat) => {
      const isAgency = importMode === "agency"
      const content =
        format === "json"
          ? generateJsonTemplate(isAgency)
          : generateCsvTemplate(isAgency)
      const mimeType =
        format === "json" ? "application/json" : "text/csv"
      const ext = format === "json" ? "json" : "csv"
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `job-import-template${isAgency ? "-agency" : ""}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [importMode]
  )

  // ---- Navigation Helpers ----

  const canProceedStep1 =
    importMode === "company" ? !!selectedCompany : !!selectedAgency

  const canProceedStep2 = parsedRows.length > 0 && !parseError

  const canProceedStep3 = validRows.length > 0

  // ---- Render ----

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl overflow-hidden flex flex-col",
          !dialogSize && "max-h-[85vh]"
        )}
        style={{
          ...(dialogPos ? { translate: `calc(-50% + ${dialogPos.x}px) calc(-50% + ${dialogPos.y}px)` } : {}),
          ...(dialogSize ? { width: dialogSize.w, height: dialogSize.h, maxHeight: "none" } : {}),
        }}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
      >
        {/* Drag Handle */}
        <div
          onMouseDown={handleDragStart}
          className="flex items-center gap-2 -mx-6 -mt-6 px-6 pt-4 pb-3 cursor-grab active:cursor-grabbing select-none border-b border-transparent hover:border-border transition-colors"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <DialogHeader className="pointer-events-none">
              <DialogTitle>Import Jobs</DialogTitle>
              <DialogDescription>
                Bulk import jobs from a JSON or CSV file. All jobs will be
                created as drafts.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-y-auto min-h-0 pt-2">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4 mb-6">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    s
                  )}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      "w-8 h-px",
                      step > s ? "bg-primary/40" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {step === 1 && "Select Target"}
              {step === 2 && "Upload File"}
              {step === 3 && "Preview & Validate"}
              {step === 4 && "Results"}
            </span>
          </div>

          {/* ========================================================= */}
          {/* STEP 1 — Select Import Mode & Target */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Mode Toggle */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Import Mode
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImportMode("company")
                      setSelectedAgency(null)
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                      importMode === "company"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <Building2
                      className={cn(
                        "w-5 h-5",
                        importMode === "company"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-xs text-muted-foreground">
                        All jobs go to one company
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportMode("agency")
                      setSelectedCompany(null)
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                      importMode === "agency"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <Users
                      className={cn(
                        "w-5 h-5",
                        importMode === "agency"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">Agency</p>
                      <p className="text-xs text-muted-foreground">
                        Per-row company data
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Company Combobox */}
              {importMode === "company" && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Select Company
                  </Label>
                  <Combobox
                    items={companies.map((c) => c.name)}
                    value={selectedCompany?.name ?? null}
                    onValueChange={(val: string | null) => {
                      const item = companies.find((c) => c.name === val) ?? null
                      setSelectedCompany(item)
                    }}
                    onOpenChange={(isOpen: boolean) => {
                      if (isOpen && companies.length === 0) {
                        searchCompanies("")
                      }
                    }}
                  >
                    <ComboboxInput
                      placeholder="Search companies..."
                      showClear={!!selectedCompany}
                      onChange={handleCompanyInputChange}
                    />
                    <ComboboxContent container={containerRef.current}>
                      <ComboboxEmpty>
                        {isSearchingCompanies
                          ? "Searching..."
                          : "No companies found"}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => {
                          const company = companies.find((c) => c.name === item)
                          return (
                            <ComboboxItem key={item} value={item} className="group/item">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground group-data-highlighted/item:text-accent-foreground shrink-0" />
                                <span className="truncate">{item}</span>
                                {company && (
                                  <Badge
                                    variant="outline"
                                    className="ml-auto text-[10px] shrink-0 group-data-highlighted/item:border-accent-foreground/30 group-data-highlighted/item:text-accent-foreground"
                                  >
                                    {company.status}
                                  </Badge>
                                )}
                              </div>
                            </ComboboxItem>
                          )
                        }}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {selectedCompany && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      All imported jobs will be assigned to{" "}
                      <span className="font-medium text-foreground">
                        {selectedCompany.name}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Agency Combobox */}
              {importMode === "agency" && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Select Agency
                  </Label>
                  <Combobox
                    items={agencies.map((a) => a.name)}
                    value={selectedAgency?.name ?? null}
                    onValueChange={(val: string | null) => {
                      const item = agencies.find((a) => a.name === val) ?? null
                      setSelectedAgency(item)
                    }}
                    onOpenChange={(isOpen: boolean) => {
                      if (isOpen && agencies.length === 0) {
                        searchAgencies("")
                      }
                    }}
                  >
                    <ComboboxInput
                      placeholder="Search agencies..."
                      showClear={!!selectedAgency}
                      onChange={handleAgencyInputChange}
                    />
                    <ComboboxContent container={containerRef.current}>
                      <ComboboxEmpty>
                        {isSearchingAgencies
                          ? "Searching..."
                          : "No agencies found"}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => {
                          const agency = agencies.find((a) => a.name === item)
                          return (
                            <ComboboxItem key={item} value={item} className="group/item">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground group-data-highlighted/item:text-accent-foreground shrink-0" />
                                <span className="truncate">{item}</span>
                                {agency && (
                                  <Badge
                                    variant="outline"
                                    className="ml-auto text-[10px] shrink-0 group-data-highlighted/item:border-accent-foreground/30 group-data-highlighted/item:text-accent-foreground"
                                  >
                                    {agency.status}
                                  </Badge>
                                )}
                              </div>
                            </ComboboxItem>
                          )
                        }}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {selectedAgency && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Jobs will be imported under{" "}
                      <span className="font-medium text-foreground">
                        {selectedAgency.name}
                      </span>
                    </p>
                  )}

                  {/* Agency mode info banner */}
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 mt-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-0.5">
                        Agency mode requires company data per row
                      </p>
                      <p>
                        Each job row must include <code className="bg-blue-100 px-1 rounded text-[11px]">company_name</code> and{" "}
                        <code className="bg-blue-100 px-1 rounded text-[11px]">company_email</code>. Companies will be
                        auto-created if they don&apos;t already exist.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Default Import Status */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Import Status
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What status should imported jobs be created with?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultStatus("pending")}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
                      defaultStatus === "pending"
                        ? "border-amber-500 bg-amber-50 text-amber-700 font-medium"
                        : "border-border text-muted-foreground hover:border-amber-500/40"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pending Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultStatus("draft")}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
                      defaultStatus === "draft"
                        ? "border-gray-500 bg-gray-50 text-gray-700 font-medium"
                        : "border-border text-muted-foreground hover:border-gray-500/40"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Draft
                  </button>
                </div>
              </div>

              {/* Next button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setStep(2)
                    // Reset file data when going back to step 2
                    setParsedRows([])
                    setParseError(null)
                    setFileName(null)
                    setValidatedRows([])
                  }}
                  disabled={!canProceedStep1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2 — Upload File */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Format Tabs */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  File Format
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFileFormat("json")
                      setParsedRows([])
                      setParseError(null)
                      setFileName(null)
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
                      fileFormat === "json"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileFormat("csv")
                      setParsedRows([])
                      setParseError(null)
                      setFileName(null)
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
                      fileFormat === "csv"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Template Downloads */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Download a template to see the expected format
                  {importMode === "agency" && " (includes company_name & company_email columns)"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("json")}
                  >
                    <FileJson className="w-3.5 h-3.5 mr-1.5" />
                    JSON Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("csv")}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                    CSV Template
                  </Button>
                  <span className="text-[11px] text-muted-foreground ml-1">
                    5 sample jobs included
                  </span>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                  parsedRows.length > 0
                    ? "border-green-300 bg-green-50"
                    : parseError
                      ? "border-red-300 bg-red-50"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={fileFormat === "json" ? ".json" : ".csv"}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {parsedRows.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <p className="text-sm font-medium text-green-800">
                      {fileName}
                    </p>
                    <p className="text-xs text-green-600">
                      {parsedRows.length} job{parsedRows.length !== 1 ? "s" : ""}{" "}
                      found. Click to upload a different file.
                    </p>
                  </>
                ) : parseError ? (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm font-medium text-red-800">
                      {fileName || "Upload failed"}
                    </p>
                    <p className="text-xs text-red-600 text-center max-w-sm">
                      {parseError}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop your {fileFormat.toUpperCase()} file here or click to
                      browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max {fileFormat === "csv" ? "5" : "10"}MB, up to{" "}
                      {MAX_IMPORT_ROWS} rows
                    </p>
                  </>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    validateRows()
                    setStep(3)
                  }}
                  disabled={!canProceedStep2}
                >
                  Validate & Preview
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3 — Preview & Validate */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant={validRows.length > 0 ? "default" : "secondary"}
                  className="gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {validRows.length} valid
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {invalidRows.length} invalid
                  </Badge>
                )}
                {importMode === "agency" && uniqueCompanies > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {uniqueCompanies} unique compan{uniqueCompanies !== 1 ? "ies" : "y"}
                  </Badge>
                )}
              </div>

              {/* Duplicate Warning */}
              {(() => {
                const titles = validRows.map((r) =>
                  String(r.data.title || "").toLowerCase().trim()
                )
                const dupes = titles.filter(
                  (t, i) => t && titles.indexOf(t) !== i
                )
                if (dupes.length > 0) {
                  return (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">
                        {dupes.length} duplicate title{dupes.length !== 1 ? "s" : ""}{" "}
                        detected within this batch. Duplicates will be skipped during import.
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              {/* Rows Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-left px-3 py-2 font-medium">Title</th>
                        {importMode === "agency" && (
                          <th className="text-left px-3 py-2 font-medium">Company</th>
                        )}
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {validatedRows.map((row) => (
                        <tr
                          key={row.index}
                          className={cn(
                            "border-t",
                            !row.valid && "bg-red-50/50"
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.index + 1}
                          </td>
                          <td className="px-3 py-2 font-medium truncate max-w-[180px]">
                            {String(row.data.title || "—")}
                          </td>
                          {importMode === "agency" && (
                            <td className="px-3 py-2 truncate max-w-[120px]">
                              {String(row.data.company_name || "—")}
                            </td>
                          )}
                          <td className="px-3 py-2 text-muted-foreground">
                            {EMPLOYMENT_TYPE_LABELS[String(row.data.employment_type || "")] ||
                              String(row.data.employment_type || "—")}
                          </td>
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleErrorExpand(row.index)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-3 h-3" />
                                {Object.keys(row.errors).length} error
                                {Object.keys(row.errors).length !== 1 ? "s" : ""}
                                <ChevronDown
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    expandedErrors.has(row.index) && "rotate-180"
                                  )}
                                />
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(row.index)}
                              className="text-muted-foreground hover:text-red-600 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {validatedRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={importMode === "agency" ? 6 : 5}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            All rows have been removed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expanded Errors */}
              {invalidRows
                .filter((r) => expandedErrors.has(r.index))
                .map((row) => (
                  <div
                    key={`err-${row.index}`}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs"
                  >
                    <p className="font-medium text-red-800 mb-1">
                      Row {row.index + 1}: {String(row.data.title || "Untitled")}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-red-700">
                      {Object.entries(row.errors).map(([field, msgs]) =>
                        msgs.map((msg, i) => (
                          <li key={`${field}-${i}`}>
                            <span className="font-medium">{field}</span>: {msg}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  {submitError && (
                    <p className="text-xs text-red-600 max-w-xs truncate">
                      {submitError}
                    </p>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceedStep3 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Importing {validRows.length} jobs...
                      </>
                    ) : (
                      <>
                        Import {validRows.length} Job
                        {validRows.length !== 1 ? "s" : ""} as Drafts
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4 — Results */}
          {/* ========================================================= */}
          {step === 4 && importResult && (
            <div className="space-y-4">
              {/* Result Card */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {importResult.failed === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {importResult.failed === 0
                        ? "Import Completed Successfully"
                        : "Import Completed with Errors"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {importResult.total} total, {importResult.created} created,{" "}
                      {importResult.failed} failed
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "grid gap-3",
                  importResult.duplicates_skipped > 0 || importMode === "agency"
                    ? "grid-cols-4"
                    : "grid-cols-3"
                )}>
                  <div className="rounded-md bg-green-50 border border-green-200 p-2.5 text-center">
                    <p className="text-lg font-semibold text-green-700">
                      {importResult.created}
                    </p>
                    <p className="text-[10px] text-green-600">Created</p>
                  </div>
                  <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-center">
                    <p className="text-lg font-semibold text-red-700">
                      {importResult.failed}
                    </p>
                    <p className="text-[10px] text-red-600">Failed</p>
                  </div>
                  {importResult.duplicates_skipped > 0 && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-center">
                      <p className="text-lg font-semibold text-amber-700">
                        {importResult.duplicates_skipped}
                      </p>
                      <p className="text-[10px] text-amber-600">Duplicates</p>
                    </div>
                  )}
                  {importMode === "agency" && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-2.5 text-center">
                      <p className="text-lg font-semibold text-blue-700">
                        {importResult.companies_created}
                      </p>
                      <p className="text-[10px] text-blue-600">
                        Companies Created
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Backend Errors */}
              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-800 mb-2">
                    Failed rows ({importResult.errors.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-700">
                        <span className="font-medium">
                          Row {err.index + 1}
                        </span>
                        {err.title && ` — ${err.title}`}:{" "}
                        {Object.entries(err.errors)
                          .map(
                            ([field, msgs]) =>
                              `${field}: ${msgs.join(", ")}`
                          )
                          .join("; ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetAll()
                    setStep(1)
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Import More
                </Button>
                <Button
                  onClick={() => {
                    onImportComplete()
                    handleOpenChange(false)
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group/resize"
          title="Drag to resize"
        >
          <svg
            className="w-3 h-3 absolute bottom-1 right-1 text-muted-foreground/40 group-hover/resize:text-muted-foreground transition-colors"
            viewBox="0 0 6 6"
            fill="currentColor"
          >
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2" r="0.8" />
            <circle cx="2" cy="5" r="0.8" />
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  )
}

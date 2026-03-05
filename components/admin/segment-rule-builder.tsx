"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import type { SegmentFilterRules, SegmentRule } from "@/lib/api/admin-marketing"

const FIELD_OPTIONS = [
  { value: "role", label: "User Role" },
  { value: "status", label: "User Status" },
  { value: "company.industry", label: "Company Industry" },
  { value: "company.size", label: "Company Size" },
  { value: "company.verified", label: "Company Verified" },
  { value: "consent.status", label: "Consent Status" },
  { value: "date_joined", label: "Date Joined" },
  { value: "last_login", label: "Last Login" },
  { value: "has_applications", label: "Has Applications" },
  { value: "has_published_jobs", label: "Has Published Jobs" },
  { value: "attribute", label: "Custom Attribute" },
]

const OP_OPTIONS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "is not one of" },
  { value: "exists", label: "exists" },
  { value: "is_null", label: "is null" },
]

function getValueSuggestions(field: string): string[] {
  switch (field) {
    case "role":
      return ["admin", "employer", "agency", "candidate"]
    case "status":
      return ["active", "suspended", "pending"]
    case "consent.status":
      return ["opted_in", "opted_out", "unsubscribed", "bounced", "complained"]
    case "company.verified":
      return ["true", "false"]
    default:
      return []
  }
}

function isNoValueOp(op: string): boolean {
  return op === "exists" || op === "is_null"
}

interface SegmentRuleBuilderProps {
  value: SegmentFilterRules
  onChange: (value: SegmentFilterRules) => void
  disabled?: boolean
}

export function SegmentRuleBuilder({ value, onChange, disabled }: SegmentRuleBuilderProps) {
  const rules = value.rules || []
  const logic = value.logic || "AND"

  const addRule = () => {
    const newRule: SegmentRule = { field: "role", op: "eq", value: "" }
    onChange({ ...value, rules: [...rules, newRule] })
  }

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    const updated = rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule))
    onChange({ ...value, rules: updated })
  }

  const removeRule = (index: number) => {
    onChange({ ...value, rules: rules.filter((_, i) => i !== index) })
  }

  const toggleLogic = () => {
    onChange({ ...value, logic: logic === "AND" ? "OR" : "AND" })
  }

  return (
    <div className="space-y-3">
      {/* Logic toggle */}
      {rules.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Match</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={toggleLogic}
            disabled={disabled}
          >
            {logic === "AND" ? "ALL" : "ANY"}
          </Button>
          <span className="text-sm text-muted-foreground">of the following rules</span>
        </div>
      )}

      {/* Rules */}
      {rules.map((rule, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px] w-10 justify-center",
                logic === "AND"
                  ? "border-sky/20 text-sky bg-sky/10"
                  : "border-amber-200 text-amber-600 bg-amber-50"
              )}
            >
              {logic}
            </Badge>
          )}
          {index === 0 && rules.length > 1 && <div className="w-10 shrink-0" />}

          {/* Field */}
          <Select
            value={rule.field}
            onValueChange={(v) => updateRule(index, { field: v })}
            disabled={disabled}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator */}
          <Select
            value={rule.op}
            onValueChange={(v) => updateRule(index, { op: v as SegmentRule["op"] })}
            disabled={disabled}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              {OP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value */}
          {!isNoValueOp(rule.op) && (
            <>
              {getValueSuggestions(rule.field).length > 0 ? (
                <Select
                  value={String(rule.value)}
                  onValueChange={(v) => updateRule(index, { value: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    {getValueSuggestions(rule.field).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={String(rule.value)}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 h-9"
                  disabled={disabled}
                />
              )}
            </>
          )}

          {/* Remove */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeRule(index)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Add Rule */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={addRule}
        disabled={disabled}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add Rule
      </Button>
    </div>
  )
}

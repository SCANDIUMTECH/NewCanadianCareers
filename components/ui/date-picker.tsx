"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format, startOfDay, isSameDay } from "date-fns"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean | ((date: Date) => boolean)
  /** For portaling inside Dialogs (Radix pointer-events fix) */
  container?: HTMLElement | null
  className?: string
}

const shortcuts = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1yr", days: 365 },
] as const

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  container,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date>(value ?? new Date())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = React.useMemo(() => startOfDay(new Date()), [])

  // Sync month view when value changes externally
  React.useEffect(() => {
    if (value) setMonth(value)
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
  }

  const handleShortcut = (days: number) => {
    const date = addDays(new Date(), days)
    onChange(date)
    setMonth(date)
    setOpen(false)
  }

  const handleNoExpiry = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <InputGroup className={className}>
      <InputGroupInput
        readOnly
        value={value ? format(value, "PPP") : ""}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton>
              <CalendarIcon />
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            container={container}
          >
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              disabled={typeof disabled === "function" ? disabled : undefined}
              autoFocus
            />
            <div className="flex flex-wrap gap-1 border-t px-3 py-2">
              {shortcuts.map((s) => (
                <Button
                  key={s.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs",
                    value &&
                      isSameDay(value, addDays(today, s.days)) &&
                      "bg-accent"
                  )}
                  onClick={() => handleShortcut(s.days)}
                >
                  {s.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs",
                  !value && "bg-accent"
                )}
                onClick={handleNoExpiry}
              >
                No expiry
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { DatePicker }
export type { DatePickerProps }

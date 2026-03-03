"use client"

import * as React from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { INDUSTRY_LABELS } from "@/lib/constants/industries"

interface IndustryComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function IndustryCombobox({ value, onValueChange }: IndustryComboboxProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative">
      <Combobox
        items={INDUSTRY_LABELS}
        value={value || null}
        onValueChange={(val) => onValueChange(val || "")}
      >
        <ComboboxInput placeholder="Select industry..." showClear />
        <ComboboxContent container={containerRef}>
          <ComboboxEmpty>No industry found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Globe, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { generateSEOMeta } from "@/lib/api/ai"
import { cn } from "@/lib/utils"

interface SEOFieldsProps {
  jobId?: string
  metaTitle: string
  metaDescription: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
  defaultOpen?: boolean
  className?: string
}

/**
 * SEO meta fields with optional AI generation for job forms.
 * Renders in a collapsible section with character counters and AI button.
 */
export function SEOFields({
  jobId,
  metaTitle,
  metaDescription,
  onMetaTitleChange,
  onMetaDescriptionChange,
  defaultOpen = false,
  className,
}: SEOFieldsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleAIGenerate = async () => {
    if (!jobId) return
    const result = await generateSEOMeta(jobId)
    onMetaTitleChange(result.meta_title)
    onMetaDescriptionChange(result.meta_description)
  }

  const titleLength = metaTitle.length
  const descLength = metaDescription.length

  function charCountColor(length: number, warn: number, limit: number): string {
    if (length > limit) return "text-red-500"
    if (length > warn) return "text-amber-500"
    return "text-gray-400"
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-500" />
          <span>SEO Settings</span>
          {(metaTitle || metaDescription) && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              Configured
            </Badge>
          )}
        </div>
        <svg
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 px-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Optimize how this job appears in search engines and Google for Jobs.
          </p>
          {jobId && (
            <AIGenerateButton
              onClick={handleAIGenerate}
              label="Auto-generate"
            />
          )}
        </div>

        {/* Meta Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="meta_title" className="text-xs font-medium">
                Meta Title
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">The title shown in search engine results. Keep under 60 characters for best display.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={cn(
              "text-[10px] font-medium tabular-nums",
              charCountColor(titleLength, 50, 60)
            )}>
              {titleLength}/60
            </span>
          </div>
          <Input
            id="meta_title"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder="e.g., Senior Developer at Acme Corp — Toronto (Remote)"
            maxLength={70}
            className="text-sm"
          />
        </div>

        {/* Meta Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="meta_description" className="text-xs font-medium">
                Meta Description
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">The snippet shown below the title in search results. Keep under 155 characters.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={cn(
              "text-[10px] font-medium tabular-nums",
              charCountColor(descLength, 140, 155)
            )}>
              {descLength}/155
            </span>
          </div>
          <Textarea
            id="meta_description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Write a compelling summary of the role, including key benefits and requirements..."
            maxLength={160}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Search Preview */}
        {(metaTitle || metaDescription) && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">
              Search Preview
            </p>
            <p className="text-sm text-blue-700 font-medium leading-snug truncate">
              {metaTitle || "Job Title — Company | Orion Jobs"}
            </p>
            <p className="text-xs text-green-700 truncate">
              orion.jobs/jobs/...
            </p>
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {metaDescription || "Job description preview will appear here..."}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import { useState } from "react"
import { Sparkles, Loader2, Check, Copy, Linkedin, Twitter, Facebook, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { generateSocialContent } from "@/lib/api/ai"
import { cn } from "@/lib/utils"

const platformConfig = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-[#0A66C2]", maxLen: 1300 },
  twitter: { label: "X (Twitter)", icon: Twitter, color: "text-[#1DA1F2]", maxLen: 280 },
  facebook: { label: "Facebook", icon: Facebook, color: "text-[#1877F2]", maxLen: 500 },
  instagram: { label: "Instagram", icon: Instagram, color: "text-[#E4405F]", maxLen: 2200 },
} as const

type Platform = keyof typeof platformConfig

interface SocialContentGeneratorProps {
  jobId: string
  onContentGenerated?: (content: Record<string, string>) => void
  createPosts?: boolean
  className?: string
}

/**
 * AI-powered social media content generator for job postings.
 * Generates platform-specific content and optionally creates SocialPost records.
 */
export function SocialContentGenerator({
  jobId,
  onContentGenerated,
  createPosts = false,
  className,
}: SocialContentGeneratorProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin", "twitter", "facebook"])
  const [content, setContent] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return

    setStatus("loading")
    setError(null)

    try {
      const result = await generateSocialContent({
        job_id: jobId,
        platforms: selectedPlatforms,
        create_posts: createPosts,
      })

      setContent(result.content)
      setStatus("success")
      onContentGenerated?.(result.content)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate content"
      setError(message)
      setStatus("error")
    }
  }

  const handleCopy = async (platform: string) => {
    const text = content[platform]
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopiedPlatform(platform)
      setTimeout(() => setCopiedPlatform(null), 2000)
    } catch {
      const { toast } = await import("sonner")
      toast.error("Failed to copy — try selecting and copying manually")
    }
  }

  const handleContentEdit = (platform: string, value: string) => {
    const updated = { ...content, [platform]: value }
    setContent(updated)
    onContentGenerated?.(updated)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Platform Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-600">Platforms</Label>
        <div className="flex flex-wrap gap-3">
          {(Object.entries(platformConfig) as [Platform, typeof platformConfig[Platform]][]).map(
            ([key, config]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm",
                  selectedPlatforms.includes(key)
                    ? "border-indigo-300 bg-indigo-50/80"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-100"
                )}
              >
                <Checkbox
                  checked={selectedPlatforms.includes(key)}
                  onCheckedChange={() => togglePlatform(key)}
                />
                <config.icon className={cn("h-4 w-4", config.color)} />
                <span className="text-xs font-medium">{config.label}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={status === "loading" || selectedPlatforms.length === 0}
        className="gap-2"
        size="sm"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {status === "loading"
          ? "Generating..."
          : `Generate for ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
      </Button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Generated Content */}
      {Object.keys(content).length > 0 && (
        <div className="space-y-3">
          {selectedPlatforms.map((platform) => {
            const config = platformConfig[platform]
            const text = content[platform]
            if (!text) return null

            return (
              <Card key={platform} className="border-gray-200">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <config.icon className={cn("h-4 w-4", config.color)} />
                      <span className="text-xs font-medium">{config.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {text.length}/{config.maxLen}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleCopy(platform)}
                    >
                      {copiedPlatform === platform ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={text}
                    onChange={(e) => handleContentEdit(platform, e.target.value)}
                    rows={platform === "twitter" ? 2 : 4}
                    className="text-xs resize-none"
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

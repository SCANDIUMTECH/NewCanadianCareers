"use client"

import { SOCIAL } from "@/lib/constants/colors"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { type JobWizardData } from "@/lib/job-wizard-schema"
import { useCompanyContext } from "@/hooks/use-company"

interface StepDistributionProps {
  data: JobWizardData
  updateData: (updates: Partial<JobWizardData>) => void
}

const socialChannelDefs = [
  {
    key: "linkedin" as const,
    name: "LinkedIn",
    description: "Post to your company page",
    color: SOCIAL.linkedin,
    icon: (
      <span className="text-sm font-bold text-social-linkedin">in</span>
    ),
  },
  {
    key: "twitter" as const,
    name: "X (Twitter)",
    description: "Tweet from company account",
    color: SOCIAL.twitter,
    icon: (
      <span className="text-sm font-bold">X</span>
    ),
  },
  {
    key: "facebook" as const,
    name: "Facebook",
    description: "Share on company page",
    color: SOCIAL.facebook,
    icon: (
      <span className="text-sm font-bold text-social-facebook">f</span>
    ),
  },
  {
    key: "instagram" as const,
    name: "Instagram",
    description: "Share as a story",
    color: SOCIAL.instagram,
    icon: (
      <span className="text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">ig</span>
    ),
  },
]

export function StepDistribution({ data, updateData }: StepDistributionProps) {
  const { company } = useCompanyContext()

  // Build channels with dynamic connection status from company profile
  const socialChannels = socialChannelDefs.map((channel) => {
    let connected = false
    let handle: string | null = null

    if (channel.key === "linkedin" && company?.linkedin_url) {
      connected = true
      handle = company.name || "Connected"
    } else if (channel.key === "twitter" && company?.twitter_url) {
      connected = true
      handle = company.twitter_url.replace(/^https?:\/\/(www\.)?x\.com\//, "@")
    } else if (channel.key === "facebook" && company?.facebook_url) {
      connected = true
      handle = company.name || "Connected"
    } else if (channel.key === "instagram" && company?.instagram_url) {
      connected = true
      handle = company.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
    }

    return { ...channel, connected, handle, description: channel.description }
  })

  const toggleChannel = (key: "linkedin" | "twitter" | "facebook" | "instagram") => {
    updateData({ [key]: !data[key] })
  }

  const connectedCount = socialChannels.filter(
    (channel) => channel.connected && data[channel.key]
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Distribution</h2>
        <p className="text-sm text-foreground-muted">
          Automatically share this job on your social channels
        </p>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {connectedCount > 0
                ? `Sharing to ${connectedCount} channel${connectedCount > 1 ? "s" : ""}`
                : "No channels selected"}
            </p>
            <p className="text-xs text-foreground-muted">
              Posts will be published when the job goes live
            </p>
          </div>
        </div>
      </div>

      {/* Social Channels */}
      <div className="space-y-3">
        <Label>Social Channels</Label>
        {socialChannels.map((channel) => (
          <div
            key={channel.key}
            className="flex items-center justify-between p-4 rounded-xl border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${channel.color}15` }}
              >
                {channel.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{channel.name}</p>
                  {channel.connected ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                    >
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-foreground/5 text-foreground-muted border-foreground/10 text-xs"
                    >
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">
                  {channel.connected ? channel.handle : channel.description}
                </p>
              </div>
            </div>
            {channel.connected ? (
              <Switch
                checked={data[channel.key]}
                onCheckedChange={() => toggleChannel(channel.key)}
              />
            ) : (
              <button className="text-sm text-primary hover:text-primary-hover font-medium transition-colors">
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-foreground-muted mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Pro tip</p>
            <p className="text-sm text-foreground-muted mt-1">
              Jobs shared on LinkedIn get 2x more visibility. Connect your company page in{" "}
              <a href="/company/settings" className="text-primary hover:underline">Settings</a>{" "}
              to enable automatic posting.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

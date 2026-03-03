import { cn } from "@/lib/utils"
import { Check, X, AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface BotAccessCardProps {
  name: string
  description: string
  icon: React.ReactNode
  isAllowed: boolean
  onToggle?: (allowed: boolean) => void
  status?: "active" | "blocked" | "partial"
  lastSeen?: string
}

export function BotAccessCard({
  name,
  description,
  icon,
  isAllowed,
  onToggle,
  status = isAllowed ? "active" : "blocked",
  lastSeen,
}: BotAccessCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          icon: Check,
          color: "text-emerald-600",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          label: "Allowed",
        }
      case "blocked":
        return {
          icon: X,
          color: "text-red-600",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          label: "Blocked",
        }
      case "partial":
        return {
          icon: AlertCircle,
          color: "text-amber-600",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          label: "Partial",
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      statusConfig.bg,
      statusConfig.border
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            statusConfig.bg
          )}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{name}</h4>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                statusConfig.bg,
                statusConfig.color
              )}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            {lastSeen && (
              <p className="text-xs text-muted-foreground mt-1">
                Last seen: {lastSeen}
              </p>
            )}
          </div>
        </div>

        {onToggle && (
          <Switch
            checked={isAllowed}
            onCheckedChange={onToggle}
          />
        )}
      </div>
    </div>
  )
}

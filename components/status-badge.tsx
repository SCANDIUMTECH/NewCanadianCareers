import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { JOB_STATUS_STYLES, APPLICATION_STATUS_STYLES } from "@/lib/constants/status-styles"

interface StatusBadgeProps {
  status: string
  variant?: "job" | "application"
  className?: string
}

export function StatusBadge({ status, variant = "job", className }: StatusBadgeProps) {
  const styles = variant === "application" ? APPLICATION_STATUS_STYLES : JOB_STATUS_STYLES
  const config = styles[status]
  if (!config) return null

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}

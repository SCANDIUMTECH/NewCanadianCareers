import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface SEOHealthScoreCardProps {
  score: number
  previousScore?: number
  label?: string
  industryAverage?: number
}

export function SEOHealthScoreCard({ score, previousScore, label = "SEO Health Score", industryAverage = 72 }: SEOHealthScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600"
    if (s >= 60) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBg = (s: number) => {
    if (s >= 80) return "from-emerald-500/20 to-emerald-500/5"
    if (s >= 60) return "from-amber-500/20 to-amber-500/5"
    return "from-red-500/20 to-red-500/5"
  }

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "Excellent"
    if (s >= 80) return "Good"
    if (s >= 60) return "Fair"
    if (s >= 40) return "Poor"
    return "Critical"
  }

  const trend = previousScore !== undefined ? score - previousScore : 0
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus

  // Calculate the circumference and offset for the ring
  const circumference = 2 * Math.PI * 70 // radius = 70
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6",
      getScoreBg(score)
    )}>
      <div className="flex items-center gap-6">
        {/* Score Ring */}
        <div className="relative w-40 h-40 shrink-0">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-foreground/10"
            />
            {/* Progress ring */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-1000", getScoreColor(score))}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-4xl font-bold", getScoreColor(score))}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          <p className={cn("text-2xl font-semibold mt-1", getScoreColor(score))}>
            {getScoreLabel(score)}
          </p>

          {previousScore !== undefined && (
            <div className={cn(
              "flex items-center gap-1.5 mt-3 text-sm",
              trend > 0 && "text-emerald-600",
              trend < 0 && "text-red-600",
              trend === 0 && "text-muted-foreground"
            )}>
              <TrendIcon className="w-4 h-4" />
              <span>
                {trend > 0 ? "+" : ""}{trend} points from last week
              </span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Target</span>
              <p className="font-medium text-foreground">≥ 80</p>
            </div>
            <div>
              <span className="text-muted-foreground">Industry Avg</span>
              <p className="font-medium text-foreground">{industryAverage}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

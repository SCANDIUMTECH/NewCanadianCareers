"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, RefreshCw, ArrowLeft, Home, ChevronDown } from "lucide-react"
import Link from "next/link"

interface ErrorBoundaryViewProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  backHref: string
  backLabel?: string
  backIcon?: "home" | "arrow"
  logLabel?: string
}

export function ErrorBoundaryView({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or return to the dashboard.",
  backHref,
  backLabel = "Back to Dashboard",
  backIcon = "home",
  logLabel = "Error",
}: ErrorBoundaryViewProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isDev = process.env.NODE_ENV === "development"

  useEffect(() => {
    console.error(`${logLabel}:`, error)
  }, [error, logLabel])

  const BackIcon = backIcon === "home" ? Home : ArrowLeft

  return (
    <div className="max-w-[600px] mx-auto px-4 md:px-6 lg:px-8 py-16">
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            {title}
          </h2>
          <p className="text-foreground-muted mb-8 max-w-md mx-auto">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button asChild className="gap-2">
              <Link href={backHref}>
                <BackIcon className="w-4 h-4" />
                {backLabel}
              </Link>
            </Button>
          </div>

          {isDev && (
            <div className="mt-6 text-left">
              <button
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
                aria-controls="error-details-panel"
                className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors mx-auto"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                Error Details
              </button>
              {showDetails && (
                <div id="error-details-panel" className="mt-3 p-3 bg-muted rounded-lg text-xs font-mono text-foreground-muted break-all">
                  <p className="font-semibold text-foreground mb-1">{error.name}: {error.message}</p>
                  {error.digest && (
                    <p className="mt-1">Digest: {error.digest}</p>
                  )}
                  {error.stack && (
                    <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

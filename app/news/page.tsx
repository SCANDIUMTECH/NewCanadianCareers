import type { Metadata } from "next"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { NewsIndexClient } from "./news-index-client"

export const metadata: Metadata = {
  title: "News & Insights | Orion Jobs",
  description: "Career advice, industry insights, and hiring trends from Orion Jobs.",
  openGraph: {
    title: "News & Insights | Orion Jobs",
    description: "Career advice, industry insights, and hiring trends from Orion Jobs.",
    type: "website",
  },
}

export default function NewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewsIndexClient />
    </Suspense>
  )
}

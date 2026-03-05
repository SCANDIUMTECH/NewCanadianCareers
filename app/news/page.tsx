import type { Metadata } from "next"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { PublicPageShell } from "@/components/public-page-shell"
import { NewsIndexClient } from "./news-index-client"

export const metadata: Metadata = {
  title: "News & Insights | New Canadian Careers",
  description: "Career advice, industry insights, and hiring trends from New Canadian Careers.",
  openGraph: {
    title: "News & Insights | New Canadian Careers",
    description: "Career advice, industry insights, and hiring trends from New Canadian Careers.",
    type: "website",
  },
}

export default function NewsPage() {
  return (
    <PublicPageShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <NewsIndexClient />
      </Suspense>
    </PublicPageShell>
  )
}

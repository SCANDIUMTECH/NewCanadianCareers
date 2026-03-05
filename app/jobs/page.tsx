import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import JobsSearchClient from "./jobs-search-client"

export const metadata: Metadata = {
  title: "Browse Canadian Jobs | New Canadian Careers",
  description:
    "Search jobs across Canada. Filter by province, city, salary, and job type. Find your next Canadian career opportunity.",
  openGraph: {
    title: "Browse Canadian Jobs | New Canadian Careers",
    description:
      "Search jobs across Canada. Filter by province, city, salary, and job type. Find your next Canadian career opportunity.",
    type: "website",
    url: "/jobs",
  },
}

function JobsLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function JobsPage() {
  return (
    <PublicPageShell>
      <Suspense fallback={<JobsLoadingSpinner />}>
        <JobsSearchClient />
      </Suspense>
    </PublicPageShell>
  )
}

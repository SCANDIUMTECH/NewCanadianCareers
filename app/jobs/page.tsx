import { Suspense } from "react"
import type { Metadata } from "next"
import JobsSearchClient from "./jobs-search-client"

export const metadata: Metadata = {
  title: "Browse Jobs | Orion",
  description:
    "Search thousands of jobs across top companies. Filter by location, salary, job type, and more. Find your next opportunity on Orion.",
  openGraph: {
    title: "Browse Jobs | Orion",
    description:
      "Search thousands of jobs across top companies. Filter by location, salary, job type, and more. Find your next opportunity on Orion.",
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
    <Suspense fallback={<JobsLoadingSpinner />}>
      <JobsSearchClient />
    </Suspense>
  )
}

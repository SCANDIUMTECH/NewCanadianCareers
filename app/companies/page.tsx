import { Suspense } from "react"
import type { Metadata } from "next"
import CompaniesDirectoryClient from "./companies-directory-client"

export const metadata: Metadata = {
  title: "Company Directory | Orion",
  description:
    "Browse top companies hiring on Orion. Explore verified employers across every industry and find the organization that matches your values and career goals.",
  openGraph: {
    title: "Company Directory | Orion",
    description:
      "Browse top companies hiring on Orion. Explore verified employers across every industry and find the organization that matches your values and career goals.",
    type: "website",
    url: "/companies",
  },
}

function CompaniesLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<CompaniesLoadingSpinner />}>
      <CompaniesDirectoryClient />
    </Suspense>
  )
}

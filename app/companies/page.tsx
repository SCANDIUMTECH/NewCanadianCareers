import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import CompaniesDirectoryClient from "./companies-directory-client"

export const metadata: Metadata = {
  title: "Canadian Employers | New Canadian Careers",
  description:
    "Browse Canadian companies hiring newcomers. Find employers who value international experience and diverse talent.",
  openGraph: {
    title: "Canadian Employers | New Canadian Careers",
    description:
      "Browse Canadian companies hiring newcomers. Find employers who value international experience and diverse talent.",
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
    <PublicPageShell>
      <Suspense fallback={<CompaniesLoadingSpinner />}>
        <CompaniesDirectoryClient />
      </Suspense>
    </PublicPageShell>
  )
}

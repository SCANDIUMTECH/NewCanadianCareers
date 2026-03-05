import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { HelpSupportClient } from "./help-support-client"

export const metadata: Metadata = {
  title: "Help & Support | New Canadian Careers",
  description:
    "Find answers to common questions about job searching, employer tools, billing, and more. Get the support you need for your career journey in Canada.",
  openGraph: {
    title: "Help & Support | New Canadian Careers",
    description:
      "Find answers to common questions about job searching, employer tools, billing, and more. Get the support you need for your career journey in Canada.",
    type: "website",
    url: "/help",
  },
}

function HelpLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function HelpPage() {
  return (
    <PublicPageShell>
      <Suspense fallback={<HelpLoadingSpinner />}>
        <HelpSupportClient />
      </Suspense>
    </PublicPageShell>
  )
}

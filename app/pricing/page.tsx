import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { PricingClient } from "./pricing-client"

export const metadata: Metadata = {
  title: "Pricing & Plans | New Canadian Careers",
  description:
    "Flexible job posting packages for Canadian employers. Choose a plan and start hiring newcomers today.",
  openGraph: {
    title: "Pricing & Plans | New Canadian Careers",
    description:
      "Flexible job posting packages for Canadian employers. Choose a plan and start hiring newcomers today.",
    type: "website",
    url: "/pricing",
  },
}

function PricingLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function PricingPage() {
  return (
    <PublicPageShell>
      <Suspense fallback={<PricingLoadingSpinner />}>
        <PricingClient />
      </Suspense>
    </PublicPageShell>
  )
}

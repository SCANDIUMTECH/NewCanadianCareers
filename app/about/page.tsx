import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { AboutClient } from "./about-client"

export const metadata: Metadata = {
  title: "About Us | New Canadian Careers",
  description:
    "NewCanadian.Careers is a purpose-built hiring platform designed to help newcomers access meaningful employment opportunities in Canada.",
  openGraph: {
    title: "About Us | New Canadian Careers",
    description:
      "NewCanadian.Careers is a purpose-built hiring platform designed to help newcomers access meaningful employment opportunities in Canada.",
    type: "website",
    url: "/about",
  },
}

function AboutLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function AboutPage() {
  return (
    <PublicPageShell>
      <Suspense fallback={<AboutLoadingSpinner />}>
        <AboutClient />
      </Suspense>
    </PublicPageShell>
  )
}

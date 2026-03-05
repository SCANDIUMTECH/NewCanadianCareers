import { Suspense } from "react"
import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { ContactClient } from "./contact-client"

export const metadata: Metadata = {
  title: "Contact Us | New Canadian Careers",
  description:
    "Get in touch with New Canadian Careers. Questions about job postings, employer packages, or career resources — we're here to help.",
  openGraph: {
    title: "Contact Us | New Canadian Careers",
    description:
      "Get in touch with New Canadian Careers. Questions about job postings, employer packages, or career resources — we're here to help.",
    type: "website",
    url: "/contact",
  },
}

function ContactLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function ContactPage() {
  return (
    <PublicPageShell>
      <Suspense fallback={<ContactLoadingSpinner />}>
        <ContactClient />
      </Suspense>
    </PublicPageShell>
  )
}

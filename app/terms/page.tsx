import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { TermsOfServiceClient } from "./terms-client"

export const metadata: Metadata = {
  title: "Terms of Service | New Canadian Careers",
  description: "Read the terms and conditions governing the use of the New Canadian Careers platform.",
}

export default function TermsOfServicePage() {
  return (
    <PublicPageShell>
      <TermsOfServiceClient />
    </PublicPageShell>
  )
}

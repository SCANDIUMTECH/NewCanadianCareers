import type { Metadata } from "next"
import { PublicPageShell } from "@/components/public-page-shell"
import { PrivacyPolicyClient } from "./privacy-client"

export const metadata: Metadata = {
  title: "Privacy Policy | New Canadian Careers",
  description: "Learn how New Canadian Careers collects, uses, and protects your personal information.",
}

export default function PrivacyPolicyPage() {
  return (
    <PublicPageShell>
      <PrivacyPolicyClient />
    </PublicPageShell>
  )
}

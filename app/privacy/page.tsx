import type { Metadata } from "next"
import { PrivacyPolicyClient } from "./privacy-client"

export const metadata: Metadata = {
  title: "Privacy Policy | Orion",
  description: "Learn how Orion collects, uses, and protects your personal information.",
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />
}

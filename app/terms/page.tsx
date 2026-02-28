import type { Metadata } from "next"
import { TermsOfServiceClient } from "./terms-client"

export const metadata: Metadata = {
  title: "Terms of Service | Orion",
  description: "Read the terms and conditions governing the use of the Orion platform.",
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />
}

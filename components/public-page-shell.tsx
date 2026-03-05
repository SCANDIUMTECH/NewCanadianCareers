"use client"

import { type ReactNode } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-24 md:pt-28">
        {children}
      </main>
      <Footer />
    </>
  )
}

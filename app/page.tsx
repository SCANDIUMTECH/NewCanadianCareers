import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { WhyOrionSection } from "@/components/why-orion-section"
import { CandidatesSection } from "@/components/candidates-section"
import { CompaniesSection } from "@/components/companies-section"
import { PlatformSection } from "@/components/platform-section"
import { FinalCTASection } from "@/components/final-cta-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <WhyOrionSection />
        <CandidatesSection />
        <CompaniesSection />
        <PlatformSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  )
}

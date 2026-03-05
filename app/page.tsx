import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedJobsSection } from "@/components/featured-jobs-section"
import { WhyOrionSection } from "@/components/why-orion-section"
import { CandidatesSection } from "@/components/candidates-section"
import { CompaniesSection } from "@/components/companies-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { PlatformSection } from "@/components/platform-section"
import { FinalCTASection } from "@/components/final-cta-section"
import { Footer } from "@/components/footer"
import { BannerSlot } from "@/components/banners/banner-slot"

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-4">
          <BannerSlot placement="homepage" />
        </div>
        <FeaturedJobsSection />
        <WhyOrionSection />
        <CandidatesSection />
        <CompaniesSection />
        <TestimonialsSection />
        <PlatformSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  )
}

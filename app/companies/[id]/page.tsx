import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompanyAvatar } from "@/components/company-avatar"
import { MotionWrapper } from "@/components/motion-wrapper"
import { MagneticButton } from "@/components/magnetic-button"
import { ConstellationCanvas } from "@/components/constellation-canvas"
import { getPublicCompany, PublicCompanyDetail, PublicJobListItem } from "@/lib/api/public"
import { OrganizationJsonLd } from "@/components/seo/organization-schema"
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-schema"
import { hashToHue } from "@/lib/utils"
import {
  MapPin, Building2, Users, Briefcase, Calendar,
  Check, ArrowRight, Heart, Gift, Info, Globe, ExternalLink,
} from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const company = await getPublicCompany(id)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'
    const description = company.tagline || company.description?.slice(0, 160) || `View ${company.name}'s company profile and open positions on New Canadian Careers.`
    return {
      title: `${company.name} - Company Profile | New Canadian Careers`,
      description,
      alternates: {
        canonical: `${baseUrl}/companies/${id}`,
      },
      openGraph: {
        title: `${company.name} - Company Profile`,
        description,
        type: 'website',
        url: `${baseUrl}/companies/${id}`,
        ...(company.banner || company.logo ? { images: [{ url: company.banner || company.logo! }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${company.name} - Company Profile`,
        description,
        ...(company.banner || company.logo ? { images: [company.banner || company.logo!] } : {}),
      },
    }
  } catch {
    return {
      title: 'Company Not Found | New Canadian Careers',
    }
  }
}

export default async function PublicCompanyProfilePage({ params }: PageProps) {
  const { id } = await params

  let company: PublicCompanyDetail
  try {
    company = await getPublicCompany(id)
  } catch {
    notFound()
  }

  const jobs = company.jobs || []
  const hue = hashToHue(company.name)

  // Helpers
  function getRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return '1 week ago'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 60) return '1 month ago'
    return `${Math.floor(diffDays / 30)} months ago`
  }

  function getRemoteLabel(remote: 'onsite' | 'remote' | 'hybrid'): string {
    switch (remote) {
      case 'remote': return 'Remote'
      case 'hybrid': return 'Hybrid'
      case 'onsite': return 'On-site'
      default: return remote
    }
  }

  function formatSalary(job: PublicJobListItem): string | null {
    if (!job.show_salary || !job.salary_min || !job.salary_max) return null
    const min = Number(job.salary_min)
    const max = Number(job.salary_max)
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
    const currency = job.salary_currency === 'USD' ? '$' : job.salary_currency
    const period = job.salary_period ? `/${job.salary_period === 'year' ? 'yr' : job.salary_period === 'month' ? 'mo' : 'hr'}` : ''
    return `${currency}${fmt(min)} - ${fmt(max)}${period}`
  }

  // Build headquarters string
  const headquarters = [company.headquartersCity, company.headquartersState, company.headquartersCountry]
    .filter(Boolean)
    .join(', ')

  // Determine if sidebar has content
  const hasCulture = company.culture && company.culture.length > 0
  const hasBenefits = company.benefits && company.benefits.length > 0
  const hasQuickFacts = headquarters || company.founded || company.size || company.industry
  const hasSidebar = hasCulture || hasBenefits || hasQuickFacts

  // Social links
  const socialLinks = [
    company.socialLinks?.linkedin && { href: company.socialLinks.linkedin, label: 'LinkedIn', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, color: 'hover:text-social-linkedin' },
    company.socialLinks?.twitter && { href: company.socialLinks.twitter, label: 'X', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, color: 'hover:text-foreground' },
    company.socialLinks?.facebook && { href: company.socialLinks.facebook, label: 'Facebook', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: 'hover:text-social-facebook' },
    company.socialLinks?.instagram && { href: company.socialLinks.instagram, label: 'Instagram', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, color: 'hover:text-social-instagram' },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode; color: string }[]

  // Stats to show
  const stats = [
    jobs.length > 0 && { icon: Briefcase, value: String(jobs.length), label: 'Open Positions' },
    company.memberCount && { icon: Users, value: String(company.memberCount), label: 'Team Members' },
    company.founded && { icon: Calendar, value: company.founded, label: 'Founded' },
    company.industry && { icon: Building2, value: company.industry, label: 'Industry' },
    company.size && { icon: Users, value: `${company.size} employees`, label: 'Company Size' },
    headquarters && { icon: MapPin, value: headquarters, label: 'Headquarters' },
  ].filter(Boolean) as { icon: typeof Briefcase; value: string; label: string }[]

  // Build social links array for Organization schema
  const orgSocialLinks = [
    company.socialLinks?.linkedin,
    company.socialLinks?.twitter,
    company.socialLinks?.facebook,
    company.socialLinks?.instagram,
  ].filter(Boolean) as string[]

  // Breadcrumb items
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Companies', url: '/companies' },
    { name: company.name, url: `/companies/${id}` },
  ]

  return (
    <>
      {/* SEO Schema Markup */}
      <OrganizationJsonLd
        company={{
          name: company.name,
          description: company.description || undefined,
          website: company.website || undefined,
          logo: company.logo || undefined,
          foundingDate: company.founded || undefined,
          // Note: company.size is a display string (e.g. "50-200"), not parsed min/max.
          // Omitting employeeCount to avoid malformed QuantitativeValue in JSON-LD.
          ...(headquarters && {
            location: {
              city: company.headquartersCity || '',
              state: company.headquartersState || undefined,
              country: company.headquartersCountry || '',
            },
          }),
          industry: company.industry || undefined,
          ...(orgSocialLinks.length > 0 && { socialLinks: orgSocialLinks }),
        }}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <span className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              NCC
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all group-hover:bg-primary" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/companies">
              <Button variant="ghost" size="sm">Companies</Button>
            </Link>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Browse Jobs</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-[240px] md:h-[320px] overflow-hidden">
        {company.banner ? (
          <>
            <Image
              src={company.banner}
              alt={`${company.name} banner`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 60% 15%) 0%, hsl(${hue} 50% 8%) 50%, hsl(${(hue + 30) % 360} 40% 12%) 100%)`,
              }}
            />
            <ConstellationCanvas />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </>
        )}
      </div>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6">
        {/* Company Identity — overlaps hero */}
        <div className="-mt-20 relative z-10 mb-8">
          <MotionWrapper delay={0}>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar with ring */}
              <div className="relative">
                <div className="ring-4 ring-background rounded-2xl shadow-2xl">
                  <CompanyAvatar name={company.name} logo={company.logo} size="2xl" />
                </div>
                {company.verified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center ring-3 ring-background shadow-lg">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="flex-1 pt-2 sm:pt-8">
                {/* Company name — plain h1 for LCP, no animation delay */}
                <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold tracking-tight text-foreground leading-tight">
                  {company.name}
                </h1>

                {/* Tagline */}
                {company.tagline && (
                  <MotionWrapper delay={200}>
                    <p className="mt-2 text-lg text-foreground-muted max-w-2xl">
                      {company.tagline}
                    </p>
                  </MotionWrapper>
                )}

                {/* Social links + website */}
                <MotionWrapper delay={300}>
                  <div className="flex items-center gap-4 mt-4">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {socialLinks.length > 0 && (
                      <div className="flex items-center gap-3">
                        {company.website && <span className="w-px h-5 bg-border" />}
                        {socialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-foreground-muted transition-colors ${link.color}`}
                            aria-label={link.label}
                          >
                            {link.icon}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </MotionWrapper>
              </div>
            </div>
          </MotionWrapper>
        </div>

        {/* Stats Strip */}
        {stats.length > 0 && (
          <MotionWrapper delay={400}>
            <div className="mb-10 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
                      <p className="text-xs text-foreground-muted">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MotionWrapper>
        )}

        {/* Main Grid */}
        <div className={`grid grid-cols-1 ${hasSidebar ? 'lg:grid-cols-[1fr_340px]' : ''} gap-10 pb-16`}>
          {/* Left Column */}
          <div className="space-y-12">
            {/* About */}
            {company.description && (
              <MotionWrapper as="section" delay={500}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-6 rounded-full bg-primary" />
                  <h2 className="text-xl font-semibold text-foreground">About {company.name}</h2>
                </div>
                <div className="space-y-4">
                  {company.description.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-[15px] leading-relaxed text-foreground-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </MotionWrapper>
            )}

            {/* Open Positions */}
            <div id="positions" />
            <MotionWrapper as="section" delay={600}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 rounded-full bg-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Open Positions {jobs.length > 0 && <span className="text-foreground-muted font-normal">({jobs.length})</span>}
                </h2>
              </div>

              {jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map((job: PublicJobListItem, i: number) => (
                    <MotionWrapper key={job.job_id} delay={660 + i * 60}>
                      <Link href={`/jobs/${job.job_id}`} className="group block">
                        <div className="relative p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-300">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-foreground-muted">
                                {job.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {job.city}{job.state ? `, ${job.state}` : ''}
                                  </span>
                                )}
                                <span>{job.employment_type}</span>
                                {formatSalary(job) && (
                                  <span className="font-medium text-foreground">{formatSalary(job)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {getRemoteLabel(job.location_type)}
                              </Badge>
                              <span className="text-xs text-foreground-muted whitespace-nowrap">
                                {getRelativeTime(job.posted_at)}
                              </span>
                              <ArrowRight className="w-4 h-4 text-foreground-muted opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0 hidden md:block" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </MotionWrapper>
                  ))}
                </div>
              ) : (
                <div className="p-12 rounded-xl border border-border/50 bg-card/30 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-6 h-6 text-primary/40" />
                  </div>
                  <p className="text-foreground-muted font-medium">No open positions right now</p>
                  <p className="text-sm text-foreground-muted/60 mt-1">Check back later for new opportunities.</p>
                </div>
              )}
            </MotionWrapper>
          </div>

          {/* Right Column — Sidebar */}
          {hasSidebar && (
            <div className="space-y-6">
              {/* Culture & Values */}
              {hasCulture && (
                <MotionWrapper delay={700}>
                  <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Culture & Values</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {company.culture.map((item) => (
                        <Badge key={item} variant="secondary" className="bg-primary/5 text-foreground border-0 text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </MotionWrapper>
              )}

              {/* Benefits & Perks */}
              {hasBenefits && (
                <MotionWrapper delay={760}>
                  <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Benefits & Perks</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {company.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </MotionWrapper>
              )}

              {/* Quick Facts */}
              {hasQuickFacts && (
                <MotionWrapper delay={820}>
                  <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Quick Facts</h3>
                    </div>
                    <dl className="space-y-3">
                      {headquarters && (
                        <div>
                          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Headquarters</dt>
                          <dd className="text-sm text-foreground font-medium mt-0.5">{headquarters}</dd>
                        </div>
                      )}
                      {company.founded && (
                        <div>
                          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Founded</dt>
                          <dd className="text-sm text-foreground font-medium mt-0.5">{company.founded}</dd>
                        </div>
                      )}
                      {company.size && (
                        <div>
                          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Company Size</dt>
                          <dd className="text-sm text-foreground font-medium mt-0.5">{company.size} employees</dd>
                        </div>
                      )}
                      {company.industry && (
                        <div>
                          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Industry</dt>
                          <dd className="text-sm text-foreground font-medium mt-0.5">{company.industry}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </MotionWrapper>
              )}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <MotionWrapper delay={900}>
          <div className="mb-16 p-8 md:p-12 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent border border-primary/10">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Interested in joining {company.name}?
              </h2>
              <p className="text-foreground-muted mb-6">
                {jobs.length > 0
                  ? `Explore ${jobs.length} open position${jobs.length === 1 ? '' : 's'} and find your next opportunity.`
                  : 'Stay tuned for upcoming opportunities and career growth.'}
              </p>
              <div className="flex items-center justify-center gap-4">
                {jobs.length > 0 ? (
                  <Link href="#positions">
                    <MagneticButton variant="primary" className="text-sm">
                      View Open Positions
                    </MagneticButton>
                  </Link>
                ) : (
                  <Link href="/jobs">
                    <MagneticButton variant="primary" className="text-sm">
                      Browse All Jobs
                    </MagneticButton>
                  </Link>
                )}
                <Link href="/jobs">
                  <MagneticButton variant="ghost" className="text-sm">
                    Explore More Companies
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </div>
        </MotionWrapper>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-foreground-muted text-sm">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo.svg"
                  alt="New Canadian Careers Logo"
                  width={28}
                  height={28}
                  className="h-7 w-auto"
                  priority
                />
              </Link>
              <span>·</span>
              <span>&copy; {new Date().getFullYear()} New Canadian Careers. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/companies" className="hover:text-foreground transition-colors">Companies</Link>
              <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

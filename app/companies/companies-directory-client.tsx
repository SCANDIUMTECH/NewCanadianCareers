"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  MapPin,
  Building2,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanyAvatar } from "@/components/company-avatar"
import { browseCompanies, getSearchFilters, type PublicCompanyListItem, type PublicCompanyFilters } from "@/lib/api/public"
import { INDUSTRY_LABELS } from "@/lib/constants/industries"

const industries = ["All Industries", ...INDUSTRY_LABELS]

const sizes = [
  "All Sizes",
  "1-50 employees",
  "50-100 employees",
  "100-250 employees",
  "250-500 employees",
  "500-1000 employees",
  "1000+ employees",
]

export default function CompaniesDirectoryClient() {
  const [locations, setLocations] = useState(["All Locations", "Remote"])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("All Industries")
  const [selectedLocation, setSelectedLocation] = useState("All Locations")
  const [selectedSize, setSelectedSize] = useState("All Sizes")
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'jobs' | 'name' | 'recent'>('jobs')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // API state
  const [companies, setCompanies] = useState<PublicCompanyListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dynamic locations from backend
  useEffect(() => {
    getSearchFilters()
      .then((filters) => {
        const dynamicLocations = filters.top_locations
          .map((loc) => loc.country)
          .filter(Boolean)
        setLocations(["All Locations", "Remote", ...dynamicLocations])
      })
      .catch(() => {
        // Keep fallback: "All Locations" + "Remote"
      })
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, selectedIndustry, selectedLocation, selectedSize, showVerifiedOnly, sortBy])

  // Fetch companies from API
  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const filters: PublicCompanyFilters = {
          q: debouncedQuery || undefined,
          industry: selectedIndustry !== "All Industries" ? selectedIndustry : undefined,
          location: selectedLocation !== "All Locations" ? selectedLocation : undefined,
          size: selectedSize !== "All Sizes" ? selectedSize : undefined,
          verified: showVerifiedOnly || undefined,
          sort: sortBy,
          page: currentPage,
          page_size: itemsPerPage,
        }

        const response = await browseCompanies(filters)
        setCompanies(response.results)
        setTotalCount(response.count)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load companies"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanies()
  }, [debouncedQuery, selectedIndustry, selectedLocation, selectedSize, showVerifiedOnly, sortBy, currentPage])

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Featured companies (first 2 featured ones from current results)
  const featuredCompanies = useMemo(() => {
    return companies.filter(c => c.featured).slice(0, 2)
  }, [companies])

  // Should show featured section
  const showFeatured = !searchQuery && selectedIndustry === "All Industries" && featuredCompanies.length > 0

  const handleResetFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedIndustry("All Industries")
    setSelectedLocation("All Locations")
    setSelectedSize("All Sizes")
    setShowVerifiedOnly(false)
    setSortBy("jobs")
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <span className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              NCC
            </span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50 transition-all group-hover:bg-primary" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost">Browse Jobs</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
            Discover Great Companies
          </h1>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Explore top companies hiring on New Canadian Careers. Find your next opportunity at organizations that match your values and goals.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 md:p-6 mb-8"
        >
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search companies by name, industry, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-full sm:w-48">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {industries.map(industry => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full sm:w-48">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-full sm:w-48">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showVerifiedOnly ? "default" : "outline"}
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className={cn(
                "gap-2",
                showVerifiedOnly && "bg-primary text-primary-foreground"
              )}
            >
              <Check className="w-4 h-4" />
              Verified Only
            </Button>
          </div>
        </motion.div>

        {/* Featured Companies */}
        {showFeatured && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-semibold text-foreground">Featured Companies</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredCompanies.map((company) => (
                <Link key={company.entity_id} href={`/companies/${company.entity_id}`}>
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-all cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CompanyAvatar name={company.name} logo={company.logo} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{company.name}</h3>
                            {company.verified && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shrink-0">
                                <Check className="w-3 h-3 mr-0.5" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground-muted line-clamp-2 mb-3">{company.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {company.industry}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {company.location}
                            </span>
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {company.openJobs} jobs
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-foreground-muted">
            {isLoading ? (
              "Loading..."
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <>
                {totalCount} {totalCount === 1 ? "company" : "companies"} found
              </>
            )}
          </p>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jobs">Most Jobs</SelectItem>
              <SelectItem value="name">Company Name</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-foreground/5 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load companies</h3>
            <p className="text-foreground-muted mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        )}

        {/* Company Cards Grid */}
        {!isLoading && !error && companies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {companies.map((company, index) => (
              <motion.div
                key={company.entity_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/companies/${company.entity_id}`}>
                  <Card className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <CompanyAvatar name={company.name} logo={company.logo} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-foreground truncate">{company.name}</h3>
                            {company.verified && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-foreground-muted">{company.industry}</p>
                        </div>
                      </div>

                      <p className="text-sm text-foreground-muted line-clamp-2 mb-4">
                        {company.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {company.culture.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-foreground/5 text-foreground-muted text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 text-foreground-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {company.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {company.size.split(" ")[0]}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {company.openJobs} jobs
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && companies.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No companies found</h3>
            <p className="text-foreground-muted mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Show pages around current page
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-primary text-primary-foreground" : ""}
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-foreground-muted text-sm">
              <Link href="/" className="flex items-center">
                <span className="font-semibold text-foreground">NCC</span>
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary/50" />
              </Link>
              <span>·</span>
              <span>&copy; 2026 New Canadian Careers. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
              <Link href="/companies" className="hover:text-foreground transition-colors">Companies</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

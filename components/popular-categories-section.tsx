"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Wrench,
  Utensils,
  Heart,
  HardHat,
  Truck,
  Building2,
  ShoppingBag,
  GraduationCap,
  Laptop,
  Factory,
  Sprout,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import { MotionWrapper } from "./motion-wrapper"
import { TextReveal } from "./text-reveal"
import { getJobCategories } from "@/lib/api/public"

const categoryIcons: Record<string, LucideIcon> = {
  construction: HardHat,
  "restaurant-food-service": Utensils,
  healthcare: Heart,
  transportation: Truck,
  hospitality: Building2,
  retail: ShoppingBag,
  education: GraduationCap,
  technology: Laptop,
  manufacturing: Factory,
  agriculture: Sprout,
  "personal-care": Users,
  maintenance: Wrench,
}

const defaultIcon = Briefcase

export function PopularCategoriesSection() {
  const [categories, setCategories] = useState<
    Array<{ slug: string; name: string; count: number }>
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobCategories()
      .then((data) => setCategories(data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && categories.length === 0) return null

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <MotionWrapper delay={0}>
          <div className="text-center mb-12">
            <TextReveal
              as="h2"
              className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Popular Categories
            </TextReveal>
            <p className="font-secondary mt-4 text-foreground-muted text-lg max-w-2xl mx-auto">
              Browse opportunities across industries that welcome newcomers to Canada
            </p>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-foreground/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, index) => {
              const Icon = categoryIcons[cat.slug] || defaultIcon
              return (
                <MotionWrapper key={cat.slug} delay={50 + index * 50}>
                  <Link href={`/jobs?category=${cat.slug}`}>
                    <div className="group relative p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-secondary font-medium text-foreground text-sm">
                        {cat.name}
                      </h3>
                      {cat.count > 0 && (
                        <p className="font-secondary text-xs text-foreground-muted mt-1">
                          {cat.count} {cat.count === 1 ? "job" : "jobs"}
                        </p>
                      )}
                    </div>
                  </Link>
                </MotionWrapper>
              )
            })}
          </div>
        )}

        <MotionWrapper delay={500}>
          <div className="text-center mt-8">
            <Link
              href="/jobs"
              className="font-secondary text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View all categories &rarr;
            </Link>
          </div>
        </MotionWrapper>
      </div>
    </section>
  )
}

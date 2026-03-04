import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <Image
                src="/logo.svg"
                alt="New Canadian Careers Logo"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-12" />
          <span className="text-foreground-muted">/</span>
          <Skeleton className="h-4 w-12" />
          <span className="text-foreground-muted">/</span>
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Hero Card */}
        <div className="rounded-3xl bg-card border border-border/50 p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            {/* Left: Company & Job Info */}
            <div className="flex-1">
              {/* Company */}
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>

              {/* Job Title */}
              <Skeleton className="h-12 w-96 mb-6" />

              {/* Key Details */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>

              {/* Salary */}
              <Skeleton className="h-9 w-64 mb-8" />

              {/* Skills */}
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-8 w-28 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Right: Meta Info Card */}
            <div className="lg:w-80 shrink-0">
              <div className="rounded-2xl border border-border/50 p-6 space-y-5">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    {i < 3 && <div className="border-t border-border/50 mt-5" />}
                  </div>
                ))}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl">
                    <Skeleton className="h-8 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                  <div className="text-center p-3 rounded-xl">
                    <Skeleton className="h-8 w-12 mx-auto mb-1" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                </div>

                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-1 h-6" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </section>

            {/* Responsibilities */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-1 h-6" />
                <Skeleton className="h-6 w-36" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-1.5 h-1.5 rounded-full mt-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </section>

            {/* Requirements */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-1 h-6" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded mt-0.5" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info Card */}
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-xl mt-6" />
            </div>

            {/* Share Card */}
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <Skeleton className="h-5 w-28 mb-4" />
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 flex-1 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

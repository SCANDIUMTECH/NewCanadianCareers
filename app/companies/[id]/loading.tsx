import { Skeleton } from "@/components/ui/skeleton"

export default function PublicCompanyProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </header>

      {/* Banner Skeleton */}
      <Skeleton className="h-[240px] md:h-[320px] w-full rounded-none" />

      {/* Identity */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="-mt-20 relative z-10 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Skeleton className="w-32 h-32 rounded-2xl ring-4 ring-background shrink-0" />
            <div className="flex-1 pt-2 sm:pt-8 space-y-3">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-5 w-96 max-w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mb-10 rounded-xl border border-border/50 p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 pb-16">
          {/* Left */}
          <div className="space-y-12">
            {/* About */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <Skeleton className="w-1 h-6 rounded-full" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </section>

            {/* Jobs */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <Skeleton className="w-1 h-6 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-52" />
                        <Skeleton className="h-4 w-72" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50">
                <Skeleton className="h-5 w-32 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

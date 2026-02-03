import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-foreground">Orion</span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/50" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      </header>

      {/* Search Hero */}
      <div className="bg-card border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 md:py-12">
          <Skeleton className="h-10 w-80 mb-3" />
          <Skeleton className="h-5 w-64 mb-6" />
          <div className="flex flex-col md:flex-row gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="space-y-6">
              {/* Location Filter */}
              <div>
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Remote Filter */}
              <div>
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Type Filter */}
              <div>
                <Skeleton className="h-4 w-20 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Filter */}
              <div>
                <Skeleton className="h-4 w-16 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            </div>
          </aside>

          {/* Jobs List */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-10 w-44" />
              </div>
            </div>

            {/* Jobs Grid */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-border/50 bg-card"
                >
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-3" />
                      <div className="flex items-center gap-4 mb-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map((j) => (
                          <Skeleton key={j} className="h-6 w-20 rounded-full" />
                        ))}
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

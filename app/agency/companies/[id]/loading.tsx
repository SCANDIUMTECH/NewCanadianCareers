import { Skeleton } from "@/components/ui/skeleton"

export default function AgencyCompanyDetailLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-20" />
        <span className="text-foreground-muted">/</span>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border/50">
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-64 mb-6" />

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}

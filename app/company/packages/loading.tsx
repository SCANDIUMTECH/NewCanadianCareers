import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <Skeleton className="h-8 w-56 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>

      {/* Package Toggle */}
      <div className="flex justify-center mb-8">
        <Skeleton className="h-10 w-64 rounded-full" />
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50 relative">
            {i === 2 && (
              <Skeleton className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-24 rounded-full" />
            )}
            <CardHeader className="text-center pb-4">
              <Skeleton className="h-5 w-24 mx-auto mb-2" />
              <Skeleton className="h-10 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Features */}
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>

              <Skeleton className="h-12 w-full mt-6" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add-ons Section */}
      <div className="mb-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

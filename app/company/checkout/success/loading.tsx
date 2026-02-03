import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-12">
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-6" />

          {/* Title */}
          <Skeleton className="h-8 w-64 mx-auto mb-3" />
          <Skeleton className="h-4 w-80 mx-auto mb-8" />

          {/* Order Details */}
          <div className="bg-background-secondary/50 rounded-xl p-6 mb-8">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-48" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-foreground" />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12">
            <Skeleton className="h-6 w-20" />
          </div>

          <Skeleton className="h-10 w-56 mb-3" />
          <Skeleton className="h-5 w-72 mb-10" />

          {/* Form */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Skeleton className="h-4 w-4 rounded mt-0.5" />
              <Skeleton className="h-4 w-full" />
            </div>

            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 border-t border-border" />
            <Skeleton className="h-4 w-28" />
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Social Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          {/* Sign in link */}
          <div className="mt-10 flex justify-center gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

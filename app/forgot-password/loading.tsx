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

          <Skeleton className="h-10 w-48 mb-3" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-72 mb-10" />

          {/* Form */}
          <div className="space-y-5">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          {/* Back to login link */}
          <div className="mt-8 flex justify-center">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

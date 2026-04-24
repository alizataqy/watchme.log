import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-32 animate-pulse">
      {/* Backdrop Skeleton */}
      <div className="h-[40vh] sm:h-[70vh] w-full relative overflow-hidden bg-secondary">
        <Skeleton className="w-full h-full opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="container -mt-52 sm:-mt-80 relative z-10 px-4">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster and Buttons Skeleton */}
          <div className="flex flex-row gap-4 items-start">
            {/* Poster */}
            <div className="w-32 sm:w-48 flex-shrink-0">
              <Skeleton className="w-full aspect-[2/3] rounded-xl shadow-2xl" />
            </div>

            {/* Title and Action Buttons */}
            <div className="flex-1 space-y-4 max-w-xs">
              <Skeleton className="h-10 w-full sm:h-14" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Info Section Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>

            {/* Synopsis */}
            <div className="space-y-3">
              <Skeleton className="h-7 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            </div>

            {/* Cast Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-7 w-24" />
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-24 sm:w-28 space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-[80%]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

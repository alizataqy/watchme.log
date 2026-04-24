import { Skeleton } from "@/components/ui/skeleton";

export function ShowCardSkeleton() {
  return (
    <div className="glass-card rounded-lg overflow-hidden p-3 flex gap-3 animate-pulse">
      {/* Poster Skeleton */}
      <Skeleton className="w-20 h-28 flex-shrink-0 rounded-md" />

      {/* Info Skeleton */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            {/* Title */}
            <Skeleton className="h-4 w-[140px] sm:w-[200px]" />
            {/* Badges */}
            <div className="flex gap-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          {/* Right side badges */}
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-auto space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

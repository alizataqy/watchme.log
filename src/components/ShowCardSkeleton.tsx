import { Skeleton } from "@/components/ui/skeleton";

export const ShowCardSkeleton = () => {
  return (
    <div className="flex gap-4 p-3 rounded-xl border border-border bg-card/50">
      <Skeleton className="h-24 w-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-6 w-12 rounded-md" />
        </div>
        <div className="border rounded-md p-2 mt-2">
            <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
};

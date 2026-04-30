import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-[300px] w-full">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="icon" className="bg-background/20 backdrop-blur-md rounded-full text-white">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="container px-4 -mt-20 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6">
          <Skeleton className="h-[240px] w-[160px] rounded-2xl border-4 border-background shadow-2xl shrink-0 mx-auto sm:mx-0" />

          <div className="flex-1 space-y-4 text-center sm:text-left pt-4">
            <Skeleton className="h-8 w-3/4 mx-auto sm:mx-0" />
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

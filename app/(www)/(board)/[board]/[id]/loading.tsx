import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeftIcon } from "lucide-react";

export default function PostLoading() {
  return (
    <div className="bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
        {/* Go Back Button Skeleton */}
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-6 sm:mb-8">
          <ChevronLeftIcon className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>

        <article>
          <header className="mb-4 sm:mb-6">
            {/* Title Skeleton */}
            <Skeleton className="h-8 sm:h-10 lg:h-12 w-full mb-4 sm:mb-6" />

            {/* Author and Follow Button Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex w-full items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            </div>

            {/* Stats Skeleton */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </header>

          {/* Image Skeleton */}
          <div className="mb-6 sm:mb-8">
            <Skeleton className="h-48 sm:h-64 lg:h-80 w-full rounded-lg" />
          </div>

          {/* Tags Skeleton */}
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>

          {/* Content Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Post Actions Skeleton */}
          <div className="flex items-center gap-4 sm:gap-6 mt-6 mb-6 sm:mb-8">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>

          {/* Comment Section Skeleton */}
          <div className="my-8 sm:my-12">
            <Skeleton className="h-6 w-32 mb-4 sm:mb-6" />

            {/* Comment Box Skeleton */}
            <div className="flex items-start gap-2 sm:gap-3 mb-6 sm:mb-8">
              <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-20 w-full rounded-md" />
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>

            {/* Comments List Skeleton */}
            <div className="space-y-6 sm:space-y-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3">
                  <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Skeleton */}
          <footer className="mt-8 sm:mt-12">
            <Skeleton className="h-px w-full mb-6" />
            <div className="text-center">
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

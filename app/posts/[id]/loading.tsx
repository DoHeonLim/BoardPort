/**
 * File Name : app/posts/[id]/loading.tsx
 * Description : 게시글 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-neutral-50 dark:bg-neutral-900 pb-20">
      {/* Topbar Skeleton */}
      <div className="sticky top-0 z-40 h-14 bg-white/70 dark:bg-neutral-900/70 border-b border-border backdrop-blur-md flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" /> {/* Back */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Title */}
        <Skeleton className="h-10 w-3/4 rounded-lg" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Carousel */}
        <div className="aspect-video w-full rounded-2xl bg-surface-dim border border-border animate-pulse" />

        {/* Meta */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        {/* Comments */}
        <div className="pt-4 space-y-4">
          <Skeleton className="h-6 w-24 rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

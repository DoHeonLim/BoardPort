/**
 * File Name : app/streams/[id]/recording/loading.tsx
 * Description : 녹화본 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.13  임도헌   Created
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar */}
      <div className="h-14 w-full border-b border-border bg-surface flex items-center px-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="ml-2 flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center gap-6 pb-20 px-4 py-6 w-full max-w-mobile mx-auto">
        {/* Detail Area */}
        <div className="w-full space-y-4">
          <Skeleton className="h-7 w-3/4 rounded" />
          <div className="aspect-video w-full bg-surface-dim rounded-xl animate-pulse" />
          <div className="flex justify-between items-center py-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* Comments */}
        <div className="w-full pt-4 border-t border-border space-y-4">
          <Skeleton className="h-6 w-20 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * File Name : app/(tabs)/profile/(product)/my-likes/loading.tsx
 * Description : 나의 찜한 내역 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 내역 전용 ProductCard 리스트 스켈레톤 적용
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="px-page-x py-6 flex flex-col gap-4">
        {/* List Skeleton */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
          >
            <div className="flex p-4 gap-4">
              {/* Thumbnail */}
              <Skeleton className="size-24 sm:size-28 rounded-xl shrink-0" />

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-5 w-14 rounded" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded" />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border/50 mt-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-10 rounded" />
                    <Skeleton className="size-5 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

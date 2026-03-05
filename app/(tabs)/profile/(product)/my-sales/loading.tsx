/**
 * File Name : app/(tabs)/profile/(product)/my-sales/loading.tsx
 * Description : 나의 판매 제품 페이지 로딩 스켈레톤.tsx
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  현재 UI(탭+카드+액션) 구조와 톤으로 재정렬
 * 2026.01.16  임도헌   Modified  [UI] 탭 UI 및 ProductCard 스타일 스켈레톤 적용
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="px-page-x py-6 flex flex-col">
        {/* Tabs Skeleton */}
        <div className="flex p-1 mb-6 bg-surface-dim rounded-xl border border-border">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-transparent" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-transparent" />
        </div>

        {/* View Toggle */}
        <div className="flex justify-end gap-2 mb-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>

        {/* List Skeleton */}
        <div className="flex flex-col gap-4">
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

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-8 rounded" />
                        <Skeleton className="h-3 w-8 rounded" />
                      </div>
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="h-10 border-t border-border bg-surface-dim/30 flex items-center justify-center">
                <Skeleton className="h-4 w-24 rounded bg-border" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

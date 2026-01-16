/**
 * File Name : app/(tabs)/products/loading
 * Description : 제품 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 로딩 페이지 추가
 * 2025.06.08  임도헌   Modified  제품 목록 로딩 수정
 * 2026.01.10  임도헌   Modified  로딩 재수정
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      {/* Search Header Skeleton (Sticky) */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4 h-[73px] flex items-center gap-3">
        <Skeleton className="h-10 w-24 rounded-xl" /> {/* Category Dropdown */}
        <Skeleton className="h-10 flex-1 rounded-xl" /> {/* Search Input */}
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Filter & Summary */}
        <div className="flex justify-end mb-4 h-9">
          <Skeleton className="w-20 h-9 rounded-lg" />
        </div>

        {/* Product List Skeleton */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-28 sm:h-36 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
            >
              {/* Thumbnail */}
              <div className="w-24 sm:w-36 h-full shrink-0">
                <Skeleton className="w-full h-full" />
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 rounded" /> {/* Category */}
                  <Skeleton className="h-5 w-3/4 rounded" /> {/* Title */}
                  <Skeleton className="h-5 w-24 rounded" /> {/* Price */}
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <Skeleton className="h-3 w-32 rounded" /> {/* Meta */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

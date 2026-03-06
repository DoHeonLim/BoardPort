/**
 * File Name : features/product/components/ProductCardSkeleton.tsx
 * Description : 제품 카드 로딩용 스켈레톤 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   ProductCard 구조와 동일한 밀도의 스켈레톤 컴포넌트 추가
 */
"use client";

import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardSkeletonProps {
  viewMode: ViewMode;
}

export default function ProductCardSkeleton({
  viewMode,
}: ProductCardSkeletonProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
        isGrid ? "flex-col h-full" : "h-28 w-full flex-row sm:h-36"
      )}
    >
      <div
        className={cn(
          "shrink-0 overflow-hidden bg-surface-dim",
          isGrid ? "aspect-[3/2] w-full sm:aspect-[4/3]" : "w-24 h-full sm:w-36"
        )}
      >
        <Skeleton className="h-full w-full" />
      </div>

      <div
        className={cn(
          "flex flex-1 min-w-0",
          isGrid
            ? "flex-col justify-start gap-1.5 p-2 sm:gap-2 sm:p-3"
            : "flex-col justify-between gap-1 p-3"
        )}
      >
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            {isGrid && <Skeleton className="h-4 w-2/3 rounded" />}
            <Skeleton className="h-5 w-24 rounded" />
          </div>
        </div>

        <div className={cn("flex flex-col", isGrid ? "gap-1.5" : "gap-2")}>
          {isGrid && <Skeleton className="h-3 w-24 rounded" />}
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}

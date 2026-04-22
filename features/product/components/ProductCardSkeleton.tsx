/**
 * File Name : features/product/components/ProductCardSkeleton.tsx
 * Description : 제품 카드 로딩용 스켈레톤 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   ProductCard 구조와 동일한 밀도의 스켈레톤 컴포넌트 추가
 * 2026.03.19  임도헌   Modified  실제 ProductCard와 동일하게 border-border-subtle 기준으로 스켈레톤 외곽선을 통일
 * 2026.03.19  임도헌   Modified  모바일 리스트 높이를 실제 ProductCard(h-32)와 맞춰 전환 시 밀도 점프를 완화
 * 2026.04.17  임도헌   Modified  list/grid 카드 골격을 실제 카드와 어떻게 맞추는지 설명 주석 보강
 */
"use client";

import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardSkeletonProps {
  viewMode: ViewMode;
}

/**
 * 개별 제품 카드 스켈레톤
 *
 * - 실제 `ProductCard`의 list/grid 비율에 맞춰 썸네일과 정보 영역 뼈대를 그린다
 * - 모바일 리스트 높이와 그리드 썸네일 비율을 실카드와 맞춰 전환 시 밀도 점프를 줄인다
 */
export default function ProductCardSkeleton({
  viewMode,
}: ProductCardSkeletonProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm",
        isGrid ? "flex-col h-full" : "h-32 w-full flex-row sm:h-36"
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

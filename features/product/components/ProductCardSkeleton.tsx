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
 * 2026.05.09  임도헌   Modified  보드게임 배지와 taxonomy가 추가된 상품 카드 정보 구조 반영
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
 * - 실제 `ProductCard`의 list/grid 비율에 맞춘 썸네일과 정보 영역 뼈대
 * - 보드게임 분류, 연결 게임명, 태그, 거래 메타가 들어가는 현재 카드 밀도 반영
 */
export default function ProductCardSkeleton({
  viewMode,
}: ProductCardSkeletonProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm",
        isGrid ? "h-full flex-col" : "min-h-[8.5rem] w-full flex-row sm:h-[9.5rem]"
      )}
    >
      {!isGrid && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 hidden sm:block">
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      )}

      <div
        className={cn(
          "shrink-0 overflow-hidden bg-surface-dim",
          isGrid ? "aspect-[3/2] w-full sm:aspect-[4/3]" : "h-full w-24 sm:w-36"
        )}
      >
        <Skeleton className="h-full w-full" />
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1",
          isGrid
            ? "flex-col justify-start gap-2 p-2 sm:p-3"
            : "flex-col justify-between gap-2 p-3 sm:pr-[46%]"
        )}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-5 w-14 shrink-0 rounded" />
            <Skeleton className="h-3 w-24 min-w-0 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>

        <div className={cn("flex flex-col", isGrid ? "gap-1.5" : "gap-2")}>
          <div className="flex min-w-0 items-center gap-1.5">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-4 w-5 rounded" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

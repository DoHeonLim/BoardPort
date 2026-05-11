/**
 * File Name : features/product/components/ProductListSkeleton.tsx
 * Description : 제품 목록 로딩 시 보여줄 스켈레톤 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   ProductCard 구조와 맞춘 목록 스켈레톤 추가
 * 2026.04.13  임도헌   Modified  상단 요약/뷰 토글 스켈레톤 노출 여부를 옵션화해 라우트 loading 중복 표시를 방지
 * 2026.04.17  임도헌   Modified  목록/라우트 로딩에서 재사용되는 스켈레톤 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.05.09  임도헌   Modified  보드게임 도감/알림 액션이 포함된 상품 목록 헤더 구조 반영
 */
"use client";

import ProductCardSkeleton from "@/features/product/components/ProductCardSkeleton";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductListSkeletonProps {
  viewMode: ViewMode;
  count?: number;
  showToolbar?: boolean;
}

/**
 * 제품 목록 본문 스켈레톤
 *
 * - 실제 `ProductList`와 같은 list/grid 밀도의 카드 뼈대
 * - 라우트 전용 loading UI가 헤더/툴바 스켈레톤을 그릴 때는 `showToolbar={false}`로 중복 회피
 * - 헤더 내부 Suspense fallback처럼 본문만 교체되는 경우에는 툴바까지 함께 렌더링
 */
export default function ProductListSkeleton({
  viewMode,
  count = 4,
  showToolbar = true,
}: ProductListSkeletonProps) {
  return (
    <div className="flex flex-col">
      {showToolbar ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="h-5 w-28 rounded-full bg-surface-dim" />
            <div className="h-8 w-24 rounded-full bg-surface-dim" />
            <div className="h-8 w-9 rounded-full bg-surface-dim sm:w-28" />
          </div>
          <div className="flex rounded-xl border border-border-subtle bg-surface p-1">
            <div className="size-11 rounded-lg bg-surface-dim" />
            <div className="size-11 rounded-lg bg-surface-dim" />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-2 gap-3 sm:gap-4"
            : "grid grid-cols-1 gap-4"
        )}
      >
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
}

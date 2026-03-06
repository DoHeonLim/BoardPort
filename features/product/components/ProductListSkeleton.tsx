/**
 * File Name : features/product/components/ProductListSkeleton.tsx
 * Description : 제품 목록 로딩 시 보여줄 스켈레톤 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   ProductCard 구조와 맞춘 목록 스켈레톤 추가
 */
"use client";

import ProductCardSkeleton from "@/features/product/components/ProductCardSkeleton";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductListSkeletonProps {
  viewMode: ViewMode;
  count?: number;
}

export default function ProductListSkeleton({
  viewMode,
  count = 4,
}: ProductListSkeletonProps) {
  return (
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
  );
}

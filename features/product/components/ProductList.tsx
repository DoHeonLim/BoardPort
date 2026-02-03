/**
 * File Name : features/product/components/ProductList.tsx
 * Description : 제품 목록 컴포넌트 (무한 스크롤 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 컴포넌트 추가
 * 2024.10.17  임도헌   Modified  무한 스크롤 기능 추가
 * 2024.12.12  임도헌   Modified  스타일 수정
 * 2024.12.17  임도헌   Modified  스타일 수정
 * 2024.12.24  임도헌   Modified  스타일 재 수정
 * 2025.04.29  임도헌   Modified  검색 결과가 변경될 때마다 제품 목록 업데이트 되도록 수정
 * 2025.04.30  임도헌   Modified  성능 최적화 및 사용자 경험 개선
 * 2025.05.06  임도헌   Modified  그리드/리스트 뷰 모드 추가
 * 2025.06.07  임도헌   Modified  nextCursor 기반 페이지네이션 적용 및 props 구조 변경
 * 2025.06.07  임도헌   Modified  무한 스크롤 훅 useInfiniteScroll 분리 적용
 * 2025.06.07  임도헌   Modified  ProductCard 기반으로 구조 정리
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 */
"use client";

import { useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import ProductCard from "@/features/product/components/productCard";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";
import type { Paginated, ProductType } from "@/features/product/types";
import { cn } from "@/lib/utils";

type ProductListProps = {
  initialProducts: Paginated<ProductType>;
};

/**
 * 제품 목록 컴포넌트
 *
 * [기능]
 * 1. 제품 카드 리스트 렌더링
 * 2. 무한 스크롤 (useProductPagination 훅 사용)
 * 3. 뷰 모드 전환 (리스트 ↔ 그리드)
 * 4. 빈 상태 UI 처리 (데이터 없을 때)
 */
export default function ProductList({ initialProducts }: ProductListProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const isVisible = usePageVisibility();

  // 커서 기반 페이지네이션 훅 사용
  const { products, isLoading, hasMore, loadMore } =
    useProductPagination<ProductType>({
      mode: "product",
      initialProducts: initialProducts.products,
      initialCursor: initialProducts.nextCursor,
    });

  // 무한 스크롤 관찰자 연결
  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "1400px 0px 0px 0px", // 조기 프리패치 여유
    threshold: 0.01,
  });

  return (
    <div className="flex flex-col">
      {/* 뷰 모드 토글 및 카운트 (헤더) */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm font-medium text-muted">
          총 <span className="text-primary font-bold">{products.length}</span>
          개의 상품
        </span>

        <div className="flex p-1 bg-surface-dim rounded-lg border border-border">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
            aria-label="리스트 뷰"
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
            aria-label="그리드 뷰"
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* 목록 렌더링 */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <span className="text-6xl mb-4 animate-float">📦</span>
          <p className="text-lg font-medium">등록된 상품이 없습니다</p>
          <p className="text-sm mt-1">첫 번째 상품을 등록해보세요!</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
          )}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              isPriority={index < 4} // LCP 최적화
            />
          ))}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div className="py-8 flex justify-center min-h-[40px]">
        {hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted bg-surface-dim px-4 py-2 rounded-full">
            <span className="size-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
            <span>더 불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * File Name : features/product/components/MyLikesList.tsx
 * Description : 나의 찜한 상품 리스트 렌더링 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 상품 목록 UI 및 무한 스크롤 연동 구현
 * 2026.03.06  임도헌   Modified  리스트 레이아웃/하단 로딩 배지 정렬
 */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import ProductCard from "@/features/product/components/productCard";
import { HeartIcon } from "@heroicons/react/24/outline";
import type { ProductType } from "@/features/product/types";

/**
 * 나의 찜한 제품 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 스크롤 페이징 로직]
 * - `useProductPagination` 훅을 활용하여 'LIKED' 범위(scope) 데이터 추출 및 전역 상태 관리
 * - 사용자 가시성(`usePageVisibility`) 기반 `useInfiniteScroll` 스크롤 감지 및 페이징 요청 제어
 * - 상위 4개 아이템 LCP 최적화를 위한 `isPriority` 속성 동적 주입 적용
 *
 * @param {Object} props
 * @param {number} props.userId - 조회할 대상 유저 ID
 */
export default function MyLikesList({ userId }: { userId: number }) {
  const liked = useProductPagination<ProductType>({
    mode: "profile",
    scope: { type: "LIKED", userId },
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  useInfiniteScroll({
    triggerRef,
    hasMore: liked.hasMore,
    isLoading: liked.isFetchingNextPage,
    onLoadMore: liked.loadMore,
    enabled: isVisible,
    rootMargin: "600px",
    threshold: 0.1,
  });

  if (liked.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-surface-dim mb-4">
          <HeartIcon className="size-10 text-muted/50" />
        </div>
        <h3 className="text-lg font-bold text-primary mb-1">
          찜한 상품이 없습니다
        </h3>
        <p className="text-sm text-muted mb-6">
          관심 있는 게임을 찾아 찜해보세요!
        </p>
        <Link
          href="/products"
          className="btn-primary text-sm h-10 px-6 inline-flex items-center shadow-sm"
        >
          항구로 이동하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-page-x py-6 gap-4">
      <div className="grid grid-cols-1 gap-4">
        {liked.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode="list"
            isPriority={index < 4}
          />
        ))}
      </div>

      <div className="py-6 min-h-[40px]">
        {liked.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {liked.isFetchingNextPage && (
          <div className="mt-3 mb-[calc(84px+env(safe-area-inset-bottom))] sm:mb-0 mx-auto w-fit flex items-center gap-2 text-sm text-muted bg-surface-dim px-4 py-2 rounded-full shadow-sm animate-fade-in whitespace-nowrap">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span className="whitespace-nowrap">더 불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

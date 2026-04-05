/**
 * File Name : features/product/components/MyLikesList.tsx
 * Description : 나의 찜한 상품 리스트 렌더링 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 상품 목록 UI 및 무한 스크롤 연동 구현
 * 2026.03.06  임도헌   Modified  리스트 레이아웃/하단 로딩 배지 정렬
 * 2026.03.26  임도헌   Modified  빈 상태를 최근 프로필 상태 화면 패턴으로 통일하고 liked_at 타입을 반영
 * 2026.03.26  임도헌   Modified  카드 우상단 빠른 찜 해제 버튼을 활성화해 목록 관리 효율 개선
 */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import ProductCard from "@/features/product/components/productCard";
import { HeartIcon } from "@heroicons/react/24/outline";
import type { LikedProductListItem } from "@/features/product/types";

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
  const liked = useProductPagination<LikedProductListItem>({
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
      <div className="state-screen">
        <div className="state-card">
          <div className="state-icon-wrap">
            <HeartIcon className="size-10 text-muted/50" />
          </div>
          <h3 className="state-title">찜한 상품이 없습니다</h3>
          <p className="state-description">
            관심 있는 게임을 저장해두고 가격 변화와 거래 상태를 편하게 확인해보세요.
          </p>
          <div className="state-actions">
            <Link
              href="/products"
              className="btn-primary inline-flex min-h-[44px] w-full items-center justify-center px-6 text-sm font-semibold shadow-sm sm:w-auto"
            >
              제품 둘러보기
            </Link>
          </div>
        </div>
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
            showQuickUnlike
          />
        ))}
      </div>

      <div className="py-6 min-h-[40px]">
        {liked.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {liked.isFetchingNextPage && (
          <div className="mt-3 mb-[calc(84px+env(safe-area-inset-bottom))] sm:mb-0 mx-auto w-fit flex items-center gap-2 text-sm text-muted bg-surface-dim px-4 py-2 rounded-full shadow-sm whitespace-nowrap">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span className="whitespace-nowrap">더 불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

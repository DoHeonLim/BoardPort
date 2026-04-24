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
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 찜 목록 빈 상태 CTA 타이포를 정리
 * 2026.04.17  임도헌   Modified  찜 목록의 무한 스크롤/빠른 해제/상단 카드 우선 로드 책임 설명 보강
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 첫 카드만 priority 적용하고 빈 상태 heading/order 정리
 * 2026.04.24  임도헌   Modified  찜 목록 제품 상세 진입 시 현재 목록 경로를 returnTo로 전달
 */
"use client";

import { useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import ProductCard from "@/features/product/components/productCard";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { HeartIcon } from "@heroicons/react/24/outline";
import type { LikedProductListItem } from "@/features/product/types";

/**
 * 나의 찜한 제품 목록 렌더링 컴포넌트
 *
 * [기능]
 * - `useProductPagination`으로 프로필의 `LIKED` 범위를 구독해 찜 목록과 다음 페이지 상태를 함께 관리
 * - `usePageVisibility`와 `useInfiniteScroll`을 결합해 현재 보이는 탭일 때만 다음 페이지를 요청
 * - 카드의 `showQuickUnlike`를 켜서 목록 안에서 바로 찜 해제가 가능하도록 연결
 * - 첫 카드만 `isPriority`를 적용해 LCP 후보를 빠르게 노출하면서 과한 선행 로드를 피함
 *
 * @param {Object} props
 * @param {number} props.userId - 조회할 대상 유저 ID
 */
export default function MyLikesList({ userId }: { userId: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const returnTo = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
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
          <p className="state-title">찜한 상품이 없습니다</p>
          <p className="state-description">
            관심 있는 게임을 저장해두고 가격 변화와 거래 상태를 편하게 확인해보세요.
          </p>
          <div className="state-actions justify-center">
            <Link
              href="/products"
              className="btn-primary inline-flex min-h-[44px] w-full items-center justify-center px-6 text-sm font-medium shadow-sm sm:w-auto"
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
            // 첫 카드만 대표 LCP 후보로 우선 로드해 초기 이미지 경쟁 완화
            isPriority={index === 0}
            showQuickUnlike
            returnTo={returnTo}
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

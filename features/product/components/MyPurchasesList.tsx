/**
 * File Name : features/product/components/MyPurchasesList.tsx
 * Description : 나의 구매 제품 리스트 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.02  임도헌   Created
 * 2024.12.02  임도헌   Modified  나의 구매 제품 리스트 컴포넌트
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.24  임도헌   Modified  다크모드 적용
 * 2024.12.29  임도헌   Modified  구매 제품 리스트 컴포넌트 스타일 수정
 * 2025.10.17  임도헌   Modified  useProductPagination(profile PURCHASED) + useInfiniteScroll 적용
 * 2025.11.06  임도헌   Modified  아이템 단위 갱신(updateOne) 연동
 * 2026.01.12  임도헌   Modified  레이아웃 수정
 * 2026.01.16  임도헌   Modified  Empty State 및 Loading UI 개선
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.03.01  임도헌   Modified  useProductPagination 반환 타입 구조 및 로딩 분리 대응
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.26  임도헌   Modified  Empty State를 최근 프로필 제품 화면 패턴에 맞게 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 구매 목록 빈 상태 CTA 타이포를 정리
 * 2026.04.17  임도헌   Modified  구매 목록의 무한 스크롤/리뷰 변경 반영 책임 설명 보강
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 첫 카드 LCP 이미지 우선 로드
 * 2026.04.17  임도헌   Modified  빈 상태 CTA 데스크톱 중앙 정렬 및 heading-order 대응
 */

"use client";

import { useRef } from "react";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import MyPurchasesProductItem from "@/features/product/components/MyPurchasesProductItem";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import type { MyPurchasedListItem } from "@/features/product/types";

interface MyPurchasesListProps {
  userId: number;
}

/**
 * 나의 구매 제품 목록 컴포넌트
 *
 * [기능]
 * - `useProductPagination`으로 프로필의 `PURCHASED` 범위를 구독해 구매 목록과 다음 페이지 상태를 관리
 * - 사용자 가시성(`usePageVisibility`) 기반의 `useInfiniteScroll`로 현재 보이는 탭에서만 추가 페이지를 불러옴
 * - 각 아이템의 리뷰 작성/수정 결과를 `updateOne`으로 같은 목록 캐시에 즉시 반영
 * - 빈 상태/로딩 상태를 프로필 제품 탭 패턴에 맞춰 일관되게 렌더링
 */
export default function MyPurchasesList({ userId }: MyPurchasesListProps) {
  const purchased = useProductPagination<MyPurchasedListItem>({
    mode: "profile",
    scope: { type: "PURCHASED", userId },
  });

  const products = purchased.products;
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 무한 스크롤 이벤트 연결
  useInfiniteScroll({
    triggerRef,
    hasMore: purchased.hasMore,
    isLoading: purchased.isFetchingNextPage, // 하단 스크롤 중복 로드 방지
    onLoadMore: purchased.loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 600px 0px", // 하단 조기 로딩 여유 영역
    threshold: 0.1,
  });

  // 빈 상태 처리
  if (products.length === 0) {
    return (
      <div className="state-screen">
        <div className="state-card">
          <div className="state-icon-wrap">
            <ShoppingBagIcon className="size-10 text-muted/50" />
          </div>
          <p className="state-title">구매한 제품이 없습니다</p>
          <p className="state-description">
            마음에 드는 게임을 둘러보고 첫 거래를 시작해보세요.
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

  // 리스트 렌더링
  return (
    <div className="flex flex-col px-page-x py-6 gap-4">
      {products.map((product, index) => (
        <MyPurchasesProductItem
          key={product.id}
          product={product}
          prioritizeImage={index === 0}
          // 리뷰 작성/수정 후 해당 카드만 즉시 갱신해 목록 전체 재조회 비용 절감
          onReviewChanged={(patch) => purchased.updateOne(product.id, patch)}
        />
      ))}
      <div className="py-6 flex justify-center min-h-[40px]">
        {purchased.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {purchased.isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

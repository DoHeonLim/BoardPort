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
 * [상태 주입 및 스크롤 페이징 로직]
 * - `useProductPagination` 훅을 활용하여 'PURCHASED' 범위(scope)의 구매 내역 데이터를 추출 및 관리
 * - 서버(RSC)에서 프리패치(Prefetch)된 초기 데이터를 활용한 클라이언트 하이드레이션 적용 (깜빡임 방지)
 * - 사용자 가시성(`usePageVisibility`) 기반의 `useInfiniteScroll` 스크롤 감지 및 페이징 요청 제어
 * - 리뷰 작성/수정 발생 시 `updateOne` 헬퍼를 통한 쿼리 캐시 낙관적 업데이트(Optimistic UI) 처리
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
    rootMargin: "600px", // 사용자 경험 향상을 위한 조기 로딩 여유 영역
    threshold: 0.1,
  });

  // 빈 상태 처리
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-surface-dim mb-4">
          <ShoppingBagIcon className="size-10 text-muted/50" />
        </div>
        <h3 className="text-lg font-bold text-primary mb-1">
          구매한 제품이 없습니다
        </h3>
        <p className="text-sm text-muted mb-6">
          마음에 드는 게임을 찾아보세요!
        </p>
        <Link
          href="/products"
          className="btn-primary text-sm h-10 px-6 inline-flex items-center shadow-sm hover:shadow-md transition-all"
        >
          제품 둘러보기
        </Link>
      </div>
    );
  }

  // 리스트 렌더링
  return (
    <div className="flex flex-col px-page-x py-6 gap-4">
      {products.map((product) => (
        <MyPurchasesProductItem
          key={product.id}
          product={product}
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

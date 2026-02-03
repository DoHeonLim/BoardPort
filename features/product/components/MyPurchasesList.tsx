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
 */

"use client";

import { useRef } from "react";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import MyPurchasesProductItem from "@/features/product/components/MyPurchasesProductItem";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import type { MyPurchasedListItem, Paginated } from "@/features/product/types";

interface MyPurchasesListProps {
  userId: number;
  initialPurchased: Paginated<MyPurchasedListItem>;
}

/**
 * 내 구매 목록 리스트 컴포넌트
 *
 * [기능]
 * 1. 초기 데이터(SSR)를 받아 리스트를 렌더링합니다.
 * 2. `useProductPagination` 훅을 사용하여 무한 스크롤 상태를 관리합니다.
 * 3. `useInfiniteScroll` 훅을 통해 스크롤 끝 감지 시 추가 데이터를 로드합니다.
 * 4. 각 아이템(`MyPurchasesProductItem`)에서 발생하는 변경 사항(리뷰 작성/삭제 등)을
 *    `updateOne` 메서드를 통해 리스트 상태에 반영합니다.
 */
export default function MyPurchasesList({
  initialPurchased,
  userId,
}: MyPurchasesListProps) {
  // 1. 페이지네이션 훅 초기화 (profile 모드 / PURCHASED 스코프)
  const purchased = useProductPagination<MyPurchasedListItem>({
    mode: "profile",
    scope: { type: "PURCHASED", userId },
    initialProducts: initialPurchased.products,
    initialCursor: initialPurchased.nextCursor,
  });

  const products = purchased.products;
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 2. 무한 스크롤 연결
  useInfiniteScroll({
    triggerRef,
    hasMore: purchased.hasMore,
    isLoading: purchased.isLoading,
    onLoadMore: purchased.loadMore,
    enabled: isVisible,
    rootMargin: "600px", // 조기 로딩 여유
    threshold: 0.1,
  });

  // 3. 빈 상태 처리
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
          className="btn-primary text-sm h-10 px-6 inline-flex items-center"
        >
          제품 둘러보기
        </Link>
      </div>
    );
  }

  // 4. 리스트 렌더링
  return (
    <div className="flex flex-col px-page-x py-6 gap-4">
      {products.map((product) => (
        <MyPurchasesProductItem
          key={product.id}
          product={product}
          // 리뷰 상태 변경 시(작성/삭제) 리스트 아이템 업데이트
          onReviewChanged={(patch) => purchased.updateOne(product.id, patch)}
        />
      ))}

      {/* Infinite Scroll Trigger & Loader */}
      <div className="py-6 flex justify-center min-h-[40px]">
        {purchased.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {purchased.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

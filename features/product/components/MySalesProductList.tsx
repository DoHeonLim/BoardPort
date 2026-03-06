/**
 * File Name : features/product/components/MySalesProductList.tsx
 * Description : 나의 판매 제품 리스트 컴포넌트 (탭별 지연 로드 + 공통 페이지네이션 훅)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.30  임도헌   Created
 * 2024.11.30  임도헌   Modified  나의 판매 제품 리스트 컴포넌트
 * 2024.12.03  임도헌   Modified  purchase_at을 purchased_at으로 변경
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.24  임도헌   Modified  다크모드 적용
 * 2025.10.17  임도헌   Modified  탭별 지연 로드 + useProductPagination(profile) 도입
 * 2025.10.19  임도헌   Modified  하이브리드 낙관적 이동 + 실패시 롤백/리프레시
 * 2025.11.04  임도헌   Modified  getInitialUserProducts(서버) 직접 호출 제거 → fetchInitialUserProductsClient(API 경유)로 교체
 * 2026.01.08  임도헌   Modified  탭 전환 시 fetch 에러(세션만료 등) 크래시 방지(try/catch) 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.16  임도헌   Modified  Empty State 개선
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.01  임도헌   Modified  상태 변경(Optimistic Move) 로직을 QueryClient.setQueryData로 리팩토링 및 로딩 상태 세분화
 * 2026.03.03  임도헌   Modified  initialProps 제거 및 탭 내부 컴포넌트(SalesTabContent)를 분리하여 Suspense 최적화
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useCallback, useRef, useState, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { queryKeys } from "@/lib/queryKeys";
import MySalesProductItem from "@/features/product/components/MySalesProductItem";
import Skeleton from "@/components/ui/Skeleton";
import {
  ListBulletIcon,
  Squares2X2Icon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TYPES,
} from "@/features/product/constants";
import type {
  MySalesListItem,
  TabCounts,
  ProductStatus,
  ViewMode,
} from "@/features/product/types";
import { cn } from "@/lib/utils";

interface MySalesProductListProps {
  userId: number;
  initialCounts: TabCounts;
}

/**
 * 나의 판매 제품 목록 탭 컨테이너 컴포넌트
 *
 * [상태 주입 및 상호작용 로직]
 * - 판매 중, 예약 중, 판매 완료 3개의 탭에 따라 각각의 `useProductPagination` 인스턴스를 격리 생성하여 캐시 충돌 방지
 * - 상태 변경(예: 예약 -> 판매완료) 액션 발생 시 `onOptimisticMove`를 호출하여 Query Cache 간 아이템 이동 즉각 반영
 * - 에러(onMoveFailed) 시 관련 쿼리 키(queryKeys.products.userScope) 무효화(invalidate)로 상태 복원(Rollback) 적용
 * - 하위 탭 콘텐츠(`SalesTabContent`) 분리를 통한 React Suspense 기반 선언적 로딩 처리
 */
export default function MySalesProductList({
  userId,
  initialCounts,
}: MySalesProductListProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProductStatus>("selling");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [counts, setCounts] = useState<TabCounts>(initialCounts);
  /**
   * 낙관적 상태 이동 (Optimistic Move) 핸들러
   * - 탭 간 아이템 이동 시, Query Cache를 직접 조작함.
   */
  const onOptimisticMove = useCallback(
    ({
      from,
      to,
      product,
      modifiedProduct,
    }: {
      from: ProductStatus;
      to: ProductStatus;
      product: MySalesListItem;
      modifiedProduct?: MySalesListItem;
    }): (() => void) => {
      const fromKey = queryKeys.products.userScope(from.toUpperCase(), userId);
      const toKey = queryKeys.products.userScope(to.toUpperCase(), userId);

      const prevFromData = queryClient.getQueryData(fromKey);
      const prevToData = queryClient.getQueryData(toKey);
      const prevCounts = { ...counts };

      let nextProduct = modifiedProduct ?? product;
      if (!modifiedProduct && from === "reserved" && to === "sold") {
        nextProduct = {
          ...product,
          purchase_userId: product.reservation_userId ?? null,
          purchase_user: product.reservation_user
            ? { ...product.reservation_user }
            : null,
          purchased_at: new Date().toISOString(),
          reservation_userId: null,
          reservation_user: null,
          reservation_at: null,
        };
      }

      queryClient.setQueryData(fromKey, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            products: page.products.filter((p: any) => p.id !== product.id),
          })),
        };
      });

      queryClient.setQueryData(toKey, (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0)
          return oldData;
        const newPages = [...oldData.pages];
        const exists = newPages[0].products.some(
          (p: any) => p.id === nextProduct.id
        );
        if (!exists) {
          newPages[0] = {
            ...newPages[0],
            products: [nextProduct, ...newPages[0].products],
          };
        }
        return { ...oldData, pages: newPages };
      });

      setCounts((c) => ({
        ...c,
        [from as keyof TabCounts]: Math.max(0, c[from as keyof TabCounts] - 1),
        [to as keyof TabCounts]: c[to as keyof TabCounts] + 1,
      }));

      return () => {
        queryClient.setQueryData(fromKey, prevFromData);
        queryClient.setQueryData(toKey, prevToData);
        setCounts(prevCounts);
      };
    },
    [queryClient, userId, counts]
  );

  const onMoveFailed = useCallback(
    async ({ from, to }: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.userScope(from.toUpperCase(), userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.userScope(to.toUpperCase(), userId),
      });
    },
    [queryClient, userId]
  );

  return (
    <div className="flex flex-col px-page-x py-6">
      <div className="flex p-1 mb-6 bg-surface-dim rounded-xl border border-border">
        {PRODUCT_STATUS_TYPES.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab
                ? "bg-surface text-brand shadow-sm"
                : "text-muted hover:text-primary"
            )}
          >
            {PRODUCT_STATUS_LABEL[tab]}{" "}
            <span className="text-xs opacity-70 ml-0.5">({counts[tab]})</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 mb-3">
        <div className="flex p-1 bg-surface-dim rounded-lg border border-border">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand"
                : "text-muted hover:text-primary"
            )}
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand"
                : "text-muted hover:text-primary"
            )}
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* 선택된 탭만 마운트시켜 훅 렌더링 최적화 */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        }
      >
        <SalesTabContent
          key={activeTab} // 탭이 바뀔 때마다 컴포넌트를 새로 마운트
          type={activeTab}
          userId={userId}
          viewMode={viewMode}
          onOptimisticMove={onOptimisticMove}
          onMoveFailed={onMoveFailed}
        />
      </Suspense>
    </div>
  );
}

// ----------------------------------------------------------------------
// 내부 컴포넌트: 선택된 탭 전용 데이터 패칭 및 렌더링
// ----------------------------------------------------------------------
function SalesTabContent({
  type,
  userId,
  viewMode,
  onOptimisticMove,
  onMoveFailed,
}: any) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 컴포넌트가 마운트된 해당 탭의 데이터만 패치함.
  const current = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: type.toUpperCase() as any, userId },
  });

  const products = current.products;

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isFetchingNextPage,
    onLoadMore: current.loadMore,
    enabled: isVisible,
    rootMargin: "1000px 0px 0px 0px",
    threshold: 0.01,
  });

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-surface-dim mb-4">
          <TagIcon className="size-10 text-muted/50" />
        </div>
        <p className="text-lg font-medium text-primary">
          {type === "selling"
            ? "판매 중인 제품이 없습니다"
            : type === "reserved"
              ? "예약 중인 제품이 없습니다"
              : "판매 완료한 제품이 없습니다"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {products.map((product) => (
          <MySalesProductItem
            key={product.id}
            product={product}
            type={type}
            userId={userId}
            viewMode={viewMode}
            onOptimisticMove={onOptimisticMove}
            onMoveFailed={onMoveFailed}
            onReviewChanged={(patch) => current.updateOne(product.id, patch)}
          />
        ))}
      </div>
      <div className="py-6 flex justify-center min-h-[40px]">
        {current.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {current.isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}

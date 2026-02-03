/**
 * File Name : features/product/hooks/useProductPagination.ts
 * Description : 제품 무한 스크롤을 위한 커서 기반 페이지네이션 훅 (카탈로그/프로필/커스텀 통합)
 * Author : 임도헌
 *
 * History
 * 2025.06.07  임도헌   Created   제품 목록 페이징 로직 전용 훅으로 분리
 * 2025.06.07  임도헌   Modified  공통 useInfiniteScroll 훅에 대응하도록 로직 정리
 * 2025.10.17  임도헌   Modified  product/profile/custom 모드 지원 + reset API 추가
 * 2025.10.19  임도헌   Modified  제네릭 T 도입 (ProductType | MySalesListItem | MyPurchasedListItem)
 * 2025.10.23  임도헌   Modified  분기별 안전 캡처(useMemo deps 정리) + 중복요청 방지/에러 상태 추가
 * 2025.11.06  임도헌   Modified  아이템 부분 갱신(updateOne) 추가
 * 2025.12.31  임도헌   Modified  loadMore 병합 시 id 기준 중복 제거 + 기존(로컬 patch) 우선 정책으로 정합성 강화
 * 2026.01.16  임도헌   Moved     hooks -> hooks/product
 * 2026.01.18  임도헌   Moved     hooks/product -> features/product/hooks
 * 2026.01.25  임도헌   Modified  주석 설명 보강
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { fetchUserProductsAction } from "@/features/user/actions/product";
import { getMoreProducts } from "@/features/product/actions/list";
import type { UserProductsScope } from "@/features/product/service/userList";
import type { Paginated } from "@/features/product/types";

// =============================================================================
// 1. Hook Configuration Types
// =============================================================================

/** 페이지네이션 데이터 구조 (제품 배열 + 다음 커서) */
type ProductsEnvelope<T> = Paginated<T>;

/** [Mode 1] 기본 제품 목록 (메인 페이지 등) */
type ProductMode = { mode: "product" };

/** [Mode 2] 프로필 탭 목록 (판매중/판매완료 등 Scope 기반) */
type ProfileMode<T> = {
  mode: "profile";
  scope: UserProductsScope; // SELLING | RESERVED | SOLD | PURCHASED
  /** 제네릭 T 추론을 위한 Phantom Field (런타임 영향 없음) */
  __t?: T;
};

/** [Mode 3] 커스텀 Fetcher 사용 (별도 API 호출 필요 시) */
type CustomMode<T> = {
  mode: "custom";
  fetcher: (cursor: number | null) => Promise<ProductsEnvelope<T>>;
};

/** 훅 설정 통합 타입 (Discriminated Union) */
type ModeConfig<T> = ProductMode | ProfileMode<T> | CustomMode<T>;

/** 훅 Props 정의 */
type UseProductPaginationParams<T extends { id: number }> = ModeConfig<T> & {
  initialProducts: T[]; // 초기 렌더링용 데이터
  initialCursor: number | null; // 초기 다음 페이지 커서
};

/** 훅 Return 타입 */
interface UseProductPaginationResult<T extends { id: number }> {
  products: T[]; // 현재 로드된 전체 목록
  cursor: number | null; // 다음 페이지 로드용 커서
  isLoading: boolean; // 데이터 로딩 중 여부
  hasMore: boolean; // 추가 데이터 존재 여부
  error: unknown | null; // 에러 상태

  loadMore: () => Promise<void>; // 다음 페이지 요청 함수
  reset: (next: { products: T[]; cursor: number | null }) => void; // 목록 초기화 (필터 변경 시 등)
  updateOne: (id: number, patch: Partial<T>) => void; // 특정 아이템만 로컬 업데이트 (Optimistic UI)
}

// =============================================================================
// 2. Hook Implementation
// =============================================================================

/**
 * 제품 목록 페이징 및 상태 관리를 위한 훅
 *
 * [기능]
 * 1. 다양한 조회 모드('product', 'profile', 'custom') 지원
 * 2. 커서 기반 무한 스크롤 상태 관리 (products, cursor, hasMore)
 * 3. 중복 요청 방지 및 에러 핸들링
 * 4. 리스트 아이템 개별 업데이트(updateOne) 및 전체 리셋(reset)
 */
export function useProductPagination<T extends { id: number }>(
  params: UseProductPaginationParams<T>
): UseProductPaginationResult<T> {
  const { initialProducts, initialCursor } = params;

  const [products, setProducts] = useState<T[]>(initialProducts);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>(initialCursor !== null);
  const [error, setError] = useState<unknown | null>(null);

  // 같은 커서로 중복 요청 방지 (Race Condition 방어)
  const lastRequestedCursorRef = useRef<number | null>(null);

  // 모드별 설정 분리 (Dependency 최적화를 위해 Destructuring)
  const mode = params.mode;
  const profileScope =
    mode === "profile" ? (params.scope as UserProductsScope) : undefined;
  const customFetcher =
    mode === "custom"
      ? (params.fetcher as (c: number | null) => Promise<ProductsEnvelope<T>>)
      : undefined;

  // 1. Fetcher 선택 (Memoized)
  // - 모드에 따라 적절한 데이터 조회 함수를 결정합니다.
  const pagedFetcher = useMemo(() => {
    if (mode === "custom" && customFetcher) {
      return (c: number | null) => customFetcher(c);
    }
    if (mode === "profile" && profileScope) {
      const scope = profileScope; // Closure capture
      return (c: number | null) => fetchUserProductsAction(scope, c);
    }
    // mode === "product" (Default: 전체 제품 목록)
    return async (c: number | null) =>
      (await getMoreProducts(c)) as unknown as ProductsEnvelope<T>;
  }, [mode, customFetcher, profileScope]);

  // 2. 추가 데이터 로드 (Infinite Scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || cursor === null) return;
    if (lastRequestedCursorRef.current === cursor) return; // 중복 요청 방어

    lastRequestedCursorRef.current = cursor;
    setIsLoading(true);
    setError(null);

    try {
      const data = await pagedFetcher(cursor);

      if (data.products.length > 0) {
        setProducts((prev) => {
          // 중복 아이템 제거 (Map 활용)
          // - 기존 아이템(prev)을 우선하여 로컬 변경사항을 보존합니다.
          const map = new Map<number, T>();
          for (const p of prev) map.set(p.id, p);
          for (const p of data.products) {
            if (!map.has(p.id)) map.set(p.id, p);
          }
          return Array.from(map.values());
        });
      }

      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch (err) {
      console.error("Pagination Load Error:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, pagedFetcher]);

  // 3. 리스트 초기화 (탭 변경, 필터 변경 등)
  const reset = useCallback(
    (next: { products: T[]; cursor: number | null }) => {
      setProducts(next.products);
      setCursor(next.cursor);
      setHasMore(next.cursor !== null);
      setError(null);
      lastRequestedCursorRef.current = null;
    },
    []
  );

  // 4. 특정 아이템 부분 업데이트 (Optimistic UI / 좋아요 / 리뷰 등)
  const updateOne = useCallback((id: number, patch: Partial<T>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...patch } as T) : p))
    );
  }, []);

  return {
    products,
    cursor,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    updateOne,
  };
}

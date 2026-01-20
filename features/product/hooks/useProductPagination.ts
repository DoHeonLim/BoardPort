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
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  getMoreUserProducts,
  type UserProductsScope,
} from "@/features/product/lib/getUserProducts";
import { getMoreProducts } from "@/app/(tabs)/products/actions/init";
import type { Paginated } from "@/types/product";

type ProductsEnvelope<T> = Paginated<T>; // { products: T[]; nextCursor: number | null }

type ProductMode = { mode: "product" };

type ProfileMode<T> = {
  mode: "profile";
  scope: UserProductsScope; // SELLING | RESERVED | SOLD | PURCHASED
  /** Phantom field */
  __t?: T;
};

type CustomMode<T> = {
  mode: "custom";
  fetcher: (cursor: number | null) => Promise<ProductsEnvelope<T>>;
};

type ModeConfig<T> = ProductMode | ProfileMode<T> | CustomMode<T>;

type UseProductPaginationParams<T extends { id: number }> = ModeConfig<T> & {
  initialProducts: T[];
  initialCursor: number | null;
};

interface UseProductPaginationResult<T extends { id: number }> {
  products: T[];
  cursor: number | null;
  isLoading: boolean;
  hasMore: boolean;
  error: unknown | null;
  loadMore: () => Promise<void>;
  reset: (next: { products: T[]; cursor: number | null }) => void;
  /** 리스트 내 특정 아이템만 부분 갱신 */
  updateOne: (id: number, patch: Partial<T>) => void;
}

export function useProductPagination<T extends { id: number }>(
  params: UseProductPaginationParams<T>
): UseProductPaginationResult<T> {
  const { initialProducts, initialCursor } = params;

  const [products, setProducts] = useState<T[]>(initialProducts);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>(initialCursor !== null);
  const [error, setError] = useState<unknown | null>(null);

  // 같은 커서로 중복 요청 방지
  const lastRequestedCursorRef = useRef<number | null>(null);

  // 분기별 안전 캡처: 모드에 따라 필요한 값만 deps에 넣는다
  const mode = params.mode;
  const profileScope =
    mode === "profile" ? (params.scope as UserProductsScope) : undefined;
  const customFetcher =
    mode === "custom"
      ? (params.fetcher as (c: number | null) => Promise<ProductsEnvelope<T>>)
      : undefined;

  // mode별 fetcher를 메모이즈
  const pagedFetcher = useMemo(() => {
    if (mode === "custom" && customFetcher) {
      return (c: number | null) => customFetcher(c);
    }
    if (mode === "profile" && profileScope) {
      const scope = profileScope; // 캡처
      return (c: number | null) =>
        (
          getMoreUserProducts as unknown as (
            scope: UserProductsScope,
            cursor: number | null
          ) => Promise<ProductsEnvelope<T>>
        )(scope, c);
    }
    // mode === "product"
    return async (c: number | null) =>
      (await getMoreProducts(c)) as unknown as ProductsEnvelope<T>;
  }, [mode, customFetcher, profileScope]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || cursor === null) return;
    if (lastRequestedCursorRef.current === cursor) return; // 같은 커서 중복 방지
    lastRequestedCursorRef.current = cursor;

    setIsLoading(true);
    setError(null);
    try {
      const data = await pagedFetcher(cursor);
      if (data.products.length > 0) {
        setProducts((prev) => {
          const map = new Map<number, T>();
          // prev 우선(로컬 patch 보존)
          for (const p of prev) map.set(p.id, p);
          // 새로 온 것은 없던 것만 추가 (또는 필요하면 덮기 정책 선택)
          for (const p of data.products) {
            if (!map.has(p.id)) map.set(p.id, p);
          }
          return Array.from(map.values());
        });
      }
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, pagedFetcher]);

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

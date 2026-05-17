/**
 * File Name : features/product/hooks/useProductPagination.ts
 * Description : 제품 무한 스크롤을 위한 커서 기반 페이지네이션 훅 (TanStack Query 통합)
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
 * 2026.02.15  임도헌   Modified  searchParams 연동 로직 강화
 * 2026.03.01  임도헌   Modified  useInfiniteQuery 도입 및 수동 상태(useState) 관리 제거 및 로딩 상태 세분화
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialData Prop Drilling 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.11  임도헌   Modified  첫 페이지 totalCount를 노출해 무한스크롤 중에도 전체 검색 결과 수를 고정 표시
 * 2026.04.17  임도헌   Modified  Suspense 무한 쿼리 기준 현재 동작과 맞지 않던 initialData 설명을 제거하고 훅 책임 주석을 최신화
 * 2026.05.08  임도헌   Modified  프로필 제품 목록 조회 범위 타입 import 경로를 product types로 정리
 * 2026.05.16  임도헌   Modified  제품 무한스크롤 캐시 shape 타입을 공용 유틸 타입으로 정리
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  useSuspenseInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getUserProductsAction } from "@/features/user/actions/product";
import { getProductsAction } from "@/features/product/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { ProductInfiniteCache } from "@/features/product/utils/productQueryCache";
import type {
  Paginated,
  ProductSearchParams,
  UserProductsScope,
} from "@/features/product/types";

// =============================================================================
// 1. Hook Configuration Types
// =============================================================================

type ProductsEnvelope<T> = Paginated<T>;

/** [Mode 1] 기본 제품 목록 (항구 메인 페이지 등) */
type ProductMode = {
  mode: "product";
  searchParams?: ProductSearchParams;
  queryKeyExtra?: unknown;
};

/** [Mode 2] 프로필 탭 목록 (판매중, 판매완료, 구매내역 등) */
type ProfileMode<T> = {
  mode: "profile";
  scope: UserProductsScope;
  __t?: T; // 제네릭 타입 추론을 위한 Phantom Field (실제 런타임 값 없음)
};

/** [Mode 3] 커스텀 Fetcher 사용 (필요 시 확장용) */
type CustomMode<T> = {
  mode: "custom";
  fetcher: (cursor: number | null) => Promise<ProductsEnvelope<T>>;
  // custom 모드 캐시 충돌 방지를 위한 전용 queryKey
  queryKey: readonly unknown[];
};

/** 훅 설정 통합 타입 (Discriminated Union 패턴 적용) */
type ModeConfig<T> = ProductMode | ProfileMode<T> | CustomMode<T>;

export type UseProductPaginationParams<T extends { id: number }> =
  ModeConfig<T>;

/** 훅 반환 타입 인터페이스 */
export interface UseProductPaginationResult<T extends { id: number }> {
  products: T[]; // 평탄화된 전체 제품 배열
  totalCount?: number; // 서버에서 내려준 전체 결과 수 (지원 모드에서만 사용)
  cursor: number | null; // 다음 페이지 요청을 위한 커서 ID
  isFetchingNextPage: boolean; // 스크롤 하단에 도달하여 다음 페이지를 불러오는 중인지 여부
  hasMore: boolean; // 불러올 데이터가 더 남아있는지 여부
  loadMore: () => Promise<unknown>; // 다음 페이지 요청 트리거 함수
  updateOne: (id: number, patch: Partial<T>) => void; // 캐시 내 특정 아이템 부분 업데이트 함수
}

// =============================================================================
// 2. Hook Implementation
// =============================================================================

/**
 * 제품 목록 페이지네이션 및 캐시 상태를 관리하는 커스텀 훅
 *
 * [기능 및 동작 원리]
 * 1. TanStack Query의 `useSuspenseInfiniteQuery`로 커서 기반 무한 스크롤 상태를 조립
 * 2. `mode` 값에 따라 Query Key와 서버 액션(fetcher)을 동적으로 분기해 메인 목록/프로필 목록/커스텀 목록을 공통 처리
 * 3. Suspense 경계 아래에서 평탄화된 제품 배열과 첫 페이지 totalCount를 반환해 상위 리스트가 즉시 렌더링할 수 있게 함
 * 4. `updateOne`으로 단일 아이템만 로컬 캐시에 반영해 좋아요/후기 같은 부분 갱신을 쿼리 무효화 없이 처리
 */
export function useProductPagination<T extends { id: number }>(
  params: UseProductPaginationParams<T>
): UseProductPaginationResult<T> {
  const queryClient = useQueryClient();
  const { mode } = params;

  // 의존성 배열(deps) 최적화를 위해 구조 분해 할당으로 필요한 값만 추출
  const searchParams = mode === "product" ? params.searchParams : undefined;
  const productQueryKeyExtra =
    mode === "product" ? params.queryKeyExtra : undefined;
  const profileScope = mode === "profile" ? params.scope : undefined;
  const customFetcher = mode === "custom" ? params.fetcher : undefined;

  /**
   * 동적 Query Key 생성
   * - 검색 조건(searchParams)이나 프로필 탭(scope)이 변경될 경우, Query Key가 달라지므로
   *   TanStack Query가 알아서 캐시를 분리하고 새 데이터를 요청
   */
  const queryKey = useMemo(() => {
    if (mode === "product") {
      return queryKeys.products.list({
        ...(searchParams || {}),
        __scope: productQueryKeyExtra,
      });
    }
    if (mode === "profile" && profileScope) {
      return queryKeys.products.userScope(
        profileScope.type,
        profileScope.userId
      );
    }
    if (mode === "custom") return params.queryKey;
    return ["products", "unreachable"];
  }, [mode, searchParams, productQueryKeyExtra, profileScope, params]);

  /**
   * 무한 쿼리 인스턴스 생성
   * - pageParam을 제품의 ID(커서)로 사용하여 다음 페이지를 요청
   */
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        // 1. 커스텀 함수 모드
        if (mode === "custom" && customFetcher) {
          return customFetcher(pageParam as number | null);
        }
        // 2. 프로필 탭 모드 (내 판매/구매 내역)
        if (mode === "profile" && profileScope) {
          return getUserProductsAction<T>(
            profileScope,
            pageParam as number | null
          );
        }
        // 3. 기본 카탈로그 모드 (항구 메인)
        // 제네릭 T와의 충돌 방지를 위해 unknown으로 캐스팅 후 반환
        return (await getProductsAction(
          pageParam as number | null,
          searchParams || {}
        )) as unknown as ProductsEnvelope<T>;
      },
      initialPageParam: null as number | null,
      // 서버가 응답한 nextCursor를 다음 요청의 pageParam으로 사용
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // 페이지 이동 시 데이터 보존 및 잦은 재요청 방지를 위해 캐시 유지 시간(1분) 적용
      staleTime: 60 * 1000,
      refetchOnMount: mode === "product" ? false : "always",
    });

  // Suspense 환경이므로 data는 반드시 존재
  const products = data.pages.flatMap((page) => page.products);
  const totalCount = data.pages[0]?.totalCount;

  /**
   * 단일 아이템 로컬 캐시 업데이트 (Optimistic UI용)
   * - 좋아요 버튼 클릭이나 리뷰 작성 완료 시, 전체 쿼리를 리패치하지 않고 캐시에 접근해 데이터 조각(patch)만 교체
   */
  const updateOne = useCallback(
    (id: number, patch: Partial<T>) => {
      queryClient.setQueryData<ProductInfiniteCache<T>>(queryKey, (oldData) => {
        // [방어 로직] 캐시 구조가 비어있거나 깨져있을 경우 무시
        if (!oldData || !oldData.pages || oldData.pages.length === 0)
          return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ProductsEnvelope<T>) => ({
            ...page,
            products: page.products.map((p: T) =>
              p.id === id ? { ...p, ...patch } : p
            ),
          })),
        };
      });
    },
    [queryClient, queryKey]
  );

  return {
    products,
    totalCount,
    cursor: data?.pages[data.pages.length - 1]?.nextCursor ?? null,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
    updateOne,
  };
}

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
import type { UserProductsScope } from "@/features/product/service/userList";
import type { Paginated, ProductSearchParams } from "@/features/product/types";

// =============================================================================
// 1. Hook Configuration Types
// =============================================================================

type ProductsEnvelope<T> = Paginated<T>;

/** [Mode 1] 기본 제품 목록 (항구 메인 페이지 등) */
type ProductMode = { mode: "product"; searchParams?: ProductSearchParams };

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
 * 1. TanStack Query의 `useInfiniteQuery`를 사용하여 커서 기반 무한 스크롤 상태를 자동화
 * 2. `mode` 값에 따라 동적으로 Query Key와 데이터 페칭 함수(Server Action)를 할당
 * 3. 서버(RSC)에서 미리 가져온 `initialProducts`를 `initialData`로 주입하여 클라이언트 마운트 시 불필요한 네트워크 요청을 방지
 * 4. `updateOne` 함수를 제공하여, 좋아요/리뷰 작성 등 단일 아이템 상태 변경 시 쿼리 무효화 없이 로컬 캐시를 즉각 갱신(Optimistic UI)
 */
export function useProductPagination<T extends { id: number }>(
  params: UseProductPaginationParams<T>
): UseProductPaginationResult<T> {
  const queryClient = useQueryClient();
  const { mode } = params;

  // 의존성 배열(deps) 최적화를 위해 구조 분해 할당으로 필요한 값만 추출
  const searchParams = mode === "product" ? params.searchParams : undefined;
  const profileScope = mode === "profile" ? params.scope : undefined;
  const customFetcher = mode === "custom" ? params.fetcher : undefined;

  /**
   * 동적 Query Key 생성
   * - 검색 조건(searchParams)이나 프로필 탭(scope)이 변경될 경우, Query Key가 달라지므로
   *   TanStack Query가 알아서 캐시를 분리하고 새 데이터를 요청
   */
  const queryKey = useMemo(() => {
    if (mode === "product") return queryKeys.products.list(searchParams || {});
    if (mode === "profile" && profileScope) {
      return queryKeys.products.userScope(
        profileScope.type,
        profileScope.userId
      );
    }
    if (mode === "custom") return params.queryKey;
    return ["products", "unreachable"];
  }, [mode, searchParams, profileScope, params]);

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

  /**
   * 단일 아이템 로컬 캐시 업데이트 (Optimistic UI용)
   * - 좋아요 버튼 클릭이나 리뷰 작성 완료 시, 전체 쿼리를 리패치하지 않고 캐시에 접근해 데이터 조각(patch)만 교체
   */
  const updateOne = useCallback(
    (id: number, patch: Partial<T>) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
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
    cursor: data?.pages[data.pages.length - 1]?.nextCursor ?? null,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
    updateOne,
  };
}

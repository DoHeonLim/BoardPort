/**
 * File Name : features/product/utils/productQueryCache.ts
 * Description : Product TanStack Query 캐시 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   LIKED 스코프 판별 및 목록 캐시 스냅샷 추출 유틸 분리
 * 2026.05.16  임도헌   Modified  무한스크롤 캐시 shape 타입을 명시해 캐시 조작부 any 의존 완화
 * 2026.05.23  임도헌   Modified  삭제된 상품을 infinite cache와 nextCursor에서 제거하는 유틸 추가
 * 2026.08.13  임도헌   Modified  상품 목록/찜 캐시 판별을 현재 조회자 범위로 제한
 */

import type { Paginated } from "@/features/product/types";

/** TanStack Infinite Query가 제품 페이지 목록을 저장하는 캐시 shape */
export type ProductInfiniteCache<T extends { id: number }> = {
  pages: Paginated<T>[];
  pageParams?: unknown[];
};

/** nullable 조회자 ID를 상품 캐시에서 사용할 안정적인 scope로 변환한다. */
const getViewerScope = (viewerId: number | null) => viewerId ?? "guest";

/** products/list/{viewerId}/{filters} 구조에서 현재 조회자의 목록 키인지 판별 */
export function isProductListKeyForViewer(
  key: readonly unknown[],
  viewerId: number | null
) {
  return (
    Array.isArray(key) &&
    key.length >= 4 &&
    key[0] === "products" &&
    key[1] === "list" &&
    key[2] === getViewerScope(viewerId)
  );
}

/**
 * products/userScope/LIKED/{userId} 구조의 Query Key인지 판별
 *
 * - getQueriesData/setQueriesData/invalidateQueries에서 predicate를 재사용해
 *   LIKED 스코프 캐시만 정확히 타겟팅
 * - 문자열 하드코딩을 컴포넌트마다 반복하지 않아 오타/누락 위험 Down
 */
export function isLikedScopeKey(
  key: readonly unknown[],
  viewerId?: number | null
) {
  const isLikedScope =
    Array.isArray(key) &&
    key.length >= 4 &&
    key[0] === "products" &&
    key[1] === "userScope" &&
    key[2] === "LIKED" &&
    typeof key[3] === "number";

  if (!isLikedScope || viewerId === null) return false;
  return viewerId === undefined || key[3] === viewerId;
}

/**
 * products.list 계열 캐시들에서 특정 product 스냅샷 1건을 추출
 *
 * - 좋아요 추가 직후 LIKED 목록에 즉시 prepend(낙관적 반영)하려면
 *   최소한의 제품 데이터 스냅샷이 필요
 * - 서버 재요청 전에도 UX를 즉시 맞추기 위해, 이미 로딩된 list 캐시에서 재사용
 * - 데이터 형태가 페이지별로 나뉘어 있으므로 pages -> products 순회로 탐색
 */
export function pickProductFromLists<T extends { id: number }>(
  listQueries: [readonly unknown[], unknown][],
  productId: number
): T | null {
  for (const [, data] of listQueries) {
    const pages = (data as ProductInfiniteCache<T> | undefined)?.pages;
    if (!Array.isArray(pages)) continue;

    for (const page of pages) {
      const found = page?.products?.find((product) => product.id === productId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * infinite query 캐시에서 삭제된 상품과 해당 상품을 가리키는 nextCursor를 함께 제거
 *
 * - 삭제된 상품이 페이지 마지막 아이템이면 기존 nextCursor가 삭제된 id로 남을 수 있음
 * - 그 상태에서 다음 페이지를 요청하면 Prisma cursor가 존재하지 않아 무한스크롤이 실패할 수 있음
 */
export function removeProductFromInfiniteCache<T extends { id: number }>(
  oldData: ProductInfiniteCache<T> | undefined,
  productId: number
): ProductInfiniteCache<T> | undefined {
  if (!oldData?.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => {
      const products = page.products.filter(
        (product) => product.id !== productId
      );
      const removedFromPage = products.length !== page.products.length;
      // 삭제된 상품이 다음 페이지 cursor였으면 남은 마지막 항목으로 되돌려
      // 존재하지 않는 Prisma cursor 요청을 막는다.
      const nextCursor =
        page.nextCursor === productId
          ? (products[products.length - 1]?.id ?? null)
          : page.nextCursor;

      return {
        ...page,
        products,
        nextCursor,
        totalCount:
          removedFromPage && typeof page.totalCount === "number"
            ? Math.max(0, page.totalCount - 1)
            : page.totalCount,
      };
    }),
  };
}

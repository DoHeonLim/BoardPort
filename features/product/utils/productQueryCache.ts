/**
 * File Name : features/product/utils/productQueryCache.ts
 * Description : Product TanStack Query 캐시 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   LIKED 스코프 판별 및 목록 캐시 스냅샷 추출 유틸 분리
 */

/**
 * products/userScope/LIKED/{userId} 구조의 Query Key인지 판별
 *
 * - getQueriesData/setQueriesData/invalidateQueries에서 predicate를 재사용해
 *   LIKED 스코프 캐시만 정확히 타겟팅
 * - 문자열 하드코딩을 컴포넌트마다 반복하지 않아 오타/누락 위험 Down
 */
export function isLikedScopeKey(key: readonly unknown[]) {
  return (
    Array.isArray(key) &&
    key.length >= 4 &&
    key[0] === "products" &&
    key[1] === "userScope" &&
    key[2] === "LIKED" &&
    typeof key[3] === "number"
  );
}

/**
 * products.list 계열 캐시들에서 특정 product 스냅샷 1건을 추출
 *
 * - 좋아요 추가 직후 LIKED 목록에 즉시 prepend(낙관적 반영)하려면
 *   최소한의 제품 데이터 스냅샷이 필요
 * - 서버 재요청 전에도 UX를 즉시 맞추기 위해, 이미 로딩된 list 캐시에서 재사용
 * - 데이터 형태가 페이지별로 나뉘어 있으므로 pages -> products 순회로 탐색
 */
export function pickProductFromLists(
  listQueries: [readonly unknown[], unknown][],
  productId: number
) {
  for (const [, data] of listQueries) {
    const pages = (data as any)?.pages;
    if (!Array.isArray(pages)) continue;

    for (const page of pages) {
      const found = page?.products?.find?.((p: any) => p.id === productId);
      if (found) return found;
    }
  }
  return null;
}

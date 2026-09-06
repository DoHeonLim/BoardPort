/**
 * File Name : features/product/utils/recentViewed.ts
 * Description : 최근 본 상품 로컬 저장소 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.15  임도헌   Created   최근 본 상품 스냅샷 저장/조회 유틸 추가
 * 2026.03.16  임도헌   Modified  저장 직후 FAB가 즉시 갱신되도록 커스텀 이벤트 발행 추가
 * 2026.04.08  임도헌   Modified  상품 삭제 직후 최근 본 상품 목록에서도 즉시 제거할 수 있도록 삭제 유틸 추가
 * 2026.08.27  임도헌   Modified  상세 상품의 실제 refreshed_at을 보존하는 최근 본 상품 스냅샷 변환 함수 추가
 * 2026.08.31  임도헌   Modified  서버 cache에서 직렬화된 상세 날짜도 안전하게 스냅샷으로 변환
 * 2026.09.05  임도헌   Modified  서버 조회 결과로 삭제 기록 정리 및 조회 중 변경된 열람 기록 보존
 */

"use client";

import type { ProductDetailType, ProductType } from "@/features/product/types";

const RECENT_VIEWED_PRODUCTS_KEY = "bp_recent_viewed_products";
const MAX_RECENT_VIEWED_PRODUCTS = 8;
export const RECENT_VIEWED_PRODUCTS_UPDATED_EVENT =
  "bp:recent-viewed-products-updated";

/**
 * 최근 본 상품에 저장할 최소 스냅샷 타입
 *
 * - 제품 목록 카드에서 바로 재사용할 수 있도록 `ProductType` 형태 유지
 * - 날짜 직렬화를 위해 `created_at`, `refreshed_at`은 문자열 기반 허용
 */
export type RecentViewedProduct = ProductType;

/** Date 또는 서버 cache의 ISO 문자열을 브라우저 저장소용 ISO 문자열로 통일한다. */
function serializeProductDate(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

/**
 * 상세 조회 결과를 브라우저 저장소용 최근 본 상품 스냅샷으로 변환
 *
 * - 생성 시각과 끌어올리기 이후 노출 기준 시각을 각각 직렬화해 의미를 유지
 * - 상품 카드 렌더링에 필요한 필드만 선택해 상세 전용 데이터 저장을 방지
 *
 * @param product - 서버에서 조회한 상품 상세 정보
 * @returns 상품 카드에서 재사용할 최근 본 상품 스냅샷
 */
export function createRecentViewedProductSnapshot(
  product: ProductDetailType
): RecentViewedProduct {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    created_at: serializeProductDate(product.created_at),
    refreshed_at: serializeProductDate(product.refreshed_at),
    reservation_userId: product.reservation_userId,
    purchase_userId: product.purchase_userId,
    views: product.views,
    bump_count: product.bump_count,
    game_type: product.game_type,
    region1: product.region1 ?? null,
    region2: product.region2 ?? null,
    region3: product.region3 ?? null,
    images: product.images,
    category: product.category,
    _count: product._count,
    search_tags: product.search_tags,
    board_games: product.board_games,
  };
}

/**
 * 최근 본 상품 목록 조회
 *
 * - 로컬 저장소에 저장된 스냅샷 파싱
 * - 예외 발생 시 빈 배열 반환
 *
 * @returns 최근 본 상품 스냅샷 배열
 */
export function getRecentViewedProducts(): RecentViewedProduct[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_VIEWED_PRODUCTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as RecentViewedProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 성공한 서버 조회 결과와 현재 로컬 열람 기록 병합
 *
 * - 요청 ID 중 응답에 없는 상품 제거 및 남은 상품의 최신 스냅샷 반영
 * - 조회 중 새로 추가한 항목·현재 열람 순서 보존, 로컬에서 제거한 항목 복원 방지
 * - 동일 내용 재저장과 같은 탭 갱신 이벤트를 생략해 재조회 반복 방지
 * @returns 새로 추가되어 아직 검증되지 않은 항목도 포함한 병합 기록.
 * 호출자는 이번 응답으로 확인한 상품만 화면에 표시해야 함
 */
export function reconcileRecentViewedProducts(
  requestedIds: number[],
  verified: RecentViewedProduct[]
) {
  const requested = new Set(requestedIds);
  const byId = new Map(verified.map((product) => [product.id, product]));
  const next = getRecentViewedProducts().flatMap((product) => {
    if (!requested.has(product.id)) return [product];
    const fresh = byId.get(product.id);
    return fresh ? [fresh] : [];
  });
  try {
    const serialized = JSON.stringify(next);
    if (
      window.localStorage.getItem(RECENT_VIEWED_PRODUCTS_KEY) !== serialized
    ) {
      window.localStorage.setItem(RECENT_VIEWED_PRODUCTS_KEY, serialized);
    }
  } catch {
    // 저장소를 사용할 수 없어도 검증된 화면 상태는 반환한다.
  }
  return next;
}

/**
 * 최근 본 상품 스냅샷 저장
 *
 * - 동일 상품은 최신 항목으로 재정렬
 * - 최대 개수 초과 시 오래된 항목 제거
 *
 * @param product - 최근 본 상품 스냅샷
 */
export function saveRecentViewedProduct(product: RecentViewedProduct) {
  if (typeof window === "undefined") return;

  try {
    const current = getRecentViewedProducts().filter(
      (item) => item.id !== product.id
    );
    const next = [product, ...current].slice(0, MAX_RECENT_VIEWED_PRODUCTS);
    window.localStorage.setItem(
      RECENT_VIEWED_PRODUCTS_KEY,
      JSON.stringify(next)
    );
    // 같은 탭 안에서도 최근 본 상품 FAB가 즉시 최신 상태를 반영할 수 있도록 갱신 이벤트 발행
    window.dispatchEvent(new Event(RECENT_VIEWED_PRODUCTS_UPDATED_EVENT));
  } catch {
    // 최근 본 상품은 보조 UX이므로 저장 실패 시 조용히 무시
  }
}

/**
 * 최근 본 상품 목록에서 특정 상품 제거
 *
 * - 제품 삭제 후 로컬 최근 본 상품 목록에서도 즉시 제거
 * - 같은 탭 FAB/모달이 바로 반영되도록 갱신 이벤트를 함께 발행
 *
 * @param {number} productId - 제거할 상품 ID
 */
export function removeRecentViewedProduct(productId: number) {
  if (typeof window === "undefined") return;

  try {
    const next = getRecentViewedProducts().filter(
      (item) => item.id !== productId
    );
    window.localStorage.setItem(
      RECENT_VIEWED_PRODUCTS_KEY,
      JSON.stringify(next)
    );
    window.dispatchEvent(new Event(RECENT_VIEWED_PRODUCTS_UPDATED_EVENT));
  } catch {
    // 최근 본 상품은 보조 UX이므로 제거 실패 시 조용히 무시
  }
}

/**
 * File Name : features/product/utils/recentViewed.ts
 * Description : 최근 본 상품 로컬 저장소 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.15  임도헌   Created   최근 본 상품 스냅샷 저장/조회 유틸 추가
 * 2026.03.16  임도헌   Modified  저장 직후 FAB가 즉시 갱신되도록 커스텀 이벤트 발행 추가
 */

"use client";

import type { ProductType } from "@/features/product/types";

const RECENT_VIEWED_PRODUCTS_KEY = "bp_recent_viewed_products";
const MAX_RECENT_VIEWED_PRODUCTS = 8;
export const RECENT_VIEWED_PRODUCTS_UPDATED_EVENT =
  "bp:recent-viewed-products-updated";

/**
 * 최근 본 상품에 저장할 최소 스냅샷 타입
 *
 * - 제품 목록 카드에서 바로 재사용할 수 있도록 `ProductType` 형태 유지
 * - 날짜 직렬화를 위해 `created_at`은 문자열 기반 허용
 */
export type RecentViewedProduct = ProductType;

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
    const current = getRecentViewedProducts().filter((item) => item.id !== product.id);
    const next = [product, ...current].slice(0, MAX_RECENT_VIEWED_PRODUCTS);
    window.localStorage.setItem(RECENT_VIEWED_PRODUCTS_KEY, JSON.stringify(next));
    // 같은 탭 안에서도 최근 본 상품 FAB가 즉시 최신 상태를 반영할 수 있도록 갱신 이벤트 발행
    window.dispatchEvent(new Event(RECENT_VIEWED_PRODUCTS_UPDATED_EVENT));
  } catch {
    // 최근 본 상품은 보조 UX이므로 저장 실패 시 조용히 무시
  }
}

/**
 * File Name : features/product/utils/recentViewedSnapshot.ts
 * Description : 최근 본 상품 스냅샷 타입 및 변환 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   서버에서 상세 DTO를 카드용 최소 스냅샷으로 변환하는 공용 유틸 분리
 */

import type { ProductDetailType, ProductType } from "@/features/product/types";

/** 제품 목록 카드에서 재사용할 최근 본 상품 스냅샷 */
export type RecentViewedProduct = ProductType;

/** Date 또는 서버 cache의 ISO 문자열을 브라우저 저장소용 ISO 문자열로 통일 */
function serializeProductDate(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

/**
 * 상세 조회 결과를 브라우저 저장소용 최근 본 상품 스냅샷으로 변환
 *
 * - 생성 시각과 끌어올리기 이후 노출 기준 시각을 각각 직렬화해 의미 유지
 * - 상품 카드 렌더링에 필요한 필드만 선택해 상세 전용 데이터 전달 방지
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

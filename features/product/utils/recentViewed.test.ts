/**
 * File Name : features/product/utils/recentViewed.test.ts
 * Description : 최근 본 상품 스냅샷 변환 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   생성 시각과 끌어올리기 노출 시각을 독립적으로 보존하는지 검증
 * 2026.08.31  임도헌   Modified  서버 cache에서 직렬화된 상세 날짜 입력 회귀 검증
 */

import { describe, expect, it } from "vitest";
import type { ProductDetailType } from "@/features/product/types";
import { createRecentViewedProductSnapshot } from "./recentViewed";

/** 최근 본 상품 스냅샷 변환에 필요한 상세 상품 fixture 생성 */
function createProductDetailFixture(): ProductDetailType {
  return {
    id: 17,
    title: "끌어올린 보드게임",
    description: "최근 본 상품 시간 정합성 테스트",
    price: 32000,
    game_type: "strategy",
    min_players: 2,
    max_players: 4,
    play_time: "60분",
    condition: "LIKE_NEW",
    completeness: "PERFECT",
    has_manual: true,
    categoryId: 1,
    userId: 5,
    user: { id: 5, avatar: null, username: "판매자" },
    created_at: new Date("2026-08-20T01:00:00.000Z"),
    refreshed_at: new Date("2026-08-27T02:30:00.000Z"),
    reservation_userId: null,
    purchase_userId: null,
    views: 12,
    bump_count: 1,
    region1: "서울특별시",
    region2: "강남구",
    region3: "역삼동",
    images: [{ url: "https://example.com/product.webp", order: 0 }],
    category: {
      eng_name: "boardgame",
      kor_name: "보드게임",
      icon: null,
      parent: null,
    },
    _count: { product_likes: 3 },
    search_tags: [{ name: "전략" }],
    board_games: [],
  };
}

describe("createRecentViewedProductSnapshot", () => {
  it("생성 시각과 실제 끌어올리기 노출 시각을 각각 직렬화한다", () => {
    const snapshot = createRecentViewedProductSnapshot(
      createProductDetailFixture()
    );

    expect(snapshot.created_at).toBe("2026-08-20T01:00:00.000Z");
    expect(snapshot.refreshed_at).toBe("2026-08-27T02:30:00.000Z");
    expect(snapshot.refreshed_at).not.toBe(snapshot.created_at);
  });

  it("상품 카드 렌더링에 필요한 목록 필드를 보존한다", () => {
    const snapshot = createRecentViewedProductSnapshot(
      createProductDetailFixture()
    );

    expect(snapshot).toMatchObject({
      id: 17,
      title: "끌어올린 보드게임",
      bump_count: 1,
      region2: "강남구",
      views: 12,
      _count: { product_likes: 3 },
    });
  });

  it("서버 cache를 거친 ISO 문자열 날짜도 다시 직렬화한다", () => {
    const product = createProductDetailFixture();
    const cachedProduct = {
      ...product,
      created_at: product.created_at.toISOString(),
      refreshed_at: product.refreshed_at.toISOString(),
    } as unknown as ProductDetailType;

    const snapshot = createRecentViewedProductSnapshot(cachedProduct);

    expect(snapshot.created_at).toBe("2026-08-20T01:00:00.000Z");
    expect(snapshot.refreshed_at).toBe("2026-08-27T02:30:00.000Z");
  });
});

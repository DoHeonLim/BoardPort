// @vitest-environment jsdom
/**
 * File Name : features/product/components/productDetail/ProductDetailClientEffects.test.tsx
 * Description : 제품 상세 클라이언트 부작용 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   최근 본 상품 스냅샷 저장·제거와 상세 refresh 동작 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { RecentViewedProduct } from "@/features/product/utils/recentViewedSnapshot";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  consumeRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/product/utils/recentViewed", () => ({
  saveRecentViewedProduct: mocks.save,
  removeRecentViewedProduct: mocks.remove,
}));

vi.mock("@/lib/navigationRefreshFlag", () => ({
  NAVIGATION_REFRESH_SCOPES: { PRODUCT_DETAIL: "product-detail" },
  consumeNavigationRefresh: mocks.consumeRefresh,
}));

import ProductDetailClientEffects from "./ProductDetailClientEffects";

const recentProduct = {
  id: 17,
  title: "최근 본 상품",
  price: 32000,
  game_type: "strategy",
  images: [],
  search_tags: [],
  created_at: "2026-09-09T00:00:00.000Z",
  refreshed_at: "2026-09-09T00:00:00.000Z",
  reservation_userId: null,
  purchase_userId: null,
  views: 3,
  bump_count: 0,
  region1: "서울특별시",
  region2: "강남구",
  region3: "역삼동",
  category: { kor_name: "보드게임", icon: null, parent: null },
  _count: { product_likes: 1 },
  board_games: [],
} satisfies RecentViewedProduct;

describe("ProductDetailClientEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRefresh.mockReturnValue(false);
  });

  it("서버에서 구성한 최근 본 상품 스냅샷을 저장한다", () => {
    render(
      <ProductDetailClientEffects
        productId={recentProduct.id}
        recentProduct={recentProduct}
        isModalContext={false}
      />
    );

    expect(mocks.save).toHaveBeenCalledWith(recentProduct);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("숨김 상품은 최근 본 상품에서 제거한다", () => {
    render(
      <ProductDetailClientEffects
        productId={recentProduct.id}
        recentProduct={null}
        isModalContext={false}
      />
    );

    expect(mocks.remove).toHaveBeenCalledWith(recentProduct.id);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("일반 상세의 refresh 플래그를 소비해 서버 payload를 갱신한다", () => {
    mocks.consumeRefresh.mockReturnValue(true);

    render(
      <ProductDetailClientEffects
        productId={recentProduct.id}
        recentProduct={recentProduct}
        isModalContext={false}
      />
    );

    expect(mocks.consumeRefresh).toHaveBeenCalledWith(
      "product-detail",
      recentProduct.id
    );
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("모달 상세에서는 일반 상세 refresh 플래그를 소비하지 않는다", () => {
    render(
      <ProductDetailClientEffects
        productId={recentProduct.id}
        recentProduct={recentProduct}
        isModalContext
      />
    );

    expect(mocks.consumeRefresh).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

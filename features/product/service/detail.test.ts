/**
 * File Name : features/product/service/detail.test.ts
 * Description : 상품 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   실제 미존재만 null로 반환하고 DB 실패는 cache 밖으로 전파하는지 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    product: { findUnique: mocks.productFindUnique },
  },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));
vi.mock("@/features/product/service/like", () => ({
  getProductLikeStatus: vi.fn(),
}));
vi.mock("@/features/user/service/block", () => ({
  checkBlockRelation: vi.fn(),
}));

describe("product detail lookup boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("실제로 존재하지 않는 상품만 null로 반환한다", async () => {
    mocks.productFindUnique.mockResolvedValue(null);
    const { getProductDetail } = await import("./detail");

    await expect(getProductDetail(404)).resolves.toBeNull();
  });

  it("DB 상세 조회 실패를 cache 밖으로 전파한다", async () => {
    const databaseError = new Error("database unavailable");
    mocks.productFindUnique.mockRejectedValue(databaseError);
    const { getCachedProduct } = await import("./detail");

    await expect(getCachedProduct(91)).rejects.toBe(databaseError);
  });

  it("DB 메타데이터 조회 실패를 미존재로 변환하지 않는다", async () => {
    const databaseError = new Error("metadata query failed");
    mocks.productFindUnique.mockRejectedValue(databaseError);
    const { getProductTitleById } = await import("./detail");

    await expect(getProductTitleById(91)).rejects.toBe(databaseError);
  });
});

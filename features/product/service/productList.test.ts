/**
 * File Name : features/product/service/productList.test.ts
 * Description : 상품 목록 정렬과 커서 페이지네이션 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   최신·가격 정렬과 동률 기준 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  categoryFindUnique: vi.fn(),
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  productCount: vi.fn(),
  productLikeFindMany: vi.fn(),
  getBlockedUserIds: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    $transaction: mocks.transaction,
    user: { findUnique: mocks.userFindUnique },
    category: { findUnique: mocks.categoryFindUnique },
    product: {
      findUnique: mocks.productFindUnique,
      findMany: mocks.productFindMany,
      count: mocks.productCount,
    },
    productLike: { findMany: mocks.productLikeFindMany },
  },
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: mocks.getBlockedUserIds,
}));

describe("getProductsList ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.transaction.mockResolvedValue([[], 0]);
    mocks.productLikeFindMany.mockResolvedValue([]);
  });

  it("기본 정렬은 끌어올리기 시각과 ID 내림차순을 사용한다", async () => {
    const { getProductsList } = await import("./list");

    await getProductsList({}, -1);

    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ refreshed_at: "desc" }, { id: "desc" }],
      })
    );
  });

  it.each([
    ["priceAsc", [{ price: "asc" }, { refreshed_at: "desc" }, { id: "desc" }]],
    [
      "priceDesc",
      [{ price: "desc" }, { refreshed_at: "desc" }, { id: "desc" }],
    ],
  ] as const)(
    "%s 정렬은 끌어올리기 시각과 ID로 가격 동률을 결정한다",
    async (sort, orderBy) => {
      const { getProductsList } = await import("./list");

      await getProductsList({ sort }, -1);

      expect(mocks.productFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy })
      );
    }
  );
});

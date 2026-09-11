/**
 * File Name : features/product/service/userList.test.ts
 * Description : 상품 관심 목록 복합 커서 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   커서 찜 삭제 후에도 다음 정렬 범위 조회 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productLikeFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    productLike: { findMany: mocks.productLikeFindMany },
  },
}));

describe("getUserProductsList LIKED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productLikeFindMany.mockResolvedValue([]);
  });

  it("커서 찜 레코드 재조회 없이 찜 시각과 상품 ID 다음 범위를 조회한다", async () => {
    const { getUserProductsList } = await import("./userList");

    const result = await getUserProductsList(
      { type: "LIKED", userId: 7 },
      { id: 21, likedAt: "2026-09-11T10:00:00.000Z" }
    );

    expect(result).toEqual({ products: [], nextCursor: null });
    expect(mocks.productLikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 7,
          OR: [
            { created_at: { lt: new Date("2026-09-11T10:00:00.000Z") } },
            {
              AND: [
                { created_at: new Date("2026-09-11T10:00:00.000Z") },
                { productId: { lt: 21 } },
              ],
            },
          ],
        }),
      })
    );
  });
});

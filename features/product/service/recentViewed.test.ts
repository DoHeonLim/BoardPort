/**
 * File Name : features/product/service/recentViewed.test.ts
 * Description : 최근 본 상품의 공개 상태 필터·열람 순서·좋아요 및 DB 오류 전파 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   최근 본 상품의 공개 상태 필터·열람 순서·좋아요 및 DB 오류 전파 회귀 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  likes: vi.fn(),
  blocked: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    product: { findMany: mocks.findMany },
    productLike: { findMany: mocks.likes },
  },
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: mocks.blocked,
}));
import { getRecentProducts } from "./list";

describe("getRecentProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.blocked.mockResolvedValue([9]);
    mocks.likes.mockResolvedValue([{ productId: 3 }]);
  });

  it("삭제된 ID를 제외하고 최신 카드와 열람 순서·좋아요를 반환한다", async () => {
    mocks.findMany.mockResolvedValue([
      { id: 1, board_games: [] },
      { id: 3, board_games: [] },
    ]);
    const result = await getRecentProducts([3, 2, 1], 7);
    expect(result.map((p) => p.id)).toEqual([3, 1]);
    expect(result[0].isLiked).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: [3, 2, 1] },
          hidden_at: null,
          user: { bannedAt: null },
          userId: { notIn: [9] },
        },
      })
    );
  });

  it("DB 실패를 빈 결과로 바꾸어 기록 삭제를 유발하지 않는다", async () => {
    mocks.findMany.mockRejectedValue(new Error("DB unavailable"));
    await expect(getRecentProducts([1], 7)).rejects.toThrow("DB unavailable");
  });
});

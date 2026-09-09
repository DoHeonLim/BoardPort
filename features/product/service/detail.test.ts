/**
 * File Name : features/product/service/detail.test.ts
 * Description : 상품 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   실제 미존재·DB 실패 경계와 최신 조회수 overlay를 검증
 * 2026.08.31  임도헌   Modified  서버 cache에서 문자열로 복원된 상세 날짜의 Date 정규화 검증
 * 2026.09.05  임도헌   Modified  상세 본문이 남아 있어도 최신 DB에서 삭제된 상품의 미존재 판정 검증
 * 2026.09.09  임도헌   Modified  별도 최신 조회와 중복되는 좋아요 집계 제외 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productLikeFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    product: { findUnique: mocks.productFindUnique },
    productLike: { findUnique: mocks.productLikeFindUnique },
  },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
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

  it("상세 본문 조회에서 별도로 집계하는 좋아요 수를 제외한다", async () => {
    mocks.productFindUnique.mockResolvedValue({ id: 91, board_games: [] });
    const { getProductDetail } = await import("./detail");

    await getProductDetail(91);

    const query = mocks.productFindUnique.mock.calls[0]?.[0];
    expect(query.include).not.toHaveProperty("_count");
  });

  it("이전 상세 본문이 있어도 최신 DB에서 삭제됐으면 상품 미존재 반환", async () => {
    mocks.productFindUnique
      .mockResolvedValueOnce({ id: 91, views: 3, board_games: [] })
      .mockResolvedValueOnce(null);
    const { getProductDetailViewData } = await import("./detail");

    const result = await getProductDetailViewData(91, null);
    expect(result.product).toBeNull();
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

  it("상세 본문 cache의 조회수를 최신 DB 값으로 덮어쓴다", async () => {
    mocks.productFindUnique
      .mockResolvedValueOnce({
        id: 91,
        userId: 11,
        views: 3,
        created_at: new Date("2026-08-20T01:00:00.000Z"),
        refreshed_at: new Date("2026-08-27T02:30:00.000Z"),
        board_games: [],
      })
      .mockResolvedValueOnce({
        reservation_userId: null,
        purchase_userId: null,
        hidden_at: null,
        views: 42,
        _count: { product_likes: 6 },
      });
    const { getProductDetailViewData } = await import("./detail");

    const result = await getProductDetailViewData(91, null);

    expect(result.product?.views).toBe(42);
    expect(result.likeStatus).toEqual({ likeCount: 6, isLiked: false });
  });

  it("로그인 조회자의 좋아요 여부만 별도 복합 키로 확인한다", async () => {
    mocks.productFindUnique
      .mockResolvedValueOnce({
        id: 91,
        userId: 11,
        views: 3,
        created_at: new Date("2026-08-20T01:00:00.000Z"),
        refreshed_at: new Date("2026-08-27T02:30:00.000Z"),
        board_games: [],
      })
      .mockResolvedValueOnce({
        reservation_userId: null,
        purchase_userId: null,
        hidden_at: null,
        views: 3,
        _count: { product_likes: 1 },
      });
    mocks.productLikeFindUnique.mockResolvedValue({ productId: 91 });
    const { getProductDetailViewData } = await import("./detail");

    const result = await getProductDetailViewData(91, 7);

    expect(mocks.productLikeFindUnique).toHaveBeenCalledWith({
      where: { id: { productId: 91, userId: 7 } },
      select: { productId: true },
    });
    expect(result.likeStatus).toEqual({ likeCount: 1, isLiked: true });
  });

  it("서버 cache에서 ISO 문자열로 복원된 상세 날짜를 Date로 정규화한다", async () => {
    mocks.productFindUnique
      .mockResolvedValueOnce({
        id: 91,
        userId: 11,
        views: 3,
        created_at: "2026-08-20T01:00:00.000Z",
        refreshed_at: "2026-08-27T02:30:00.000Z",
        board_games: [],
      })
      .mockResolvedValueOnce({
        reservation_userId: null,
        purchase_userId: null,
        hidden_at: null,
        views: 3,
        _count: { product_likes: 0 },
      });
    const { getProductDetailViewData } = await import("./detail");

    const result = await getProductDetailViewData(91, null);

    expect(result.product?.created_at).toEqual(
      new Date("2026-08-20T01:00:00.000Z")
    );
    expect(result.product?.refreshed_at).toEqual(
      new Date("2026-08-27T02:30:00.000Z")
    );
  });
});

/**
 * File Name : features/report/service/adminList.test.ts
 * Description : 관리자 신고 목록 대상 스냅샷 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   대상 검색과 원본 삭제 후 스냅샷 표시 유지 검증 추가
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    report: { count: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
    comment: { findMany: vi.fn() },
    broadcast: { findMany: vi.fn() },
    productMessage: { findMany: vi.fn() },
    streamMessage: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/report/service/moderationOutbox", () => ({
  enqueueModerationOutboxJobs: vi.fn(),
  processModerationOutboxBatch: vi.fn(),
}));
vi.mock("@/features/product/service/delete", () => ({
  hardDeleteProductTx: vi.fn(),
}));
vi.mock("@/features/post/service/post", () => ({
  hardDeletePostTx: vi.fn(),
}));
vi.mock("@/features/stream/service/delete", () => ({
  deleteBroadcastTx: vi.fn(),
}));

const deletedProductReport = {
  id: 10,
  reporterId: 200,
  targetUserId: null,
  targetProductId: 581,
  targetPostId: null,
  targetCommentId: null,
  targetStreamId: null,
  targetProductMessageId: null,
  targetStreamMessageId: null,
  targetReviewId: null,
  targetPreview: "SMOKE-V130-ADMIN-DELETE",
  targetOwnerId: 203,
  targetOwnerUsername: "testd",
  targetParentId: null,
  targetParentPreview: null,
  reason: "INAPPROPRIATE",
  description: "삭제 검증",
  adminComment: null,
  status: "RESOLVED",
  created_at: new Date("2026-09-04T00:00:00Z"),
  updated_at: new Date("2026-09-04T00:00:00Z"),
  reporter: { id: 200, username: "testa" },
};

describe("getReportsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.report.count.mockResolvedValue(1);
    mocks.db.report.findMany.mockResolvedValue([deletedProductReport]);
    mocks.db.user.findMany.mockResolvedValue([]);
    mocks.db.product.findMany.mockResolvedValue([]);
    mocks.db.post.findMany.mockResolvedValue([]);
    mocks.db.comment.findMany.mockResolvedValue([]);
    mocks.db.broadcast.findMany.mockResolvedValue([]);
    mocks.db.productMessage.findMany.mockResolvedValue([]);
    mocks.db.streamMessage.findMany.mockResolvedValue([]);
    mocks.db.review.findMany.mockResolvedValue([]);
    mocks.db.auditLog.findMany.mockResolvedValue([]);
  });

  it("대상 제목·소유자명·상위 제목을 관리자 검색 조건에 포함한다", async () => {
    const { getReportsAdmin } = await import("./admin");
    await getReportsAdmin({ status: "ALL", query: "SMOKE-V130" });

    expect(mocks.db.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: expect.arrayContaining([
                {
                  targetPreview: {
                    contains: "SMOKE-V130",
                    mode: "insensitive",
                  },
                },
                {
                  targetOwnerUsername: {
                    contains: "SMOKE-V130",
                    mode: "insensitive",
                  },
                },
                {
                  targetParentPreview: {
                    contains: "SMOKE-V130",
                    mode: "insensitive",
                  },
                },
              ]),
            },
          ],
        },
      })
    );
  });

  it("원본 상품이 삭제되어도 접수 시점 제목과 소유자 식별 정보를 반환한다", async () => {
    const { getReportsAdmin } = await import("./admin");
    const result = await getReportsAdmin({ status: "RESOLVED" });

    expect(result).toMatchObject({
      success: true,
      data: {
        items: [
          {
            targetPreview: "SMOKE-V130-ADMIN-DELETE",
            targetResolvedUserId: 203,
            targetResolvedUsername: "testd",
          },
        ],
      },
    });
    expect(mocks.db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetId: { in: [203] } }),
      })
    );
  });
});

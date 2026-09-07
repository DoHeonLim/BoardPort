/**
 * File Name : features/report/service/create.test.ts
 * Description : 신고 생성 대상 스냅샷 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   직접 대상과 상위 문맥 스냅샷 저장 검증 추가
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    post: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn() },
    review: { findUnique: vi.fn() },
    broadcast: { findUnique: vi.fn() },
    productMessage: { findUnique: vi.fn() },
    streamMessage: { findUnique: vi.fn() },
    report: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  validateUserStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));

describe("createReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.db.report.findFirst.mockResolvedValue(null);
    mocks.db.report.count.mockResolvedValue(0);
    mocks.db.report.create.mockResolvedValue({ id: 1 });
  });

  it("상품 제목과 소유자 식별 정보를 신고 시점 스냅샷으로 저장한다", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      id: 581,
      userId: 201,
      title: "SMOKE-V130-ADMIN-DELETE",
      user: { username: "testd" },
    });

    const { createReport } = await import("./create");
    const result = await createReport(200, {
      targetId: 581,
      targetType: "PRODUCT",
      reason: "INAPPROPRIATE",
      description: "삭제 검증",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.db.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reporterId: 200,
        targetProductId: 581,
        targetPreview: "SMOKE-V130-ADMIN-DELETE",
        targetOwnerId: 201,
        targetOwnerUsername: "testd",
        targetParentId: null,
        targetParentPreview: null,
      }),
    });
  });

  it("댓글 원문과 상위 게시글 제목을 공백 정규화해 함께 저장한다", async () => {
    mocks.db.comment.findUnique.mockResolvedValue({
      id: 33,
      userId: 203,
      payload: "  신고   대상\n댓글  ",
      user: { username: "testd" },
      post: { id: 77, title: "  원본   게시글  " },
    });

    const { createReport } = await import("./create");
    const result = await createReport(200, {
      targetId: 33,
      targetType: "COMMENT",
      reason: "ABUSIVE",
      description: "경고 검증",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.db.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetCommentId: 33,
        targetPreview: "신고 대상 댓글",
        targetOwnerId: 203,
        targetOwnerUsername: "testd",
        targetParentId: 77,
        targetParentPreview: "원본 게시글",
      }),
    });
  });
});

/**
 * File Name : features/report/service/admin.test.ts
 * Description : 관리자 신고 처리 원자성·멱등성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   단일 claim·동일 조치 재시도·동시 처리 충돌 검증 추가
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    auditLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    report: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    tx,
    db: { $transaction: vi.fn() },
    enqueue: vi.fn(),
    processOutbox: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/report/service/moderationOutbox", () => ({
  enqueueModerationOutboxJobs: mocks.enqueue,
  processModerationOutboxBatch: mocks.processOutbox,
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

const pendingReport = {
  id: 10,
  status: "PENDING",
  reason: "SPAM",
  targetUserId: 20,
  targetProductId: null,
  targetPostId: null,
  targetCommentId: null,
  targetStreamId: null,
  targetProductMessageId: null,
  targetStreamMessageId: null,
  targetReviewId: null,
};

describe("report moderation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.tx.auditLog.findUnique.mockResolvedValue(null);
    mocks.tx.auditLog.findMany.mockResolvedValue([]);
    mocks.tx.auditLog.create.mockResolvedValue({ id: 1 });
    mocks.tx.report.findUnique.mockResolvedValue(pendingReport);
    mocks.tx.report.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.report.update.mockResolvedValue({});
    mocks.enqueue.mockResolvedValue(undefined);
    mocks.processOutbox.mockResolvedValue({
      claimed: 0,
      completed: 0,
      failed: 0,
    });
  });

  it("같은 신고와 조치 조합은 안정적인 멱등 키를 사용한다", async () => {
    const { buildReportActionIdempotencyKey } = await import("./admin");
    expect(
      buildReportActionIdempotencyKey(10, "RESOLVED", {
        action: "WARN",
        adminComment: "정책 위반 확인",
        strike: 1,
      })
    ).toBe("report:10:RESOLVED:WARN");
    expect(
      buildReportActionIdempotencyKey(10, "DISMISSED", {
        adminComment: "위반 사항 없음",
      })
    ).toBe("report:10:DISMISSED:DISMISS");
  });

  it("PENDING 신고를 PROCESSING으로 선점한 transaction에서 최종 상태와 감사 로그를 함께 기록한다", async () => {
    const { updateReportStatus } = await import("./admin");
    const result = await updateReportStatus(1, 10, "DISMISSED", {
      adminComment: "위반 사항이 확인되지 않았습니다.",
    });

    expect(result).toMatchObject({
      success: true,
      data: { reportId: 10, status: "DISMISSED" },
    });
    expect(mocks.tx.report.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    expect(mocks.tx.report.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        status: "DISMISSED",
        adminComment: "위반 사항이 확인되지 않았습니다.",
      },
    });
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DISMISS_REPORT",
        idempotencyKey: "report:10:DISMISSED:DISMISS",
      }),
    });
  });

  it("완료된 같은 조치 재시도는 DB 조치를 반복하지 않고 성공으로 수렴한다", async () => {
    const { updateReportStatus } = await import("./admin");
    mocks.tx.auditLog.findUnique.mockResolvedValue({ id: 99 });

    const result = await updateReportStatus(1, 10, "RESOLVED", {
      action: "WARN",
      adminComment: "운영 정책 위반 경고입니다.",
      strike: 1,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        idempotent: true,
        action: "WARN",
        revalidationPaths: ["/admin/reports"],
      },
    });
    expect(mocks.tx.report.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: expect.objectContaining({ targetProductId: true }),
    });
    expect(mocks.tx.report.updateMany).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("동시 처리자가 PENDING claim을 얻지 못하면 어떤 후속 조치도 기록하지 않는다", async () => {
    const { updateReportStatus } = await import("./admin");
    mocks.tx.report.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateReportStatus(1, 10, "DISMISSED", {
      adminComment: "중복 처리 충돌 검증입니다.",
    });

    expect(result).toEqual({
      success: false,
      error: "다른 관리자가 신고를 처리하고 있습니다.",
    });
    expect(mocks.tx.report.update).not.toHaveBeenCalled();
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});

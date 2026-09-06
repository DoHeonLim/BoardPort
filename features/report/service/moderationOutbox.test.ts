/**
 * File Name : features/report/service/moderationOutbox.test.ts
 * Description : moderation outbox claim·완료·재시도 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   고유 enqueue와 처리 성공·실패 backoff 검증 추가
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    moderationOutbox: { update: vi.fn() },
  },
  tx: {
    $queryRaw: vi.fn(),
    moderationOutbox: { createMany: vi.fn() },
  },
  sendAdminNotification: vi.fn(),
  realtimeSend: vi.fn(),
  deleteImages: vi.fn(),
  deletePostVideo: vi.fn(),
  deleteBroadcastAssets: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/notification/service/notification", () => ({
  sendAdminActionNotification: mocks.sendAdminNotification,
}));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: {
    channel: () => ({ send: mocks.realtimeSend }),
  },
}));
vi.mock("@/features/realtime/topics", () => ({
  notificationRealtimeTopic: (userId: number) => `notification:user:${userId}`,
}));
vi.mock("@/features/media/service/assets", () => ({
  deleteCloudflareImageAssetsById: mocks.deleteImages,
}));
vi.mock("@/features/post/service/video", () => ({
  deleteCloudflareStreamAsset: mocks.deletePostVideo,
}));
vi.mock("@/features/stream/service/delete", () => ({
  cleanupDeletedBroadcastAssets: mocks.deleteBroadcastAssets,
}));

const notificationJob = {
  id: 1,
  dedupeKey: "report:1:notification:warn",
  kind: "ADMIN_NOTIFICATION",
  payload: {
    targetUserId: 2,
    type: "WARN_USER",
    reason: "정책 위반",
    deliveryKey: "report:1:notification:warn",
  },
  status: "PROCESSING",
  attempts: 1,
  available_at: new Date("2026-08-26T00:00:00.000Z"),
  processed_at: null,
  lastError: null,
  created_at: new Date("2026-08-26T00:00:00.000Z"),
  updated_at: new Date("2026-08-26T00:00:00.000Z"),
};

describe("moderation outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.tx.moderationOutbox.createMany.mockResolvedValue({ count: 1 });
    mocks.db.moderationOutbox.update.mockResolvedValue({});
    mocks.sendAdminNotification.mockResolvedValue({ success: true });
  });

  it("transaction 안에서 dedupe key 기준 skipDuplicates enqueue를 사용한다", async () => {
    const { enqueueModerationOutboxJobs } = await import("./moderationOutbox");
    await enqueueModerationOutboxJobs(mocks.tx as never, [
      {
        dedupeKey: "report:1:notification:warn",
        kind: "ADMIN_NOTIFICATION",
        payload: notificationJob.payload as never,
      },
    ]);

    expect(mocks.tx.moderationOutbox.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          dedupeKey: "report:1:notification:warn",
          kind: "ADMIN_NOTIFICATION",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("선점한 알림 작업이 성공하면 같은 delivery key를 전달하고 COMPLETED로 마감한다", async () => {
    const { processModerationOutboxBatch } = await import("./moderationOutbox");
    mocks.tx.$queryRaw.mockResolvedValue([notificationJob]);

    const result = await processModerationOutboxBatch(
      10,
      new Date("2026-08-26T01:00:00.000Z")
    );

    expect(mocks.sendAdminNotification).toHaveBeenCalledWith(
      notificationJob.payload
    );
    expect(mocks.db.moderationOutbox.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: "COMPLETED", lastError: null }),
    });
    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
  });

  it("외부 효과 실패는 지수형 backoff를 적용해 PENDING 재시도로 되돌린다", async () => {
    const { processModerationOutboxBatch } = await import("./moderationOutbox");
    mocks.tx.$queryRaw.mockResolvedValue([{ ...notificationJob, attempts: 2 }]);
    mocks.sendAdminNotification.mockResolvedValue({
      success: false,
      error: "temporary failure",
    });

    const before = Date.now();
    const result = await processModerationOutboxBatch();
    const update = mocks.db.moderationOutbox.update.mock.calls[0][0];

    expect(update.data.status).toBe("PENDING");
    expect(update.data.lastError).toBe("temporary failure");
    expect(update.data.available_at.getTime()).toBeGreaterThanOrEqual(
      before + 2 * 60 * 1000
    );
    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
  });
});

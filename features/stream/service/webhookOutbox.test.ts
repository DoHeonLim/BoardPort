/**
 * File Name : features/stream/service/webhookOutbox.test.ts
 * Description : Cloudflare webhook outbox 실행·재시도 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   완료 처리와 지수형 backoff 재시도 검증
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jobs: [] as Array<Record<string, unknown>>,
  update: vi.fn(),
  sendRealtime: vi.fn(),
  transaction: vi.fn(async (callback: (tx: object) => unknown) =>
    callback({ $queryRaw: vi.fn(() => mocks.jobs) })
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/db", () => ({
  default: {
    $transaction: mocks.transaction,
    streamWebhookOutbox: { update: mocks.update },
    broadcast: { updateMany: vi.fn() },
  },
}));
vi.mock("@/features/stream/service/realtime", () => ({
  sendLiveStatusFromServer: mocks.sendRealtime,
}));
vi.mock("@/features/notification/service/live", () => ({
  sendLiveStartNotifications: vi.fn(),
}));

import { processStreamWebhookOutboxBatch } from "@/features/stream/service/webhookOutbox";

/** Realtime 후처리용 outbox fixture를 만든다. */
function realtimeJob(attempts: number = 1) {
  const now = new Date("2026-08-26T02:00:00.000Z");
  return {
    id: 21,
    dedupeKey: "stream-webhook:1:realtime",
    kind: "BROADCAST_REALTIME",
    payload: { broadcastId: 7 },
    status: "PROCESSING",
    attempts,
    available_at: now,
    processed_at: null,
    lastError: null,
    created_at: now,
    updated_at: now,
    webhookEventId: 1,
  };
}

/** 썸네일 보완용 outbox fixture를 만든다. */
function thumbnailJob() {
  return {
    ...realtimeJob(),
    id: 22,
    dedupeKey: "stream-webhook:1:thumbnail",
    kind: "FILL_BROADCAST_THUMBNAIL",
    payload: { liveInputUid: "live-input-1", broadcastId: 7 },
  };
}

describe("processStreamWebhookOutboxBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jobs.length = 0;
    mocks.update.mockResolvedValue({});
    mocks.sendRealtime.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("후처리 성공 작업을 COMPLETED로 마감한다", async () => {
    mocks.jobs.push(realtimeJob());

    const result = await processStreamWebhookOutboxBatch(10);

    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(mocks.sendRealtime).toHaveBeenCalledWith({ broadcastId: 7 });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        status: "COMPLETED",
        processed_at: expect.any(Date),
        lastError: null,
      },
    });
  });

  it("후처리 실패 작업을 PENDING으로 돌리고 다음 실행 시각을 늦춘다", async () => {
    mocks.jobs.push(realtimeJob(2));
    mocks.sendRealtime.mockRejectedValue(new Error("realtime unavailable"));
    const before = Date.now();

    const result = await processStreamWebhookOutboxBatch(10);

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        status: "PENDING",
        available_at: expect.any(Date),
        lastError: "realtime unavailable",
      },
    });
    const update = mocks.update.mock.calls[0][0];
    expect(update.data.available_at.getTime()).toBeGreaterThanOrEqual(
      before + 2 * 60 * 1000
    );
  });

  it("연결 직후 썸네일이 아직 없으면 작업을 완료하지 않고 재시도한다", async () => {
    mocks.jobs.push(thumbnailJob());
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "account-1");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "token-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ result: [] }),
      })
    );

    const result = await processStreamWebhookOutboxBatch(10);

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 22 },
      data: expect.objectContaining({
        status: "PENDING",
        lastError: "Cloudflare thumbnail is not ready yet.",
      }),
    });
  });
});

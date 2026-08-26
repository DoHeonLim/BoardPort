/**
 * File Name : features/stream/service/webhookProcessor.test.ts
 * Description : Cloudflare webhook 순서 보장 상태 전이 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   역순 종료·terminal 동영상·세션 VOD 매칭 경계 검증
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    liveInput: { findUnique: vi.fn() },
    broadcast: { findFirst: vi.fn(), updateMany: vi.fn() },
    postVideo: { findFirst: vi.fn(), updateMany: vi.fn() },
    cloudflareWebhookEvent: { update: vi.fn() },
    $queryRaw: vi.fn(),
  };
  return {
    tx,
    eventUpdate: vi.fn(),
    eventUpdateMany: vi.fn(),
    eventFindMany: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx)
    ),
    enqueue: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    $transaction: mocks.transaction,
    cloudflareWebhookEvent: {
      update: mocks.eventUpdate,
      updateMany: mocks.eventUpdateMany,
      findMany: mocks.eventFindMany,
    },
  },
}));
vi.mock("@/features/stream/service/webhookOutbox", () => ({
  enqueueStreamWebhookOutboxJobs: mocks.enqueue,
}));

import {
  processCloudflareWebhookInboxBatch,
  processClaimedCloudflareWebhookEvent,
  type CloudflareWebhookInput,
} from "@/features/stream/service/webhookProcessor";

/** 기본 webhook 입력에 테스트별 경계값을 덮어쓴다. */
function createInput(
  overrides: Partial<CloudflareWebhookInput> = {}
): CloudflareWebhookInput {
  return {
    source: "DESTINATION",
    eventType: "unknown",
    providerEventId: null,
    payloadHash: "hash-1",
    body: {},
    liveInputUid: null,
    assetUid: null,
    eventAt: new Date("2026-08-26T02:00:00.000Z"),
    ...overrides,
  };
}

describe("processClaimedCloudflareWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enqueue.mockResolvedValue(undefined);
    mocks.tx.cloudflareWebhookEvent.update.mockResolvedValue({});
    mocks.eventUpdate.mockResolvedValue({});
    mocks.eventUpdateMany.mockResolvedValue({ count: 1 });
    mocks.eventFindMany.mockResolvedValue([]);
  });

  it("필수 Live Input 식별자가 없는 연결 이벤트를 IGNORED로 마감한다", async () => {
    const result = await processClaimedCloudflareWebhookEvent(
      11,
      createInput({ eventType: "live_input.connected" })
    );

    expect(result).toBe("IGNORED");
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        status: "IGNORED",
        processed_at: expect.any(Date),
        lastError: null,
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("더 최신 provider 이벤트가 반영된 방송에는 오래된 종료 이벤트를 적용하지 않는다", async () => {
    mocks.tx.liveInput.findUnique.mockResolvedValue({ id: 3 });
    mocks.tx.broadcast.findFirst.mockResolvedValue({ id: 7 });
    mocks.tx.broadcast.updateMany.mockResolvedValue({ count: 0 });

    const eventAt = new Date("2026-08-26T02:00:00.000Z");
    const result = await processClaimedCloudflareWebhookEvent(
      12,
      createInput({
        eventType: "live_input.disconnected",
        liveInputUid: "live-input-1",
        eventAt,
      })
    );

    expect(result).toBe("IGNORED");
    expect(mocks.tx.broadcast.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 7,
          OR: [
            { lastProviderEventAt: null },
            { lastProviderEventAt: { lt: eventAt } },
          ],
        },
      })
    );
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("방송 시작 알림 outbox는 Broadcast 단위 고유 키로 한 번만 적재한다", async () => {
    mocks.tx.liveInput.findUnique.mockResolvedValue({ id: 3, userId: 4 });
    mocks.tx.broadcast.findFirst.mockResolvedValue({
      id: 7,
      title: "테스트 방송",
      thumbnail: null,
      started_at: null,
      providerSessionStartedAt: null,
    });
    mocks.tx.broadcast.updateMany.mockResolvedValue({ count: 1 });

    const result = await processClaimedCloudflareWebhookEvent(
      15,
      createInput({
        eventType: "live_input.connected",
        liveInputUid: "live-input-1",
      })
    );

    expect(result).toBe("PROCESSED");
    expect(mocks.enqueue).toHaveBeenCalledWith(
      mocks.tx,
      15,
      expect.arrayContaining([
        expect.objectContaining({
          dedupeKey: "stream-live-start:7",
          kind: "LIVE_START_NOTIFICATION",
          payload: expect.objectContaining({
            deliveryKeyPrefix: "stream-live-start:7",
          }),
        }),
      ])
    );
  });

  it("게시글 동영상은 처리 중 상태에서 먼저 도착한 terminal 상태만 반영한다", async () => {
    mocks.tx.postVideo.findFirst.mockResolvedValue({ id: 5, postId: 9 });
    mocks.tx.postVideo.updateMany.mockResolvedValue({ count: 1 });

    const eventAt = new Date("2026-08-26T02:00:00.000Z");
    const result = await processClaimedCloudflareWebhookEvent(
      13,
      createInput({
        assetUid: "video-1",
        eventAt,
        body: {
          uid: "video-1",
          readyToStream: true,
          status: { state: "ready" },
          playback: { hls: "https://example.com/video.m3u8" },
          meta: { sourceType: "POST_VIDEO", draftKey: "draft-1" },
        },
      })
    );

    expect(result).toBe("PROCESSED");
    expect(mocks.tx.postVideo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 5,
          status: { in: ["UPLOADING", "PROCESSING"] },
        }),
        data: expect.objectContaining({
          status: "READY",
          lastProviderEventAt: eventAt,
        }),
      })
    );
    expect(mocks.enqueue).toHaveBeenCalledWith(
      mocks.tx,
      13,
      expect.arrayContaining([
        expect.objectContaining({ kind: "REVALIDATE_POST" }),
      ])
    );
  });

  it("녹화본 생성 시각을 포함하는 방송 세션만 VOD 연결 후보로 조회한다", async () => {
    mocks.tx.broadcast.findFirst.mockResolvedValue(null);
    const createdAt = "2026-08-26T01:30:00.000Z";

    const result = await processClaimedCloudflareWebhookEvent(
      14,
      createInput({
        eventType: "video.ready",
        liveInputUid: "live-input-1",
        assetUid: "video-2",
        body: {
          uid: "video-2",
          created: createdAt,
          readyToStream: true,
          status: { state: "ready" },
          playback: { hls: "https://example.com/vod.m3u8" },
          liveInput: "live-input-1",
        },
      })
    );

    expect(result).toBe("IGNORED");
    expect(mocks.tx.broadcast.findFirst).toHaveBeenCalledWith({
      where: {
        liveInput: { provider_uid: "live-input-1" },
        providerSessionStartedAt: {
          lte: new Date("2026-08-26T01:31:00.000Z"),
        },
        OR: [
          { providerSessionEndedAt: null },
          { providerSessionEndedAt: { gte: new Date(createdAt) } },
        ],
      },
      orderBy: { providerSessionStartedAt: "desc" },
      select: { id: true },
    });
  });
});

describe("processCloudflareWebhookInboxBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventUpdate.mockResolvedValue({});
    mocks.eventUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("오래 처리 중인 inbox를 다시 선점해 terminal 상태로 마감한다", async () => {
    const eventAt = new Date("2026-08-26T01:00:00.000Z");
    mocks.eventFindMany.mockResolvedValue([
      {
        id: 31,
        source: "DESTINATION",
        eventType: "unknown",
        providerEventId: null,
        payloadHash: "hash-31",
        payload: {},
        liveInputUid: null,
        assetUid: null,
        eventAt,
      },
    ]);

    const result = await processCloudflareWebhookInboxBatch(
      10,
      new Date("2026-08-26T03:00:00.000Z")
    );

    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(mocks.eventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 31 }),
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          lastError: null,
        },
      })
    );
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: 31 },
      data: {
        status: "IGNORED",
        processed_at: expect.any(Date),
        lastError: null,
      },
    });
  });
});

/**
 * File Name : app/api/webhooks/cloudflare/route.test.ts
 * Description : Cloudflare Webhook Route 인증 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   production secret 누락 시 이벤트 처리 중단 테스트 추가
 * 2026.08.26  임도헌   Modified  inbox 중복 선점·처리 실패 기록·outbox 실행 경계 검증 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimWebhook: vi.fn(),
  processWebhook: vi.fn(),
  failWebhook: vi.fn(),
  processOutbox: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/stream/service/webhookProcessor", () => ({
  claimCloudflareWebhookEvent: mocks.claimWebhook,
  processClaimedCloudflareWebhookEvent: mocks.processWebhook,
  failCloudflareWebhookEvent: mocks.failWebhook,
}));
vi.mock("@/features/stream/service/webhookOutbox", () => ({
  processStreamWebhookOutboxBatch: mocks.processOutbox,
}));

/** Live Input 연결 Destination webhook 요청을 만든다. */
function liveConnectedRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/webhooks/cloudflare", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      type: "live_input.connected",
      liveInput: "live-input-1",
    }),
  });
}

describe("POST /api/webhooks/cloudflare", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.claimWebhook.mockResolvedValue({ claimed: true, eventId: 17 });
    mocks.processWebhook.mockResolvedValue("PROCESSED");
    mocks.failWebhook.mockResolvedValue(undefined);
    mocks.processOutbox.mockResolvedValue({
      claimed: 1,
      completed: 1,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production Stream webhook secret이 없으면 이벤트 처리를 시작하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOUDFLARE_STREAM_WEBHOOK_SECRET", "");
    vi.stubEnv("CLOUDFLARE_WEBHOOK_SECRET", "destination-secret");

    const { POST } = await import("./route");
    const response = await POST(
      liveConnectedRequest({
        "webhook-signature": "time=1,sig1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "WEBHOOK_SECRET_NOT_CONFIGURED",
    });
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
  });

  it("production Destination webhook secret이 없으면 이벤트 처리를 시작하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOUDFLARE_STREAM_WEBHOOK_SECRET", "stream-secret");
    vi.stubEnv("CLOUDFLARE_WEBHOOK_SECRET", "");

    const { POST } = await import("./route");
    const response = await POST(liveConnectedRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "WEBHOOK_SECRET_NOT_CONFIGURED",
    });
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
  });

  it("인증된 delivery를 inbox에서 선점한 뒤 상태 전이와 outbox를 실행한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLOUDFLARE_STREAM_WEBHOOK_SECRET", "");
    vi.stubEnv("CLOUDFLARE_WEBHOOK_SECRET", "destination-secret");

    const { POST } = await import("./route");
    const response = await POST(
      liveConnectedRequest({
        "x-cloudflare-webhook-secret": "destination-secret",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "PROCESSED",
      outbox: { claimed: 1, completed: 1, failed: 0 },
    });
    expect(mocks.claimWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "DESTINATION",
        eventType: "live_input.connected",
        liveInputUid: "live-input-1",
      })
    );
    expect(mocks.processWebhook).toHaveBeenCalledWith(
      17,
      expect.objectContaining({ eventType: "live_input.connected" })
    );
    expect(mocks.processOutbox).toHaveBeenCalledWith(10);
  });

  it("이미 처리 중인 동일 delivery는 상태 전이와 outbox를 중복 실행하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLOUDFLARE_WEBHOOK_SECRET", "destination-secret");
    mocks.claimWebhook.mockResolvedValue({
      claimed: false,
      eventId: 17,
      status: "PROCESSING",
    });

    const { POST } = await import("./route");
    const response = await POST(
      liveConnectedRequest({
        "x-cloudflare-webhook-secret": "destination-secret",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      duplicate: true,
      status: "PROCESSING",
    });
    expect(mocks.processWebhook).not.toHaveBeenCalled();
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("선점 뒤 핵심 처리 실패를 inbox에 기록하고 재시도 가능한 500을 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLOUDFLARE_WEBHOOK_SECRET", "destination-secret");
    const error = new Error("database unavailable");
    mocks.processWebhook.mockRejectedValue(error);

    const { POST } = await import("./route");
    const response = await POST(
      liveConnectedRequest({
        "x-cloudflare-webhook-secret": "destination-secret",
      })
    );

    expect(response.status).toBe(500);
    expect(mocks.failWebhook).toHaveBeenCalledWith(17, error);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });
});

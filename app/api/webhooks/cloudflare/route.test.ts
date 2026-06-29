/**
 * File Name : app/api/webhooks/cloudflare/route.test.ts
 * Description : Cloudflare Webhook Route 인증 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   production secret 누락 시 이벤트 처리 중단 테스트 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    liveInput: {
      findUnique: vi.fn(),
    },
    broadcast: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vodAsset: {
      upsert: vi.fn(),
    },
    postVideo: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  revalidateTag: vi.fn(),
  sendLiveStatusFromServer: vi.fn(),
  sendLiveStartNotifications: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}));

vi.mock("@/features/stream/service/realtime", () => ({
  sendLiveStatusFromServer: mocks.sendLiveStatusFromServer,
}));

vi.mock("@/features/notification/service/live", () => ({
  sendLiveStartNotifications: mocks.sendLiveStartNotifications,
}));

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
    expect(mocks.db.liveInput.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.broadcast.update).not.toHaveBeenCalled();
    expect(mocks.sendLiveStatusFromServer).not.toHaveBeenCalled();
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
    expect(mocks.db.liveInput.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.broadcast.update).not.toHaveBeenCalled();
    expect(mocks.sendLiveStatusFromServer).not.toHaveBeenCalled();
  });
});

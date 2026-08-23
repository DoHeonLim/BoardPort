/**
 * File Name : app/api/auth/push-delivery/route.test.ts
 * Description : Service Worker Push 표시 승인 API 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   세션·payload·기기 소유권 fail-closed 경계 테스트 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  authorizePushDelivery: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/notification/service/subscription", () => ({
  authorizePushDelivery: mocks.authorizePushDelivery,
}));

const deliveryPayload = {
  version: 1,
  recipientUserId: 7,
  endpoint: "https://fcm.googleapis.com/fcm/send/current-device",
  keys: {
    p256dh:
      "BAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
    auth: "AgICAgICAgICAgICAgICAg",
  },
};

function deliveryRequest(payload: unknown = deliveryPayload) {
  return new Request("http://localhost/api/auth/push-delivery", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/auth/push-delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.authorizePushDelivery.mockResolvedValue(true);
  });

  it("세션이 없으면 기기 조회 없이 표시를 거부한다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { POST } = await import("./route");

    const response = await POST(deliveryRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ valid: false });
    expect(mocks.authorizePushDelivery).not.toHaveBeenCalled();
  });

  it.each([
    { ...deliveryPayload, version: 0 },
    { ...deliveryPayload, recipientUserId: 0 },
    { ...deliveryPayload, endpoint: "https://127.0.0.1/internal" },
    { ...deliveryPayload, keys: { p256dh: "", auth: "AgICAgICAgICAgICAgICAg" } },
  ])("잘못된 표시 payload를 fail-closed로 거부한다", async (payload) => {
    const { POST } = await import("./route");

    const response = await POST(deliveryRequest(payload));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ valid: false });
    expect(mocks.authorizePushDelivery).not.toHaveBeenCalled();
  });

  it("현재 세션과 활성 기기 소유권이 일치하면 표시를 승인한다", async () => {
    const { POST } = await import("./route");

    const response = await POST(deliveryRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ valid: true });
    expect(mocks.authorizePushDelivery).toHaveBeenCalledWith(7, 7, {
      endpoint: deliveryPayload.endpoint,
      keys: deliveryPayload.keys,
    });
  });

  it("다른 계정·비활성 기기 등 서비스 거부 결과를 그대로 fail-closed 처리한다", async () => {
    mocks.authorizePushDelivery.mockResolvedValue(false);
    const { POST } = await import("./route");

    const response = await POST(deliveryRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ valid: false });
  });

  it("DB 검증 오류가 발생해도 표시를 허용하지 않는다", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.authorizePushDelivery.mockRejectedValue(new Error("db unavailable"));
    const { POST } = await import("./route");

    const response = await POST(deliveryRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ valid: false });
    expect(consoleError).toHaveBeenCalledWith(
      "[push-delivery] authorization failed:",
      expect.any(Error)
    );
    consoleError.mockRestore();
  });
});

/**
 * File Name : app/api/push/subscribe/route.test.ts
 * Description : Push 구독 등록 API 보호 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   표시 보호 버전과 사용자별 기기 상한 응답 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class LimitError extends Error {}
  class OwnershipError extends Error {}

  return {
    LimitError,
    OwnershipError,
    getSession: vi.fn(),
    upsertSubscription: vi.fn(),
    sendPushNotification: vi.fn(),
    notificationUpdate: vi.fn(),
  };
});

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/lib/db", () => ({
  default: { notification: { update: mocks.notificationUpdate } },
}));
vi.mock("@/features/notification/service/subscription", () => ({
  PushSubscriptionLimitExceededError: mocks.LimitError,
  PushSubscriptionOwnershipMismatchError: mocks.OwnershipError,
  upsertSubscription: mocks.upsertSubscription,
}));
vi.mock("@/features/notification/service/sender", () => ({
  sendPushNotification: mocks.sendPushNotification,
}));

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/current-device",
  keys: {
    p256dh:
      "BAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
    auth: "AgICAgICAgICAgICAgICAg",
  },
};

function subscribeRequest(payload: unknown) {
  return new Request("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-browser",
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.upsertSubscription.mockResolvedValue({
      success: true,
      welcomeNotiId: null,
    });
  });

  it("표시 보호 Worker 버전이 없는 구 클라이언트 등록을 거부한다", async () => {
    const { POST } = await import("./route");

    const response = await POST(subscribeRequest(subscription));

    expect(response.status).toBe(400);
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
  });

  it("보호 Worker를 확인한 구독만 service에 전달한다", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      subscribeRequest({ ...subscription, displayGuardVersion: 1 })
    );

    expect(response.status).toBe(201);
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(7, {
      ...subscription,
      userAgent: "test-browser",
    });
  });

  it("사용자별 활성 기기 상한은 재시도 가능한 429로 반환한다", async () => {
    mocks.upsertSubscription.mockRejectedValue(new mocks.LimitError());
    const { POST } = await import("./route");

    const response = await POST(
      subscribeRequest({ ...subscription, displayGuardVersion: 1 })
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Push subscription device limit exceeded",
    });
  });
});

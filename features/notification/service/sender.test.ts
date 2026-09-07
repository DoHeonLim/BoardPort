/**
 * File Name : features/notification/service/sender.test.ts
 * Description : Web Push 발송 후 구독 소유권 경쟁 조건 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   로그아웃/소유권 이전 뒤 stale 발송 콜백의 DB 변경 차단 테스트 추가
 * 2026.08.21  임도헌   Modified  TTL 상한과 일시적 전송 오류의 구독 유지 회귀 테스트 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  db: {
    pushSubscription: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("web-push", () => ({
  default: {
    sendNotification: mocks.sendNotification,
    setVapidDetails: mocks.setVapidDetails,
  },
}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

const subscription = {
  id: 41,
  userId: 7,
  endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
  p256dh: "device_p256dh-key",
  auth: "device_auth-key",
  isActive: true,
};

const activeSubscriptionSnapshot = {
  id: subscription.id,
  userId: subscription.userId,
  endpoint: subscription.endpoint,
  p256dh: subscription.p256dh,
  auth: subscription.auth,
  isActive: true,
};

async function sendTestNotification() {
  const { sendPushNotification } = await import("./sender");
  return sendPushNotification({
    targetUserId: subscription.userId,
    title: "테스트 알림",
    message: "구독 경쟁 조건 테스트",
    type: "SYSTEM",
  });
}

describe("sendPushNotification subscription ownership CAS", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");

    mocks.db.pushSubscription.findMany.mockResolvedValue([subscription]);
    mocks.db.pushSubscription.updateMany.mockResolvedValue({ count: 0 });
    mocks.db.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("발송 성공 뒤 로그아웃된 row를 재활성화하지 않고 snapshot에만 last_used를 기록한다", async () => {
    mocks.sendNotification.mockResolvedValue(undefined);

    const result = await sendTestNotification();

    expect(result).toEqual({
      success: true,
      data: { sent: 1, removed: 0, disabled: 0, errors: 0 },
    });
    expect(mocks.db.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: subscription.userId, isActive: true },
      orderBy: [{ updated_at: "desc" }, { id: "desc" }],
      take: 10,
    });
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: activeSubscriptionSnapshot,
      data: { last_used: expect.any(Date) },
    });
    expect(
      mocks.db.pushSubscription.updateMany.mock.calls[0]?.[0]?.data
    ).not.toHaveProperty("isActive");
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscription.endpoint }),
      expect.stringContaining(`"version":1`),
      expect.objectContaining({ timeout: 10_000 })
    );
    expect(mocks.sendNotification.mock.calls[0]?.[1]).toContain(
      `"recipientUserId":${subscription.userId}`
    );
  });

  it("본문 밖 필드와 한글이 커도 payload 축약이 종료되고 3800 bytes를 넘지 않는다", async () => {
    mocks.sendNotification.mockResolvedValue(undefined);
    const { sendPushNotification } = await import("./sender");

    await sendPushNotification({
      targetUserId: subscription.userId,
      title: "큰제목".repeat(2_000),
      message: "긴본문".repeat(2_000),
      image: `https://images.example.test/${"가".repeat(2_000)}`,
      url: `/${"경로".repeat(2_000)}`,
      type: "SYSTEM",
    });

    const payload = mocks.sendNotification.mock.calls[0]?.[1];
    expect(typeof payload).toBe("string");
    expect(new TextEncoder().encode(payload as string).byteLength).toBeLessThanOrEqual(
      3_800
    );
    expect(JSON.parse(payload as string)).toEqual(
      expect.objectContaining({
        version: 1,
        recipientUserId: subscription.userId,
      })
    );
  });

  it("신뢰할 수 없는 legacy endpoint는 외부 요청 없이 제거한다", async () => {
    mocks.db.pushSubscription.findMany.mockResolvedValue([
      {
        ...subscription,
        endpoint: "https://127.0.0.1/internal",
      },
    ]);

    const result = await sendTestNotification();

    expect(result).toEqual({
      success: true,
      data: { sent: 0, removed: 1, disabled: 0, errors: 0 },
    });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.db.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        endpoint: "https://127.0.0.1/internal",
        isActive: true,
      }),
    });
  });

  it("404/410 응답이 늦게 와도 새 소유자로 이전된 endpoint row를 삭제하지 않는다", async () => {
    mocks.sendNotification.mockRejectedValue({
      statusCode: 410,
      headers: {},
      body: "Gone",
    });

    const result = await sendTestNotification();

    expect(result).toEqual({
      success: true,
      data: { sent: 0, removed: 1, disabled: 0, errors: 1 },
    });
    expect(mocks.db.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: activeSubscriptionSnapshot,
    });
  });

  it("일시적 Web Push HTTP 오류는 구독을 비활성화하지 않는다", async () => {
    mocks.sendNotification.mockRejectedValue({
      statusCode: 503,
      headers: {},
      body: "Unavailable",
    });

    const result = await sendTestNotification();

    expect(result).toEqual({
      success: true,
      data: { sent: 0, removed: 0, disabled: 0, errors: 1 },
    });
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("socket timeout은 구독을 비활성화하지 않고 전송 오류로만 집계한다", async () => {
    mocks.sendNotification.mockRejectedValue(new Error("Socket timeout"));

    const result = await sendTestNotification();

    expect(result).toEqual({
      success: true,
      data: { sent: 0, removed: 0, disabled: 0, errors: 1 },
    });
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("호출부가 더 긴 TTL을 요청해도 provider 보관 기간을 24시간으로 제한한다", async () => {
    mocks.sendNotification.mockResolvedValue(undefined);
    const { sendPushNotification } = await import("./sender");

    await sendPushNotification({
      targetUserId: subscription.userId,
      title: "테스트 알림",
      message: "TTL 상한 테스트",
      type: "SYSTEM",
      ttlSeconds: 60 * 60 * 72,
    });

    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ TTL: 60 * 60 * 24 })
    );
  });

  it("유효하지 않은 TTL 숫자는 알림 유형의 기본값으로 대체한다", async () => {
    mocks.sendNotification.mockResolvedValue(undefined);
    const { sendPushNotification } = await import("./sender");

    await sendPushNotification({
      targetUserId: subscription.userId,
      title: "테스트 알림",
      message: "TTL fallback 테스트",
      type: "SYSTEM",
      ttlSeconds: Number.NaN,
    });

    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ TTL: 60 * 60 * 6 })
    );
  });
});

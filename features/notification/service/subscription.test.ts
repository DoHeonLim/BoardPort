/**
 * File Name : features/notification/service/subscription.test.ts
 * Description : Push endpoint 계정 격리와 기기 소유 증명 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   소유권 이전, legacy 차단, 현재 기기 해제 테스트 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSubscriptionDTO } from "@/features/notification/types";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    pushSubscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    notificationPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

const device: PushSubscriptionDTO = {
  endpoint: "https://push.example.test/subscriptions/device-1",
  keys: {
    p256dh: "device_p256dh-key",
    auth: "device_auth-key",
  },
};

describe("push subscription service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db)
    );
    mocks.db.$queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
    mocks.db.pushSubscription.findUnique.mockResolvedValue(null);
    mocks.db.pushSubscription.upsert.mockResolvedValue({ id: 1 });
    mocks.db.pushSubscription.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
    mocks.db.pushSubscription.count.mockResolvedValue(0);
    mocks.db.notificationPreferences.findUnique.mockResolvedValue({
      pushEnabled: true,
    });
    mocks.db.notificationPreferences.upsert.mockResolvedValue({ id: 1 });
  });

  it("등록 시 endpoint 소유권을 현재 계정으로 원자적 이전한다", async () => {
    const { upsertSubscription } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      userId: 3,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
    });

    await upsertSubscription(22, { ...device, userAgent: "test-browser" });

    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(mocks.db.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: device.endpoint },
      update: expect.objectContaining({
        userId: 22,
        p256dh: device.keys.p256dh,
        auth: device.keys.auth,
        userAgent: "test-browser",
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      }),
      create: expect.objectContaining({
        userId: 22,
        endpoint: device.endpoint,
        p256dh: device.keys.p256dh,
        auth: device.keys.auth,
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      }),
    });
  });

  it("타 계정 endpoint의 기기 키를 증명하지 못하면 소유권을 이전하지 않는다", async () => {
    const {
      PushSubscriptionOwnershipMismatchError,
      upsertSubscription,
    } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      userId: 3,
      p256dh: "another_p256dh",
      auth: "another_auth",
    });

    await expect(upsertSubscription(22, device)).rejects.toBeInstanceOf(
      PushSubscriptionOwnershipMismatchError
    );
    expect(mocks.db.pushSubscription.upsert).not.toHaveBeenCalled();
    expect(mocks.db.notificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it("사용자별 활성 기기 상한을 넘는 새 endpoint 등록을 거부한다", async () => {
    const {
      MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER,
      PushSubscriptionLimitExceededError,
      upsertSubscription,
    } = await import("./subscription");
    mocks.db.pushSubscription.count.mockResolvedValue(
      MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER
    );

    await expect(upsertSubscription(22, device)).rejects.toBeInstanceOf(
      PushSubscriptionLimitExceededError
    );
    expect(mocks.db.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("새 등록 전 명시적으로 비활성화된 stale 기기 row만 정리한다", async () => {
    const { upsertSubscription } = await import("./subscription");

    await upsertSubscription(22, device);

    expect(mocks.db.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 22,
        isActive: false,
        allows_automatic_reactivation: false,
        endpoint: { not: device.endpoint },
      },
    });
  });

  it("현재 계정의 fail-closed row는 기기 키 증명 후 자동 복구한다", async () => {
    const { checkSubscriptionStatus } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 10,
      userId: 7,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      isActive: false,
      requires_ownership_verification: true,
      allows_automatic_reactivation: true,
    });

    const result = await checkSubscriptionStatus(7, device);

    expect(result).toEqual({ isValid: true, reason: "active" });
    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 10,
        userId: 7,
        endpoint: device.endpoint,
        requires_ownership_verification: true,
        allows_automatic_reactivation: true,
      }),
      data: {
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      },
    });
  });

  it("legacy 기기 자동 복구도 활성 기기 상한을 넘기지 않는다", async () => {
    const {
      checkSubscriptionStatus,
      MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER,
    } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 10,
      userId: 7,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      isActive: false,
      requires_ownership_verification: true,
      allows_automatic_reactivation: true,
    });
    mocks.db.pushSubscription.count.mockResolvedValue(
      MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER
    );

    const result = await checkSubscriptionStatus(7, device);

    expect(result).toEqual({
      isValid: false,
      reason: "needs_reconnect",
    });
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("활성화 쓰기는 항상 legacy 재검증 표시를 함께 제거한다", async () => {
    const { upsertSubscription } = await import("./subscription");

    await upsertSubscription(7, device);

    const call = mocks.db.pushSubscription.upsert.mock.calls[0]?.[0];
    expect(call?.update).toEqual(
      expect.objectContaining({
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      })
    );
    expect(call?.create).toEqual(
      expect.objectContaining({
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      })
    );
  });

  it("이미 검증된 row가 비활성화됐다면 자동 복구하지 않는다", async () => {
    const { checkSubscriptionStatus } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 10,
      userId: 7,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      isActive: false,
      requires_ownership_verification: false,
      allows_automatic_reactivation: false,
    });

    const result = await checkSubscriptionStatus(7, device);

    expect(result).toEqual({
      isValid: false,
      reason: "needs_reconnect",
    });
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("전역 OFF는 비활성 legacy row의 자동 복구 자격까지 취소한다", async () => {
    const { unsubscribeAll } = await import("./subscription");

    await unsubscribeAll(7);

    expect(mocks.db.notificationPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 7 },
      update: { pushEnabled: false },
      create: { userId: 7, pushEnabled: false },
    });
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
  });

  it("이전 계정 row와 기기 키가 일치하면 비활성화하고 불일치를 반환한다", async () => {
    const { checkSubscriptionStatus } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 11,
      userId: 3,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      isActive: true,
      requires_ownership_verification: false,
      allows_automatic_reactivation: false,
    });

    const result = await checkSubscriptionStatus(7, device);

    expect(result).toEqual({
      isValid: false,
      reason: "account_mismatch",
    });
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 11, userId: 3 }),
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
    expect(mocks.db.notificationPreferences.findUnique).not.toHaveBeenCalled();
  });

  it("타 계정 endpoint의 기기 키가 다르면 row를 변경하지 않는다", async () => {
    const { checkSubscriptionStatus } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 12,
      userId: 3,
      p256dh: "another_p256dh",
      auth: "another_auth",
      isActive: true,
      requires_ownership_verification: false,
      allows_automatic_reactivation: false,
    });

    const result = await checkSubscriptionStatus(7, device);

    expect(result).toEqual({
      isValid: false,
      reason: "needs_reconnect",
    });
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("현재 기기만 비활성화하고 전역 설정을 변경하지 않는다", async () => {
    const { unsubscribeDevice } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 13,
      userId: 7,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
    });

    await expect(unsubscribeDevice(7, device)).resolves.toBeUndefined();
    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 13,
        userId: 7,
        endpoint: device.endpoint,
      },
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
    expect(mocks.db.notificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it("현재 계정 row는 키가 회전됐어도 세션+endpoint로 정리한다", async () => {
    const { unsubscribeDevice } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 14,
      userId: 7,
      p256dh: "rotated_p256dh",
      auth: "rotated_auth",
    });

    await expect(unsubscribeDevice(7, device)).resolves.toBeUndefined();
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 14,
        userId: 7,
        endpoint: device.endpoint,
      },
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
  });

  it("legacy 타 계정 row는 기기 키가 일치할 때만 정리한다", async () => {
    const { unsubscribeDevice } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 14,
      userId: 3,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
    });

    await expect(unsubscribeDevice(7, device)).resolves.toBeUndefined();
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 14, userId: 3 }),
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });

    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db)
    );
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 14,
      userId: 3,
      p256dh: "different_key",
      auth: device.keys.auth,
    });

    await expect(unsubscribeDevice(7, device)).resolves.toBeUndefined();
    expect(mocks.db.pushSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("세션이 끝난 기기도 정확한 키를 증명하면 stale row를 정리한다", async () => {
    const { unsubscribeDevice } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      id: 15,
      userId: 3,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
    });

    await expect(unsubscribeDevice(null, device)).resolves.toBeUndefined();
    expect(mocks.db.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 15,
        userId: 3,
        p256dh: device.keys.p256dh,
        auth: device.keys.auth,
      }),
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
  });

  it("표시 직전 세션·수신자·활성 endpoint 소유권이 모두 맞으면 Push를 허용한다", async () => {
    const { authorizePushDelivery } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue({
      userId: 7,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      isActive: true,
      requires_ownership_verification: false,
    });

    await expect(authorizePushDelivery(7, 7, device)).resolves.toBe(true);
    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      label: "다른 로그인 계정",
      sessionUserId: 8,
      recipientUserId: 7,
      subscription: null,
      pushEnabled: true,
    },
    {
      label: "비활성 endpoint",
      sessionUserId: 7,
      recipientUserId: 7,
      subscription: {
        userId: 7,
        p256dh: device.keys.p256dh,
        auth: device.keys.auth,
        isActive: false,
        requires_ownership_verification: false,
      },
      pushEnabled: true,
    },
    {
      label: "소유 키 불일치",
      sessionUserId: 7,
      recipientUserId: 7,
      subscription: {
        userId: 7,
        p256dh: "other-key",
        auth: device.keys.auth,
        isActive: true,
        requires_ownership_verification: false,
      },
      pushEnabled: true,
    },
    {
      label: "전역 Push OFF",
      sessionUserId: 7,
      recipientUserId: 7,
      subscription: {
        userId: 7,
        p256dh: device.keys.p256dh,
        auth: device.keys.auth,
        isActive: true,
        requires_ownership_verification: false,
      },
      pushEnabled: false,
    },
  ])("$label 상태에서는 Push 표시를 거부한다", async (scenario) => {
    const { authorizePushDelivery } = await import("./subscription");
    mocks.db.pushSubscription.findUnique.mockResolvedValue(
      scenario.subscription
    );
    mocks.db.notificationPreferences.findUnique.mockResolvedValue({
      pushEnabled: scenario.pushEnabled,
    });

    await expect(
      authorizePushDelivery(
        scenario.sessionUserId,
        scenario.recipientUserId,
        device
      )
    ).resolves.toBe(false);

    if (scenario.sessionUserId !== scenario.recipientUserId) {
      expect(mocks.db.$transaction).not.toHaveBeenCalled();
    }
  });
});

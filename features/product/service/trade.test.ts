/**
 * File Name : features/product/service/trade.test.ts
 * Description : 상품 거래 상태의 조건부 갱신과 commit 이후 실패 격리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   관찰한 상대·시각 조건과 외부 부가 작업 실패 격리 검증
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    product: { updateMany: vi.fn(), findUnique: vi.fn() },
    appointment: { findMany: vi.fn(), updateMany: vi.fn() },
    review: { deleteMany: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(),
      product: { findUnique: vi.fn() },
      productChatRoom: { findUnique: vi.fn(), findFirst: vi.fn() },
      productMessage: { create: vi.fn() },
      notificationPreferences: { findUnique: vi.fn(), findMany: vi.fn() },
      notification: { create: vi.fn(), update: vi.fn() },
    },
    realtimeSend: vi.fn(),
    validateUserStatus: vi.fn(),
    onTradeComplete: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: { channel: () => ({ send: mocks.realtimeSend }) },
}));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));
vi.mock("@/features/user/service/badge", () => ({
  badgeChecks: { onTradeComplete: mocks.onTradeComplete },
}));
vi.mock("@/features/notification/utils/policy", () => ({
  isNotificationTypeEnabled: vi.fn(() => true),
  canSendPushForType: vi.fn(() => false),
}));
vi.mock("@/features/notification/service/sender", () => ({
  sendPushNotification: vi.fn(),
}));
vi.mock("@/features/product/utils/image", () => ({
  toProductImagePublicUrl: vi.fn(() => null),
}));
vi.mock("@/features/chat/utils/converter", () => ({
  mapToChatMessage: vi.fn((message) => message),
}));

describe("updateProductStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.appointment.findMany.mockResolvedValue([]);
    mocks.tx.appointment.updateMany.mockResolvedValue({ count: 0 });
    mocks.tx.review.deleteMany.mockResolvedValue({ count: 0 });
    mocks.realtimeSend.mockResolvedValue("ok");
    mocks.onTradeComplete.mockResolvedValue(undefined);
  });

  it("판매완료는 선조회한 예약자와 예약 시각이 그대로일 때만 반영한다", async () => {
    const reservationAt = new Date("2026-08-26T01:00:00.000Z");
    mocks.db.product.findUnique
      .mockResolvedValueOnce({ userId: 1 })
      .mockResolvedValueOnce({
        reservation_userId: 2,
        reservation_at: reservationAt,
        purchase_userId: null,
        purchased_at: null,
        title: "테스트 상품",
        images: [],
      });
    mocks.db.notificationPreferences.findMany.mockResolvedValue([]);
    mocks.db.notification.create.mockResolvedValue({
      id: 1,
      title: "알림",
      body: "본문",
      link: null,
      type: "TRADE",
      image: null,
    });

    const { updateProductStatus } = await import("./trade");
    const result = await updateProductStatus(1, 10, "sold", undefined, {
      skipSystemMessage: true,
      actorId: 1,
    });

    expect(result).toMatchObject({ success: true });
    expect(mocks.tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        reservation_userId: 2,
        reservation_at: reservationAt,
        purchase_userId: null,
        purchased_at: null,
      },
      data: {
        purchased_at: expect.any(Date),
        purchase_userId: 2,
        reservation_at: null,
        reservation_userId: null,
      },
    });
  });

  it("판매중 복귀는 선조회한 예약·구매 상태가 유지될 때만 반영한다", async () => {
    const purchasedAt = new Date("2026-08-26T02:00:00.000Z");
    mocks.db.product.findUnique
      .mockResolvedValueOnce({ userId: 1 })
      .mockResolvedValueOnce({
        reservation_userId: null,
        reservation_at: null,
        purchase_userId: 2,
        purchased_at: purchasedAt,
        title: "테스트 상품",
        images: [],
      });
    mocks.db.notificationPreferences.findUnique.mockResolvedValue(null);
    mocks.db.notification.create.mockResolvedValue({
      id: 1,
      title: "알림",
      body: "본문",
      link: null,
      type: "TRADE",
      image: null,
    });

    const { updateProductStatus } = await import("./trade");
    const result = await updateProductStatus(1, 10, "selling", undefined, {
      skipSystemMessage: true,
      actorId: 1,
    });

    expect(result).toMatchObject({ success: true });
    expect(mocks.tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        reservation_userId: null,
        reservation_at: null,
        purchase_userId: 2,
        purchased_at: purchasedAt,
      },
      data: {
        purchased_at: null,
        purchase_userId: null,
        reservation_at: null,
        reservation_userId: null,
      },
    });
  });

  it("선조회 뒤 거래 상대가 바뀌어 조건부 갱신이 실패하면 후속 정리를 실행하지 않는다", async () => {
    const reservationAt = new Date("2026-08-26T03:00:00.000Z");
    mocks.db.product.findUnique
      .mockResolvedValueOnce({ userId: 1 })
      .mockResolvedValueOnce({
        reservation_userId: 2,
        reservation_at: reservationAt,
        purchase_userId: null,
        purchased_at: null,
        title: "테스트 상품",
        images: [],
      });
    mocks.tx.product.updateMany.mockResolvedValue({ count: 0 });

    const { updateProductStatus } = await import("./trade");
    const result = await updateProductStatus(1, 10, "sold", undefined, {
      skipSystemMessage: true,
    });

    expect(result).toEqual({
      success: false,
      error: "이미 상태가 변경되었습니다.",
    });
    expect(mocks.tx.appointment.findMany).not.toHaveBeenCalled();
    expect(mocks.db.notification.create).not.toHaveBeenCalled();
  });

  it("commit 뒤 알림 저장이 실패해도 반영된 예약은 성공으로 응답한다", async () => {
    mocks.db.product.findUnique.mockResolvedValue({ userId: 1 });
    mocks.db.productChatRoom.findUnique.mockResolvedValue({ id: "room-1" });
    mocks.tx.product.findUnique.mockResolvedValue({
      title: "테스트 상품",
      images: [],
    });
    mocks.db.notificationPreferences.findUnique.mockRejectedValue(
      new Error("notification database unavailable")
    );

    const { updateProductStatus } = await import("./trade");
    const result = await updateProductStatus(1, 10, "reserved", 2, {
      skipSystemMessage: true,
    });

    expect(result).toMatchObject({
      success: true,
      data: { buyerId: 2, newStatus: "reserved" },
    });
    expect(mocks.tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        reservation_at: null,
        reservation_userId: null,
        purchased_at: null,
        purchase_userId: null,
      },
      data: {
        reservation_at: expect.any(Date),
        reservation_userId: 2,
        purchased_at: null,
        purchase_userId: null,
      },
    });
    expect(mocks.db.productChatRoom.findUnique).toHaveBeenCalledWith({
      where: { productId_buyerId: { productId: 10, buyerId: 2 } },
      select: { id: true },
    });
  });
});

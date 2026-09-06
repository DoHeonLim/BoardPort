/**
 * File Name : features/chat/service/appointment.test.ts
 * Description : 거래 약속 commit 이후 외부 전달 실패 격리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   Realtime 실패가 저장된 취소 결과를 뒤집지 않는지 검증
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    appointment: { updateMany: vi.fn() },
    productMessage: { create: vi.fn() },
    productChatRoom: { update: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(),
      appointment: { findUnique: vi.fn() },
      notificationPreferences: { findUnique: vi.fn() },
      notification: { create: vi.fn(), update: vi.fn() },
    },
    realtimeSend: vi.fn(),
    isNotificationTypeEnabled: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: { channel: () => ({ send: mocks.realtimeSend }) },
}));
vi.mock("@/features/notification/utils/policy", () => ({
  isNotificationTypeEnabled: mocks.isNotificationTypeEnabled,
  canSendPushForType: vi.fn(() => false),
}));
vi.mock("@/features/notification/service/sender", () => ({
  sendPushNotification: vi.fn(),
}));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: vi.fn(),
}));
vi.mock("@/features/user/service/block", () => ({
  checkBlockRelation: vi.fn(),
}));

describe("cancelAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.appointment.findUnique.mockResolvedValue({
      id: 11,
      status: "PENDING",
      proposerId: 2,
      receiverId: 1,
      chatRoomId: "room-1",
      chatRoom: {
        product: { id: 10, title: "테스트 상품", images: [] },
      },
    });
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.tx.appointment.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.productMessage.create.mockResolvedValue({
      id: 21,
      payload: "제안자가 약속을 취소했습니다.",
      image: null,
      imageIsAnimated: false,
      deleted_at: null,
      type: "SYSTEM",
      appointment: null,
      isRead: false,
      created_at: new Date("2026-08-26T00:00:00.000Z"),
      updated_at: new Date("2026-08-26T00:00:00.000Z"),
      productChatRoomId: "room-1",
      userId: 2,
      user: { id: 2, username: "buyer", avatar: null },
    });
    mocks.tx.productChatRoom.update.mockResolvedValue({});
    mocks.realtimeSend.mockRejectedValue(new Error("realtime unavailable"));
    mocks.db.notificationPreferences.findUnique.mockResolvedValue({});
    mocks.isNotificationTypeEnabled.mockReturnValue(false);
  });

  it("Realtime 전달이 실패해도 commit된 취소 결과는 성공으로 유지한다", async () => {
    const { cancelAppointment } = await import("./appointment");

    await expect(cancelAppointment(2, 11)).resolves.toEqual({ success: true });
    expect(mocks.tx.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: 11, status: "PENDING" },
      data: { status: "CANCELED" },
    });
  });
});

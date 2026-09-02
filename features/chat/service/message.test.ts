/**
 * File Name : features/chat/service/message.test.ts
 * Description : 상품 채팅 메시지 저장·삭제와 외부 효과 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   clientMessageId 재사용과 Realtime 실패 후 DB 성공 유지 검증
 * 2026.09.02  임도헌   Modified  이미지 메시지 삭제 시 MediaAsset 및 Cloudflare 정리 검증 추가
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    productMessage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productChatRoom: { update: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(),
      productChatRoom: { findFirst: vi.fn(), findUnique: vi.fn() },
      productMessage: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      notification: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    },
    validateUserStatus: vi.fn(),
    checkBlockRelation: vi.fn(),
    realtimeSend: vi.fn(),
    isNotificationTypeEnabled: vi.fn(),
    canSendPushForType: vi.fn(),
    sendPush: vi.fn(),
    attachOwnedMediaAssets: vi.fn(),
    detachMissingMediaAssets: vi.fn(),
    deleteCloudflareImageAssetsById: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));
vi.mock("@/features/user/service/block", () => ({
  checkBlockRelation: mocks.checkBlockRelation,
}));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: { channel: () => ({ send: mocks.realtimeSend }) },
}));
vi.mock("@/features/notification/utils/policy", () => ({
  isNotificationTypeEnabled: mocks.isNotificationTypeEnabled,
  canSendPushForType: mocks.canSendPushForType,
}));
vi.mock("@/features/notification/service/sender", () => ({
  sendPushNotification: mocks.sendPush,
}));
vi.mock("@/features/media/service/assets", () => ({
  attachOwnedMediaAssets: mocks.attachOwnedMediaAssets,
  detachMissingMediaAssets: mocks.detachMissingMediaAssets,
  deleteCloudflareImageAssetsById: mocks.deleteCloudflareImageAssetsById,
}));

const persistedMessage = {
  id: 7,
  payload: "안녕하세요",
  image: null,
  imageIsAnimated: false,
  deleted_at: null,
  type: "TEXT",
  appointment: null,
  isRead: false,
  created_at: new Date("2026-08-26T00:00:00.000Z"),
  updated_at: new Date("2026-08-26T00:00:00.000Z"),
  productChatRoomId: "room-1",
  userId: 1,
  user: { id: 1, username: "sender", avatar: null },
  reactions: [],
};

describe("createMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.checkBlockRelation.mockResolvedValue(false);
    mocks.db.productChatRoom.findFirst.mockResolvedValue({
      id: "room-1",
      users: [{ id: 2, bannedAt: null }],
    });
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.tx.productChatRoom.update.mockResolvedValue({});
    mocks.db.user.findUnique.mockResolvedValue({
      notification_preferences: null,
    });
    mocks.isNotificationTypeEnabled.mockReturnValue(false);
    mocks.realtimeSend.mockResolvedValue("ok");
  });

  it("잘못된 clientMessageId는 DB 조회 전에 거부한다", async () => {
    const { createMessage } = await import("./message");

    await expect(
      createMessage("room-1", 1, "안녕하세요", null, false, "short")
    ).resolves.toEqual({
      success: false,
      error: "메시지 요청 ID가 올바르지 않습니다.",
    });
    expect(mocks.db.productChatRoom.findFirst).not.toHaveBeenCalled();
  });

  it("같은 clientMessageId 재전송은 기존 메시지를 반환하고 외부 효과를 반복하지 않는다", async () => {
    const { createMessage } = await import("./message");
    mocks.tx.productMessage.findUnique.mockResolvedValue(persistedMessage);

    const result = await createMessage(
      "room-1",
      1,
      "안녕하세요",
      null,
      false,
      "client-message-id-0001"
    );

    expect(result).toMatchObject({
      success: true,
      data: { message: { id: 7 }, receiverId: 2 },
    });
    expect(mocks.tx.productMessage.create).not.toHaveBeenCalled();
    expect(mocks.realtimeSend).not.toHaveBeenCalled();
    expect(mocks.db.notification.create).not.toHaveBeenCalled();
  });

  it("다른 채팅방에서 사용된 clientMessageId는 기존 메시지를 노출하지 않고 거부한다", async () => {
    const { createMessage } = await import("./message");
    mocks.tx.productMessage.findUnique.mockResolvedValue({
      ...persistedMessage,
      productChatRoomId: "other-room",
    });

    await expect(
      createMessage(
        "room-1",
        1,
        "안녕하세요",
        null,
        false,
        "client-message-id-0003"
      )
    ).resolves.toEqual({
      success: false,
      error: "다른 채팅방에서 이미 사용된 메시지 요청 ID입니다.",
    });
    expect(mocks.realtimeSend).not.toHaveBeenCalled();
    expect(mocks.db.notification.create).not.toHaveBeenCalled();
  });

  it("Realtime 전달이 실패해도 commit된 신규 메시지는 성공으로 반환한다", async () => {
    const { createMessage } = await import("./message");
    mocks.tx.productMessage.findUnique.mockResolvedValue(null);
    mocks.tx.productMessage.create.mockResolvedValue(persistedMessage);
    mocks.realtimeSend.mockRejectedValue(new Error("realtime unavailable"));

    const result = await createMessage(
      "room-1",
      1,
      "안녕하세요",
      null,
      false,
      "client-message-id-0002"
    );

    expect(result).toMatchObject({
      success: true,
      data: { message: { id: 7 }, receiverId: 2 },
    });
    expect(mocks.tx.productChatRoom.update).toHaveBeenCalled();
  });
});

describe("deleteMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx)
    );
    mocks.db.productMessage.findUnique.mockResolvedValue({
      ...persistedMessage,
      payload: null,
      image: "https://imagedelivery.net/account/chat-asset",
      imageIsAnimated: true,
      type: "IMAGE",
    });
    mocks.tx.productMessage.update.mockResolvedValue({
      ...persistedMessage,
      payload: null,
      image: null,
      imageIsAnimated: false,
      type: "IMAGE",
      deleted_at: new Date("2026-09-02T00:00:00.000Z"),
    });
    mocks.detachMissingMediaAssets.mockResolvedValue(["chat-asset"]);
    mocks.deleteCloudflareImageAssetsById.mockResolvedValue(undefined);
    mocks.db.productChatRoom.findUnique.mockResolvedValue({
      users: [{ id: 1 }, { id: 2 }],
    });
    mocks.db.notification.updateMany.mockResolvedValue({ count: 1 });
    mocks.realtimeSend.mockResolvedValue("ok");
  });

  it("이미지 메시지와 MediaAsset 연결을 함께 제거하고 Cloudflare 원본을 정리한다", async () => {
    const { deleteMessage } = await import("./message");

    const result = await deleteMessage(7, 1);

    expect(result).toMatchObject({
      success: true,
      data: { id: 7, image: null, deleted_at: expect.any(Date) },
    });
    expect(mocks.detachMissingMediaAssets).toHaveBeenCalledWith(mocks.tx, {
      ownerId: 1,
      purpose: "CHAT_IMAGE",
      linkedEntityId: "7",
      keepUrls: [],
    });
    expect(mocks.tx.productMessage.update).toHaveBeenCalled();
    expect(mocks.deleteCloudflareImageAssetsById).toHaveBeenCalledWith([
      "chat-asset",
    ]);
  });

  it("이미 삭제된 이미지 메시지를 다시 요청해도 남은 MediaAsset을 정리한다", async () => {
    const { deleteMessage } = await import("./message");
    mocks.db.productMessage.findUnique.mockResolvedValue({
      ...persistedMessage,
      payload: null,
      image: null,
      imageIsAnimated: false,
      type: "IMAGE",
      deleted_at: new Date("2026-09-02T00:00:00.000Z"),
    });

    const result = await deleteMessage(7, 1);

    expect(result).toMatchObject({ success: true, data: { id: 7 } });
    expect(mocks.detachMissingMediaAssets).toHaveBeenCalledWith(mocks.tx, {
      ownerId: 1,
      purpose: "CHAT_IMAGE",
      linkedEntityId: "7",
      keepUrls: [],
    });
    expect(mocks.tx.productMessage.update).not.toHaveBeenCalled();
    expect(mocks.deleteCloudflareImageAssetsById).toHaveBeenCalledWith([
      "chat-asset",
    ]);
  });
});

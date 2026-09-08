/**
 * File Name : features/chat/service/room.test.ts
 * Description : 상품 채팅방 생성 DB 멱등성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   상품·구매자 고유 키 upsert와 기존 방 재사용 검증
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    product: { findUnique: vi.fn() },
    productChatRoom: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  validateUserStatus: vi.fn(),
  checkBlockRelation: vi.fn(),
  realtimeSend: vi.fn(),
  isUniqueConstraintError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: vi.fn(),
  checkBlockRelation: mocks.checkBlockRelation,
}));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: { channel: () => ({ send: mocks.realtimeSend }) },
}));
vi.mock("@/lib/errors", () => ({
  isUniqueConstraintError: mocks.isUniqueConstraintError,
}));

describe("createChatRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.checkBlockRelation.mockResolvedValue(false);
    mocks.db.product.findUnique.mockResolvedValue({ userId: 1 });
    mocks.db.productChatRoom.findUnique.mockResolvedValue(null);
    mocks.db.productChatRoom.upsert.mockResolvedValue({ id: "room-10-2" });
    mocks.isUniqueConstraintError.mockReturnValue(false);
  });

  it("상품·구매자 고유 키 upsert로 신규 요청을 하나의 방에 수렴시킨다", async () => {
    const { createChatRoom } = await import("./room");

    await expect(createChatRoom(2, 10)).resolves.toBe("room-10-2");
    expect(mocks.db.productChatRoom.findUnique).toHaveBeenCalledWith({
      where: { productId_buyerId: { productId: 10, buyerId: 2 } },
      include: { users: { select: { id: true } } },
    });
    expect(mocks.db.productChatRoom.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_buyerId: { productId: 10, buyerId: 2 } },
        create: expect.objectContaining({
          buyer: { connect: { id: 2 } },
        }),
      })
    );
  });

  it("이미 존재하고 양쪽 사용자가 연결된 방은 추가 쓰기 없이 재사용한다", async () => {
    const { createChatRoom } = await import("./room");
    mocks.db.productChatRoom.findUnique.mockResolvedValue({
      id: "existing-room",
      users: [{ id: 1 }, { id: 2 }],
    });

    await expect(createChatRoom(2, 10)).resolves.toBe("existing-room");
    expect(mocks.db.productChatRoom.upsert).not.toHaveBeenCalled();
  });

  it("동시 create 고유 키 충돌은 선행 요청이 만든 방으로 수렴한다", async () => {
    const { createChatRoom } = await import("./room");
    const collision = new Error("unique collision");
    mocks.db.productChatRoom.upsert.mockRejectedValue(collision);
    mocks.isUniqueConstraintError.mockReturnValue(true);
    mocks.db.productChatRoom.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "concurrent-room" });

    await expect(createChatRoom(2, 10)).resolves.toBe("concurrent-room");
    expect(mocks.isUniqueConstraintError).toHaveBeenCalledWith(collision, [
      "productId",
      "buyerId",
    ]);
  });
});

/**
 * File Name : features/product/actions/chat.test.ts
 * Description : 상품 채팅방 생성 Action의 이동 경로와 오류 전달 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.01  임도헌   Created   `redirect()` 제어 신호 대신 안전한 내부 채팅 경로를 반환하는 동작 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createChatRoom: vi.fn(),
  getProductChatUsers: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/chat/service/room", () => ({
  createChatRoom: mocks.createChatRoom,
}));
vi.mock("@/features/product/service/chatUsers", () => ({
  getProductChatUsers: mocks.getProductChatUsers,
}));

describe("createChatRoomAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.createChatRoom.mockResolvedValue("room-525-7");
  });

  it("채팅방 생성 후 정규화한 복귀 경로를 포함한 내부 URL을 반환한다", async () => {
    const { createChatRoomAction } = await import("./chat");

    await expect(
      createChatRoomAction(525, "/products/view/525?view=grid")
    ).resolves.toBe(
      "/chats/room-525-7?returnTo=%2Fproducts%2Fview%2F525%3Fview%3Dgrid"
    );
    expect(mocks.createChatRoom).toHaveBeenCalledWith(7, 525);
  });

  it("외부 복귀 경로는 루트 경로로 제한한다", async () => {
    const { createChatRoomAction } = await import("./chat");

    await expect(
      createChatRoomAction(525, "https://attacker.example")
    ).resolves.toBe("/chats/room-525-7?returnTo=%2F");
  });

  it("로그인 세션이 없으면 채팅방을 만들지 않고 실제 오류를 전달한다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { createChatRoomAction } = await import("./chat");

    await expect(createChatRoomAction(525)).rejects.toThrow(
      "로그인이 필요합니다."
    );
    expect(mocks.createChatRoom).not.toHaveBeenCalled();
  });
});

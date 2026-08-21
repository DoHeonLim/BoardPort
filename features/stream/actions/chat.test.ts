/**
 * File Name : features/stream/actions/chat.test.ts
 * Description : 라이브 채팅 방송 접근 권한 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   제한 방송 접근 거부 시 메시지 쓰기와 rate limit 조회가 실행되지 않음을 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getStreamChatSendContext: vi.fn(),
  authorizeBroadcastAccess: vi.fn(),
  isStreamViewerMuted: vi.fn(),
  countRecentStreamMessages: vi.fn(),
  createStreamMessage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/access", () => ({
  authorizeBroadcastAccess: mocks.authorizeBroadcastAccess,
}));
vi.mock("@/features/stream/service/chat", () => ({
  getStreamChatSendContext: mocks.getStreamChatSendContext,
  isStreamViewerMuted: mocks.isStreamViewerMuted,
  countRecentStreamMessages: mocks.countRecentStreamMessages,
  createStreamMessage: mocks.createStreamMessage,
}));

describe("sendStreamMessageAction access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 11, unlockedBroadcastIds: {} });
    mocks.getStreamChatSendContext.mockResolvedValue({
      hostId: 7,
      broadcastId: 31,
    });
  });

  it("FOLLOWERS/PRIVATE 접근이 거부되면 후속 조회와 메시지 생성을 중단한다", async () => {
    mocks.authorizeBroadcastAccess.mockResolvedValue({
      allowed: false,
      reason: "FOLLOWERS_ONLY",
      role: "VISITOR",
      subject: { broadcastId: 31 },
    });
    const { sendStreamMessageAction } = await import("./chat");

    const result = await sendStreamMessageAction("안녕하세요", 91);

    expect(result).toEqual({ success: false, error: "CREATE_FAILED" });
    expect(mocks.authorizeBroadcastAccess).toHaveBeenCalledWith(
      31,
      11,
      expect.objectContaining({ id: 11 })
    );
    expect(mocks.isStreamViewerMuted).not.toHaveBeenCalled();
    expect(mocks.countRecentStreamMessages).not.toHaveBeenCalled();
    expect(mocks.createStreamMessage).not.toHaveBeenCalled();
  });
});

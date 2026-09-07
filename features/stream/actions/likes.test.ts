/**
 * File Name : features/stream/actions/likes.test.ts
 * Description : VOD 좋아요 Action 접근 권한 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   공용 VOD 접근 거부를 좋아요 실패로 변환하고 성공값을 만들지 않음을 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockStreamAccessError extends Error {}
  return {
    StreamAccessError: MockStreamAccessError,
    getSession: vi.fn(),
    getRecordingLikeStatus: vi.fn(),
    toggleRecordingLike: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/access", () => ({
  StreamAccessError: mocks.StreamAccessError,
}));
vi.mock("@/features/stream/service/like", () => ({
  getRecordingLikeStatus: mocks.getRecordingLikeStatus,
  toggleRecordingLike: mocks.toggleRecordingLike,
}));

describe("recording like action access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 11, unlockedBroadcastIds: {} });
  });

  it("service의 FOLLOWERS 접근 거부를 FORBIDDEN으로 반환한다", async () => {
    mocks.toggleRecordingLike.mockRejectedValue(
      new mocks.StreamAccessError("FOLLOWERS_ONLY")
    );
    const { likeRecording } = await import("./likes");

    const result = await likeRecording(91);

    expect(result).toEqual({ success: false, error: "FORBIDDEN" });
    expect(mocks.toggleRecordingLike).toHaveBeenCalledWith(
      91,
      11,
      true,
      expect.objectContaining({ id: 11 })
    );
  });
});

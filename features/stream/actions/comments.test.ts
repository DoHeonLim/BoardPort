/**
 * File Name : features/stream/actions/comments.test.ts
 * Description : VOD 댓글 Action 접근 권한 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   공용 VOD 접근 거부를 댓글 작성 실패로 안전하게 변환하는 경계 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockStreamAccessError extends Error {}
  return {
    StreamAccessError: MockStreamAccessError,
    getSession: vi.fn(),
    createRecordingComment: vi.fn(),
    getRecordingCommentsList: vi.fn(),
    deleteRecordingComment: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/access", () => ({
  StreamAccessError: mocks.StreamAccessError,
}));
vi.mock("@/features/stream/service/comment", () => ({
  createRecordingComment: mocks.createRecordingComment,
  getRecordingCommentsList: mocks.getRecordingCommentsList,
  deleteRecordingComment: mocks.deleteRecordingComment,
}));

describe("recording comment action access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 11, unlockedBroadcastIds: {} });
  });

  it("service의 PRIVATE 접근 거부를 FORBIDDEN으로 반환한다", async () => {
    mocks.createRecordingComment.mockRejectedValue(
      new mocks.StreamAccessError("PRIVATE")
    );
    const { createRecordingComment } = await import("./comments");
    const formData = new FormData();
    formData.set("vodId", "91");
    formData.set("payload", "댓글");

    const result = await createRecordingComment(formData);

    expect(result).toEqual({ success: false, error: "FORBIDDEN" });
    expect(mocks.createRecordingComment).toHaveBeenCalledWith(
      91,
      11,
      "댓글",
      expect.objectContaining({ id: 11 })
    );
  });
});
